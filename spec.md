# 韓ドラ好きが集まるWebサイト — 設計書（AIでの実装向け）

> 目的：韓国ドラマ好きが記事を投稿・閲覧し、管理者が記事編集とセッション管理を行えるシンプルで拡張性のあるWebアプリを、AIにコード生成してもらって構築するための詳細設計書。

---

## 1. 要件サマリ

### ユーザー向け（公開）
- メインページ：記事一覧、おすすめ、記事詳細（本文、画像、タグ）
- 記事検索（キーワード、タグ）
- 記事に対する「いいね」（任意／将来実装）

### 管理者向け（認証済み）
- 管理者登録（初回セットアップ用）
- 管理者一覧表示／編集／削除
- 記事の作成・編集・削除・下書き管理
- セッション管理：現在ログイン中セッション一覧、強制ログアウト（セッション破棄）
- シンプルな監査ログ（記事の更新履歴を保存）

### 非機能要件
- 高速な読み取り（Cloudflare Workers をフロントに）
- メディアはR2に保存、CDNで配信
- データはCloudflare D1（SQLite互換）に保存
- セキュリティ：管理ページは認証必須、セッションはHTTP-only cookie
- 可搬性・自動生成しやすい実装（AIがパーツごとに生成しやすい設計）

---

## 2. 技術スタック
- フロント／アプリ：Remix（Vite） + React 18
- スタイリング：Tailwind CSS
- 実行環境：Cloudflare Workers
- データベース：Cloudflare D1 (SQLite互換)
- オブジェクトストレージ：Cloudflare R2（画像等）
- CI／デプロイ：GitHub Actions → Wrangler（Workers）

---

## 3. アーキテクチャ（高レベル）

1. クライアント（ブラウザ） → Remix SSR/CSR（Cloudflare Workers上で動作）
2. WorkersがRemixハンドラを受け、D1へクエリ／R2へ署名URLを発行
3. 管理者は管理UIから記事を操作（APIはRemixの`action`や専用APIルート）
4. セッションはD1の`sessions`テーブルで管理、cookieにセッションIDを置く

---

## 4. データベース設計（D1 用 SQL DDL）

以下は最小セット（将来拡張しやすい設計）：

