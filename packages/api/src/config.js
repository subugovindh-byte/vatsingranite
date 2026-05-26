import 'dotenv/config';

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',

  // Database
  dbPath: process.env.DB_PATH || './data/vatsingranite.db',
  dbBackupPath: process.env.DB_BACKUP_PATH || './backups',
  dbWalMode: process.env.DB_WAL_MODE === 'true',

  // Security
  jwtSecret: process.env.JWT_SECRET || 'change_this_secret_in_production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/app.log',

  // Organization
  orgName: process.env.ORG_NAME || 'Vatsin Granite Quarry',
  orgCode: process.env.ORG_CODE || 'VATSIN',
  orgPan: process.env.ORG_PAN || 'AABCA1234B',
  orgGstin: process.env.ORG_GSTIN || '33AABCA1234B1Z5',
  orgEmail: process.env.ORG_EMAIL || 'info@vatsingranite.com',
  orgPhone: process.env.ORG_PHONE || '+91-4362-123456',

  // Admin user
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@vatsingranite.com',

  // Azure Blob Storage backup
  azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  azureStorageContainer: process.env.AZURE_STORAGE_CONTAINER || 'vatsingranite-backups',
};

export default config;
