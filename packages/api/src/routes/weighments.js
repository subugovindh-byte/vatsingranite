import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/weighments
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, from, to, vehicleNo, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT w.*, q.quarry_name, b.block_no, i.invoice_no
      FROM weighments w
      LEFT JOIN quarries q ON w.quarry_id = q.id
      LEFT JOIN blocks b ON w.block_id = b.id
      LEFT JOIN invoices i ON w.invoice_id = i.id
      WHERE w.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND w.quarry_id = ?`; params.push(quarryId); }
    if (vehicleNo) { query += ` AND w.vehicle_no LIKE ?`; params.push(`%${vehicleNo}%`); }
    if (from) { query += ` AND w.weighment_date >= ?`; params.push(from); }
    if (to) { query += ` AND w.weighment_date <= ?`; params.push(to); }

    query += ` ORDER BY w.weighment_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const weighments = db.prepare(query).all(...params);
    res.json(weighments);
  } catch (err) {
    console.error('Get weighments error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch weighments' });
  }
});

// POST /api/weighments
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, blockId, invoiceId, weighmentDate, vehicleNo, driverName, tareWeightKg, grossWeightKg, materialType, weighbridgeOperator, notes } = req.body;

    if (!quarryId || !weighmentDate) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId and weighmentDate required' });
    }

    const netWeightKg = (grossWeightKg || 0) - (tareWeightKg || 0);

    const result = db.prepare(`
      INSERT INTO weighments (org_id, quarry_id, block_id, invoice_id, weighment_date, vehicle_no, driver_name, tare_weight_kg, gross_weight_kg, net_weight_kg, material_type, weighbridge_operator, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, quarryId, blockId || null, invoiceId || null, weighmentDate,
      vehicleNo || null, driverName || null, tareWeightKg || 0, grossWeightKg || 0,
      netWeightKg, materialType || 'block', weighbridgeOperator || null, notes || null
    );

    // Update block weight if provided
    if (blockId && netWeightKg > 0) {
      db.prepare(`UPDATE blocks SET weight_kg = ? WHERE id = ? AND org_id = ?`).run(netWeightKg, blockId, req.user.orgId);
    }

    res.status(201).json(db.prepare(`SELECT * FROM weighments WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create weighment error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create weighment' });
  }
});

export default router;