```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- UUID
  admin_id INTEGER NOT NULL,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  hero_image_key TEXT, -- R2 object key
  status TEXT NOT NULL DEFAULT 'published', -- published|draft|archived
  author_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE article_tags (
  article_id INTEGER,
  tag TEXT,
  PRIMARY KEY(article_id, tag),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE TABLE article_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  edited_by INTEGER,
  edited_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. 認証・セッション設計

### 管理者認証フロー
1. 初回：`/admin/setup`で管理者を作成（username、email、password）
2. パスワードはbcrypt (work factor 12 相当) でハッシュ化して保存
3. ログイン成功時、UUIDでセッションを生成し、`sessions`テーブルへ保存
4. クライアントへは`Set-Cookie`で`__HOST-ADMIN-SESS=<session_id>; HttpOnly; Secure; Path=/; SameSite=Lax; Expires=...`を付与

### セッション管理
- セッションテーブルにuser_agent、ip、created_at、expires_atを保持
- 管理画面にて現在有効なセッションを一覧化（セッション作成日時、IP、UA）
- 強制ログアウトは該当セッションレコードの削除
- 自動期限：デフォルト7日（設定可能）
- 長期保持をする場合はRefreshトークン設計を追加（今回は不要）

### CSRF対策
- Remixの`action` + `loader`でCSRFトークンを埋め込み（または`SameSite=Lax`＋POSTのみで保護）

---

## 6. R2（メディア）設計
- 画像アップロードは管理UIで実行。Workers経由でR2に直接アップロードするか、バックエンド（Remix action）で受け取りR2 SDKで保存する。
- 画像は`bucket/articles/<article_id>/<uuid>.<ext>`のキー形式で保存
- 配信用に短期署名（presigned URL）を付与するか、公開バケットを用意してCloudflare CDNで配信

---

## 7. API / Route 設計（主要）

### 公開ルート
- `GET /` - 記事一覧（ページネーション、検索クエリ `?q=`, `?tag=`）
- `GET /articles/:slug` - 記事詳細（記事、タグ、画像の署名URL）

### 管理ルート（/admin/*）
- `GET /admin` - 管理ダッシュボード（要セッション）
- `GET /admin/articles` - 記事一覧（管理用）
- `GET /admin/articles/new` - 新規作成フォーム
- `POST /admin/articles` - 記事作成（action）
- `GET /admin/articles/:id/edit` - 編集画面
- `POST /admin/articles/:id` - 記事更新（action）
- `POST /admin/articles/:id/delete` - 記事削除
- `GET /admin/admins` - 管理者一覧
- `POST /admin/admins` - 管理者作成
- `POST /admin/login` - ログイン
- `POST /admin/logout` - ログアウト（現在のセッションを削除）
- `GET /admin/sessions` - セッション一覧
- `POST /admin/sessions/:id/revoke` - セッション強制終了

---

## 8. UI構成（コンポーネント）

### 公開系
- `Header`（ロゴ、検索ボックス、ナビ）
- `ArticleCard`（サムネ、タイトル、excerpt、tag list）
- `ArticlePage`（hero image、content、meta、tags）
- `Pagination`コンポーネント

### 管理系
- `AdminLayout`（サイドバー、ヘッダー）
- `ArticleEditor`（title, slug, content: markdown or rich text? → 最初はMarkdown textarea）
- `AdminList`（テーブル表示：編集/削除/ログ）
- `SessionsPanel`（セッション一覧＋revokeボタン）

---

## 9. 実装方針（AIに生成してもらいやすい分割）
各タスクは小さい単位でAIに生成させる。例えば：

1. DBマイグレーションSQLファイル作成
2. Remixルート：`routes/index.tsx`（記事一覧） - loader + component
3. Remixルート：`routes/articles/$slug.tsx`（記事詳細）
4. 管理ルート：`routes/admin/login.tsx`（login form + action）
5. 管理ルート：`routes/admin/articles/index.tsx`（管理記事一覧）
6. API：記事作成・更新用の`action`実装（ファイルアップロード連携を含む）
7. セッション管理UIとAPI（`/admin/sessions` と revoke action）
8. R2アップロードユーティリティ（署名 or direct put）
9. E2Eテスト（Playwright）テンプレート

---

## 10. API仕様（例：記事取得）

**GET /api/articles?limit=20&offset=0&q=xxx&tag=yyy**
- response 200
```json
{
  "items": [
    {"id": 1, "slug":"...","title":"...","excerpt":"...","hero_image_url":"https://...","tags":["romance","2020"]}
  ],
  "total": 123
}
```

**POST /api/admin/articles** (multipart/form-data)
- body: title, slug, content, status, hero_image(file), tags (comma)
- response 201: created article id / slug

---

## 11. セキュリティ考慮
- パスワードは必ずハッシュ化（bcrypt）
- 管理系はすべてHTTPS、cookieはHttpOnly+Secure
- SQLインジェクションはプリペアドステートメント（D1のパラメタライズ）を使用
- ファイルアップロードは拡張子とMIMEチェック、サイズ制限
- R2の公開設定は最小限。可能なら署名URL。

---

## 12. CI / デプロイ
- GitHub Actionsで`lint`→`test`→`build`→`wrangler publish`
- 環境変数（R2 keys、D1 binding、JWT secret等）はGitHub Secretsで管理

---

## 13. テスト
- ユニット：DBユーティリティ、日付処理、slug生成など
- 統合：重要なAPI（記事作成・取得・セッション）
- E2E：Playwrightで管理画面のログイン→記事作成→表示確認

---

## 14. コーディング規約（AIへの指示例）
- TypeScript (strict)
- ファイル単位で1コンポーネント、明確な命名
- Tailwind utility-first、コンポーネントにはclassNameでスタイル
- Remixの`loader`でデータ取得、`action`で書き込み
- テストはjest / vitest + PlaywrightでE2E

---

## 15. AIへ投げる生成プロンプト（例）
- 「DBマイグレーションSQLを生成して。テーブルはadmins, sessions, articles, article_tags, article_versions, audit_logs。D1互換のSQLite構文で。」
- 「Remixの`routes/articles/$slug.tsx`を生成して。loaderでD1から記事を取得、hero_image_keyを受け取ったらR2の署名URLを発行してページで表示するコンポーネントを作って。」

---

## 16. タスク優先度（初期フェーズ）
1. DBマイグレーション + 接続ユーティリティ
2. 公開：記事一覧（/）と記事詳細（/articles/:slug）
3. 管理：ログイン・セッション（/admin/login, /admin/sessions）
4. 管理：記事作成・編集（/admin/articles/*）
5. 画像アップロード（R2連携）
6. CI/CD, テスト

---

## 17. 受け入れ基準（例）
- 記事一覧と詳細が正常に表示される（D1から読み出し）
- 管理者がログイン・ログアウトできる、セッションがD1に記録される
- 管理画面のセッション一覧で任意のセッションを強制終了できる

---

## 18. 参考（実装のヒント）
- Markdownレンダリングは最初は`marked`等の軽量ライブラリでOK
- slug生成は`slugify(title)`
- 画像は小サイズ・中サイズを作るならWorkersの画像リサイズ機能や外部サービス検討

---

### 最後に（AIが実装する際の注意）
- 1つのPR/生成で1機能（例：記事一覧）を目標にし、テストと簡単なREADMEを付与する。
- セキュリティに関する部分（認証・アップロード）は必ず手元でレビューする。

---

以上。必要ならこの設計書を元に、まずは「DBマイグレーションSQL」を生成します。どれを先に生成しますか？

