import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/reports/dpr - Daily Production Report
router.get('/dpr', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, date = new Date().toISOString().split('T')[0] } = req.query;

    const logsParams = [req.user.orgId, date];
    let logsQuery = `
      SELECT pl.*, q.quarry_name, l.location_name, e.emp_name as in_charge_name
      FROM production_logs pl
      LEFT JOIN quarries q ON pl.quarry_id = q.id
      LEFT JOIN locations l ON pl.location_id = l.id
      LEFT JOIN employees e ON pl.in_charge_emp_id = e.id
      WHERE pl.org_id = ? AND pl.production_date = ?
    `;
    if (quarryId) { logsQuery += ` AND pl.quarry_id = ?`; logsParams.push(quarryId); }

    const blockParams = [req.user.orgId, date];
    let blockQuery = `
      SELECT b.block_no, b.gross_cbm, b.net_cbm, b.grade, v.variety_name, q.quarry_name, l.location_name
      FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      LEFT JOIN quarries q ON b.quarry_id = q.id
      LEFT JOIN locations l ON b.extracted_from_location_id = l.id
      WHERE b.org_id = ? AND b.extraction_date = ?
    `;
    if (quarryId) { blockQuery += ` AND b.quarry_id = ?`; blockParams.push(quarryId); }

    const blastParams = [req.user.orgId, date];
    let blastQuery = `
      SELECT be.blast_no, be.holes_drilled, be.explosives_consumed_kg, be.actual_yield_cbm, q.quarry_name
      FROM blast_events be LEFT JOIN quarries q ON be.quarry_id = q.id
      WHERE be.org_id = ? AND be.blast_date = ?
    `;
    if (quarryId) { blastQuery += ` AND be.quarry_id = ?`; blastParams.push(quarryId); }

    const productionLogs = db.prepare(logsQuery).all(...logsParams);
    const blocksExtracted = db.prepare(blockQuery).all(...blockParams);
    const blastEvents = db.prepare(blastQuery).all(...blastParams);

    const totals = blocksExtracted.reduce((acc, b) => {
      acc.totalGrossCbm += b.gross_cbm || 0;
      acc.totalNetCbm += b.net_cbm || 0;
      acc.totalBlocks += 1;
      return acc;
    }, { totalGrossCbm: 0, totalNetCbm: 0, totalBlocks: 0 });

    res.json({ date, productionLogs, blocksExtracted, blastEvents, totals });
  } catch (err) {
    console.error('DPR error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate DPR' });
  }
});

