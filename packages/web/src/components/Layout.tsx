import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import './Layout.css';

// Force cache refresh - Updated with conceptual icons 2026-05-23

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo"><span style={{ marginRight: '0.5rem' }}>🏔️</span>Vatsin Granite ERP</h1>
            <nav className="nav">
              <Link to="/" className="nav-link"><span style={{ marginRight: '0.25rem' }}>📊</span>Dashboard</Link>
              <Link to="/quarries" className="nav-link"><span style={{ marginRight: '0.25rem' }}>⛏️</span>Quarries</Link>
              <Link to="/blocks" className="nav-link"><span style={{ marginRight: '0.25rem' }}>🗿</span>Blocks</Link>
            </nav>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.fullName}</span>
              <span className="user-org">{user?.orgName}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              <span style={{ marginRight: '0.25rem' }}>🚪</span>Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <p>&copy; 2026 Vatsin Granite Quarry. All rights reserved.</p>
      </footer>
    </div>
  );
}
