import { Router } from 'express';
import { createReadStream, mkdirSync, copyFileSync, existsSync, readdirSync, statSync, renameSync, writeFileSync } from 'fs';
import { join, resolve, basename } from 'path';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import { getDb, closeDatabase, initializeDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { seedDatabase, seedMinimal } from '../db/seed.js';
import config from '../config.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// All data tables in deletion order (FK-safe). Excludes organizations, roles, users, user_roles.
// Used by /purge (clears everything except user accounts) and /factory-reset (also clears users).
const DATA_TABLES = [
  // transactions
  'invoice_lines', 'invoices',
  'sales_order_lines', 'sales_orders',
  'production_logs', 'blast_events',
  'weighments', 'consumables',
  'maintenance_jobs',
  'payroll_details', 'payroll_runs',
  'voucher_lines', 'vouchers',
  'royalty_challans', 'photos', 'assets',
  'attendance', 'safety_incidents', 'blocks',
  'permits',
  // master data (customers, quarries, etc.) — included so purge gives a clean slate
  'employees', 'customers', 'suppliers',
  'varieties', 'locations', 'cost_centers',
  'leases', 'accounts',
  'quarries',
];

// Keep for backward compatibility (reseed uses this)
const TRANSACTION_TABLES = DATA_TABLES;

// POST /api/admin/purge
// Wipes ALL data (transactions + master) but keeps org, roles, and user accounts.
router.post('/purge', (req, res) => {
  try {
    const db = getDb();
    const deleted = {};

    db.transaction(() => {
      db.pragma('foreign_keys = OFF');
      for (const tbl of DATA_TABLES) {
        try {
          const info = db.prepare(`DELETE FROM ${tbl}`).run();
          deleted[tbl] = info.changes;
        } catch {
          deleted[tbl] = 'skipped';
        }
      }
      try { db.prepare(`DELETE FROM sqlite_sequence WHERE name != 'organizations' AND name != 'roles' AND name != 'users' AND name != 'user_roles'`).run(); } catch { /* skip */ }
      db.pragma('foreign_keys = ON');
    })();

    res.json({ ok: true, message: 'All data purged — org and user accounts retained', deleted });
  } catch (err) {
    console.error('Purge error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Purge failed' });
  }
});

// POST /api/admin/reseed
// Purges transaction data then restores sample data via seed.
router.post('/reseed', async (req, res) => {
  try {
    const db = getDb();

    db.transaction(() => {
      db.pragma('foreign_keys = OFF');
      for (const tbl of DATA_TABLES) {
        try { db.prepare(`DELETE FROM ${tbl}`).run(); } catch { /* skip */ }
      }
      db.pragma('foreign_keys = ON');
    })();

    await seedDatabase();

    res.json({ ok: true, message: 'Transaction data purged and sample data reseeded' });
  } catch (err) {
    console.error('Reseed error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Reseed failed' });
  }
});

const MASTER_TABLES = [
  'organizations', 'quarries', 'varieties', 'locations', 'cost_centers',
  'users', 'roles', 'user_roles', 'customers', 'employees', 'accounts',
  'suppliers', 'leases',
];

// All tables in deletion order (children before parents for FK safety)
const ALL_TABLES = [
  // transactions first
  'invoice_lines', 'invoices',
  'sales_order_lines', 'sales_orders',
  'production_logs', 'blast_events',
  'weighments', 'consumables',
  'maintenance_jobs',
  'payroll_details', 'payroll_runs',
  'voucher_lines', 'vouchers',
  'royalty_challans', 'photos', 'assets',
  'attendance', 'safety_incidents', 'blocks',
  'permits',
  // master last
  'user_roles', 'users', 'roles',
  'employees', 'customers', 'suppliers',
  'varieties', 'locations', 'cost_centers',
  'leases', 'accounts',
  'quarries', 'organizations',
];

// POST /api/admin/factory-reset
// Wipes EVERYTHING including master data, then creates only org + admin user.
// No demo quarries, customers, employees, or transactions — truly blank slate.
router.post('/factory-reset', async (req, res) => {
  try {
    const db = getDb();

    db.transaction(() => {
      db.pragma('foreign_keys = OFF');
      for (const tbl of ALL_TABLES) {
        try { db.prepare(`DELETE FROM ${tbl}`).run(); } catch { /* skip */ }
      }
      // Reset autoincrement counters so IDs restart from 1
      try { db.prepare(`DELETE FROM sqlite_sequence`).run(); } catch { /* skip */ }
      db.pragma('foreign_keys = ON');
    })();

    await seedMinimal();

    res.json({ ok: true, message: 'Factory reset complete — system wiped, admin user only' });
  } catch (err) {
    console.error('Factory reset error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Factory reset failed' });
  }
});

// GET /api/admin/stats — row counts split into master vs transaction
router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    const master = {}, transactions = {};

    for (const tbl of MASTER_TABLES) {
      try { master[tbl] = db.prepare(`SELECT COUNT(*) as n FROM ${tbl}`).get().n; }
      catch { master[tbl] = 'n/a'; }
    }
    for (const tbl of TRANSACTION_TABLES) {
      try { transactions[tbl] = db.prepare(`SELECT COUNT(*) as n FROM ${tbl}`).get().n; }
      catch { transactions[tbl] = 'n/a'; }
    }

    const allClear = Object.values(transactions).every(v => v === 0 || v === 'n/a');
    res.json({ master, transactions, allClear });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Stats failed' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function backupDir() {
  // On Azure App Service the writable root is /home; locally use ./backups
  const dir = config.dbBackupPath || './backups';
  mkdirSync(dir, { recursive: true });
  return resolve(dir);
}

function timestampedName() {
  return `vatsingranite-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`;
}

