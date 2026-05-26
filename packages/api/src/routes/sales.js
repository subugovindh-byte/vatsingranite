import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query, queryOne, execute } from '../db/index.js';

const router = Router();

router.use(authenticate);

router.get('/', (req, res) => { res.json([]); });

// Sales orders list
router.get('/orders', async (req, res, next) => {
  try {
    const { quarryId, customerId, status, fromDate, toDate, limit = 50, offset = 0 } = req.query;
    const orgId = req.user.orgId;

    let sql = `
      SELECT
        so.id,
        so.so_no      AS order_no,
        so.so_date    AS order_date,
        so.status,
        so.total_value,
        so.is_export,
        so.buyer_country,
        so.advance_received,
        so.customer_id,
        so.source_quarry_id AS quarry_id,
        c.customer_name,
        q.quarry_name,
        COALESCE(SUM(sol.qty_cbm), 0)    AS total_cbm,
        COALESCE(SUM(sol.line_value), 0) AS order_value,
        COUNT(sol.id)                     AS line_count
      FROM sales_orders so
      LEFT JOIN customers c  ON so.customer_id = c.id
      LEFT JOIN quarries q   ON so.source_quarry_id = q.id
      LEFT JOIN sales_order_lines sol ON sol.so_id = so.id
      WHERE so.org_id = ?
    `;
    const params = [orgId];

    if (quarryId)   { sql += ' AND so.source_quarry_id = ?'; params.push(quarryId); }
    if (customerId) { sql += ' AND so.customer_id = ?';       params.push(customerId); }
    if (status)     { sql += ' AND so.status = ?';            params.push(status); }
    if (fromDate)   { sql += ' AND so.so_date >= ?';          params.push(fromDate); }
    if (toDate)     { sql += ' AND so.so_date <= ?';          params.push(toDate); }

    sql += ' GROUP BY so.id ORDER BY so.so_date DESC, so.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = await query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM sales_orders WHERE org_id = ?';
    const countParams = [orgId];
    if (quarryId)   { countSql += ' AND source_quarry_id = ?'; countParams.push(quarryId); }
    if (customerId) { countSql += ' AND customer_id = ?';       countParams.push(customerId); }
    if (status)     { countSql += ' AND status = ?';            countParams.push(status); }

    const { total } = await queryOne(countSql, countParams);

    res.json({ orders, pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: parseInt(offset) + orders.length < total } });
  } catch (error) {
    next(error);
  }
});

