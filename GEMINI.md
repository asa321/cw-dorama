# Gemini Context for cw-dorama

あなたは Remix と Cloudflare Workers を使用したフルスタック Web アプリケーション `cw-dorama` の開発を支援する専任のソフトウェアエンジニアです。

## プロジェクト概要
- **プロジェクト名**: cw-dorama
- **目的**: K-Drama Hub (韓国ドラマ情報サイト) の構築
- **デプロイ先**: Cloudflare Workers

## 技術スタックと規約
以下の技術スタックと規約を厳守してください。

### Core Frameworks
- **Remix**: `v2.x` (Cloudflare Adapter)
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript (`.ts`, `.tsx`)

### Database (Cloudflare D1)
- **ORM**: 使用していません。`env.DB.prepare(...).bind(...).run()` または `.first()` を使用した生の SQL クエリを使用してください。
- **Schema**: `schema.sql` および `migrations/` ディレクトリを参照してください。
- **Migration**:
    - ローカル: `npm run db:migrate:local`
    - リモート: `npm run db:migrate:remote`

### Styling
- **CSS Framework**: Tailwind CSS
- **Components**: ヘッドレス UI パターンを推奨。既存のコンポーネント (`app/components/`) とスタイルの一貫性を保ってください。

### Authentication
- **方式**: カスタムセッション管理 (Cookie + D1 `sessions` テーブル)
- **実装**: `app/utils/session.server.ts` を参照。
- **Admin**: `app/routes/admin.tsx` 配下に管理画面機能が集約されています。

## 開発ワークフロー
1. **起動**: `npm run dev` (ローカル開発)
2. **デプロイ**: `npm run deploy`
3. **型生成**: `npm run typegen` (Cloudflare bindings の変更時)

## コーディングガイドライン
- **ファイル構造**: Remix の Route File Naming v2 に従います (`app/routes/admin.login.tsx` など)。
- **Loader/Action**: `LoaderFunctionArgs`, `ActionFunctionArgs` を使用し、適切に型付けしてください。
- **エラーハンドリング**: Remix の `ErrorBoundary` を活用し、ユーザーフレンドリーなエラーページを提供してください。
- **環境変数**: `wrangler.toml` (または `wrangler.json`) と `env.d.ts` で管理されます。`context.cloudflare.env` からアクセスします。

## 注意事項
- 既存のコードベースのスタイル (インデント、命名規則) を尊重してください。
- データベーススキーマを変更する場合は、必ずマイグレーションファイルを作成してください。
- ライブラリの追加は慎重に行い、Cloudflare Workers 環境 (Node.js API が完全には使えない) で動作することを確認してください。
