# Project Context: cw-dorama

## プロジェクト概要
`cw-dorama` は、Remix フレームワークと Cloudflare Workers プラットフォーム上に構築された、K-Drama (韓国ドラマ) 情報を提供するフルスタック Web アプリケーションです。
管理画面機能を含み、記事の投稿・管理、メディア管理、管理者セッション管理機能を有しています。

## アーキテクチャ

### インフラストラクチャ (Cloudflare)
- **Compute**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite 互換)
- **Storage**: Cloudflare R2 (画像などのメディアファイル用、`hero_image_key` カラムなどから推測)
- **Assets**: Cloudflare Pages / Workers Sites

### アプリケーション構造 (`app/`)
- **Routing**: Remix File System Routing (`app/routes/`)
- **Styling**: Tailwind CSS (`app/tailwind.css`)
- **Database Access**: `app/utils/db.server.ts` (型定義と共通処理)
- **Authentication**: `app/utils/session.server.ts` (Cookie ベースのセッション管理)

## データベース設計 (D1)
主なテーブル構造は以下の通りです (`schema.sql` 参照):

- **admins**: 管理者情報 (username, password_hash, etc.)
- **sessions**: 管理者ログインセッション (id, admin_id, expires_at, etc.)
- **articles**: 記事コンテンツ (slug, title, content, status, hero_image_key, etc.)
- **article_tags**: 記事とタグの関連付け
- **article_versions**: 記事の変更履歴・バージョン管理
- **audit_logs**: 管理操作の監査ログ

## 機能一覧

### 公開側 (`/`)
- 記事一覧表示
- 記事詳細表示 (`articles.$slug`)
- (予定) カテゴリ・タグ検索

### 管理画面 (`/admin`)
- **ダッシュボード**: 概要表示
- **認証**: ログイン (`admin.login`)、ログアウト
- **記事管理**: 作成 (`admin.articles.new`)、編集 (`admin.articles.$id.edit`)、一覧
- **メディア管理**: (`api.media`, `api.upload` などで実装)
- **セッション管理**: アクティブなセッションの確認と強制終了

## 開発状況
- 基本的な管理機能と記事入稿フローは実装済み。
- データベースマイグレーションは `migrations/` ディレクトリで管理。
- テストは Playwright を使用 (`tests/`)。

## 今後の課題・TODO
- フロントエンド (公開側) のデザイン拡充
- 記事検索・フィルタリング機能の強化
- 画像アップロード機能の完全な統合 (R2 との連携)
