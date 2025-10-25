import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5001;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 型定義
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    teamName?: string;
  };
}

// 簡易的なユーザーストレージ（実際のプロダクションではデータベースを使用）
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  teamName?: string;
  role: string;
  createdAt: string;
}

let users: User[] = [];

// JWT認証ミドルウェア
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'アクセストークンが必要です' });
  }

  jwt.verify(token, process.env.NEXTAUTH_SECRET || 'fallback-secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
};

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ユーザー登録
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, teamName } = req.body;

    // バリデーション
    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    // 既存ユーザーチェック
    const existingUser = users.find(user => user.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // ユーザー作成
    const user: User = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      teamName: teamName || 'デフォルトチーム',
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // JWTトークン生成
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        teamName: user.teamName
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: '登録が完了しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamName: user.teamName
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '登録処理中にエラーが発生しました' });
  }
});

// ユーザーログイン
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    // ユーザー検索
    const user = users.find(u => u.email === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // JWTトークン生成
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        teamName: user.teamName
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    res.json({
      message: 'ログインに成功しました',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamName: user.teamName
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'ログイン処理中にエラーが発生しました' });
  }
});

// ユーザー情報取得
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user
  });
});

// タスク関連API（ダミーデータ）
app.get('/api/tasks', authenticateToken, (req: AuthenticatedRequest, res) => {
  const dummyTasks = [
    {
      id: '1',
      title: 'サンプルタスク1',
      description: 'これはサンプルタスクです',
      status: 'pending',
      priority: 'medium',
      assignee: req.user?.name || 'Unknown',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'サンプルタスク2',
      description: 'これもサンプルタスクです',
      status: 'completed',
      priority: 'high',
      assignee: req.user?.name || 'Unknown',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  res.json(dummyTasks);
});

// プロジェクト関連API（ダミーデータ）
app.get('/api/projects', authenticateToken, (req: AuthenticatedRequest, res) => {
  const dummyProjects = [
    {
      id: '1',
      name: 'サンプルプロジェクト1',
      description: 'これはサンプルプロジェクトです',
      client: 'サンプルクライアント',
      status: 'in-progress',
      priority: 'high',
      progress: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  res.json(dummyProjects);
});

// リード関連API（ダミーデータ）
app.get('/api/leads', authenticateToken, (req: AuthenticatedRequest, res) => {
  const dummyLeads = [
    {
      id: '1',
      company: 'サンプル会社',
      contact: '田中太郎',
      contactEmail: 'tanaka@sample.com',
      status: 'リード',
      value: 100000,
      probability: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  res.json(dummyLeads);
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 APIサーバーがポート${PORT}で起動しました`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/api/health`);
  console.log(`🔐 認証エンドポイント: http://localhost:${PORT}/api/auth/`);
});
