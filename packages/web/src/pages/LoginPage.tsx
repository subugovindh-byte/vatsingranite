import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useToastStore } from '../store';
import { apiClient } from '../utils/api';

type View = 'login' | 'forgot' | 'reset';

export default function LoginPage() {
  const [view, setView] = useState<View>('login');

  /* login */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /* forgot */
  const [forgotUser, setForgotUser] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  /* reset */
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login } = useAuthStore();
  const { notify } = useToastStore();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) { notify('Enter username and password', 'error'); return; }
    setLoading(true);
    try {
      const data = await apiClient.login(username, password);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      notify(err?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotUser.trim()) { notify('Enter your username', 'error'); return; }
    setForgotLoading(true);
    try {
      await apiClient.forgotPassword(forgotUser.trim());
      setForgotSent(true);
    } catch {
      setForgotSent(true); // show same message regardless
    } finally {
      setForgotLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) { notify('Enter the reset code', 'error'); return; }
    if (newPass.length < 8) { notify('Password must be at least 8 characters', 'error'); return; }
    if (newPass !== confirmPass) { notify('Passwords do not match', 'error'); return; }
    setResetLoading(true);
    try {
      await apiClient.resetPassword(resetToken.trim(), newPass);
      notify('Password updated — please sign in', 'success');
      setView('login');
      setResetToken(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      notify(err?.message || 'Invalid or expired reset code', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: 6 }}>
      <div style={{ fontSize: 28, marginBottom: 4, color: 'var(--rust)' }}>⛏</div>
      <div className="login-logo">AB GRANITE ERP</div>
      <div className="login-sub">Integrated Quarry Management Platform</div>
      <div className="login-tagline">Chendrapalli · Krishnagiri · Tamil Nadu</div>
    </div>
  );

  return (
    <div className="login-wrap">
      <div className="login-box">
        <Header />
        <div style={{ height: 1, background: 'var(--bd)', margin: '18px 0' }} />

        {/* ── Login ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="fg">
              <label className="fl">Username or Email</label>
              <input className="fi" type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username or email" autoComplete="username" autoFocus />
            </div>
            <div className="fg">
              <label className="fl">Password</label>
              <input className="fi" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-p"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="link-btn" onClick={() => { setView('forgot'); setForgotSent(false); setForgotUser(''); }}>
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* ── Forgot password ── */}
        {view === 'forgot' && (
          forgotSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📬</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Reset code generated</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
                Your administrator has been notified. Ask them for your 6-character reset code, then use it below to set a new password.
              </div>
              <button className="btn btn-p" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
                onClick={() => setView('reset')}>
                I have a reset code
              </button>
              <button type="button" className="link-btn" onClick={() => setView('login')}>Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleForgot}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Forgot password</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.6 }}>
                Enter your username. A reset code will be generated — your administrator will share it with you.
              </div>
              <div className="fg">
                <label className="fl">Username</label>
                <input className="fi" type="text" value={forgotUser} onChange={e => setForgotUser(e.target.value)}
                  placeholder="Enter your username" autoFocus />
              </div>
              <button type="submit" className="btn btn-p"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={forgotLoading}>
                {forgotLoading ? 'Sending…' : 'Request reset code'}
              </button>
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button type="button" className="link-btn" onClick={() => setView('login')}>Back to sign in</button>
              </div>
            </form>
          )
        )}

        {/* ── Reset password ── */}
        {view === 'reset' && (
          <form onSubmit={handleReset}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>Set new password</div>
            <div className="fg">
              <label className="fl">Reset code</label>
              <input className="fi" type="text" value={resetToken} onChange={e => setResetToken(e.target.value)}
                placeholder="6-character code from admin" autoComplete="off" autoFocus
                style={{ textTransform: 'uppercase', letterSpacing: 3, fontFamily: 'IBM Plex Mono, monospace' }} />
            </div>
            <div className="fg">
              <label className="fl">New password</label>
              <input className="fi" type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="Min 8 characters" autoComplete="new-password" />
            </div>
            <div className="fg">
              <label className="fl">Confirm password</label>
              <input className="fi" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repeat new password" autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-p"
              style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={resetLoading}>
              {resetLoading ? 'Updating…' : 'Update password'}
            </button>
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button type="button" className="link-btn" onClick={() => setView('login')}>Back to sign in</button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontSize: 7.5, color: 'var(--t3)', letterSpacing: 1 }}>
          HSN 2516 · TNMMCR · DGMS · IBM Compliance
        </div>
      </div>
    </div>
  );
}
