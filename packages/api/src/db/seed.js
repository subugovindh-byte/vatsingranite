import bcrypt from 'bcryptjs';
import { getDb } from './index.js';
import config from '../config.js';

/**
 * Seed initial data for Vatsin Granite ERP
 */

export const seedDatabase = async () => {
  const db = getDb();
  
  console.log('🌱 Seeding database...');
  
  try {
    db.transaction(() => {
      // ========================================================================
      // 1. ORGANIZATION
      // ========================================================================
      console.log('  ➜ Creating organization...');
      const orgResult = db.prepare(`
        INSERT OR IGNORE INTO organizations (
          org_code, org_name, pan, gstin, contact_email, contact_phone, active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        config.orgCode,
        config.orgName,
        config.orgPan,
        config.orgGstin,
        config.orgEmail,
        config.orgPhone
      );
      
      const orgId = orgResult.changes > 0
        ? orgResult.lastInsertRowid
        : db.prepare('SELECT id FROM organizations WHERE org_code = ?').get(config.orgCode).id;

      // ========================================================================
      // 2. QUARRIES
      // ========================================================================
      console.log('  ➜ Creating quarries...');
      
      // Quarry 1: Vatsin Granite
      db.prepare(`
        INSERT OR IGNORE INTO quarries (
          org_id, quarry_code, quarry_name, mineral_type, 
          district, state, gstin, operational_status, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        orgId,
        'VATSIN',
        'Vatsin Granite Quarry',
        'Granite',
        'Dharmapuri',
        'Tamil Nadu',
        '33AABCA1234B1Z5',
        'active'
      );

      // Quarry 2: Vatsin South
      db.prepare(`
        INSERT OR IGNORE INTO quarries (
          org_id, quarry_code, quarry_name, mineral_type,
          district, state, gstin, operational_status, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        orgId,
        'VATSIN-S',
        'Vatsin South Granite Quarry',
        'Granite',
        'Hosur',
        'Tamil Nadu',
        '33AABCA1234B2Z4',
        'active'
      );

      const quarry1Id = db.prepare('SELECT id FROM quarries WHERE quarry_code = ?').get('VATSIN').id;
      const quarry2Id = db.prepare('SELECT id FROM quarries WHERE quarry_code = ?').get('VATSIN-S').id;
      
      // ========================================================================
      // 3. ROLES
      // ========================================================================
      console.log('  ➜ Creating roles...');
      const roles = [
        ['ADMIN', 'Administrator', 'Full system access'],
        ['MANAGER', 'Manager', 'Quarry operations management'],
        ['SUPERVISOR', 'Supervisor', 'Production and field operations'],
        ['ACCOUNTANT', 'Accountant', 'Finance and accounting'],
        ['SALES', 'Sales Executive', 'Sales and customer management'],
        ['VIEWER', 'Viewer', 'Read-only access to reports']
      ];
      
      for (const [code, name, desc] of roles) {
        db.prepare(`
          INSERT OR IGNORE INTO roles (org_id, role_code, role_name, description)
          VALUES (?, ?, ?, ?)
        `).run(orgId, code, name, desc);
      }
      
      // ========================================================================
      // 4. ADMIN USER
      // ========================================================================
      console.log('  ➜ Creating admin user...');
      const passwordHash = bcrypt.hashSync(config.adminPassword, config.bcryptRounds);
      
      const userResult = db.prepare(`
        INSERT OR IGNORE INTO users (
          org_id, username, password_hash, full_name, email, active
        ) VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        orgId,
        config.adminUsername,
        passwordHash,
        'System Administrator',
        config.adminEmail
      );
      
      const userId = userResult.changes > 0
        ? userResult.lastInsertRowid
        : db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername).id;

      // Assign ADMIN role
      const adminRoleId = db.prepare(`SELECT id FROM roles WHERE role_code = 'ADMIN'`).get().id;
      db.prepare(`
        INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)
      `).run(userId, adminRoleId);
      
      // ========================================================================
      // 5. SAMPLE VARIETIES
      // ========================================================================
      console.log('  ➜ Creating granite varieties...');
      const varieties = [
        ['VATSIN-PAR', 'Paradiso Multi-Colour', 'Multi-colour', 'A',  8500, 2.65, quarry1Id],
        ['VATSIN-BLK', 'Black Galaxy',           'Black with gold flecks', 'A', 12000, 2.80, quarry1Id],
        ['VATSIN-RED', 'Red Granite',             'Red with grey veins', 'A', 6500, 2.70, quarry1Id],
        ['VATSIN-S-MC', 'South Premium',          'Premium multi-colour', 'A+', 9500, 2.65, quarry2Id],
        ['VATSIN-S-BLU', 'Blue Pearl',            'Blue with silver specs', 'A', 11000, 2.75, quarry2Id]
      ];
      
      for (const [code, name, color, grade, price, density, quarryId] of varieties) {
        db.prepare(`
          INSERT OR IGNORE INTO varieties (
            org_id, quarry_id, variety_code, variety_name, 
            color, grade, default_price_per_cbm, default_density, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(orgId, quarryId, code, name, color, grade, price, density);
      }
      
      // ========================================================================
      // 6. SAMPLE LOCATIONS
      // ========================================================================
      console.log('  ➜ Creating locations...');
      
      // VATSIN Quarry locations
      db.prepare(`
        INSERT OR IGNORE INTO locations (
          org_id, quarry_id, location_code, location_name, location_type, active
        ) VALUES (?, ?, ?, ?, ?, 1)
      `).run(orgId, quarry1Id, 'VATSIN-STK-01', 'Stockyard - Main', 'stockyard');
      
      db.prepare(`
        INSERT OR IGNORE INTO locations (
          org_id, quarry_id, location_code, location_name, location_type, 
          bench_level, bench_height_m, bench_width_m, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(orgId, quarry1Id, 'VATSIN-BN-01', 'Bench Level 1', 'bench', 'L1', 8, 5);
      
      // VATSIN-S Quarry locations
      db.prepare(`
        INSERT OR IGNORE INTO locations (
          org_id, quarry_id, location_code, location_name, location_type, active
        ) VALUES (?, ?, ?, ?, ?, 1)
      `).run(orgId, quarry2Id, 'VATSIN-S-STK-01', 'Stockyard - Main', 'stockyard');
      
      // ========================================================================
      // 7. SAMPLE CHART OF ACCOUNTS
      // ========================================================================
      console.log('  ➜ Creating chart of accounts...');
      const accounts = [
        ['1000', 'Assets', 'Asset', null],
        ['1100', 'Current Assets', 'Asset', '1000'],
        ['1101', 'Cash in Hand', 'Asset', '1100'],
        ['1102', 'Bank Accounts', 'Asset', '1100'],
        ['1200', 'Inventory', 'Asset', '1000'],
        ['1201', 'Block Inventory', 'Asset', '1200'],
        ['2000', 'Liabilities', 'Liability', null],
        ['2100', 'Current Liabilities', 'Liability', '2000'],
        ['2101', 'Accounts Payable', 'Liability', '2100'],
        ['3000', 'Capital', 'Equity', null],
        ['3100', 'Share Capital', 'Equity', '3000'],
        ['4000', 'Revenue', 'Income', null],
        ['4100', 'Sales Revenue', 'Income', '4000'],
        ['4101', 'Domestic Sales', 'Income', '4100'],
        ['4102', 'Export Sales', 'Income', '4100'],
        ['5000', 'Expenses', 'Expense', null],
        ['5100', 'Production Expenses', 'Expense', '5000'],
        ['5101', 'Blasting Expenses', 'Expense', '5100'],
        ['5102', 'Labour Expenses', 'Expense', '5100'],
        ['5200', 'Administrative Expenses', 'Expense', '5000']
      ];
      
      for (const [code, name, type, parentCode] of accounts) {
        let parentId = null;
        if (parentCode) {
          const parent = db.prepare(`SELECT id FROM accounts WHERE account_code = ?`).get(parentCode);
          parentId = parent ? parent.id : null;
        }
        
        db.prepare(`
          INSERT OR IGNORE INTO accounts (
            org_id, account_code, account_name, account_type, parent_account_id, active
          ) VALUES (?, ?, ?, ?, ?, 1)
        `).run(orgId, code, name, type, parentId);
      }
      
      // ========================================================================
      // 8. SAMPLE CUSTOMERS
      // ========================================================================
      console.log('  ➜ Creating sample customers...');
      const customers = [
        ['CUST001', 'Tamil Nadu Construction Ltd', 'Corporate', '33AABCT1234C1Z5', 'Chennai', 'Tamil Nadu', 500000, 30],
        ['CUST002', 'Karnataka Builders', 'Corporate', '29AABCK1234D1Z6', 'Bangalore', 'Karnataka', 300000, 15],
        ['CUST003', 'Local Dealer - Hosur', 'Dealer', null, 'Hosur', 'Tamil Nadu', 100000, 7]
      ];
      
      for (const [code, name, type, gstin, city, state, creditLimit, creditDays] of customers) {
        db.prepare(`
          INSERT OR IGNORE INTO customers (
            org_id, customer_code, customer_name, customer_type, 
            gstin, city, state, credit_limit, credit_days, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(orgId, code, name, type, gstin, city, state, creditLimit, creditDays);
      }
      
      // ========================================================================
      // 9. SAMPLE EMPLOYEES
      // ========================================================================
      console.log('  ➜ Creating sample employees...');
      const employees = [
        ['EMP001', 'Rajesh Kumar', quarry1Id, 'Operations', 'Quarry Manager', 'Permanent', 45000],
        ['EMP002', 'Suresh M', quarry1Id, 'Production', 'Supervisor', 'Permanent', 35000],
        ['EMP003', 'Anand S', quarry1Id, 'Production', 'Blaster', 'Permanent', 28000],
        ['EMP004', 'Vijay R', quarry2Id, 'Operations', 'Quarry Manager', 'Permanent', 45000]
      ];
      
      for (const [code, name, quarryId, dept, designation, empType, salary] of employees) {
        db.prepare(`
          INSERT OR IGNORE INTO employees (
            org_id, emp_code, emp_name, primary_quarry_id, 
            department, designation, employment_type, 
            date_of_joining, basic_salary, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), ?, 1)
        `).run(orgId, code, name, quarryId, dept, designation, empType, salary);
      }
      
      console.log('✅ Database seeded successfully');
    })();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

/**
 * Minimal seed — org + roles + admin user only.
 * Used by factory-reset so the live system starts completely blank.
 */
export const seedMinimal = async () => {
  const db = getDb();
  console.log('🌱 Minimal seed (org + admin user only)...');
  try {
    db.transaction(() => {
      const orgResult = db.prepare(`
        INSERT OR IGNORE INTO organizations (
          org_code, org_name, pan, gstin, contact_email, contact_phone, active
        ) VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(config.orgCode, config.orgName, config.orgPan, config.orgGstin, config.orgEmail, config.orgPhone);
      const orgId = orgResult.changes > 0
        ? orgResult.lastInsertRowid
        : db.prepare('SELECT id FROM organizations WHERE org_code = ?').get(config.orgCode).id;

      const roles = [
        ['ADMIN', 'Administrator', 'Full system access'],
        ['MANAGER', 'Manager', 'Quarry operations management'],
        ['SUPERVISOR', 'Supervisor', 'Production and field operations'],
        ['ACCOUNTANT', 'Accountant', 'Finance and accounting'],
        ['SALES', 'Sales Executive', 'Sales and customer management'],
        ['VIEWER', 'Viewer', 'Read-only access to reports'],
      ];
      for (const [code, name, desc] of roles) {
        db.prepare(`INSERT OR IGNORE INTO roles (org_id, role_code, role_name, description) VALUES (?, ?, ?, ?)`).run(orgId, code, name, desc);
      }

      const passwordHash = bcrypt.hashSync(config.adminPassword, config.bcryptRounds);
      const userResult = db.prepare(`
        INSERT OR IGNORE INTO users (org_id, username, password_hash, full_name, email, active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(orgId, config.adminUsername, passwordHash, 'System Administrator', config.adminEmail);
      const userId = userResult.changes > 0
        ? userResult.lastInsertRowid
        : db.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUsername).id;

      const adminRole = db.prepare(`SELECT id FROM roles WHERE role_code = 'ADMIN'`).get();
      if (adminRole) {
        db.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`).run(userId, adminRole.id);
      }
    })();
    console.log('✅ Minimal seed complete — system is empty, admin user ready');
  } catch (error) {
    console.error('❌ Minimal seed failed:', error);
    throw error;
  }
};

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
  process.exit(0);
}
