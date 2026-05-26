import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/maintenance
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, assetId, status, jobType, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT mj.*, a.asset_name, a.asset_no, a.asset_category, a.registration_no,
        q.quarry_name, e.emp_name as technician_name
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
    if (jobType) { query += ` AND mj.job_type = ?`; params.push(jobType); }

    query += ` ORDER BY mj.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const jobs = db.prepare(query).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM maintenance_jobs WHERE org_id = ?`).get(req.user.orgId);

    res.json({ jobs, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get maintenance jobs error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch maintenance jobs' });
  }
});

// GET /api/maintenance/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const job = db.prepare(`
      SELECT mj.*, a.asset_name, a.asset_no, a.registration_no, q.quarry_name, e.emp_name as technician_name
      FROM maintenance_jobs mj
      LEFT JOIN assets a ON mj.asset_id = a.id
      LEFT JOIN quarries q ON mj.quarry_id = q.id
      LEFT JOIN employees e ON mj.technician_emp_id = e.id
      WHERE mj.id = ? AND mj.org_id = ?
    `).get(req.params.id, req.user.orgId);

    if (!job) return res.status(404).json({ error: 'Not Found', message: 'Maintenance job not found' });
    res.json(job);
  } catch (err) {
    console.error('Get maintenance job error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch maintenance job' });
  }
});

// POST /api/maintenance
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, assetId, jobType, scheduledDate, description, technicianEmpId, partsUsed, labourCost, partsCost, downtimeHours } = req.body;

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

// PUT /api/maintenance/:id
router.put('/:id', authenticate, (req, res) => {
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
