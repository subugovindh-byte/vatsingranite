import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/compliance/permits
router.get('/permits', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, permitType, status, expiringDays } = req.query;

    let query = `
      SELECT p.*, q.quarry_name
      FROM permits p
      LEFT JOIN quarries q ON p.quarry_id = q.id
      WHERE p.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND p.quarry_id = ?`; params.push(quarryId); }
    if (permitType) { query += ` AND p.permit_type = ?`; params.push(permitType); }
    if (status) { query += ` AND p.status = ?`; params.push(status); }
    if (expiringDays) {
      query += ` AND p.expiry_date <= date('now', '+' || ? || ' days') AND p.expiry_date >= date('now')`;
      params.push(expiringDays);
    }

    query += ` ORDER BY p.expiry_date ASC`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get permits error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch permits' });
  }
});

// POST /api/compliance/permits
router.post('/permits', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, permitNo, permitType, permitName, issuedBy, issueDate, expiryDate, renewalDate, documentUrl } = req.body;

    if (!quarryId || !permitType || !permitName) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId, permitType, permitName required' });
    }

    const pNo = permitNo || `PERMIT-${Date.now()}`;
    const result = db.prepare(`
      INSERT INTO permits (org_id, quarry_id, permit_no, permit_type, permit_name, issued_by, issue_date, expiry_date, renewal_date, status, document_url)
      VALUES (?,?,?,?,?,?,?,?,?,'active',?)
    `).run(req.user.orgId, quarryId, pNo, permitType, permitName, issuedBy || null, issueDate || null, expiryDate || null, renewalDate || null, documentUrl || null);

    res.status(201).json(db.prepare(`SELECT * FROM permits WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create permit error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create permit' });
  }
});

// PUT /api/compliance/permits/:id
router.put('/permits/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const permit = db.prepare(`SELECT id FROM permits WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!permit) return res.status(404).json({ error: 'Not Found', message: 'Permit not found' });

    const { permitName, issuedBy, issueDate, expiryDate, renewalDate, status, documentUrl } = req.body;
    db.prepare(`
      UPDATE permits SET
        permit_name = COALESCE(?, permit_name),
        issued_by = COALESCE(?, issued_by),
        issue_date = COALESCE(?, issue_date),
        expiry_date = COALESCE(?, expiry_date),
        renewal_date = COALESCE(?, renewal_date),
        status = COALESCE(?, status),
        document_url = COALESCE(?, document_url)
      WHERE id = ?
    `).run(permitName, issuedBy, issueDate, expiryDate, renewalDate, status, documentUrl, req.params.id);

    res.json(db.prepare(`SELECT * FROM permits WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update permit error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update permit' });
  }
});

// GET /api/compliance/safety
router.get('/safety', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, severity, status, from, to } = req.query;

    let query = `
      SELECT si.*, q.quarry_name, e.emp_name as person_affected_name, l.location_name
      FROM safety_incidents si
      LEFT JOIN quarries q ON si.quarry_id = q.id
      LEFT JOIN employees e ON si.person_affected_emp_id = e.id
      LEFT JOIN locations l ON si.location_id = l.id
      WHERE si.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND si.quarry_id = ?`; params.push(quarryId); }
    if (severity) { query += ` AND si.severity = ?`; params.push(severity); }
    if (status) { query += ` AND si.status = ?`; params.push(status); }
    if (from) { query += ` AND si.incident_date >= ?`; params.push(from); }
    if (to) { query += ` AND si.incident_date <= ?`; params.push(to); }

    query += ` ORDER BY si.incident_date DESC`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get safety incidents error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch safety incidents' });
  }
});

// POST /api/compliance/safety
router.post('/safety', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId, incidentDate, incidentType, severity, locationId,
      personAffectedEmpId, description, immediateAction, rootCause,
      correctiveAction, preventiveAction, reportedToDgms
    } = req.body;

    if (!quarryId || !incidentDate || !incidentType) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId, incidentDate, incidentType required' });
    }

    const seq = db.prepare(`SELECT COUNT(*)+1 as n FROM safety_incidents WHERE org_id = ?`).get(req.user.orgId).n;
    const quarry = db.prepare(`SELECT quarry_code FROM quarries WHERE id = ?`).get(quarryId);
    const incidentNo = `${quarry.quarry_code}/SI/${new Date().getFullYear()}/${String(seq).padStart(4,'0')}`;

    const result = db.prepare(`
      INSERT INTO safety_incidents (
        org_id, quarry_id, incident_no, incident_date, incident_type, severity,
        location_id, person_affected_emp_id, description, immediate_action,
        root_cause, corrective_action, preventive_action, reported_to_dgms, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'open')
    `).run(
      req.user.orgId, quarryId, incidentNo, incidentDate, incidentType, severity || 'minor',
      locationId || null, personAffectedEmpId || null, description || null, immediateAction || null,
      rootCause || null, correctiveAction || null, preventiveAction || null,
      reportedToDgms ? 1 : 0
    );

    res.status(201).json(db.prepare(`SELECT * FROM safety_incidents WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create safety incident error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create safety incident' });
  }
});

// PUT /api/compliance/safety/:id
router.put('/safety/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const incident = db.prepare(`SELECT id FROM safety_incidents WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!incident) return res.status(404).json({ error: 'Not Found', message: 'Incident not found' });

    const { severity, immediateAction, rootCause, correctiveAction, preventiveAction, reportedToDgms, reportedAt, status } = req.body;
    db.prepare(`
      UPDATE safety_incidents SET
        severity = COALESCE(?, severity),
        immediate_action = COALESCE(?, immediate_action),
        root_cause = COALESCE(?, root_cause),
        corrective_action = COALESCE(?, corrective_action),
        preventive_action = COALESCE(?, preventive_action),
        reported_to_dgms = COALESCE(?, reported_to_dgms),
        reported_at = COALESCE(?, reported_at),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(severity, immediateAction, rootCause, correctiveAction, preventiveAction,
      reportedToDgms !== undefined ? (reportedToDgms ? 1 : 0) : null,
      reportedAt, status, req.params.id);

    res.json(db.prepare(`SELECT * FROM safety_incidents WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update safety incident error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update safety incident' });
  }
});

// GET /api/compliance - overview/dashboard
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId } = req.query;
    const p = [req.user.orgId];
    const qFilter = quarryId ? ' AND quarry_id = ?' : '';
    if (quarryId) p.push(quarryId);

    const permitsExpiringSoon = db.prepare(`
      SELECT COUNT(*) as count FROM permits WHERE org_id = ?${qFilter}
      AND expiry_date <= date('now', '+30 days') AND expiry_date >= date('now') AND status = 'active'
    `).get(...p).count;

    const openIncidents = db.prepare(`
      SELECT COUNT(*) as count FROM safety_incidents WHERE org_id = ?${qFilter} AND status = 'open'
    `).get(...p).count;

    const totalPermits = db.prepare(`SELECT COUNT(*) as count FROM permits WHERE org_id = ?${qFilter} AND status = 'active'`).get(...p).count;

    res.json({ permitsExpiringSoon, openIncidents, totalPermits });
  } catch (err) {
    console.error('Get compliance overview error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch compliance overview' });
  }
});

export default router;
