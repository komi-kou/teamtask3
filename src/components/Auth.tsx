import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Mail, Lock, User, Building } from 'lucide-react';
import './Auth.css';

const Auth: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(email, password);
      } else {
        success = await register(email, password, name, teamName);
      }

      if (!success) {
        setError(isLogin ? "ログインに失敗しました" : "登録に失敗しました");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-section">
            <Users size={32} className="logo-icon" />
            <h1>TeamHub</h1>
          </div>
          <h2>{isLogin ? "ログイン" : "新規登録"}</h2>
          <p className="auth-subtitle">
            {isLogin ? "アカウントにログインしてください" : "新しいアカウントを作成します"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">
                <User size={16} />
                名前
              </label>
              <input
                id="name"
                type="text"
                placeholder="山田太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} />
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} />
              パスワード
            </label>
            <input
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="teamName">
                <Building size={16} />
                チーム名（任意）
              </label>
              <input
                id="teamName"
                type="text"
                placeholder="営業チーム"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <small>チーム名を入力すると、新しいチームが作成されます</small>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="auth-button" 
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : (isLogin ? "ログイン" : "登録")}
          </button>

          <button
            type="button"
            className="switch-button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setEmail("");
              setPassword("");
              setName("");
              setTeamName("");
            }}
          >
            {isLogin ? "新規登録はこちら" : "ログインはこちら"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
