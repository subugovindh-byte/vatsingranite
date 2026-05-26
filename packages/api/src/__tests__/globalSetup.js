import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let tmpDir;

export const setup = () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vatsingranite-test-'));
  process.env.NODE_ENV = 'test';
  process.env.DB_PATH = join(tmpDir, 'test.db');
  process.env.JWT_SECRET = 'test-secret-for-ci-only';
  process.env.ADMIN_PASSWORD = 'Admin@123';
  process.env.PORT = '0'; // random port — supertest uses injection
  process.env.LOG_LEVEL = 'silent';
};

export const teardown = () => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
};
