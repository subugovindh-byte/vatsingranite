import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Routes
import authRoutes from './routes/auth.js';
import quarryRoutes from './routes/quarries.js';
import blockRoutes from './routes/blocks.js';
import salesRoutes from './routes/sales.js';
import financeRoutes from './routes/finance.js';
import productionRoutes from './routes/production.js';
import blastingRoutes from './routes/blasting.js';
import assetRoutes from './routes/assets.js';
import invoiceRoutes from './routes/invoices.js';
import employeeRoutes from './routes/employees.js';
import complianceRoutes from './routes/compliance.js';
import photoRoutes from './routes/photos.js';
import weighmentRoutes from './routes/weighments.js';
import consumableRoutes from './routes/consumables.js';
import maintenanceRoutes from './routes/maintenance.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';

// Configuration
import config from './config.js';

// ============================================================================
// LOGGER
// ============================================================================
const logger = pino({
  level: config.logLevel,
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
  } : undefined
});

// ============================================================================
// APP
// ============================================================================
const app = express();
app.set('trust proxy', 1);

app.use(pinoHttp({ logger }));

// Security guards
if (config.env === 'production' && config.jwtSecret === 'change_this_secret_in_production') {
  console.error('FATAL: JWT_SECRET is set to the default value. Set a strong secret in environment variables.');
  process.exit(1);
}
if (config.adminPassword === 'Admin@123') {
  console.warn('SECURITY WARNING: ADMIN_PASSWORD is set to the default "Admin@123". Change it immediately.');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://placehold.co'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const uploadsDir = process.env.WEBSITE_SITE_NAME ? '/home/data/uploads' : 'uploads';
app.use('/uploads', express.static(uploadsDir));

if (config.env === 'production') {
  const webDist = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDist));
}

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ============================================================================
// ROUTES
// ============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: config.env, version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quarries', quarryRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/blasting', blastingRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/weighments', weighmentRoutes);
app.use('/api/consumables', consumableRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

if (config.env === 'production') {
  const webDist = path.join(__dirname, '../../web/dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.url} not found` });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

export { logger };
export default app;
