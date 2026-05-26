import { useState, useEffect } from 'react';
import { useToastStore, useAuthStore } from '../store';
import { apiClient } from '../utils/api';

// Map DB role_code → display
const ROLE_CODES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'ACCOUNTANT', 'SALES', 'VIEWER'];
const roleLabels: Record<string, { label: string; color: string }> = {
  ADMIN:      { label: 'Admin',      color: 'b-r' },
  MANAGER:    { label: 'Manager',    color: 'b-b' },
  SUPERVISOR: { label: 'Supervisor', color: 'b-b' },
  ACCOUNTANT: { label: 'Accounts',   color: 'b-g' },
  SALES:      { label: 'Sales',      color: 'b-s' },
  VIEWER:     { label: 'View Only',  color: 'b-d' },
};


export default function UsersPage() {
  const { notify } = useToastStore();
  const [showModal, setShowModal] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backups, setBackups] = useState<{ name: string; sizeBytes: number; createdAt: string }[]>([]);

  const loadBackups = async () => {
    try { const r = await apiClient.adminBackupList(); setBackups(r.backups); } catch { /* ignore */ }
  };

  const doLocalBackup = async () => {
    setBackupBusy(true);
    try {
      const r = await apiClient.adminBackupLocal();
      notify(`Local backup: ${r.file} (${Math.round(r.sizeBytes / 1024)} KB)`, 'success');
      loadBackups();
    } catch { notify('Local backup failed', 'error'); }
    finally { setBackupBusy(false); }
  };

  const doBlobBackup = async () => {
    setBackupBusy(true);
    try {
      const r = await apiClient.adminBackupBlob();
      notify(`Uploaded: ${r.container}/${r.blob}`, 'success');
    } catch (e: any) {
      notify(e?.message?.includes('AZURE_STORAGE') ? 'Azure connection string not configured on server' : 'Blob upload failed', 'error');
    }
    finally { setBackupBusy(false); }
  };

  const doRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Restore database from "${file.name}"?\n\nThe current database will be replaced. A pre-restore safeguard copy is kept on the server.`)) {
      e.target.value = '';
      return;
    }
    setBackupBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    apiClient.adminRestore(fd)
      .then(r => notify(`Restored: ${r.message} (${r.sizeKb} KB)`, 'success'))
      .catch((err: any) => notify(`Restore failed: ${err?.message || 'unknown error'}`, 'error'))
      .finally(() => { setBackupBusy(false); e.target.value = ''; });
  };

  const doDownload = () => {
    const token = useAuthStore.getState().token ?? '';
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    const url = `${apiBase}/admin/backup/download`;
    setBackupBusy(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vatsingranite-${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        notify('Download complete', 'success');
      })
      .catch(() => notify('Download failed', 'error'))
      .finally(() => setBackupBusy(false));
  };

  const adminAction = async (action: 'purge' | 'reseed' | 'factory-reset', label: string) => {
    if (!confirm(`${label}?\n\nThis cannot be undone.`)) return;
    setAdminBusy(true);
    try {
      if (action === 'purge') await apiClient.adminPurge();
      else if (action === 'reseed') await apiClient.adminReseed();
      else await apiClient.adminFactoryReset();
      notify(`${label} complete`, 'success');
    } catch {
      notify(`${label} failed`, 'error');
    } finally {
      setAdminBusy(false);
    }
  };
  const BLANK_USER = { username: '', full_name: '', email: '', phone: '', role: 'VIEWER', password: '' };
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(BLANK_USER);
  const [users, setUsers] = useState<any[]>([]);
  const [userBusy, setUserBusy] = useState(false);

  const loadUsers = () => apiClient.getUsers().then(r => setUsers(r.users)).catch(() => {});

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => { setForm({ ...BLANK_USER }); setEditId(null); setShowModal(true); };
  const openEdit = (u: any) => { setForm({ username: u.username, full_name: u.full_name, email: u.email ?? '', phone: u.phone ?? '', role: u.role ?? 'VIEWER', password: '' }); setEditId(u.id); setShowModal(true); };

  const handleSave = async () => {
    if (!form.full_name.trim()) { notify('Full name is required', 'error'); return; }
    if (editId === null && !form.username.trim()) { notify('Username is required', 'error'); return; }
    setUserBusy(true);
    try {
      if (editId !== null) {
        await apiClient.updateUser(editId, { full_name: form.full_name, email: form.email, phone: form.phone, role: form.role });
        notify('User updated', 'success');
      } else {
        const r = await apiClient.createUser({ username: form.username, full_name: form.full_name, email: form.email, phone: form.phone, role: form.role, password: form.password || undefined });
        notify(r.tempPassword ? `User created — temp password: ${r.tempPassword}` : 'User created', 'success');
      }
      setShowModal(false);
      loadUsers();
    } catch (e: any) {
      notify(e?.message || 'Save failed', 'error');
    } finally {
      setUserBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try { await apiClient.deleteUser(id); notify('User deleted'); loadUsers(); }
    catch (e: any) { notify(e?.message || 'Delete failed', 'error'); }
  };

  const handleResetPwd = async (u: any) => {
    if (!confirm(`Reset password for ${u.username}?`)) return;
    try {
      const r = await apiClient.resetUserPassword(u.id);
      notify(`New password: ${r.tempPassword}`, 'success');
    } catch { notify('Reset failed', 'error'); }
  };

  const handleToggleStatus = async (id: number, active: boolean) => {
    try {
      await apiClient.setUserStatus(id, !active);
      notify(active ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch { notify('Status update failed', 'error'); }
  };

  const f = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">User Management</div>
          <div className="ph-sub">M29 — Role-based access · Multi-quarry users · Audit log · JWT sessions</div>
        </div>
        <button className="btn btn-p" onClick={openAdd}>+ Add User</button>
      </div>

      <div className="sc-grid">
        <div className="sc g"><div className="sc-lbl">Total Users</div><div className="sc-val">{users.length}</div><div className="sc-sub">All accounts</div></div>
        <div className="sc s"><div className="sc-lbl">Active</div><div className="sc-val">{users.filter(u => u.active).length}</div><div className="sc-sub">Can log in</div></div>
        <div className="sc b"><div className="sc-lbl">Admins</div><div className="sc-val">{users.filter(u => u.role === 'ADMIN').length}</div><div className="sc-sub">Full access</div></div>
        <div className="sc a"><div className="sc-lbl">Other Roles</div><div className="sc-val">{users.filter(u => u.role !== 'ADMIN').length}</div><div className="sc-sub">Scoped access</div></div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">User List — {users.length} users</div></div>
        <div className="tw">
          <table className="dt">
            <thead>
              <tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--t3)', padding: 20 }}>No users yet — click + Add User</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td className="tdm">{u.username}</td>
                  <td className="tdc">{u.full_name}</td>
                  <td className="tdm" style={{ fontSize: 10 }}>{u.email || <span style={{ color: 'var(--t3)' }}>—</span>}</td>
                  <td><span className={`bdg ${roleLabels[u.role]?.color ?? 'b-d'}`}>{roleLabels[u.role]?.label ?? u.role}</span></td>
                  <td className="tdm" style={{ fontSize: 9 }}>{u.last_login ? u.last_login.slice(0, 16) : '—'}</td>
                  <td>
                    <span
                      className={`bdg ${u.active ? 'b-s' : 'b-d'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(u.id, u.active)}
                      title="Click to toggle"
                    >{u.active ? 'active' : 'inactive'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-xs btn-s" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-xs btn-s" onClick={() => handleResetPwd(u)}>Reset PWD</button>
                      <button className="btn btn-xs btn-s" style={{ color: 'var(--red)' }} onClick={() => handleDelete(u.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div className="card-title">Backup</div>
          <button className="btn btn-xs btn-s" onClick={loadBackups}>Refresh list</button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--bd)' }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6 }}>Local Backup</div>
              <div style={{ fontSize: 9.5, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
                Creates a timestamped copy of the database in the server's <code>./backups/</code> folder.
              </div>
              <button className="btn btn-p" style={{ width: '100%' }} disabled={backupBusy} onClick={doLocalBackup}>
                {backupBusy ? 'Working…' : 'Create Local Backup'}
              </button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--bd)' }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6 }}>Azure Blob Storage</div>
              <div style={{ fontSize: 9.5, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
                Uploads DB snapshot to Azure Blob Storage. Requires <code>AZURE_STORAGE_CONNECTION_STRING</code> set on the server.
              </div>
              <button className="btn btn-p" style={{ width: '100%' }} disabled={backupBusy} onClick={doBlobBackup}>
                {backupBusy ? 'Uploading…' : 'Backup to Blob'}
              </button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--bd)' }}>
              <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6 }}>Download DB</div>
              <div style={{ fontSize: 9.5, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
                Downloads the live database file directly to your browser as a <code>.db</code> file.
              </div>
              <button className="btn btn-p" style={{ width: '100%' }} disabled={backupBusy} onClick={doDownload}>
                {backupBusy ? 'Downloading…' : 'Download to Browser'}
              </button>
            </div>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, border: '1px solid var(--bd)', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 6 }}>Restore from Backup</div>
            <div style={{ fontSize: 9.5, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.6 }}>
              Upload a <code>.db</code> file (downloaded earlier or from the backups folder) to replace the live database. A safeguard copy of the current DB is saved on the server before the swap.
            </div>
            <label style={{ cursor: backupBusy ? 'not-allowed' : 'pointer' }}>
              <input type="file" accept=".db" style={{ display: 'none' }} disabled={backupBusy} onChange={doRestore} />
              <span className="btn btn-p" style={{ display: 'inline-block', pointerEvents: backupBusy ? 'none' : 'auto', opacity: backupBusy ? 0.5 : 1 }}>
                {backupBusy ? 'Restoring…' : 'Choose .db file to Restore'}
              </span>
            </label>
          </div>

          {backups.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6, color: 'var(--t2)' }}>Local backup files</div>
              <div className="tw"><table className="dt" style={{ fontSize: 9.5 }}>
                <thead><tr><th>File</th><th>Size</th><th>Created</th></tr></thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.name}>
                      <td className="tdm">{b.name}</td>
                      <td>{Math.round(b.sizeBytes / 1024)} KB</td>
                      <td className="tdm">{b.createdAt.slice(0, 19).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><div className="card-title">Data Management</div></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--bd)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Reset to Sample Data</div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
                Wipes all data and loads demo quarries, customers, employees, and sample transactions. Use only for testing — not for production.
              </div>
              <button
                className="btn btn-p"
                style={{ width: '100%' }}
                disabled={adminBusy}
                onClick={() => adminAction('reseed', 'Reset to sample data')}
              >
                {adminBusy ? 'Working…' : 'Reset to Sample Data'}
              </button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--red, #d33)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'var(--red, #d33)' }}>Purge All Data</div>
              <div style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.6 }}>
                Deletes everything — quarries, customers, employees, blocks, invoices, production, etc. User accounts are retained. Use this before going live.
              </div>
              <button
                className="btn"
                style={{ width: '100%', background: 'var(--red, #d33)', color: '#fff', border: 'none', marginBottom: 8 }}
                disabled={adminBusy}
                onClick={() => adminAction('purge', 'Purge ALL data (quarries, customers, employees, transactions — user accounts kept)')}
              >
                {adminBusy ? 'Working…' : 'Purge All Data'}
              </button>
              <button
                className="btn"
                style={{ width: '100%', background: '#7a1a1a', color: '#fff', border: 'none', fontSize: 10 }}
                disabled={adminBusy}
                onClick={() => adminAction('factory-reset', 'Factory reset — wipe ALL data, leaves blank slate (admin user only)')}
              >
                {adminBusy ? 'Working…' : 'Factory Reset (wipe everything)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 440 }}>
            <div className="modal-head">
              <div className="modal-title">{editId !== null ? 'Edit User' : 'Add New User'}</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {editId === null && (
                <div className="fg">
                  <label className="fl">Username * <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(used to log in)</span></label>
                  <input className="fi" value={form.username} onChange={f('username')} placeholder="e.g. rajendran.k" autoComplete="off" />
                </div>
              )}
              <div className="fg">
                <label className="fl">Full Name *</label>
                <input className="fi" value={form.full_name} onChange={f('full_name')} placeholder="e.g. Rajendran K" />
              </div>
              <div className="fg">
                <label className="fl">Email <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(also usable as login)</span></label>
                <input className="fi" type="email" value={form.email} onChange={f('email')} placeholder="user@vatsingranite.in" />
              </div>
              <div className="fg">
                <label className="fl">Phone</label>
                <input className="fi" type="tel" value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">Role</label>
                  <select className="fsel" value={form.role} onChange={f('role')}>
                    {ROLE_CODES.map(r => <option key={r} value={r}>{roleLabels[r]?.label ?? r}</option>)}
                  </select>
                </div>
                {editId === null && (
                <div className="fg">
                  <label className="fl">Password <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(blank = auto-generate)</span></label>
                  <input className="fi" type="password" value={form.password} onChange={f('password')} placeholder="leave blank to auto-generate"
                    // dummy placeholder below to suppress auto-fill
                    autoComplete="new-password"
                  />
                </div>
                )}
              </div>
              {editId === null && (
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                  If password is left blank, a one-time password will be generated and shown after creation.
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-p" disabled={userBusy} onClick={handleSave}>
                {userBusy ? 'Saving…' : editId !== null ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
