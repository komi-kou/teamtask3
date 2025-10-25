import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 5001;
const prisma = new PrismaClient();

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

// ルートパス（フロントエンド用）
app.get('/', (req, res) => {
  res.json({ 
    message: 'Team Management API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      tasks: '/api/tasks',
      projects: '/api/projects',
      leads: '/api/leads',
      team: '/api/team/*'
    },
    documentation: 'This is a backend API server. Please use the frontend application.'
  });
});

// ユーザー登録
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, teamName } = req.body;

    console.log('📝 登録リクエスト受信:', { email, name, teamName });

    // バリデーション
    if (!email || !password) {
      console.log('❌ バリデーションエラー: メールアドレスまたはパスワードが未入力');
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    // 既存ユーザーチェック
    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      console.log('❌ 既に登録されているメールアドレス:', normalizedEmail);
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // チームの作成または取得
    const finalTeamName = teamName || 'デフォルトチーム';
    let team = await prisma.team.findUnique({ where: { name: finalTeamName } });
    if (!team) {
      team = await prisma.team.create({ data: { name: finalTeamName } });
    }

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || email.split('@')[0],
        teamName: finalTeamName,
        role: 'user',
      }
    });

    console.log('✅ 新規ユーザー登録完了:', user.email);

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

    console.log('🔐 ログイン試行:', email);

    if (!email || !password) {
      console.log('❌ バリデーションエラー: メールアドレスまたはパスワードが未入力');
      return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' });
    }

    // ユーザー検索
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    console.log('🔍 検索結果:', user ? 'ユーザーが見つかりました' : 'ユーザーが見つかりませんでした');

    if (!user) {
      console.log('❌ ユーザーが見つかりません');
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証
    const isPasswordValid = await bcrypt.compare(password, user.password);

    console.log('🔑 パスワード検証結果:', isPasswordValid ? 'パスワードが正しい' : 'パスワードが間違っています');

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
app.get('/api/team/members', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.teamName) {
      return res.json([]);
    }

    const teamMembers = await prisma.user.findMany({
      where: { teamName: req.user.teamName },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamName: true,
        createdAt: true
      }
    });
    
    res.json(teamMembers);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'チームメンバーの取得に失敗しました' });
  }
});

// タスク関連API（チーム共有）
app.get('/api/tasks', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.teamName) {
      return res.json([]);
    }

    const tasks = await prisma.task.findMany({
      where: { 
        user: {
          teamName: req.user.teamName
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'タスクの取得に失敗しました' });
  }
});

app.post('/api/tasks', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const task = await prisma.task.create({
      data: {
        title: req.body.title,
        description: req.body.description || '',
        status: req.body.status || 'pending',
        priority: req.body.priority || 'medium',
        assignee: req.body.assignee || req.user?.name || 'Unknown',
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        userId: req.user!.id
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'タスクの作成に失敗しました' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'タスクの更新に失敗しました' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'タスクの削除に失敗しました' });
  }
});

// プロジェクト関連API（チーム共有）
app.get('/api/projects', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.teamName) {
      return res.json([]);
    }

    const projects = await prisma.project.findMany({
      where: { 
        user: {
          teamName: req.user.teamName
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'プロジェクトの取得に失敗しました' });
  }
});

app.post('/api/projects', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const project = await prisma.project.create({
      data: {
        name: req.body.name,
        description: req.body.description || '',
        client: req.body.client || '',
        status: req.body.status || 'planning',
        priority: req.body.priority || 'medium',
        progress: req.body.progress || 0,
        userId: req.user!.id
      }
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'プロジェクトの作成に失敗しました' });
  }
});

app.put('/api/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'プロジェクトの更新に失敗しました' });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'プロジェクトの削除に失敗しました' });
  }
});

// リード関連API（チーム共有）
app.get('/api/leads', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.teamName) {
      return res.json([]);
    }

    const leads = await prisma.lead.findMany({
      where: { 
        user: {
          teamName: req.user.teamName
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'リードの取得に失敗しました' });
  }
});

app.post('/api/leads', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const lead = await prisma.lead.create({
      data: {
        company: req.body.company,
        contact: req.body.contact,
        contactEmail: req.body.contactEmail || '',
        status: req.body.status || 'リード',
        value: req.body.value || 0,
        probability: req.body.probability || 0,
        userId: req.user!.id
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'リードの作成に失敗しました' });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'リードの更新に失敗しました' });
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.lead.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'リードの削除に失敗しました' });
  }
});

// エラーハンドリング
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// サーバー起動
const server = app.listen(PORT, () => {
  console.log(`🚀 APIサーバーがポート${PORT}で起動しました`);
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/api/health`);
  console.log(`🔐 認証エンドポイント: http://localhost:${PORT}/api/auth/`);
  console.log(`👥 チーム共有機能: 有効`);
  console.log(`💾 データベース: PostgreSQL (永続化)`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    console.log('Prisma client disconnected');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    console.log('Prisma client disconnected');
    process.exit(0);
  });
});
