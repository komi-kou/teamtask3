import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5000;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// テスト用のダミーAPI
app.get('/api/test', (req, res) => {
  res.json({ message: 'APIサーバーが正常に動作しています', timestamp: new Date().toISOString() });
});

// エラーハンドリング
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 APIサーバーがポート${PORT}で起動しました`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/api/health`);
});
