import { Router } from 'express';
import { getDb } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/invoices
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { quarryId, customerId, status, from, to, invoiceType, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT i.*, c.customer_name, q.quarry_name, so.so_no
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN quarries q ON i.despatch_quarry_id = q.id
      LEFT JOIN sales_orders so ON i.so_id = so.id
      WHERE i.org_id = ?
    `;
    const params = [req.user.orgId];

    if (quarryId) { query += ` AND i.despatch_quarry_id = ?`; params.push(quarryId); }
    if (customerId) { query += ` AND i.customer_id = ?`; params.push(customerId); }
    if (status) { query += ` AND i.status = ?`; params.push(status); }
    if (invoiceType) { query += ` AND i.invoice_type = ?`; params.push(invoiceType); }
    if (from) { query += ` AND i.invoice_date >= ?`; params.push(from); }
    if (to) { query += ` AND i.invoice_date <= ?`; params.push(to); }

    query += ` ORDER BY i.invoice_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const invoices = db.prepare(query).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM invoices WHERE org_id = ?`).get(req.user.orgId);

    res.json({ invoices, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } });
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const invoice = db.prepare(`
      SELECT i.*, c.customer_name, c.gstin as buyer_gstin, c.address as buyer_address,
        q.quarry_name, q.quarry_code, so.so_no
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN quarries q ON i.despatch_quarry_id = q.id
      LEFT JOIN sales_orders so ON i.so_id = so.id
      WHERE i.id = ? AND i.org_id = ?
    `).get(req.params.id, req.user.orgId);

    if (!invoice) return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });

    const lines = db.prepare(`
      SELECT il.*, b.block_no, v.variety_name
      FROM invoice_lines il
      LEFT JOIN blocks b ON il.block_id = b.id
      LEFT JOIN varieties v ON il.variety_id = v.id
      WHERE il.invoice_id = ? AND il.org_id = ?
      ORDER BY il.line_no
    `).all(req.params.id, req.user.orgId);

    res.json({ ...invoice, lines });
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const {
      despatchQuarryId, invoiceDate, invoiceType = 'sale', customerId, soId,
      placeOfSupply, gstinOfBuyer, lines = [], eWayBillNo, shippingBillNo
    } = req.body;

    if (!despatchQuarryId || !invoiceDate || !customerId) {
      return res.status(400).json({ error: 'Bad Request', message: 'despatchQuarryId, invoiceDate, customerId are required' });
    }

    const quarry = db.prepare(`SELECT quarry_code, gstin FROM quarries WHERE id = ?`).get(despatchQuarryId);
    if (!quarry) return res.status(404).json({ error: 'Quarry not found' });

    const isInterstate = placeOfSupply && placeOfSupply.toLowerCase() !== 'tamil nadu';

    // Compute totals — either from line items or from pre-computed body values
    let taxableValue = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    let processedLines = [];

    if (lines && lines.length > 0) {
      processedLines = lines.map((line, i) => {
        const taxable = (line.qtyCbm || 0) * (line.ratePerCbm || 0);
        const gstRate = line.gstRate || 5;
        const gstAmt = taxable * gstRate / 100;
        taxableValue += taxable;
        if (isInterstate) { igstAmount += gstAmt; } else { cgstAmount += gstAmt / 2; sgstAmount += gstAmt / 2; }
        return { ...line, taxableValue: taxable, gstAmount: gstAmt, lineTotal: taxable + gstAmt, lineNo: i + 1 };
      });
    } else {
      // Simple invoice entry — totals provided directly in body
      taxableValue = Number(req.body.taxableValue || 0);
      cgstAmount   = Number(req.body.cgstAmount   || 0);
      sgstAmount   = Number(req.body.sgstAmount   || 0);
      igstAmount   = Number(req.body.igstAmount   || 0);
    }

    const invoiceValue = taxableValue + cgstAmount + sgstAmount + igstAmount;

    // Generate invoice number using FY derived from invoice date
    const yr = new Date(invoiceDate);
    const fy = yr.getMonth() >= 3 ? yr.getFullYear() : yr.getFullYear() - 1;
    const seqRow = db.prepare(
      `SELECT COUNT(*)+1 as n FROM invoices WHERE org_id = ? AND despatch_quarry_id = ?
       AND strftime('%Y', invoice_date) = ? `
    ).get(req.user.orgId, despatchQuarryId, String(fy));
    const seq = seqRow?.n || 1;
    const invoiceNo = `${quarry.quarry_code}/INV/${fy}-${String(fy+1).slice(-2)}/${String(seq).padStart(5,'0')}`;

    const result = db.prepare(`
      INSERT INTO invoices (
        org_id, despatch_quarry_id, invoice_no, invoice_date, invoice_type, customer_id, so_id,
        place_of_supply, gstin_of_supplier, gstin_of_buyer, taxable_value,
        cgst_amount, sgst_amount, igst_amount, invoice_value,
        e_way_bill_no, shipping_bill_no, irn, status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.user.orgId, despatchQuarryId, invoiceNo, invoiceDate, invoiceType,
      customerId, soId || null, placeOfSupply || null, quarry.gstin || null, gstinOfBuyer || null,
      taxableValue, cgstAmount, sgstAmount, igstAmount, invoiceValue,
      eWayBillNo || null, shippingBillNo || null, req.body.irn || null,
      req.body.status || 'draft'
    );

    const invoiceId = result.lastInsertRowid;

    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (org_id, invoice_id, line_no, block_id, variety_id, hsn_code, qty_cbm, rate_per_cbm, taxable_value, gst_rate, gst_amount, line_total)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    for (const line of processedLines) {
      insertLine.run(
        req.user.orgId, invoiceId, line.lineNo, line.blockId || null, line.varietyId || null,
        line.hsnCode || '2516', line.qtyCbm || 0, line.ratePerCbm || 0,
        line.taxableValue, line.gstRate || 5, line.gstAmount, line.lineTotal
      );

      // Update block status to sold if blockId provided
      if (line.blockId) {
        db.prepare(`UPDATE blocks SET status = 'sold', invoice_id = ? WHERE id = ? AND org_id = ?`)
          .run(invoiceId, line.blockId, req.user.orgId);
      }
    }

    const invoice = db.prepare(`
      SELECT i.*, c.customer_name, q.quarry_name
      FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN quarries q ON i.despatch_quarry_id = q.id
      WHERE i.id = ?
    `).get(invoiceId);
    const iLines = db.prepare(`SELECT il.*, b.block_no, v.variety_name FROM invoice_lines il LEFT JOIN blocks b ON il.block_id = b.id LEFT JOIN varieties v ON il.variety_id = v.id WHERE il.invoice_id = ?`).all(invoiceId);

    res.status(201).json({ ...invoice, lines: iLines });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create invoice' });
  }
});

// PATCH /api/invoices/:id/status
router.patch('/:id/status', authenticate, (req, res) => {
  try {
    const db = getDb();
    const { status, eWayBillNo, shippingBillNo, irn, ackNo } = req.body;

    const invoice = db.prepare(`SELECT id FROM invoices WHERE id = ? AND org_id = ?`).get(req.params.id, req.user.orgId);
    if (!invoice) return res.status(404).json({ error: 'Not Found', message: 'Invoice not found' });

    db.prepare(`
      UPDATE invoices SET
        status = COALESCE(?, status),
        e_way_bill_no = COALESCE(?, e_way_bill_no),
        shipping_bill_no = COALESCE(?, shipping_bill_no),
        irn = COALESCE(?, irn),
        ack_no = COALESCE(?, ack_no)
      WHERE id = ?
    `).run(status, eWayBillNo, shippingBillNo, irn, ackNo, req.params.id);

    res.json(db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id));
  } catch (err) {
    console.error('Update invoice status error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update invoice status' });
  }
});

export default router;
