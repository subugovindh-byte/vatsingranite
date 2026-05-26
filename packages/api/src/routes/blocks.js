import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import QRCode from 'qrcode';

const router = Router();

/**
 * GET /api/blocks
 * Get all blocks with filters
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId,
      status,
      varietyId,
      grade,
      limit = 100,
      offset = 0
    } = req.query;
    
    let query = `
      SELECT 
        b.*, 
        v.variety_name, v.color,
        l.location_name as current_location_name,
        q.quarry_name
      FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      LEFT JOIN locations l ON b.current_location_id = l.id
      LEFT JOIN quarries q ON b.quarry_id = q.id
      WHERE b.org_id = ? AND b.active = 1
    `;
    
    const params = [req.user.orgId];
    
    if (quarryId) {
      query += ` AND b.quarry_id = ?`;
      params.push(quarryId);
    }
    
    if (status) {
      query += ` AND b.status = ?`;
      params.push(status);
    }
    
    if (varietyId) {
      query += ` AND b.variety_id = ?`;
      params.push(varietyId);
    }
    
    if (grade) {
      query += ` AND b.grade = ?`;
      params.push(grade);
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const blocks = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM blocks
      WHERE org_id = ? AND active = 1
    `;
    const countParams = [req.user.orgId];
    
    if (quarryId) {
      countQuery += ` AND quarry_id = ?`;
      countParams.push(quarryId);
    }
    
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    
    const { total } = db.prepare(countQuery).get(...countParams);
    
    res.json({
      blocks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + blocks.length < total
      }
    });
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch blocks'
    });
  }
});

/**
 * GET /api/blocks/varieties
 * Get all varieties for the organization
 */
router.get('/varieties', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId } = req.query;
    let query = `SELECT id, variety_code, variety_name, color, grade, default_price_per_cbm, quarry_id FROM varieties WHERE org_id = ? AND active = 1`;
    const params = [req.user.orgId];
    if (quarryId) { query += ` AND quarry_id = ?`; params.push(quarryId); }
    query += ` ORDER BY variety_name`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get varieties error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch varieties' });
  }
});

/**
 * GET /api/blocks/:id
 * Get block details
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    
    const block = db.prepare(`
      SELECT 
        b.*, 
        v.variety_name, v.color, v.default_price_per_cbm,
        l.location_name as current_location_name,
        el.location_name as extracted_from_location_name,
        q.quarry_name, q.quarry_code,
        be.blast_no, be.blast_date
      FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      LEFT JOIN locations l ON b.current_location_id = l.id
      LEFT JOIN locations el ON b.extracted_from_location_id = el.id
      LEFT JOIN quarries q ON b.quarry_id = q.id
      LEFT JOIN blast_events be ON b.blast_event_id = be.id
      WHERE b.id = ? AND b.org_id = ? AND b.active = 1
    `).get(req.params.id, req.user.orgId);
    
    if (!block) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Block not found'
      });
    }
    
    res.json(block);
  } catch (error) {
    console.error('Get block error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch block'
    });
  }
});

/**
 * POST /api/blocks
 * Create new block
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId,
      varietyId,
      grade,
      color,
      extractionDate,
      extractedFromLocationId,
      blastEventId,
      lengthMm,
      widthMm,
      heightMm,
      currentLocationId
    } = req.body;
    
    // Validate required fields
    if (!quarryId || !varietyId || !lengthMm || !widthMm || !heightMm) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields'
      });
    }
    
    // Calculate CBM
    const grossCbm = (lengthMm * widthMm * heightMm) / 1000000000;
    const netCbm = grossCbm * 0.95; // 5% wastage factor
    
    // Generate block number
    const quarry = db.prepare(`SELECT quarry_code FROM quarries WHERE id = ?`).get(quarryId);
    const year = new Date().getFullYear();
    const sequence = db.prepare(`
      SELECT COUNT(*) + 1 as next_seq
      FROM blocks
      WHERE quarry_id = ? AND strftime('%Y', created_at) = ?
    `).get(quarryId, year.toString()).next_seq;
    
    const blockNo = `${quarry.quarry_code}/${year}/${String(sequence).padStart(5, '0')}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(blockNo);
    
    // Insert block
    const result = db.prepare(`
      INSERT INTO blocks (
        org_id, quarry_id, block_no, variety_id, grade, color,
        extraction_date, extracted_from_location_id, blast_event_id,
        length_mm, width_mm, height_mm, gross_cbm, net_cbm,
        current_location_id, qr_code, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
    `).run(
      req.user.orgId,
      quarryId,
      blockNo,
      varietyId,
      grade,
      color,
      extractionDate || new Date().toISOString().split('T')[0],
      extractedFromLocationId,
      blastEventId,
      lengthMm,
      widthMm,
      heightMm,
      grossCbm,
      netCbm,
      currentLocationId,
      qrCode
    );
    
    // Fetch the created block
    const newBlock = db.prepare(`
      SELECT b.*, v.variety_name, q.quarry_name
      FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      LEFT JOIN quarries q ON b.quarry_id = q.id
      WHERE b.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newBlock);
  } catch (error) {
    console.error('Create block error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create block'
    });
  }
});

/**
 * PATCH /api/blocks/:id/status
 * Update block status
 */
router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status is required'
      });
    }
    
    // Verify block exists
    const block = db.prepare(`
      SELECT id FROM blocks WHERE id = ? AND org_id = ? AND active = 1
    `).get(req.params.id, req.user.orgId);
    
    if (!block) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Block not found'
      });
    }
    
    // Update status
    db.prepare(`
      UPDATE blocks SET status = ? WHERE id = ?
    `).run(status, req.params.id);
    
    res.json({ message: 'Block status updated', status });
  } catch (error) {
    console.error('Update block status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update block status'
    });
  }
});

export default router;
