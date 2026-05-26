import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/blasting
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, from, to, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT be.*,
        q.quarry_name, q.quarry_code,
        l.location_name,
        e1.emp_name as blaster_name,
        e2.emp_name as approved_by_name
      FROM blast_events be
      LEFT JOIN quarries q ON be.quarry_id = q.id
      LEFT JOIN locations l ON be.location_id = l.id
      LEFT JOIN employees e1 ON be.blaster_id = e1.id
      LEFT JOIN employees e2 ON be.approved_by = e2.id
      WHERE be.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND be.quarry_id = ?`; params.push(quarryId); }
    if (from) { query += ` AND be.blast_date >= ?`; params.push(from); }
    if (to) { query += ` AND be.blast_date <= ?`; params.push(to); }

    query += ` ORDER BY be.blast_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    console.error('Get blast events error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch blast events' });
  }
});

// GET /api/blasting/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const event = db.prepare(`
      SELECT be.*, q.quarry_name, l.location_name, e1.emp_name as blaster_name
      FROM blast_events be
      LEFT JOIN quarries q ON be.quarry_id = q.id
      LEFT JOIN locations l ON be.location_id = l.id
      LEFT JOIN employees e1 ON be.blaster_id = e1.id
      WHERE be.id = ? AND be.org_id = ?
    `).get(req.params.id, req.user.orgId);

    if (!event) return res.status(404).json({ error: 'Not Found', message: 'Blast event not found' });

    // Get blocks from this blast
    const blocks = db.prepare(`
      SELECT b.*, v.variety_name FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      WHERE b.blast_event_id = ? AND b.org_id = ?
    `).all(req.params.id, req.user.orgId);

    res.json({ ...event, blocks });
  } catch (err) {
    console.error('Get blast event error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch blast event' });
  }
});

// POST /api/blasting
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId, blastDate, locationId, holesDrilled, holeDepthM, holeDiameterMm,
      spacingM, burdenM, totalDrilledM, explosivesConsumedKg, detonatorsUsed,
      blasterId, blasterCertNo, estimatedYieldCbm, actualYieldCbm,
      vibrationPpvMmS, blastLatitude, blastLongitude, withinLeaseBoundary, approvedBy
    } = req.body;

    if (!quarryId || !blastDate) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId and blastDate required' });
    }

    const year = new Date(blastDate).getFullYear();
    const seq = db.prepare(`SELECT COUNT(*)+1 as n FROM blast_events WHERE quarry_id = ? AND strftime('%Y',blast_date)=?`)
      .get(quarryId, String(year)).n;
    const quarry = db.prepare(`SELECT quarry_code FROM quarries WHERE id = ?`).get(quarryId);
    const blastNo = `${quarry.quarry_code}/BL/${year}/${String(seq).padStart(4,'0')}`;

    const result = db.prepare(`
      INSERT INTO blast_events (
        org_id, quarry_id, blast_no, blast_date, location_id,
        holes_drilled, hole_depth_m, hole_diameter_mm, spacing_m, burden_m,
        total_drilled_m, explosives_consumed_kg, detonators_used,
        blaster_id, blaster_cert_no, estimated_yield_cbm, actual_yield_cbm,
        vibration_ppv_mm_s, blast_latitude, blast_longitude, within_lease_boundary, approved_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, quarryId, blastNo, blastDate, locationId || null,
      holesDrilled || null, holeDepthM || null, holeDiameterMm || null,
      spacingM || null, burdenM || null, totalDrilledM || null,
      explosivesConsumedKg || null, detonatorsUsed || null,
      blasterId || null, blasterCertNo || null,
      estimatedYieldCbm || null, actualYieldCbm || null,
      vibrationPpvMmS || null, blastLatitude || null, blastLongitude || null,
      withinLeaseBoundary !== false ? 1 : 0, approvedBy || null
    );

    const event = db.prepare(`
      SELECT be.*, q.quarry_name, l.location_name
      FROM blast_events be
      LEFT JOIN quarries q ON be.quarry_id = q.id
      LEFT JOIN locations l ON be.location_id = l.id
      WHERE be.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(event);
  } catch (err) {
    console.error('Create blast event error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create blast event' });
  }
});

// PUT /api/blasting/:id
router.put('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const event = db.prepare(`SELECT id FROM blast_events WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!event) return res.status(404).json({ error: 'Not Found', message: 'Blast event not found' });

    const {
      locationId, holesDrilled, holeDepthM, holeDiameterMm, spacingM, burdenM,
      totalDrilledM, explosivesConsumedKg, detonatorsUsed, blasterId, blasterCertNo,
      estimatedYieldCbm, actualYieldCbm, vibrationPpvMmS, withinLeaseBoundary, approvedBy
    } = req.body;

    db.prepare(`
      UPDATE blast_events SET
        location_id = COALESCE(?, location_id),
        holes_drilled = COALESCE(?, holes_drilled),
        hole_depth_m = COALESCE(?, hole_depth_m),
        hole_diameter_mm = COALESCE(?, hole_diameter_mm),
        spacing_m = COALESCE(?, spacing_m),
        burden_m = COALESCE(?, burden_m),
        total_drilled_m = COALESCE(?, total_drilled_m),
        explosives_consumed_kg = COALESCE(?, explosives_consumed_kg),
        detonators_used = COALESCE(?, detonators_used),
        blaster_id = COALESCE(?, blaster_id),
        blaster_cert_no = COALESCE(?, blaster_cert_no),
        estimated_yield_cbm = COALESCE(?, estimated_yield_cbm),
        actual_yield_cbm = COALESCE(?, actual_yield_cbm),
        vibration_ppv_mm_s = COALESCE(?, vibration_ppv_mm_s),
        within_lease_boundary = COALESCE(?, within_lease_boundary),
        approved_by = COALESCE(?, approved_by)
      WHERE id = ?
    `).run(
      locationId, holesDrilled, holeDepthM, holeDiameterMm, spacingM, burdenM,
      totalDrilledM, explosivesConsumedKg, detonatorsUsed, blasterId, blasterCertNo,
      estimatedYieldCbm, actualYieldCbm, vibrationPpvMmS, withinLeaseBoundary, approvedBy,
      req.params.id
    );

    res.json(db.prepare(`SELECT * FROM blast_events WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update blast event error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update blast event' });
  }
});

export default router;
