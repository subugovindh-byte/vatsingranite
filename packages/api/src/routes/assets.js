import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/assets
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, category, operationalStatus, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT a.*, q.quarry_name
      FROM assets a
      LEFT JOIN quarries q ON a.current_quarry_id = q.id
      WHERE a.org_id = ? AND a.active = 1
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND a.current_quarry_id = ?`; params.push(quarryId); }
    if (category) { query += ` AND a.asset_category = ?`; params.push(category); }
    if (operationalStatus) { query += ` AND a.operational_status = ?`; params.push(operationalStatus); }

    query += ` ORDER BY a.asset_name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const assets = db.prepare(query).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM assets WHERE org_id = ? AND active = 1`).get(req.user.orgId);

    res.json({ assets, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get assets error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const asset = db.prepare(`
      SELECT a.*, q.quarry_name
      FROM assets a
      LEFT JOIN quarries q ON a.current_quarry_id = q.id
      WHERE a.id = ? AND a.org_id = ? AND a.active = 1
    `).get(req.params.id, req.user.orgId);

    if (!asset) return res.status(404).json({ error: 'Not Found', message: 'Asset not found' });

    const maintenanceHistory = db.prepare(`
      SELECT mj.*, e.emp_name as technician_name
      FROM maintenance_jobs mj
      LEFT JOIN employees e ON mj.technician_emp_id = e.id
      WHERE mj.asset_id = ? AND mj.org_id = ?
      ORDER BY mj.created_at DESC LIMIT 20
    `).all(req.params.id, req.user.orgId);

    res.json({ ...asset, maintenanceHistory });
  } catch (err) {
    console.error('Get asset error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch asset' });
  }
});

// POST /api/assets
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      assetName, assetCategory, assetType, make, model, yearOfManufacture,
      serialNo, registrationNo, currentQuarryId, ownershipType, purchaseDate,
      purchaseCost, currentBookValue, depreciationMethod, operationalStatus,
      hourMeterReading, insuranceExpiryDate, fitnessExpiryDate
    } = req.body;

    if (!assetName || !assetCategory) {
      return res.status(400).json({ error: 'Bad Request', message: 'assetName and assetCategory required' });
    }

    const count = db.prepare(`SELECT COUNT(*) as c FROM assets WHERE org_id = ?`).get(req.user.orgId).c;
    const prefix = { machinery: 'MACH', vehicle: 'VEH', equipment: 'EQUIP', tool: 'TOOL' }[assetCategory] || 'ASSET';
    const assetNo = `${prefix}/${String(count + 1).padStart(4,'0')}`;

    const result = db.prepare(`
      INSERT INTO assets (
        org_id, asset_no, asset_name, asset_category, asset_type, make, model,
        year_of_manufacture, serial_no, registration_no, current_quarry_id,
        ownership_type, purchase_date, purchase_cost, current_book_value,
        depreciation_method, operational_status, hour_meter_reading,
        insurance_expiry_date, fitness_expiry_date, active
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)
    `).run(
      req.user.orgId, assetNo, assetName, assetCategory, assetType || null, make || null, model || null,
      yearOfManufacture || null, serialNo || null, registrationNo || null, currentQuarryId || null,
      ownershipType || 'owned', purchaseDate || null, purchaseCost || 0, currentBookValue || purchaseCost || 0,
      depreciationMethod || 'SLM', operationalStatus || 'active',
      hourMeterReading || 0, insuranceExpiryDate || null, fitnessExpiryDate || null
    );

    res.status(201).json(db.prepare(`SELECT * FROM assets WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create asset error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const asset = db.prepare(`SELECT id FROM assets WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!asset) return res.status(404).json({ error: 'Not Found', message: 'Asset not found' });

    const {
      assetName, assetCategory, assetType, make, model, currentQuarryId, ownershipType,
      purchaseCost, currentBookValue, operationalStatus, hourMeterReading,
      insuranceExpiryDate, fitnessExpiryDate, active
    } = req.body;

    db.prepare(`
      UPDATE assets SET
        asset_name = COALESCE(?, asset_name),
        asset_category = COALESCE(?, asset_category),
        asset_type = COALESCE(?, asset_type),
        make = COALESCE(?, make),
        model = COALESCE(?, model),
        current_quarry_id = COALESCE(?, current_quarry_id),
        ownership_type = COALESCE(?, ownership_type),
        purchase_cost = COALESCE(?, purchase_cost),
        current_book_value = COALESCE(?, current_book_value),
        operational_status = COALESCE(?, operational_status),
        hour_meter_reading = COALESCE(?, hour_meter_reading),
        insurance_expiry_date = COALESCE(?, insurance_expiry_date),
        fitness_expiry_date = COALESCE(?, fitness_expiry_date),
        active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      assetName, assetCategory, assetType, make, model, currentQuarryId, ownershipType,
      purchaseCost, currentBookValue, operationalStatus, hourMeterReading,
      insuranceExpiryDate, fitnessExpiryDate, active,
      req.params.id
    );

    res.json(db.prepare(`SELECT * FROM assets WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update asset error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update asset' });
  }
});

// GET /api/assets/maintenance/jobs
router.get('/maintenance/jobs', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, assetId, status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT mj.*, a.asset_name, a.asset_no, a.asset_category, q.quarry_name, e.emp_name as technician_name
      FROM maintenance_jobs mj
      LEFT JOIN assets a ON mj.asset_id = a.id
      LEFT JOIN quarries q ON mj.quarry_id = q.id
      LEFT JOIN employees e ON mj.technician_emp_id = e.id
      WHERE mj.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND mj.quarry_id = ?`; params.push(quarryId); }
    if (assetId) { query += ` AND mj.asset_id = ?`; params.push(assetId); }
    if (status) { query += ` AND mj.status = ?`; params.push(status); }

    query += ` ORDER BY mj.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get maintenance jobs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch maintenance jobs' });
  }
});

// POST /api/assets/maintenance/jobs
router.post('/maintenance/jobs', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId, assetId, jobType, scheduledDate, description,
      technicianEmpId, partsUsed, labourCost, partsCost, downtimeHours
    } = req.body;

    if (!quarryId || !assetId) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId and assetId required' });
    }

    const seq = db.prepare(`SELECT COUNT(*)+1 as n FROM maintenance_jobs WHERE org_id = ?`).get(req.user.orgId).n;
    const jobNo = `MJ/${new Date().getFullYear()}/${String(seq).padStart(5,'0')}`;
    const totalCost = (labourCost || 0) + (partsCost || 0);

    const result = db.prepare(`
      INSERT INTO maintenance_jobs (
        org_id, quarry_id, asset_id, job_no, job_type, scheduled_date,
        description, technician_emp_id, parts_used, labour_cost, parts_cost,
        total_cost, downtime_hours, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'open')
    `).run(
      req.user.orgId, quarryId, assetId, jobNo, jobType || 'corrective',
      scheduledDate || null, description || null, technicianEmpId || null,
      partsUsed ? JSON.stringify(partsUsed) : null,
      labourCost || 0, partsCost || 0, totalCost, downtimeHours || 0
    );

    res.status(201).json(db.prepare(`SELECT * FROM maintenance_jobs WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create maintenance job error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create maintenance job' });
  }
});

