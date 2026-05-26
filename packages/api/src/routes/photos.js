import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne, execute } from '../db/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use /home/data/uploads on Azure (persistent), fall back to local uploads/
    const base = process.env.WEBSITE_SITE_NAME ? '/home/data' : path.join(__dirname, '../../..');
    const uploadDir = path.join(base, 'uploads/photos');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Upload quarry photo
router.post('/quarries/:id/photos', upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, zone, category } = req.body;
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify quarry exists and belongs to user's org
    const quarry = await queryOne(
      'SELECT id FROM quarries WHERE id = ? AND org_id = ?',
      [id, orgId]
    );

    if (!quarry) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Quarry not found' });
    }

    // Insert photo record
    const result = await execute(`
      INSERT INTO photos (
        entity_type, entity_id, org_id, quarry_id,
        file_name, file_path, file_size, mime_type,
        caption, category, zone, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'quarry',
      id,
      orgId,
      id,
      req.file.filename,
      `/uploads/photos/${req.file.filename}`,
      req.file.size,
      req.file.mimetype,
      caption || null,
      category || 'general',
      zone || null,
      userId
    ]);

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photoId: result.lastInsertRowid,
      fileName: req.file.filename,
      filePath: `/uploads/photos/${req.file.filename}`
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Upload block photo
router.post('/blocks/:id/photos', upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, category, view_angle } = req.body;
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify block exists and belongs to user's org
    const block = await queryOne(
      'SELECT id, quarry_id FROM blocks WHERE id = ? AND org_id = ?',
      [id, orgId]
    );

    if (!block) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Block not found' });
    }

    // Insert photo record
    const result = await execute(`
      INSERT INTO photos (
        entity_type, entity_id, org_id, quarry_id,
        file_name, file_path, file_size, mime_type,
        caption, category, metadata, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'block',
      id,
      orgId,
      block.quarry_id,
      req.file.filename,
      `/uploads/photos/${req.file.filename}`,
      req.file.size,
      req.file.mimetype,
      caption || null,
      category || 'general',
      JSON.stringify({ view_angle: view_angle || null }),
      userId
    ]);

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photoId: result.lastInsertRowid,
      fileName: req.file.filename,
      filePath: `/uploads/photos/${req.file.filename}`
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Get photos for quarry
router.get('/quarries/:id/photos', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { zone, category } = req.query;
    const orgId = req.user.orgId;

    let sql = `
      SELECT 
        p.*,
        u.full_name as uploaded_by_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.entity_type = 'quarry' 
        AND p.entity_id = ? 
        AND p.org_id = ?
    `;
    const params = [id, orgId];

    if (zone) {
      sql += ' AND p.zone = ?';
      params.push(zone);
    }
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY p.uploaded_at DESC';

    const photos = await query(sql, params);

    res.json({ photos });
  } catch (error) {
    next(error);
  }
});

// Get photos for block
router.get('/blocks/:id/photos', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.query;
    const orgId = req.user.orgId;

    let sql = `
      SELECT 
        p.*,
        u.full_name as uploaded_by_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.entity_type = 'block' 
        AND p.entity_id = ? 
        AND p.org_id = ?
    `;
    const params = [id, orgId];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY p.uploaded_at DESC';

    const photos = await query(sql, params);

    res.json({ photos });
  } catch (error) {
    next(error);
  }
});

// Delete photo
router.delete('/photos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    // Get photo record
    const photo = await queryOne(
      'SELECT * FROM photos WHERE id = ? AND org_id = ?',
      [id, orgId]
    );

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../../', photo.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await execute('DELETE FROM photos WHERE id = ?', [id]);

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Update photo metadata
router.patch('/photos/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { caption, category, zone } = req.body;
    const orgId = req.user.orgId;

    // Verify photo exists
    const photo = await queryOne(
      'SELECT id FROM photos WHERE id = ? AND org_id = ?',
      [id, orgId]
    );

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (caption !== undefined) {
      updates.push('caption = ?');
      params.push(caption);
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    if (zone !== undefined) {
      updates.push('zone = ?');
      params.push(zone);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await execute(
      `UPDATE photos SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Photo updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Upload multiple photos
router.post('/upload/batch', upload.array('photos', 10), async (req, res, next) => {
  try {
    const { entity_type, entity_id, category, zone } = req.body;
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!entity_type || !entity_id) {
      // Clean up uploaded files
      req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }

    // Verify entity exists
    let table = entity_type === 'quarry' ? 'quarries' : 'blocks';
    const entity = await queryOne(
      `SELECT id, ${entity_type === 'block' ? 'quarry_id' : 'id as quarry_id'} FROM ${table} WHERE id = ? AND org_id = ?`,
      [entity_id, orgId]
    );

    if (!entity) {
      req.files.forEach(file => fs.unlinkSync(file.path));
      return res.status(404).json({ error: `${entity_type} not found` });
    }

    // Insert all photos
    const photoIds = [];
    for (const file of req.files) {
      const result = await execute(`
        INSERT INTO photos (
          entity_type, entity_id, org_id, quarry_id,
          file_name, file_path, file_size, mime_type,
          category, zone, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entity_type,
        entity_id,
        orgId,
        entity.quarry_id,
        file.filename,
        `/uploads/photos/${file.filename}`,
        file.size,
        file.mimetype,
        category || 'general',
        zone || null,
        userId
      ]);
      photoIds.push(result.lastInsertRowid);
    }

    res.status(201).json({
      message: `${req.files.length} photos uploaded successfully`,
      photoIds,
      count: req.files.length
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => fs.unlinkSync(file.path));
    }
    next(error);
  }
});

export default router;