// GET /api/reports/pl - P&L summary
router.get('/pl', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, from, to } = req.query;

    // Sales revenue from invoices
    let salesQuery = `SELECT COALESCE(SUM(invoice_value),0) as revenue, COALESCE(SUM(taxable_value),0) as taxable_value, COUNT(*) as invoice_count FROM invoices WHERE org_id = ? AND status != 'cancelled'`;
    const salesParams = [req.user.orgId];
    if (quarryId) { salesQuery += ` AND despatch_quarry_id = ?`; salesParams.push(quarryId); }
    if (from) { salesQuery += ` AND invoice_date >= ?`; salesParams.push(from); }
    if (to) { salesQuery += ` AND invoice_date <= ?`; salesParams.push(to); }

    const sales = db.prepare(salesQuery).get(...salesParams);

    // Production volumes
    let prodQuery = `SELECT COALESCE(SUM(gross_cbm),0) as gross_cbm, COALESCE(SUM(net_cbm),0) as net_cbm, COALESCE(SUM(blocks_produced),0) as blocks FROM production_logs WHERE org_id = ?`;
    const prodParams = [req.user.orgId];
    if (quarryId) { prodQuery += ` AND quarry_id = ?`; prodParams.push(quarryId); }
    if (from) { prodQuery += ` AND production_date >= ?`; prodParams.push(from); }
    if (to) { prodQuery += ` AND production_date <= ?`; prodParams.push(to); }

    const production = db.prepare(prodQuery).get(...prodParams);

    // Royalty paid
    let royaltyQuery = `SELECT COALESCE(SUM(total_amount),0) as total_royalty FROM royalty_challans WHERE org_id = ?`;
    const royaltyParams = [req.user.orgId];
    if (quarryId) { royaltyQuery += ` AND quarry_id = ?`; royaltyParams.push(quarryId); }
    if (from) { royaltyQuery += ` AND period_year || '-' || printf('%02d',period_month) || '-01' >= ?`; royaltyParams.push(from); }

    const royalty = db.prepare(royaltyQuery).get(...royaltyParams);

    // Payroll
    let payrollQuery = `SELECT COALESCE(SUM(total_gross),0) as total_gross, COALESCE(SUM(total_net),0) as total_net FROM payroll_runs WHERE org_id = ? AND status != 'cancelled'`;
    const payrollParams = [req.user.orgId];

    const payroll = db.prepare(payrollQuery).get(...payrollParams);

    // Maintenance costs
    let maintQuery = `SELECT COALESCE(SUM(total_cost),0) as total_maintenance_cost FROM maintenance_jobs WHERE org_id = ? AND status = 'completed'`;
    const maintParams = [req.user.orgId];
    if (quarryId) { maintQuery += ` AND quarry_id = ?`; maintParams.push(quarryId); }

    const maintenance = db.prepare(maintQuery).get(...maintParams);

    res.json({
      period: { from, to },
      revenue: sales,
      production,
      royalty,
      payroll,
      maintenance,
      summary: {
        totalRevenue: sales.revenue,
        totalCosts: (royalty.total_royalty || 0) + (payroll.total_gross || 0) + (maintenance.total_maintenance_cost || 0),
        grossProfit: sales.revenue - (royalty.total_royalty || 0) - (payroll.total_gross || 0) - (maintenance.total_maintenance_cost || 0)
      }
    });
  } catch (err) {
    console.error('P&L report error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate P&L report' });
  }
});

// GET /api/reports/stock - Block stock summary
router.get('/stock', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId } = req.query;

    const params = [req.user.orgId];
    let query = `
      SELECT b.status, v.variety_name, v.variety_code,
        COUNT(*) as block_count,
        COALESCE(SUM(b.gross_cbm),0) as total_gross_cbm,
        COALESCE(SUM(b.net_cbm),0) as total_net_cbm,
        COALESCE(SUM(b.weight_kg),0) as total_weight_kg,
        q.quarry_name
      FROM blocks b
      LEFT JOIN varieties v ON b.variety_id = v.id
      LEFT JOIN quarries q ON b.quarry_id = q.id
      WHERE b.org_id = ? AND b.active = 1
    `;
    if (quarryId) { query += ` AND b.quarry_id = ?`; params.push(quarryId); }
    query += ` GROUP BY b.status, b.variety_id, b.quarry_id ORDER BY b.status, v.variety_name`;

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Stock report error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate stock report' });
  }
});

// GET /api/reports/gst - GST summary for a period
router.get('/gst', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Bad Request', message: 'month and year required' });
    }

    const mm = String(month).padStart(2, '0');
    const params = [req.user.orgId, `${year}-${mm}`];

    const invoices = db.prepare(`
      SELECT i.invoice_no, i.invoice_date, i.invoice_type, i.place_of_supply,
        c.customer_name, c.gstin as buyer_gstin,
        i.taxable_value, i.cgst_amount, i.sgst_amount, i.igst_amount, i.invoice_value
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.org_id = ? AND strftime('%Y-%m', i.invoice_date) = ? AND i.status != 'cancelled'
      ORDER BY i.invoice_date
    `).all(...params);

    const totals = invoices.reduce((acc, inv) => {
      acc.taxable += inv.taxable_value || 0;
      acc.cgst += inv.cgst_amount || 0;
      acc.sgst += inv.sgst_amount || 0;
      acc.igst += inv.igst_amount || 0;
      acc.total += inv.invoice_value || 0;
      return acc;
    }, { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

    res.json({ period: `${year}-${mm}`, invoices, totals });
  } catch (err) {
    console.error('GST report error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate GST report' });
  }
});

export default router;