// GET /api/admin/backup/list — list local backup files
router.get('/backup/list', (req, res) => {
  try {
    const dir = backupDir();
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter(f => f.endsWith('.db'))
          .map(f => {
            const st = statSync(join(dir, f));
            return { name: f, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];
    res.json({ backups: files, dir });
  } catch (err) {
    res.status(500).json({ error: 'List failed', message: err.message });
  }
});

// POST /api/admin/backup/local — copy DB to backups folder
router.post('/backup/local', (req, res) => {
  try {
    const dbPath = resolve(config.dbPath);
    const dest = join(backupDir(), timestampedName());

    // Checkpoint WAL so the copy is consistent
    const db = getDb();
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* non-WAL DB */ }

    copyFileSync(dbPath, dest);
    const st = statSync(dest);
    res.json({ ok: true, message: 'Local backup created', file: basename(dest), sizeBytes: st.size });
  } catch (err) {
    console.error('Local backup error:', err);
    res.status(500).json({ error: 'Backup failed', message: err.message });
  }
});

// POST /api/admin/backup/blob — upload DB to Azure Blob Storage
router.post('/backup/blob', async (req, res) => {
  if (!config.azureStorageConnectionString) {
    return res.status(400).json({
      error: 'Not configured',
      message: 'AZURE_STORAGE_CONNECTION_STRING is not set on this server',
    });
  }
  try {
    const dbPath = resolve(config.dbPath);
    const blobName = timestampedName();

    // Checkpoint WAL for consistent snapshot
    const db = getDb();
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* non-WAL DB */ }

    const client = BlobServiceClient.fromConnectionString(config.azureStorageConnectionString);
    const container = client.getContainerClient(config.azureStorageContainer);
    await container.createIfNotExists();

    const blockBlob = container.getBlockBlobClient(blobName);
    await blockBlob.uploadFile(dbPath, {
      blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
    });

    res.json({
      ok: true,
      message: 'Backup uploaded to Azure Blob Storage',
      blob: blobName,
      container: config.azureStorageContainer,
      url: blockBlob.url,
    });
  } catch (err) {
    console.error('Blob backup error:', err);
    res.status(500).json({ error: 'Blob backup failed', message: err.message });
  }
});

// POST /api/admin/backup/restore — replace DB with an uploaded .db file
const restoreUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith('.db')) {
      return cb(new Error('Only .db files are accepted'));
    }
    cb(null, true);
  },
});

router.post('/backup/restore', restoreUpload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file', message: 'Upload a .db file in the "file" field' });
  }

  // Verify SQLite magic bytes: "SQLite format 3\0"
  const magic = req.file.buffer.slice(0, 16).toString('utf8');
  if (!magic.startsWith('SQLite format 3')) {
    return res.status(400).json({ error: 'Invalid file', message: 'Not a valid SQLite database' });
  }

  try {
    const dbPath = resolve(config.dbPath);
    const safeguard = `${dbPath}.pre-restore-${Date.now()}`;

    // 1. Checkpoint WAL + snapshot current DB before replacing
    try {
      const db = getDb();
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch { /* best-effort */ }

    // 2. Close the current connection
    closeDatabase();

    // 3. Move current DB to a safeguard copy (in-place rollback if restore fails)
    try { copyFileSync(dbPath, safeguard); } catch { /* DB may not exist */ }

    // 4. Write the uploaded bytes as the new DB file
    writeFileSync(dbPath, req.file.buffer);

    // 5. Re-open + run migrations (in case the backup is from an older schema)
    initializeDatabase();
    try { runMigrations(); } catch { /* ignore if migration fails */ }

    const sizeKb = Math.round(req.file.buffer.length / 1024);
    res.json({
      ok: true,
      message: `Database restored from ${req.file.originalname}`,
      sizeKb,
      safeguard: basename(safeguard),
    });
  } catch (err) {
    console.error('Restore error:', err);
    // Try to re-open whatever DB is there
    try { initializeDatabase(); } catch { /* ignore */ }
    res.status(500).json({ error: 'Restore failed', message: err.message });
  }
});

// GET /api/admin/backup/download — stream DB file as attachment
router.get('/backup/download', (req, res) => {
  try {
    const dbPath = resolve(config.dbPath);

    // Checkpoint WAL so download is consistent
    const db = getDb();
    try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* non-WAL DB */ }

    const filename = `vatsingranite-${new Date().toISOString().slice(0, 10)}.db`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    createReadStream(dbPath).pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed', message: err.message });
  }
});

// GET /api/admin/org — fetch current organisation record
router.get('/org', (req, res) => {
  try {
    const db = getDb();
    const org = db.prepare(`SELECT * FROM organizations WHERE id = ?`).get(req.user.orgId);
    if (!org) return res.status(404).json({ error: 'Org not found' });
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch org', message: err.message });
  }
});

// PUT /api/admin/org — update organisation details (used by setup wizard + Settings)
router.put('/org', (req, res) => {
  try {
    const db = getDb();
    const { orgName, legalEntityType, pan, gstin, registeredAddress, contactEmail, contactPhone } = req.body;
    db.prepare(`
      UPDATE organizations SET
        org_name = COALESCE(?, org_name),
        legal_entity_type = COALESCE(?, legal_entity_type),
        pan = COALESCE(?, pan),
        gstin = COALESCE(?, gstin),
        registered_address = COALESCE(?, registered_address),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone)
      WHERE id = ?
    `).run(orgName || null, legalEntityType || null, pan || null, gstin || null, registeredAddress || null, contactEmail || null, contactPhone || null, req.user.orgId);
    const org = db.prepare(`SELECT * FROM organizations WHERE id = ?`).get(req.user.orgId);
    res.json({ ok: true, org });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update org', message: err.message });
  }
});

export default router;
