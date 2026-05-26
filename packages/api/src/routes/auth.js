import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
import config from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }
    
    const db = getDb();

    // Accept either username or email in the username field
    const user = db.prepare(`
      SELECT u.*, o.org_code, o.org_name
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE (u.username = ? OR u.email = ?) AND u.active = 1
    `).get(username, username);
    
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }
    
    // Get user roles
    const roles = db.prepare(`
      SELECT r.role_code, r.role_name, ur.quarry_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(user.id);
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        orgId: user.org_id,
        orgCode: user.org_code,
        roles: roles.map(r => r.role_code)
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );
    
    // Update last login
    db.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE id = ?
    `).run(user.id);
    
    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        orgId: user.org_id,
        orgCode: user.org_code,
        orgName: user.org_name,
        roles: roles.map(r => ({
          code: r.role_code,
          name: r.role_name,
          quarryId: r.quarry_id
        }))
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req, res) => {
  try {
    const db = getDb();
    
    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.phone,
             u.org_id, o.org_code, o.org_name
      FROM users u
      JOIN organizations o ON u.org_id = o.id
      WHERE u.id = ? AND u.active = 1
    `).get(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // Get roles
    const roles = db.prepare(`
      SELECT r.role_code, r.role_name, ur.quarry_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).all(user.id);
    
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      orgId: user.org_id,
      orgCode: user.org_code,
      orgName: user.org_name,
      roles: roles.map(r => ({
        code: r.role_code,
        name: r.role_name,
        quarryId: r.quarry_id
      }))
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generates a short reset code stored in DB; admin shares it out-of-band.
 */
router.post('/forgot-password', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required' });

  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL
  )`);

  const user = db.prepare('SELECT id FROM users WHERE username = ? AND active = 1').get(username);
  if (user) {
    const { randomBytes } = await import('crypto');
    const token = randomBytes(3).toString('hex').toUpperCase(); // 6-char code
    const expires = new Date(Date.now() + 3_600_000).toISOString();
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
    db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)').run(token, user.id, expires);
    console.log(`[AUTH] Reset code for "${username}": ${token} (valid 1 hr)`);
  }

  // Always 200 — don't leak whether username exists
  res.json({ message: 'ok' });
});

/**
 * POST /api/auth/reset-password
 * Validates 6-char code and sets a new password.
 */
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL
  )`);

  const reset = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token.trim().toUpperCase());
  if (!reset || new Date(reset.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, reset.user_id);
  db.prepare('DELETE FROM password_resets WHERE token = ?').run(token.trim().toUpperCase());

  res.json({ message: 'Password updated successfully' });
});

/**
 * POST /api/auth/logout
 * User logout (client-side token deletion)
 */
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
