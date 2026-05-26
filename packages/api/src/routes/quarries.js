import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/quarries
 * Get all quarries for the organization
 */
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    
    const quarries = db.prepare(`
      SELECT
        id, quarry_code, quarry_name, quarry_type, mineral_type,
        district, state, operational_status, gstin, dgms_registration_no,
        commencement_date, is_default, active
      FROM quarries
      WHERE org_id = ? AND active = 1
      ORDER BY is_default DESC, quarry_code
    `).all(req.user.orgId);
    
    res.json(quarries);
  } catch (error) {
    console.error('Get quarries error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch quarries'
    });
  }
});

/**
 * GET /api/quarries/:id
 * Get quarry details
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    
    const quarry = db.prepare(`
      SELECT *
      FROM quarries
      WHERE id = ? AND org_id = ? AND active = 1
    `).get(req.params.id, req.user.orgId);
    
    if (!quarry) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Quarry not found'
      });
    }
    
    res.json(quarry);
  } catch (error) {
    console.error('Get quarry error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch quarry'
    });
  }
});

/**
 * GET /api/quarries/:id/stats
 * Get quarry statistics
 */
router.get('/:id/stats', authenticate, (req, res) => {
  try {
    const db = getDb();
    const quarryId = req.params.id;
    
    // Get block counts by status
    const blockStats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(net_cbm) as total_cbm
      FROM blocks
      WHERE quarry_id = ? AND active = 1
      GROUP BY status
    `).all(quarryId);
    
    // Get today's production
    const todayProduction = db.prepare(`
      SELECT 
        COALESCE(SUM(net_cbm), 0) as cbm,
        COALESCE(SUM(blocks_produced), 0) as blocks
      FROM production_logs
      WHERE quarry_id = ? AND production_date = date('now')
    `).get(quarryId);
    
    // Get monthly production
    const monthlyProduction = db.prepare(`
      SELECT 
        COALESCE(SUM(net_cbm), 0) as cbm,
        COALESCE(SUM(blocks_produced), 0) as blocks
      FROM production_logs
      WHERE quarry_id = ? 
        AND strftime('%Y-%m', production_date) = strftime('%Y-%m', 'now')
    `).get(quarryId);
    
    // Get active employees count
    const employeeCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM employees
      WHERE primary_quarry_id = ? AND active = 1
    `).get(quarryId);
    
    res.json({
      blocks: blockStats,
      production: {
        today: todayProduction,
        thisMonth: monthlyProduction
      },
      employees: employeeCount.count
    });
  } catch (error) {
    console.error('Get quarry stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch quarry statistics'
    });
  }
});

