import { getDb } from '../packages/api/src/db/index.js';
import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Backup script for SQLite database
 */
const backup = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const dbPath = process.env.DB_PATH || './data/vatsingranite.db';
  const backupDir = process.env.DB_BACKUP_PATH || './backups';
  const backupPath = join(backupDir, `vatsingranite_${timestamp}.db`);

  console.log('🔄 Creating database backup...');

  if (!existsSync(dbPath)) {
    console.error('❌ Database file not found:', dbPath);
    process.exit(1);
  }

  try {
    // Ensure backup directory exists
    const fs = await import('fs/promises');
    await fs.mkdir(backupDir, { recursive: true });

    // Copy database file
    copyFileSync(dbPath, backupPath);
    
    // Copy WAL and SHM files if they exist
    if (existsSync(`${dbPath}-wal`)) {
      copyFileSync(`${dbPath}-wal`, `${backupPath}-wal`);
    }
    if (existsSync(`${dbPath}-shm`)) {
      copyFileSync(`${dbPath}-shm`, `${backupPath}-shm`);
    }

    console.log('✅ Backup completed:', backupPath);
    
    // Get backup file size
    const stats = await fs.stat(backupPath);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
};

backup();
