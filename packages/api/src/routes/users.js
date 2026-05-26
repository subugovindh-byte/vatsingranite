import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import config from '../config.js';

const router = Router();

// All user-management routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

const userRow = (u) => ({
  id: u.id,
  username: u.username,
  full_name: u.full_name,
  email: u.email ?? '',
  phone: u.phone ?? '',
  role: u.role_code ?? 'VIEWER',
  role_name: u.role_name ?? 'Viewer',
  active: u.active === 1 || u.active === true,
  last_login: u.last_login ?? null,
  created_at: u.created_at ?? null,
});

// GET /api/users
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.active,
             u.last_login, u.created_at,
             r.role_code, r.role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r       ON r.id = ur.role_id
      WHERE u.org_id = ?
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all(req.user.orgId);

    res.json({ users: rows.map(userRow) });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// POST /api/users — create user
router.post('/', (req, res) => {
  const { username, full_name, email, phone, role, password } = req.body;
  if (!username || !full_name) {
    return res.status(400).json({ error: 'Bad Request', message: 'username and full_name are required' });
  }

  try {
    const db = getDb();

    const tempPwd = password || Math.random().toString(36).slice(-10) + 'A1!';
    const hash = bcrypt.hashSync(tempPwd, config.bcryptRounds);

    const result = db.prepare(`
      INSERT INTO users (org_id, username, password_hash, full_name, email, phone, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(req.user.orgId, username.trim(), hash, full_name.trim(), email ?? null, phone ?? null);

    const userId = result.lastInsertRowid;

    if (role) {
      const roleRow = db.prepare(`SELECT id FROM roles WHERE role_code = ? AND org_id = ?`).get(role.toUpperCase(), req.user.orgId);
      if (roleRow) {
        db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, roleRow.id);
      }
    }

    const created = db.prepare(`
      SELECT u.*, r.role_code, r.role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
    `).get(userId);

    res.status(201).json({ user: userRow(created), tempPassword: password ? undefined : tempPwd });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Conflict', message: `Username "${req.body.username}" already exists` });
    }
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// PUT /api/users/:id — update user
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { full_name, email, phone, role } = req.body;

  try {
    const db = getDb();

    const existing = db.prepare(`SELECT id FROM users WHERE id = ? AND org_id = ?`).get(id, req.user.orgId);
    if (!existing) return res.status(404).json({ error: 'Not Found' });

    db.prepare(`
      UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?
    `).run(full_name ?? null, email ?? null, phone ?? null, id);

    if (role) {
      const roleRow = db.prepare(`SELECT id FROM roles WHERE role_code = ? AND org_id = ?`).get(role.toUpperCase(), req.user.orgId);
      if (roleRow) {
        db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(id);
        db.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(id, roleRow.id);
      }
    }

    const updated = db.prepare(`
      SELECT u.*, r.role_code, r.role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
    `).get(id);

    res.json({ user: userRow(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// PATCH /api/users/:id/status — activate / deactivate
router.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'Bad Request', message: 'active is required' });

  try {
    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE id = ? AND org_id = ?`).get(id, req.user.orgId);
    if (!existing) return res.status(404).json({ error: 'Not Found' });

    db.prepare(`UPDATE users SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
    res.json({ ok: true, active: !!active });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// PATCH /api/users/:id/password — reset password
router.patch('/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  try {
    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE id = ? AND org_id = ?`).get(id, req.user.orgId);
    if (!existing) return res.status(404).json({ error: 'Not Found' });

    const newPwd = password || Math.random().toString(36).slice(-10) + 'A1!';
    const hash = bcrypt.hashSync(newPwd, config.bcryptRounds);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, id);

    res.json({ ok: true, tempPassword: password ? undefined : newPwd });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Bad Request', message: 'Cannot delete your own account' });
  }
  try {
    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE id = ? AND org_id = ?`).get(id, req.user.orgId);
    if (!existing) return res.status(404).json({ error: 'Not Found' });

    db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

export default router;