/**
 * POST /api/quarries
 * Create a new quarry
 */
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryName, quarryCode, quarryType, district, state, address, village, taluk, gstin, operationalStatus, dgmsRegistrationNo, ibmCode, commencementDate } = req.body;
    if (!quarryName || !quarryCode) return res.status(400).json({ error: 'quarryName and quarryCode are required' });

    const result = db.prepare(`
      INSERT INTO quarries (org_id, quarry_name, quarry_code, quarry_type, mineral_type, district, state, address, village, taluk, gstin, operational_status, dgms_registration_no, ibm_code, commencement_date)
      VALUES (?, ?, ?, ?, 'Granite', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.orgId, quarryName, quarryCode, quarryType || 'opencast', district || '', state || 'Tamil Nadu', address || '', village || '', taluk || '', gstin || null, operationalStatus || 'active', dgmsRegistrationNo || null, ibmCode || null, commencementDate || null);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Quarry created' });
  } catch (error) {
    console.error('Create quarry error:', error);
    res.status(500).json({ error: 'Failed to create quarry', message: error.message });
  }
});

/**
 * PUT /api/quarries/:id
 * Update quarry details
 */
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryName, quarryType, district, state, address, village, taluk, gstin, operationalStatus, dgmsRegistrationNo, ibmCode, commencementDate } = req.body;

    db.prepare(`
      UPDATE quarries SET
        quarry_name = COALESCE(?, quarry_name),
        quarry_type = COALESCE(?, quarry_type),
        district = COALESCE(?, district),
        state = COALESCE(?, state),
        address = COALESCE(?, address),
        village = COALESCE(?, village),
        taluk = COALESCE(?, taluk),
        gstin = COALESCE(?, gstin),
        operational_status = COALESCE(?, operational_status),
        dgms_registration_no = COALESCE(?, dgms_registration_no),
        ibm_code = COALESCE(?, ibm_code),
        commencement_date = COALESCE(?, commencement_date)
      WHERE id = ? AND org_id = ?
    `).run(quarryName || null, quarryType || null, district || null, state || null, address || null, village || null, taluk || null, gstin || null, operationalStatus || null, dgmsRegistrationNo || null, ibmCode || null, commencementDate || null, req.params.id, req.user.orgId);

    res.json({ message: 'Quarry updated' });
  } catch (error) {
    console.error('Update quarry error:', error);
    res.status(500).json({ error: 'Failed to update quarry', message: error.message });
  }
});

/**
 * PATCH /api/quarries/:id/default
 * Set a quarry as the default (unsets all others first)
 */
router.patch('/:id/default', authenticate, authorize('ADMIN', 'MANAGER'), (req, res) => {
  try {
    const db = getDb();
    const quarry = db.prepare(`SELECT id FROM quarries WHERE id = ? AND org_id = ? AND active = 1`).get(req.params.id, req.user.orgId);
    if (!quarry) return res.status(404).json({ error: 'Quarry not found' });

    db.transaction(() => {
      db.prepare(`UPDATE quarries SET is_default = 0 WHERE org_id = ?`).run(req.user.orgId);
      db.prepare(`UPDATE quarries SET is_default = 1 WHERE id = ?`).run(req.params.id);
    })();

    res.json({ message: 'Default quarry updated' });
  } catch (error) {
    console.error('Set default quarry error:', error);
    res.status(500).json({ error: 'Failed to update default quarry', message: error.message });
  }
});

/**
 * DELETE /api/quarries/:id
 * Delete a quarry (hard-delete via active=0). Blocked if:
 *  - quarry is the default/primary
 *  - quarry has any associated data
 */
router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  try {
    const db = getDb();
    const quarry = db.prepare(`SELECT id, quarry_name, is_default FROM quarries WHERE id = ? AND org_id = ? AND active = 1`).get(req.params.id, req.user.orgId);
    if (!quarry) return res.status(404).json({ error: 'Quarry not found' });

    if (quarry.is_default) {
      return res.status(400).json({ error: 'Cannot remove the default quarry. Set another quarry as default first.' });
    }

    // Check for any associated data
    const checks = [
      { table: 'blocks', col: 'quarry_id', label: 'blocks' },
      { table: 'employees', col: 'primary_quarry_id', label: 'employees' },
      { table: 'varieties', col: 'quarry_id', label: 'varieties' },
      { table: 'locations', col: 'quarry_id', label: 'locations' },
      { table: 'production_logs', col: 'quarry_id', label: 'production logs' },
      { table: 'blast_events', col: 'quarry_id', label: 'blast events' },
      { table: 'sales_orders', col: 'quarry_id', label: 'sales orders' },
      { table: 'invoices', col: 'despatch_quarry_id', label: 'invoices' },
      { table: 'weighments', col: 'quarry_id', label: 'weighments' },
      { table: 'consumables', col: 'quarry_id', label: 'consumables stock' },
    ];

    for (const { table, col, label } of checks) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${col} = ?`).get(quarry.id);
        if (row && row.cnt > 0) {
          return res.status(400).json({ error: `Cannot remove quarry: it has ${row.cnt} ${label} associated with it.` });
        }
      } catch { /* table may not exist yet — skip */ }
    }

    db.prepare(`UPDATE quarries SET active = 0 WHERE id = ? AND org_id = ?`).run(quarry.id, req.user.orgId);
    res.json({ message: `Quarry "${quarry.quarry_name}" removed.` });
  } catch (error) {
    console.error('Delete quarry error:', error);
    res.status(500).json({ error: 'Failed to remove quarry', message: error.message });
  }
});

export default router;
