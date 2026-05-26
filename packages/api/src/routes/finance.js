import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/finance/accounts
router.get('/accounts', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { type } = req.query;
    let query = `SELECT * FROM accounts WHERE org_id = ? AND active = 1`;
    const params = [req.user.orgId];
    if (type) { query += ` AND account_type = ?`; params.push(type); }
    query += ` ORDER BY account_code`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch accounts' });
  }
});

// GET /api/finance/vouchers
router.get('/vouchers', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, voucherType, from, to, status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT v.*, q.quarry_name
      FROM vouchers v
      LEFT JOIN quarries q ON v.default_quarry_id = q.id
      WHERE v.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND v.default_quarry_id = ?`; params.push(quarryId); }
    if (voucherType) { query += ` AND v.voucher_type = ?`; params.push(voucherType); }
    if (status) { query += ` AND v.status = ?`; params.push(status); }
    if (from) { query += ` AND v.voucher_date >= ?`; params.push(from); }
    if (to) { query += ` AND v.voucher_date <= ?`; params.push(to); }

    query += ` ORDER BY v.voucher_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const vouchers = db.prepare(query).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM vouchers WHERE org_id = ?`).get(req.user.orgId);
    res.json({ vouchers, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get vouchers error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch vouchers' });
  }
});

// GET /api/finance/vouchers/:id
router.get('/vouchers/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const voucher = db.prepare(`
      SELECT v.*, q.quarry_name FROM vouchers v
      LEFT JOIN quarries q ON v.default_quarry_id = q.id
      WHERE v.id = ? AND v.org_id = ?
    `).get(req.params.id, req.user.orgId);

    if (!voucher) return res.status(404).json({ error: 'Not Found', message: 'Voucher not found' });

    const lines = db.prepare(`
      SELECT vl.*, a.account_name, a.account_code, a.account_type, q.quarry_name
      FROM voucher_lines vl
      LEFT JOIN accounts a ON vl.account_id = a.id
      LEFT JOIN quarries q ON vl.quarry_id = q.id
      WHERE vl.voucher_id = ? AND vl.org_id = ?
      ORDER BY vl.line_no
    `).all(req.params.id, req.user.orgId);

    res.json({ ...voucher, lines });
  } catch (err) {
    console.error('Get voucher error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch voucher' });
  }
});

// POST /api/finance/vouchers
router.post('/vouchers', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { voucherType, voucherDate, narration, defaultQuarryId, lines = [], referenceNo } = req.body;

    if (!voucherType || !voucherDate || lines.length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'voucherType, voucherDate, and lines required' });
    }

    const totalDebit = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ error: 'Bad Request', message: 'Voucher is not balanced (debits != credits)' });
    }

    const date = new Date(voucherDate);
    const fy = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    const seq = db.prepare(`SELECT COUNT(*)+1 as n FROM vouchers WHERE org_id = ? AND fiscal_year = ? AND voucher_type = ?`)
      .get(req.user.orgId, fy, voucherType).n;
    const prefix = { payment: 'PV', receipt: 'RV', journal: 'JV', contra: 'CV', purchase: 'PUR', sales: 'SV' }[voucherType] || 'VCH';
    const voucherNo = `${prefix}/${fy}-${fy+1}/${String(seq).padStart(5,'0')}`;

    const result = db.prepare(`
      INSERT INTO vouchers (org_id, voucher_no, voucher_type, voucher_date, fiscal_year, fiscal_period, reference_no, narration, default_quarry_id, status)
      VALUES (?,?,?,?,?,?,?,?,?,'posted')
    `).run(req.user.orgId, voucherNo, voucherType, voucherDate, fy, date.getMonth()+1, referenceNo || null, narration || null, defaultQuarryId || null);

    const voucherId = result.lastInsertRowid;

    const insertLine = db.prepare(`
      INSERT INTO voucher_lines (org_id, voucher_id, line_no, account_id, quarry_id, cost_center_id, debit_amount, credit_amount, party_type, party_id)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `);

    lines.forEach((line, i) => {
      insertLine.run(
        req.user.orgId, voucherId, i + 1, line.accountId, line.quarryId || defaultQuarryId || null,
        line.costCenterId || null, line.debitAmount || 0, line.creditAmount || 0,
        line.partyType || null, line.partyId || null
      );
    });

    const voucher = db.prepare(`SELECT * FROM vouchers WHERE id = ?`).get(voucherId);
    const vLines = db.prepare(`
      SELECT vl.*, a.account_name FROM voucher_lines vl JOIN accounts a ON vl.account_id = a.id WHERE vl.voucher_id = ?
    `).all(voucherId);

    res.status(201).json({ ...voucher, lines: vLines });
  } catch (err) {
    console.error('Create voucher error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create voucher' });
  }
});

// GET /api/finance/ledger
router.get('/ledger', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { accountId, from, to, quarryId } = req.query;

    if (!accountId) return res.status(400).json({ error: 'Bad Request', message: 'accountId required' });

    const account = db.prepare(`SELECT * FROM accounts WHERE id = ? AND org_id = ?`).get(accountId, req.user.orgId);
    if (!account) return res.status(404).json({ error: 'Not Found', message: 'Account not found' });

    let query = `
      SELECT vl.*, v.voucher_no, v.voucher_type, v.voucher_date, v.narration, q.quarry_name
      FROM voucher_lines vl
      JOIN vouchers v ON vl.voucher_id = v.id
      LEFT JOIN quarries q ON vl.quarry_id = q.id
      WHERE vl.org_id = ? AND vl.account_id = ?
    `;
    const params = [req.user.orgId, accountId];

    if (from) { query += ` AND v.voucher_date >= ?`; params.push(from); }
    if (to) { query += ` AND v.voucher_date <= ?`; params.push(to); }
    if (quarryId) { query += ` AND vl.quarry_id = ?`; params.push(quarryId); }

    query += ` ORDER BY v.voucher_date, v.id`;

    const entries = db.prepare(query).all(...params);
    let runningBalance = 0;
    const ledger = entries.map(e => {
      runningBalance += (e.debit_amount || 0) - (e.credit_amount || 0);
      return { ...e, running_balance: runningBalance };
    });

    const totals = entries.reduce((acc, e) => {
      acc.totalDebit += e.debit_amount || 0;
      acc.totalCredit += e.credit_amount || 0;
      return acc;
    }, { totalDebit: 0, totalCredit: 0 });

    res.json({ account, ledger, totals });
  } catch (err) {
    console.error('Get ledger error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch ledger' });
  }
});

// GET /api/finance/royalty
router.get('/royalty', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, year } = req.query;
    let query = `
      SELECT rc.*, q.quarry_name
      FROM royalty_challans rc
      LEFT JOIN quarries q ON rc.quarry_id = q.id
      WHERE rc.org_id = ?
    `;
    const params = [req.user.orgId];
    if (quarryId) { query += ` AND rc.quarry_id = ?`; params.push(quarryId); }
    if (year) { query += ` AND rc.period_year = ?`; params.push(year); }
    query += ` ORDER BY rc.period_year DESC, rc.period_month DESC`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    console.error('Get royalty error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch royalty challans' });
  }
});

// POST /api/finance/royalty
router.post('/royalty', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      quarryId, periodMonth, periodYear, openingStockCbm, producedCbm,
      despatchedCbm, royaltyRatePerCbm, paymentDate
    } = req.body;

    if (!quarryId || !periodMonth || !periodYear) {
      return res.status(400).json({ error: 'Bad Request', message: 'quarryId, periodMonth, periodYear required' });
    }

    const closingStock = (openingStockCbm || 0) + (producedCbm || 0) - (despatchedCbm || 0);
    const rate = royaltyRatePerCbm || 0;
    const royaltyAmount = (despatchedCbm || 0) * rate;
    const dmfAmount = royaltyAmount * 0.10;
    const nmetAmount = royaltyAmount * 0.02;
    const totalAmount = royaltyAmount + dmfAmount + nmetAmount;

    const seq = db.prepare(`SELECT COUNT(*)+1 as n FROM royalty_challans WHERE org_id = ? AND quarry_id = ?`)
      .get(req.user.orgId, quarryId).n;
    const quarry = db.prepare(`SELECT quarry_code FROM quarries WHERE id = ?`).get(quarryId);
    const challanNo = `${quarry.quarry_code}/RC/${periodYear}/${String(periodMonth).padStart(2,'0')}/${String(seq).padStart(3,'0')}`;

    const result = db.prepare(`
      INSERT INTO royalty_challans (
        org_id, quarry_id, challan_no, period_month, period_year,
        opening_stock_cbm, produced_cbm, despatched_cbm, closing_stock_cbm,
        royalty_rate_per_cbm, royalty_amount, dmf_amount, nmet_amount, total_amount, payment_date
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, quarryId, challanNo, periodMonth, periodYear,
      openingStockCbm || 0, producedCbm || 0, despatchedCbm || 0, closingStock,
      rate, royaltyAmount, dmfAmount, nmetAmount, totalAmount, paymentDate || null
    );

    res.status(201).json(db.prepare(`SELECT * FROM royalty_challans WHERE id = ?`).get(result.lastInsertRowid));
  } catch (err) {
    console.error('Create royalty challan error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create royalty challan' });
  }
});