// PUT /api/assets/maintenance/jobs/:id
router.put('/maintenance/jobs/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const job = db.prepare(`SELECT id FROM maintenance_jobs WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!job) return res.status(404).json({ error: 'Not Found', message: 'Maintenance job not found' });

    const { startedAt, completedAt, description, technicianEmpId, partsUsed, labourCost, partsCost, downtimeHours, status, notes } = req.body;
    const totalCost = (labourCost !== undefined && partsCost !== undefined) ? labourCost + partsCost : undefined;

    db.prepare(`
      UPDATE maintenance_jobs SET
        started_at = COALESCE(?, started_at),
        completed_at = COALESCE(?, completed_at),
        description = COALESCE(?, description),
        technician_emp_id = COALESCE(?, technician_emp_id),
        parts_used = COALESCE(?, parts_used),
        labour_cost = COALESCE(?, labour_cost),
        parts_cost = COALESCE(?, parts_cost),
        total_cost = COALESCE(?, total_cost),
        downtime_hours = COALESCE(?, downtime_hours),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      startedAt, completedAt, description, technicianEmpId,
      partsUsed ? JSON.stringify(partsUsed) : null,
      labourCost, partsCost, totalCost, downtimeHours, status, notes,
      req.params.id
    );

    res.json(db.prepare(`SELECT * FROM maintenance_jobs WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update maintenance job error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update maintenance job' });
  }
});

export default router;
