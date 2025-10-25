# Team Management Tool

## 概要
チーム管理ツールは、タスク管理、プロジェクト管理、顧客管理、営業メール管理、サービス資料管理などの機能を提供するWebアプリケーションです。

## 機能
- 📊 全体ダッシュボード
- 👥 顧客管理
- 📋 案件管理
- ✅ タスク管理
- 📝 議事録・打ち合わせ
- 📧 営業メール
- 📚 サービス資料

## 技術スタック
- **フロントエンド**: React 18, TypeScript, React Router DOM
- **バックエンド**: Express.js, Node.js
- **データベース**: PostgreSQL
- **認証**: JWT認証
- **ORM**: Prisma

## セットアップ

### 必要な環境
- Node.js 18以上
- PostgreSQL 15以上
- npm

### インストール
```bash
npm install
```

### 環境変数の設定
`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/teammanagement?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### データベースのセットアップ
```bash
# データベースの作成
createdb teammanagement

# Prismaスキーマの適用
npx prisma db push

# Prismaクライアントの生成
npx prisma generate
```

### 開発サーバーの起動
```bash
# Reactアプリケーションの起動
npm start

# APIサーバーの起動（別ターミナル）
npm run server
```

## デプロイ

### Renderでのデプロイ
1. GitHubリポジトリにプッシュ
2. Renderで新しいWebサービスを作成
3. 環境変数を設定
4. デプロイを実行

### 環境変数（本番環境）
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...`
- `NEXTAUTH_SECRET=...`
- `NEXTAUTH_URL=https://your-domain.com`

## ライセンス
MIT License