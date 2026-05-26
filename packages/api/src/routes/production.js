import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/production
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, from, to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT pl.*,
        q.quarry_name, q.quarry_code,
        l.location_name,
        e1.emp_name as in_charge_name,
        e2.emp_name as surveyor_name
      FROM production_logs pl
      LEFT JOIN quarries q ON pl.quarry_id = q.id
      LEFT JOIN locations l ON pl.location_id = l.id
      LEFT JOIN employees e1 ON pl.in_charge_emp_id = e1.id
      LEFT JOIN employees e2 ON pl.surveyor_emp_id = e2.id
      WHERE pl.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND pl.quarry_id = ?`; params.push(quarryId); }
    if (from) { query += ` AND pl.production_date >= ?`; params.push(from); }
    if (to) { query += ` AND pl.production_date <= ?`; params.push(to); }

    query += ` ORDER BY pl.production_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);

    let sumQuery = `SELECT COALESCE(SUM(gross_cbm),0) as total_gross_cbm, COALESCE(SUM(net_cbm),0) as total_net_cbm, COALESCE(SUM(blocks_produced),0) as total_blocks FROM production_logs WHERE org_id = ?`;
    const sumParams = [req.user.orgId];
    if (quarryId) { sumQuery += ` AND quarry_id = ?`; sumParams.push(quarryId); }
    if (from) { sumQuery += ` AND production_date >= ?`; sumParams.push(from); }
    if (to) { sumQuery += ` AND production_date <= ?`; sumParams.push(to); }

    const summary = db.prepare(sumQuery).get(...sumParams);
    res.json({ logs, summary, pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get production logs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch production logs' });
  }
});

// POST /api/production
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, productionDate, locationId, shiftType, blocksProduced, grossCbm, netCbm, inChargeEmpId, surveyorEmpId, notes } = req.body;

    if (!quarryId || !productionDate) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId and productionDate required' });
    }

    const result = db.prepare(`
      INSERT INTO production_logs (org_id, quarry_id, production_date, location_id, shift_type, blocks_produced, gross_cbm, net_cbm, in_charge_emp_id, surveyor_emp_id, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, quarryId, productionDate, locationId || null,
      shiftType || 'day', blocksProduced || 0, grossCbm || 0,
      netCbm || (grossCbm ? grossCbm * 0.95 : 0),
      inChargeEmpId || null, surveyorEmpId || null, notes || null
    );

    const log = db.prepare(`
      SELECT pl.*, q.quarry_name, l.location_name
      FROM production_logs pl
      LEFT JOIN quarries q ON pl.quarry_id = q.id
      LEFT JOIN locations l ON pl.location_id = l.id
      WHERE pl.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(log);
  } catch (err) {
    console.error('Create production log error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create production log' });
  }
});

// PUT /api/production/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const log = db.prepare(`SELECT id FROM production_logs WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!log) return res.status(404).json({ error: 'Not Found', message: 'Production log not found' });

    const { locationId, shiftType, blocksProduced, grossCbm, netCbm, inChargeEmpId, surveyorEmpId, notes } = req.body;
    db.prepare(`
      UPDATE production_logs SET
        location_id = COALESCE(?, location_id), shift_type = COALESCE(?, shift_type),
        blocks_produced = COALESCE(?, blocks_produced), gross_cbm = COALESCE(?, gross_cbm),
        net_cbm = COALESCE(?, net_cbm), in_charge_emp_id = COALESCE(?, in_charge_emp_id),
        surveyor_emp_id = COALESCE(?, surveyor_emp_id), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(locationId, shiftType, blocksProduced, grossCbm, netCbm, inChargeEmpId, surveyorEmpId, notes, req.params.id);

    res.json(db.prepare(`SELECT * FROM production_logs WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update production log error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update production log' });
  }
});

// GET /api/production/dpr
router.get('/dpr', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, date = new Date().toISOString().split('T')[0] } = req.query;

    const logsParams = [req.user.orgId, date];
    let logsQuery = `
      SELECT pl.*, q.quarry_name, l.location_name, e1.emp_name as in_charge_name
      FROM production_logs pl
      LEFT JOIN quarries q ON pl.quarry_id = q.id
      LEFT JOIN locations l ON pl.location_id = l.id
      LEFT JOIN employees e1 ON pl.in_charge_emp_id = e1.id
      WHERE pl.org_id = ? AND pl.production_date = ?
    `;
    if (quarryId) { logsQuery += ` AND pl.quarry_id = ?`; logsParams.push(quarryId); }

    const logs = db.prepare(logsQuery).all(...logsParams);

    const blocksParams = [req.user.orgId, date];
    let blocksQuery = `SELECT b.*, v.variety_name FROM blocks b LEFT JOIN varieties v ON b.variety_id = v.id WHERE b.org_id = ? AND b.extraction_date = ?`;
    if (quarryId) { blocksQuery += ` AND b.quarry_id = ?`; blocksParams.push(quarryId); }

    const blocks = db.prepare(blocksQuery).all(...blocksParams);
    res.json({ date, productionLogs: logs, blocksExtracted: blocks });
  } catch (err) {
    console.error('Get DPR error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch DPR' });
  }
});

export default router;