// Single sales order with lines
router.get('/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    const order = await queryOne(`
      SELECT
        so.*,
        so.so_no      AS order_no,
        so.so_date    AS order_date,
        so.source_quarry_id AS quarry_id,
        c.customer_name,
        c.phone  AS customer_phone,
        c.email  AS customer_email,
        c.address AS customer_address,
        c.gstin  AS customer_gstin,
        c.pan    AS customer_pan,
        q.quarry_name,
        q.quarry_code,
        q.gstin  AS quarry_gstin,
        q.address AS quarry_address
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN quarries q  ON so.source_quarry_id = q.id
      WHERE so.id = ? AND so.org_id = ?
    `, [id, orgId]);

    if (!order) return res.status(404).json({ error: 'Sales order not found' });

    const lines = await query(`
      SELECT
        sol.*,
        sol.qty_cbm    AS quantity_cbm,
        sol.line_value AS line_total,
        v.variety_name
      FROM sales_order_lines sol
      LEFT JOIN varieties v ON sol.variety_id = v.id
      WHERE sol.so_id = ?
      ORDER BY sol.line_no
    `, [id]);

    order.lines = lines;
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Create sales order
router.post('/orders', async (req, res, next) => {
  try {
    const { quarryId, customerId, orderDate, lines = [] } = req.body;
    const orgId = req.user.orgId;

    if (!customerId || !orderDate) {
      return res.status(400).json({ error: 'customerId and orderDate are required' });
    }

    const year = new Date(orderDate).getFullYear();
    // SQLite INSTR takes only 2 args — find second '/' by chaining: pos of '/' after the first '/'
    const row = await queryOne(
      `SELECT MAX(CAST(SUBSTR(so_no, INSTR(so_no, '/') + INSTR(SUBSTR(so_no, INSTR(so_no, '/') + 1), '/') + 1) AS INTEGER)) AS mx
       FROM sales_orders WHERE org_id = ? AND so_no LIKE ?`,
      [orgId, `SO/${year}/%`]
    );
    const seq = ((row && row.mx) || 0) + 1;
    const soNo = `SO/${year}/${String(seq).padStart(6, '0')}`;

    // Accept both qtyCbm (API canonical) and quantityCbm (frontend alias)
    const totalValue = lines.reduce((s, l) => s + (Number(l.qtyCbm ?? l.quantityCbm ?? 0) * Number(l.ratePerCbm || 0)), 0);

    const result = await execute(
      `INSERT INTO sales_orders (org_id, so_no, so_date, customer_id, source_quarry_id, total_value, status) VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [orgId, soNo, orderDate, customerId, quarryId || null, totalValue]
    );
    const soId = result.lastInsertRowid;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const qtyCbm = Number(l.qtyCbm ?? l.quantityCbm ?? 0);
      const rate = Number(l.ratePerCbm || 0);
      await execute(
        `INSERT INTO sales_order_lines (org_id, so_id, line_no, variety_id, grade, qty_cbm, rate_per_cbm, line_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orgId, soId, i + 1, l.varietyId || null, l.grade || null, qtyCbm, rate, qtyCbm * rate]
      );
    }

    res.status(201).json({ message: 'Sales order created', orderId: soId, orderNo: soNo });
  } catch (error) {
    next(error);
  }
});

// Update status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.user.orgId;
    const valid = ['open', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await execute(`UPDATE sales_orders SET status = ? WHERE id = ? AND org_id = ?`, [status, id, orgId]);
    res.json({ message: 'Status updated' });
  } catch (error) {
    next(error);
  }
});

// Invoices list
router.get('/invoices', async (req, res, next) => {
  try {
    const { quarryId, customerId, status, limit = 50, offset = 0 } = req.query;
    const orgId = req.user.orgId;

    let sql = `
      SELECT i.*, c.customer_name, q.quarry_name, COUNT(il.id) AS line_count
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN quarries q  ON i.despatch_quarry_id = q.id
      LEFT JOIN invoice_lines il ON il.invoice_id = i.id
      WHERE i.org_id = ?
    `;
    const params = [orgId];
    if (quarryId)   { sql += ' AND i.despatch_quarry_id = ?'; params.push(quarryId); }
    if (customerId) { sql += ' AND i.customer_id = ?';        params.push(customerId); }
    if (status)     { sql += ' AND i.status = ?';             params.push(status); }
    sql += ' GROUP BY i.id ORDER BY i.invoice_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const invoices = await query(sql, params);
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

// Single invoice with lines
router.get('/invoices/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    const invoice = await queryOne(`
      SELECT i.*, c.customer_name, c.address AS customer_address, c.gstin AS customer_gstin,
             q.quarry_name, q.gstin AS quarry_gstin
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN quarries q  ON i.despatch_quarry_id = q.id
      WHERE i.id = ? AND i.org_id = ?
    `, [id, orgId]);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const lines = await query(`
      SELECT il.*, b.block_no, v.variety_name
      FROM invoice_lines il
      LEFT JOIN blocks b    ON il.block_id = b.id
      LEFT JOIN varieties v ON b.variety_id = v.id
      WHERE il.invoice_id = ?
      ORDER BY il.line_no
    `, [id]);

    invoice.lines = lines;
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Customers list
router.get('/customers', async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    const customers = await query(
      `SELECT id, customer_code, customer_name, phone, email, city, state, gstin FROM customers WHERE org_id = ? AND active = 1 ORDER BY customer_name`,
      [orgId]
    );
    res.json({ customers });
  } catch (error) {
    next(error);
  }
});

export default router;
