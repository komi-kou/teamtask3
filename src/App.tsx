import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import Sales from './pages/Sales';
import Projects from './pages/Projects';
import SalesEmails from './pages/SalesEmails';
import ServiceMaterials from './pages/ServiceMaterials';
import { LogOut, User } from 'lucide-react';
import './App.css';

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo-section">
            <h1 className="logo">TeamHub</h1>
            <div className="user-info">
              <div className="user-details">
                <User size={16} />
                <span>{user.name}</span>
              </div>
              {user.teamName && (
                <div className="team-info">
                  <span>チーム: {user.teamName}</span>
                </div>
              )}
            </div>
          </div>
          <ul className="nav-menu">
            <li><Link to="/">📊 全体ダッシュボード</Link></li>
            <li><Link to="/sales">👥 顧客管理</Link></li>
            <li><Link to="/projects">📋 案件管理</Link></li>
            <li><Link to="/tasks">✅ タスク管理</Link></li>
            <li><Link to="/documents">📝 議事録・打ち合わせ</Link></li>
            <li><Link to="/sales-emails">📧 営業メール</Link></li>
            <li><Link to="/service-materials">📚 サービス資料</Link></li>
          </ul>
          <div className="logout-section">
            <button 
              className="logout-button"
              onClick={logout}
            >
              <LogOut size={16} />
              ログアウト
            </button>
          </div>
        </nav>
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/sales-emails" element={<SalesEmails />} />
            <Route path="/service-materials" element={<ServiceMaterials />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
