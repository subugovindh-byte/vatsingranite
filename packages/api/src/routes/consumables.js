import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/consumables
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, category, from, to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT c.*, q.quarry_name
      FROM consumables c
      LEFT JOIN quarries q ON c.quarry_id = q.id
      WHERE c.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND c.quarry_id = ?`; params.push(quarryId); }
    if (category) { query += ` AND c.item_category = ?`; params.push(category); }
    if (from) { query += ` AND c.record_date >= ?`; params.push(from); }
    if (to) { query += ` AND c.record_date <= ?`; params.push(to); }

    query += ` ORDER BY c.record_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const items = db.prepare(query).all(...params);

    // Summary by item
    let summaryQuery = `
      SELECT item_name, item_category, unit,
        COALESCE(SUM(received_qty),0) as total_received,
        COALESCE(SUM(consumed_qty),0) as total_consumed,
        COALESCE(SUM(closing_stock),0) as closing_stock,
        COALESCE(SUM(total_value),0) as total_value
      FROM consumables WHERE org_id = ?
    `;
    const summaryParams = [req.user.orgId];
    if (quarryId) { summaryQuery += ` AND quarry_id = ?`; summaryParams.push(quarryId); }
    summaryQuery += ` GROUP BY item_name, item_category, unit ORDER BY item_name`;

    const summary = db.prepare(summaryQuery).all(...summaryParams);

    res.json({ items, summary, pagination: { limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get consumables error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch consumables' });
  }
});

// POST /api/consumables
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, itemName, itemCategory, unit, openingStock, receivedQty, consumedQty, unitCost, recordDate, purpose, notes } = req.body;

    if (!quarryId || !itemName || !recordDate) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId, itemName, and recordDate required' });
    }

    const closingStock = (openingStock || 0) + (receivedQty || 0) - (consumedQty || 0);
    const totalValue = (receivedQty || 0) * (unitCost || 0);

    const result = db.prepare(`
      INSERT INTO consumables (org_id, quarry_id, item_name, item_category, unit, opening_stock, received_qty, consumed_qty, closing_stock, unit_cost, total_value, record_date, purpose, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, quarryId, itemName, itemCategory || null, unit || 'nos',
      openingStock || 0, receivedQty || 0, consumedQty || 0, closingStock,
      unitCost || 0, totalValue, recordDate, purpose || null, notes || null
    );

    res.status(201).json(db.prepare(`SELECT * FROM consumables WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create consumable error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create consumable record' });
  }
});

export default router;
