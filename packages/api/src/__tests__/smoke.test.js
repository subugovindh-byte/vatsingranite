/**
 * Smoke / regression test suite
 * One representative transaction per API module.
 * Runs against a fresh in-memory test DB (path set via globalSetup.js).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { initializeDatabase, closeDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { seedDatabase } from '../db/seed.js';
import app from '../app.js';

let token;
let quarryId;
let customerId;
let blockId;
let soId;
let invoiceId;
let employeeId;
let assetId;
let accountIds = {};

// ─── Setup & Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  initializeDatabase();
  runMigrations();
  await seedDatabase();

  // Login once, reuse token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'Admin@123' });
  expect(res.status).toBe(200);
  token = res.body.token;
  expect(token).toBeTruthy();
});

afterAll(() => {
  closeDatabase();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

// ─── Health ───────────────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('POST /api/auth/login bad password → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me → 200', async () => {
    const res = await request(app).get('/api/auth/me').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
  });
});

// ─── Quarries ─────────────────────────────────────────────────────────────────

describe('Quarries', () => {
  it('GET /api/quarries → 200 with seeded quarries', async () => {
    const res = await request(app).get('/api/quarries').set(auth());
    expect(res.status).toBe(200);
    const quarries = res.body.quarries ?? res.body;
    expect(Array.isArray(quarries)).toBe(true);
    expect(quarries.length).toBeGreaterThan(0);
    quarryId = quarries[0].id;
  });
});

// ─── Blocks ───────────────────────────────────────────────────────────────────

describe('Blocks', () => {
  it('GET /api/blocks → 200', async () => {
    const res = await request(app).get('/api/blocks').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/blocks → 201 creates a block', async () => {
    const res = await request(app)
      .post('/api/blocks')
      .set(auth())
      .send({
        quarryId,
        varietyId: 1,
        lengthMm: 2200,
        widthMm: 1400,
        heightMm: 900,
        extractionDate: new Date().toISOString().slice(0, 10),
      });
    expect(res.status).toBe(201);
    blockId = res.body.id;
    expect(blockId).toBeTruthy();
  });

  it('GET /api/blocks/:id → 200', async () => {
    if (!blockId) return;
    const res = await request(app).get(`/api/blocks/${blockId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.block_no).toBeTruthy();
  });
});

// ─── Sales ────────────────────────────────────────────────────────────────────

describe('Sales', () => {
  it('GET /api/sales/customers → 200', async () => {
    const res = await request(app).get('/api/sales/customers').set(auth());
    expect(res.status).toBe(200);
    const custs = res.body.customers ?? res.body;
    expect(Array.isArray(custs)).toBe(true);
    expect(custs.length).toBeGreaterThan(0);
    customerId = custs[0].id;
  });

  it('POST /api/sales/orders → 201 creates a sales order', async () => {
    const res = await request(app)
      .post('/api/sales/orders')
      .set(auth())
      .send({
        quarryId,
        customerId,
        orderDate: new Date().toISOString().slice(0, 10),
        lines: [{ quantityCbm: 5, ratePerCbm: 8500, gstRate: 5 }],
      });
    expect(res.status).toBe(201);
    soId = res.body.orderId;
    expect(soId).toBeTruthy();
  });

  it('GET /api/sales/orders → 200', async () => {
    const res = await request(app).get('/api/sales/orders').set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

describe('Invoices', () => {
  it('POST /api/invoices → 201 creates an invoice', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set(auth())
      .send({
        despatchQuarryId: quarryId,
        invoiceDate: new Date().toISOString().slice(0, 10),
        customerId,
        soId: soId ?? null,
        placeOfSupply: 'Tamil Nadu',
        taxableValue: 42500,
        cgstAmount: 1062.5,
        sgstAmount: 1062.5,
        igstAmount: 0,
        status: 'draft',
      });
    expect(res.status).toBe(201);
    invoiceId = res.body.id;
    expect(invoiceId).toBeTruthy();
  });

  it('GET /api/invoices → 200', async () => {
    const res = await request(app).get('/api/invoices').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.invoices).toBeDefined();
  });

  it('PATCH /api/invoices/:id/status → 200 posts invoice', async () => {
    if (!invoiceId) return;
    const res = await request(app)
      .patch(`/api/invoices/${invoiceId}/status`)
      .set(auth())
      .send({ status: 'posted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('posted');
  });
});

// ─── Finance ──────────────────────────────────────────────────────────────────

describe('Finance', () => {
  it('GET /api/finance/accounts → 200', async () => {
    const res = await request(app).get('/api/finance/accounts').set(auth());
    expect(res.status).toBe(200);
    const accounts = Array.isArray(res.body) ? res.body : [];
    // Capture two account IDs for the voucher test
    if (accounts.length >= 2) {
      accountIds.debit = accounts.find(a => a.account_type === 'Asset')?.id;
      accountIds.credit = accounts.find(a => a.account_type === 'Income')?.id ?? accounts[1].id;
    }
  });

  it('POST /api/finance/vouchers → 201 (balanced)', async () => {
    if (!accountIds.debit || !accountIds.credit) return;
    const res = await request(app)
      .post('/api/finance/vouchers')
      .set(auth())
      .send({
        voucherType: 'journal',
        voucherDate: new Date().toISOString().slice(0, 10),
        narration: 'Smoke test journal entry',
        defaultQuarryId: quarryId,
        lines: [
          { accountId: accountIds.debit,  debitAmount: 10000, creditAmount: 0 },
          { accountId: accountIds.credit, debitAmount: 0,     creditAmount: 10000 },
        ],
      });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/finance/royalty → 200', async () => {
    const res = await request(app).get('/api/finance/royalty').set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Production ───────────────────────────────────────────────────────────────

describe('Production', () => {
  it('GET /api/production → 200', async () => {
    const res = await request(app).get('/api/production').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/production → 201', async () => {
    const res = await request(app)
      .post('/api/production')
      .set(auth())
      .send({
        quarryId,
        productionDate: new Date().toISOString().slice(0, 10),
        shiftType: 'day',
        blocksProduced: 2,
        grossCbm: 5.5,
      });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Blasting ─────────────────────────────────────────────────────────────────

describe('Blasting', () => {
  it('GET /api/blasting → 200', async () => {
    const res = await request(app).get('/api/blasting').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/blasting → 201', async () => {
    const res = await request(app)
      .post('/api/blasting')
      .set(auth())
      .send({
        quarryId,
        blastDate: new Date().toISOString().slice(0, 10),
        shiftType: 'day',
        noOfHoles: 20,
        explosiveUsedKg: 15,
        detonatorsUsed: 20,
      });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Assets ───────────────────────────────────────────────────────────────────

describe('Assets', () => {
  it('GET /api/assets → 200', async () => {
    const res = await request(app).get('/api/assets').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/assets → 201', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set(auth())
      .send({
        assetName: 'Smoke Test Compressor',
        assetCategory: 'machinery',
        currentQuarryId: quarryId,
        purchaseDate: new Date().toISOString().slice(0, 10),
        purchaseCost: 500000,
        operationalStatus: 'active',
      });
    expect([200, 201]).toContain(res.status);
    assetId = res.body.id;
  });
});

// ─── Employees ────────────────────────────────────────────────────────────────

describe('Employees', () => {
  it('GET /api/employees → 200', async () => {
    const res = await request(app).get('/api/employees').set(auth());
    expect(res.status).toBe(200);
    const emps = res.body.employees ?? res.body;
    expect(Array.isArray(emps)).toBe(true);
    expect(emps.length).toBeGreaterThan(0);
    employeeId = emps[0].id;
  });

  it('GET /api/employees/:id → 200', async () => {
    if (!employeeId) return;
    const res = await request(app).get(`/api/employees/${employeeId}`).set(auth());
    expect(res.status).toBe(200);
  });

  it('GET /api/employees/payroll/runs → 200', async () => {
    const res = await request(app).get('/api/employees/payroll/runs').set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Weighments ───────────────────────────────────────────────────────────────

describe('Weighments', () => {
  it('GET /api/weighments → 200', async () => {
    const res = await request(app).get('/api/weighments').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/weighments → 201', async () => {
    const res = await request(app)
      .post('/api/weighments')
      .set(auth())
      .send({
        quarryId,
        weighmentDate: new Date().toISOString().slice(0, 10),
        vehicleNo: 'TN-33-SMOKE',
        grossWeightKg: 32000,
        tareWeightKg: 12000,
        materialType: 'block',
      });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Consumables ──────────────────────────────────────────────────────────────

describe('Consumables', () => {
  it('GET /api/consumables → 200', async () => {
    const res = await request(app).get('/api/consumables').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/consumables → 201', async () => {
    const res = await request(app)
      .post('/api/consumables')
      .set(auth())
      .send({
        quarryId,
        itemName: 'Diesel',
        itemCategory: 'fuel',
        unit: 'litres',
        receivedQty: 100,
        unitCost: 89.5,
        recordDate: new Date().toISOString().slice(0, 10),
      });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Maintenance ──────────────────────────────────────────────────────────────

describe('Maintenance', () => {
  it('GET /api/maintenance → 200', async () => {
    const res = await request(app).get('/api/maintenance').set(auth());
    expect(res.status).toBe(200);
  });

  it('POST /api/maintenance → 201 (requires asset)', async () => {
    if (!assetId) return;
    const res = await request(app)
      .post('/api/maintenance')
      .set(auth())
      .send({
        quarryId,
        assetId,
        jobType: 'preventive',
        description: 'Smoke test maintenance job',
        scheduledDate: new Date().toISOString().slice(0, 10),
      });
    expect([200, 201]).toContain(res.status);
  });
});

// ─── Compliance ───────────────────────────────────────────────────────────────

describe('Compliance', () => {
  it('GET /api/compliance/permits → 200', async () => {
    const res = await request(app).get('/api/compliance/permits').set(auth());
    expect(res.status).toBe(200);
  });

  it('GET /api/compliance/safety → 200', async () => {
    const res = await request(app).get('/api/compliance/safety').set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

describe('Reports', () => {
  it('GET /api/reports/stock → 200', async () => {
    const res = await request(app).get('/api/reports/stock').set(auth());
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/dpr → 200', async () => {
    const res = await request(app).get('/api/reports/dpr').set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

describe('Admin', () => {
  it('GET /api/admin/stats → 200', async () => {
    const res = await request(app).get('/api/admin/stats').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.master).toBeDefined();
    expect(res.body.transactions).toBeDefined();
    expect(typeof res.body.transactions.blocks).toBe('number');
  });

  it('POST /api/admin/purge → 200 wipes transaction data', async () => {
    const res = await request(app).post('/api/admin/purge').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('stats after purge: all data cleared, org + users intact', async () => {
    const res = await request(app).get('/api/admin/stats').set(auth());
    expect(res.body.transactions.blocks).toBe(0);
    expect(res.body.transactions.invoices).toBe(0);
    expect(res.body.transactions.sales_orders).toBe(0);
    expect(res.body.allClear).toBe(true);
    // Purge clears ALL data — quarries, customers, employees all go to 0
    expect(res.body.master.quarries).toBe(0);
    expect(res.body.master.customers).toBe(0);
    // Org and user accounts are preserved
    expect(res.body.master.organizations).toBeGreaterThan(0);
    expect(res.body.master.users).toBeGreaterThan(0);
  });

  it('POST /api/admin/reseed → 200', async () => {
    const res = await request(app).post('/api/admin/reseed').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('unauthenticated purge → 401', async () => {
    const res = await request(app).post('/api/admin/purge');
    expect(res.status).toBe(401);
  });
});
