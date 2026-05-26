import app, { logger } from './app.js';
import config from './config.js';
import { initializeDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

const startServer = async () => {
  try {
    logger.info('Initializing database...');
    initializeDatabase();
    runMigrations();
    await seedDatabase();
    logger.info('Database ready');

    app.listen(config.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏔️  AB GRANITE ERP - API SERVER                            ║
║                                                               ║
║   Environment:  ${config.env.padEnd(46)}║
║   Port:         ${String(config.port).padEnd(46)}║
║   URL:          ${config.apiBaseUrl.padEnd(46)}║
║   Database:     ${config.dbPath.padEnd(46)}║
║                                                               ║
║   Status:       🟢 RUNNING                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
