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

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  teamName?: string;
  role: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee: string;
  dueDate: string;
  teamName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  client: string;
  status: string;
  priority: string;
  progress: number;
  teamName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  company: string;
  contact: string;
  contactEmail?: string;
  status: string;
  value: number;
  probability: number;
  teamName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// データストレージ（実際のプロダクションではデータベースを使用）
let users: User[] = [];
let tasks: Task[] = [];
let projects: Project[] = [];
let leads: Lead[] = [];

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

// チームメンバー取得
app.get('/api/team/members', authenticateToken, (req: AuthenticatedRequest, res) => {
  const teamMembers = users
    .filter(user => user.teamName === req.user?.teamName)
    .map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamName: user.teamName,
      createdAt: user.createdAt
    }));
  
  res.json(teamMembers);
});

// タスク関連API（チーム共有）
app.get('/api/tasks', authenticateToken, (req: AuthenticatedRequest, res) => {
  const teamTasks = tasks.filter(task => task.teamName === req.user?.teamName);
  res.json(teamTasks);
});

app.post('/api/tasks', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const task: Task = {
      id: Date.now().toString(),
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status || 'pending',
      priority: req.body.priority || 'medium',
      assignee: req.body.assignee || req.user?.name || 'Unknown',
      dueDate: req.body.dueDate || new Date().toISOString(),
      teamName: req.user?.teamName || 'Unknown',
      createdBy: req.user?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'タスクの作成に失敗しました' });
  }
});

app.put('/api/tasks/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const taskIndex = tasks.findIndex(task => 
      task.id === req.params.id && task.teamName === req.user?.teamName
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    res.json(tasks[taskIndex]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'タスクの更新に失敗しました' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const taskIndex = tasks.findIndex(task => 
      task.id === req.params.id && task.teamName === req.user?.teamName
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    tasks.splice(taskIndex, 1);
    res.json({ message: 'タスクが削除されました' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'タスクの削除に失敗しました' });
  }
});

// プロジェクト関連API（チーム共有）
app.get('/api/projects', authenticateToken, (req: AuthenticatedRequest, res) => {
  const teamProjects = projects.filter(project => project.teamName === req.user?.teamName);
  res.json(teamProjects);
});

app.post('/api/projects', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const project: Project = {
      id: Date.now().toString(),
      name: req.body.name,
      description: req.body.description || '',
      client: req.body.client || '',
      status: req.body.status || 'planning',
      priority: req.body.priority || 'medium',
      progress: req.body.progress || 0,
      teamName: req.user?.teamName || 'Unknown',
      createdBy: req.user?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects.push(project);
    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
  }
});

// リード関連API（チーム共有）
app.get('/api/leads', authenticateToken, (req: AuthenticatedRequest, res) => {
  const teamLeads = leads.filter(lead => lead.teamName === req.user?.teamName);
  res.json(teamLeads);
});

app.post('/api/leads', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const lead: Lead = {
      id: Date.now().toString(),
      company: req.body.company,
      contact: req.body.contact,
      contactEmail: req.body.contactEmail || '',
      status: req.body.status || 'リード',
      value: req.body.value || 0,
      probability: req.body.probability || 50,
      teamName: req.user?.teamName || 'Unknown',
      createdBy: req.user?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leads.push(lead);
    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'リードの作成に失敗しました' });
  }
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
  console.log(`👥 チーム共有機能: 有効`);
});
