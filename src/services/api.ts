import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://your-api-domain.com'
  : 'http://localhost:5001';

// Axiosインスタンスの作成
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（トークンを自動追加）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング）
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラーの場合、ローカルストレージをクリアしてログイン画面にリダイレクト
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// 認証API
export const authAPI = {
  register: async (userData: { email: string; password: string; name?: string; teamName?: string }) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },
};

// タスクAPI
export const taskAPI = {
  getTasks: async () => {
    const response = await api.get('/api/tasks');
    return response.data;
  },

  createTask: async (taskData: any) => {
    const response = await api.post('/api/tasks', taskData);
    return response.data;
  },

  updateTask: async (id: string, taskData: any) => {
    const response = await api.put(`/api/tasks/${id}`, taskData);
    return response.data;
  },

  deleteTask: async (id: string) => {
    const response = await api.delete(`/api/tasks/${id}`);
    return response.data;
  },
};

// プロジェクトAPI
export const projectAPI = {
  getProjects: async () => {
    const response = await api.get('/api/projects');
    return response.data;
  },

  createProject: async (projectData: any) => {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  },

  updateProject: async (id: string, projectData: any) => {
    const response = await api.put(`/api/projects/${id}`, projectData);
    return response.data;
  },

  deleteProject: async (id: string) => {
    const response = await api.delete(`/api/projects/${id}`);
    return response.data;
  },
};

// リードAPI
export const leadAPI = {
  getLeads: async () => {
    const response = await api.get('/api/leads');
    return response.data;
  },

  createLead: async (leadData: any) => {
    const response = await api.post('/api/leads', leadData);
    return response.data;
  },

  updateLead: async (id: string, leadData: any) => {
    const response = await api.put(`/api/leads/${id}`, leadData);
    return response.data;
  },

  deleteLead: async (id: string) => {
    const response = await api.delete(`/api/leads/${id}`);
    return response.data;
  },
};

// ヘルスチェック
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;