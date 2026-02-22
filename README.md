# cw-dorama

Remix + Cloudflare Workers で動くアプリです。

## 前提条件

- Node.js 20 以上
- npm
- Cloudflare アカウント

初回のみ Cloudflare にログインします。

```sh
npx wrangler login
```

依存関係をインストールします。

```sh
npm install
```

## デバッグの開始方法

### 1. 開発サーバーでデバッグする

もっとも速く確認する方法です。

```sh
npm run dev
```

起動後、表示されたローカル URL（通常は `http://localhost:5173`）にアクセスしてください。

### 2. Workers 実行環境に近い状態でデバッグする

Cloudflare Workers に近い挙動で確認したい場合はこちらを使います。

```sh
npm run preview
```

`preview` は `npm run build` のあとに `wrangler dev` を実行します。

## Deploy して実行する方法

1. アプリをデプロイする

```sh
npm run deploy
```

2. デプロイ完了後、ターミナルに表示される `workers.dev` の URL にアクセスする

例:

```txt
https://cw-dorama.toroo.workers.dev
```

同じコマンドを再実行すると最新版に更新デプロイされます。

## DB マイグレーション（schema.sql）

`schema.sql` と同内容の初期マイグレーションを `migrations/0001_init.sql` として追加しています。

### ローカル DB へ適用

```sh
npm run db:migrate:local
```

### Cloudflare のリモート DB へ適用

```sh
npm run db:migrate:remote
```

### スキーマ変更時の運用

1. `schema.sql` を更新する
2. 新しい番号で `migrations/` に SQL を追加する（例: `migrations/0002_add_xxx.sql`）
3. `npm run db:migrate:local` で確認する
4. 問題なければ `npm run db:migrate:remote` を実行する

既存のマイグレーションファイルは、適用後は書き換えない運用を推奨します。

## 補足

- 型定義を再生成する場合:

```sh
npm run typegen
```

- `wrangler.json` の binding を変更した場合は、`npm run typegen` を再実行してください。