// GET /api/finance/summary (P&L summary)
router.get('/summary', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, from, to } = req.query;

    const buildFilter = (alias) => {
      let f = `WHERE ${alias}.org_id = ?`;
      const p = [req.user.orgId];
      if (from) { f += ` AND v.voucher_date >= ?`; p.push(from); }
      if (to) { f += ` AND v.voucher_date <= ?`; p.push(to); }
      if (quarryId) { f += ` AND ${alias}.quarry_id = ?`; p.push(quarryId); }
      return { f, p };
    };

    const { f, p } = buildFilter('vl');

    const byType = db.prepare(`
      SELECT a.account_type,
        COALESCE(SUM(vl.debit_amount),0) as total_debit,
        COALESCE(SUM(vl.credit_amount),0) as total_credit
      FROM voucher_lines vl
      JOIN vouchers v ON vl.voucher_id = v.id
      JOIN accounts a ON vl.account_id = a.id
      ${f}
      GROUP BY a.account_type
    `).all(...p);

    // Block summary
    const blockStats = db.prepare(`
      SELECT COUNT(*) as total_blocks, COALESCE(SUM(net_cbm),0) as total_cbm
      FROM blocks WHERE org_id = ?
      ${quarryId ? ' AND quarry_id = ?' : ''}
    `).get(...(quarryId ? [req.user.orgId, quarryId] : [req.user.orgId]));

    res.json({ accountSummary: byType, blockStats });
  } catch (err) {
    console.error('Get finance summary error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch finance summary' });
  }
});

// Fallback GET / for api client compatibility
router.get('/', authenticate, (req, res) => {
  res.json({ message: 'Finance API - use /accounts, /vouchers, /ledger, /royalty, /summary' });
});

export default router;
