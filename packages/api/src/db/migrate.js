import { getDb } from './index.js';
import config from '../config.js';

/**
 * Database migrations for Vatsin Granite ERP
 * Based on Multi_Quarry_Data_Model.md and ERD.puml
 */

const migrations = [
  {
    version: 1,
    name: 'Create organization hierarchy tables',
    up: (db) => {
      // Organizations table
      db.exec(`
        CREATE TABLE IF NOT EXISTS organizations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_code TEXT NOT NULL UNIQUE,
          org_name TEXT NOT NULL,
          legal_entity_type TEXT,
          pan TEXT,
          gstin TEXT,
          incorporation_date TEXT,
          registered_address TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          created_by INTEGER
        );
      `);

      // Quarries table
      db.exec(`
        CREATE TABLE IF NOT EXISTS quarries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_code TEXT NOT NULL UNIQUE,
          quarry_name TEXT NOT NULL,
          quarry_type TEXT,
          mineral_type TEXT DEFAULT 'Granite',
          address TEXT,
          village TEXT,
          taluk TEXT,
          district TEXT,
          state TEXT DEFAULT 'Tamil Nadu',
          pincode TEXT,
          latitude REAL,
          longitude REAL,
          lease_id INTEGER,
          operational_status TEXT DEFAULT 'active',
          commencement_date TEXT,
          gstin TEXT,
          place_of_supply TEXT,
          dgms_registration_no TEXT,
          ibm_code TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id)
        );
      `);

      // Cost centers table
      db.exec(`
        CREATE TABLE IF NOT EXISTS cost_centers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          cost_center_code TEXT NOT NULL UNIQUE,
          cost_center_name TEXT NOT NULL,
          parent_cost_center_id INTEGER,
          cost_center_type TEXT,
          head_employee_id INTEGER,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (parent_cost_center_id) REFERENCES cost_centers(id)
        );
      `);

      // Locations table
      db.exec(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          cost_center_id INTEGER,
          location_code TEXT NOT NULL UNIQUE,
          location_name TEXT NOT NULL,
          location_type TEXT,
          parent_location_id INTEGER,
          geo_coordinates TEXT,
          area_sqm REAL,
          bench_level TEXT,
          bench_height_m REAL,
          bench_width_m REAL,
          slope_angle_deg REAL,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
          FOREIGN KEY (parent_location_id) REFERENCES locations(id)
        );
      `);
    }
  },
  {
    version: 2,
    name: 'Create master data tables',
    up: (db) => {
      // Users table
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          emp_id INTEGER,
          active INTEGER DEFAULT 1,
          last_login TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id)
        );
      `);

      // Roles table
      db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          role_code TEXT NOT NULL UNIQUE,
          role_name TEXT NOT NULL,
          description TEXT,
          FOREIGN KEY (org_id) REFERENCES organizations(id)
        );
      `);

      // User roles junction table
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          role_id INTEGER NOT NULL,
          quarry_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (role_id) REFERENCES roles(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id)
        );
      `);

      // Customers table
      db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          customer_code TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_type TEXT,
          gstin TEXT,
          pan TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          pincode TEXT,
          country TEXT DEFAULT 'India',
          credit_limit REAL DEFAULT 0,
          credit_days INTEGER DEFAULT 0,
          payment_terms TEXT,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id)
        );
      `);

      // Suppliers table
      db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          supplier_code TEXT NOT NULL UNIQUE,
          supplier_name TEXT NOT NULL,
          supplier_type TEXT,
          gstin TEXT,
          pan TEXT,
          msme_registration TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          pincode TEXT,
          payment_terms TEXT,
          tds_section TEXT,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id)
        );
      `);

      // Employees table
      db.exec(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          emp_code TEXT NOT NULL UNIQUE,
          emp_name TEXT NOT NULL,
          primary_quarry_id INTEGER,
          department TEXT,
          designation TEXT,
          employment_type TEXT,
          date_of_joining TEXT,
          date_of_exit TEXT,
          uan_no TEXT,
          esi_no TEXT,
          pan TEXT,
          aadhaar_masked TEXT,
          bank_name TEXT,
          bank_account_no TEXT,
          bank_ifsc TEXT,
          basic_salary REAL,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (primary_quarry_id) REFERENCES quarries(id)
        );
      `);

      // Varieties table
      db.exec(`
        CREATE TABLE IF NOT EXISTS varieties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER,
          variety_code TEXT NOT NULL UNIQUE,
          variety_name TEXT NOT NULL,
          color TEXT,
          grade TEXT,
          category TEXT,
          default_price_per_cbm REAL,
          default_density REAL,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id)
        );
      `);

      // Assets table
      db.exec(`
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          asset_no TEXT NOT NULL UNIQUE,
          asset_name TEXT NOT NULL,
          asset_category TEXT,
          asset_type TEXT,
          make TEXT,
          model TEXT,
          year_of_manufacture INTEGER,
          serial_no TEXT,
          registration_no TEXT,
          current_quarry_id INTEGER,
          current_location_id INTEGER,
          ownership_type TEXT,
          purchase_date TEXT,
          purchase_cost REAL,
          current_book_value REAL,
          depreciation_method TEXT,
          operational_status TEXT DEFAULT 'active',
          hour_meter_reading INTEGER DEFAULT 0,
          insurance_expiry_date TEXT,
          fitness_expiry_date TEXT,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (current_quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (current_location_id) REFERENCES locations(id)
        );
      `);

      // Chart of Accounts table
      db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          account_code TEXT NOT NULL UNIQUE,
          account_name TEXT NOT NULL,
          account_type TEXT NOT NULL,
          parent_account_id INTEGER,
          is_cost_center_required INTEGER DEFAULT 0,
          is_quarry_required INTEGER DEFAULT 0,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (parent_account_id) REFERENCES accounts(id)
        );
      `);
    }
  },
  {
    version: 3,
    name: 'Create operations tables',
    up: (db) => {
      // Leases table
      db.exec(`
        CREATE TABLE IF NOT EXISTS leases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          lease_no TEXT NOT NULL UNIQUE,
          mineral TEXT DEFAULT 'Granite',
          lease_area_ha REAL,
          mineable_area_ha REAL,
          lease_from_date TEXT,
          lease_to_date TEXT,
          annual_permitted_qty_cbm REAL,
          royalty_rate_per_cbm REAL,
          dmf_percent REAL DEFAULT 10,
          nmet_percent REAL DEFAULT 2,
          boundary_coordinates TEXT,
          survey_field_numbers TEXT,
          gazette_notification_ref TEXT,
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id)
        );
      `);

      // Blast events table
      db.exec(`
        CREATE TABLE IF NOT EXISTS blast_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          blast_no TEXT NOT NULL UNIQUE,
          blast_date TEXT NOT NULL,
          location_id INTEGER,
          holes_drilled INTEGER,
          hole_depth_m REAL,
          hole_diameter_mm INTEGER,
          spacing_m REAL,
          burden_m REAL,
          total_drilled_m REAL,
          explosives_consumed_kg REAL,
          detonators_used INTEGER,
          blaster_id INTEGER,
          blaster_cert_no TEXT,
          estimated_yield_cbm REAL,
          actual_yield_cbm REAL,
          vibration_ppv_mm_s REAL,
          blast_latitude REAL,
          blast_longitude REAL,
          within_lease_boundary INTEGER DEFAULT 1,
          approved_by INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (blaster_id) REFERENCES employees(id),
          FOREIGN KEY (approved_by) REFERENCES employees(id)
        );
      `);

      // Blocks table (core entity)
      db.exec(`
        CREATE TABLE IF NOT EXISTS blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          block_no TEXT NOT NULL UNIQUE,
          variety_id INTEGER,
          grade TEXT,
          color TEXT,
          extracted_from_location_id INTEGER,
          blast_event_id INTEGER,
          extraction_date TEXT,
          length_mm INTEGER,
          width_mm INTEGER,
          height_mm INTEGER,
          gross_cbm REAL,
          net_cbm REAL,
          weight_kg REAL,
          current_location_id INTEGER,
          status TEXT DEFAULT 'available',
          sales_order_id INTEGER,
          invoice_id INTEGER,
          qr_code TEXT UNIQUE,
          rfid_tag TEXT,
          photo_urls TEXT,
          cost_per_cbm REAL,
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (variety_id) REFERENCES varieties(id),
          FOREIGN KEY (extracted_from_location_id) REFERENCES locations(id),
          FOREIGN KEY (current_location_id) REFERENCES locations(id),
          FOREIGN KEY (blast_event_id) REFERENCES blast_events(id)
        );
      `);

      // Production logs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS production_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          production_date TEXT NOT NULL,
          location_id INTEGER,
          shift_type TEXT,
          blocks_produced INTEGER DEFAULT 0,
          gross_cbm REAL DEFAULT 0,
          net_cbm REAL DEFAULT 0,
          in_charge_emp_id INTEGER,
          surveyor_emp_id INTEGER,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (in_charge_emp_id) REFERENCES employees(id),
          FOREIGN KEY (surveyor_emp_id) REFERENCES employees(id)
        );
      `);
    }
  },
  {
    version: 4,
    name: 'Create sales and finance tables',
    up: (db) => {
      // Sales orders table
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          so_no TEXT NOT NULL UNIQUE,
          so_date TEXT NOT NULL,
          customer_id INTEGER NOT NULL,
          source_quarry_id INTEGER,
          total_value REAL DEFAULT 0,
          currency TEXT DEFAULT 'INR',
          advance_received REAL DEFAULT 0,
          is_export INTEGER DEFAULT 0,
          buyer_country TEXT,
          status TEXT DEFAULT 'open',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (source_quarry_id) REFERENCES quarries(id)
        );
      `);

      // Sales order lines table
      db.exec(`
        CREATE TABLE IF NOT EXISTS sales_order_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          so_id INTEGER NOT NULL,
          line_no INTEGER NOT NULL,
          variety_id INTEGER,
          grade TEXT,
          qty_cbm REAL,
          rate_per_cbm REAL,
          line_value REAL,
          fulfillment_quarry_id INTEGER,
          dispatched_qty_cbm REAL DEFAULT 0,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (so_id) REFERENCES sales_orders(id),
          FOREIGN KEY (variety_id) REFERENCES varieties(id),
          FOREIGN KEY (fulfillment_quarry_id) REFERENCES quarries(id)
        );
      `);

      // Invoices table
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          despatch_quarry_id INTEGER NOT NULL,
          invoice_no TEXT NOT NULL UNIQUE,
          invoice_date TEXT NOT NULL,
          invoice_type TEXT DEFAULT 'sale',
          customer_id INTEGER NOT NULL,
          so_id INTEGER,
          place_of_supply TEXT,
          gstin_of_supplier TEXT,
          gstin_of_buyer TEXT,
          taxable_value REAL DEFAULT 0,
          cgst_amount REAL DEFAULT 0,
          sgst_amount REAL DEFAULT 0,
          igst_amount REAL DEFAULT 0,
          invoice_value REAL DEFAULT 0,
          irn TEXT,
          ack_no TEXT,
          qr_code TEXT,
          e_way_bill_no TEXT,
          shipping_bill_no TEXT,
          status TEXT DEFAULT 'draft',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (despatch_quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (so_id) REFERENCES sales_orders(id)
        );
      `);

      // Invoice lines table
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoice_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          invoice_id INTEGER NOT NULL,
          line_no INTEGER NOT NULL,
          block_id INTEGER,
          variety_id INTEGER,
          hsn_code TEXT DEFAULT '2516',
          qty_cbm REAL,
          rate_per_cbm REAL,
          taxable_value REAL,
          gst_rate REAL DEFAULT 5,
          gst_amount REAL,
          line_total REAL,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (invoice_id) REFERENCES invoices(id),
          FOREIGN KEY (block_id) REFERENCES blocks(id),
          FOREIGN KEY (variety_id) REFERENCES varieties(id)
        );
      `);

      // Vouchers table (General Ledger)
      db.exec(`
        CREATE TABLE IF NOT EXISTS vouchers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          voucher_no TEXT NOT NULL UNIQUE,
          voucher_type TEXT NOT NULL,
          voucher_date TEXT NOT NULL,
          fiscal_year INTEGER,
          fiscal_period INTEGER,
          reference_no TEXT,
          narration TEXT,
          default_quarry_id INTEGER,
          default_cost_center_id INTEGER,
          status TEXT DEFAULT 'draft',
          approved_by INTEGER,
          posted_at TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (default_quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (default_cost_center_id) REFERENCES cost_centers(id),
          FOREIGN KEY (approved_by) REFERENCES employees(id)
        );
      `);

      // Voucher lines table
      db.exec(`
        CREATE TABLE IF NOT EXISTS voucher_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          voucher_id INTEGER NOT NULL,
          line_no INTEGER NOT NULL,
          account_id INTEGER NOT NULL,
          quarry_id INTEGER,
          cost_center_id INTEGER,
          debit_amount REAL DEFAULT 0,
          credit_amount REAL DEFAULT 0,
          currency TEXT DEFAULT 'INR',
          exchange_rate REAL DEFAULT 1,
          party_type TEXT,
          party_id INTEGER,
          reference_type TEXT,
          reference_id INTEGER,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
        );
      `);

      // Royalty challans table
      db.exec(`
        CREATE TABLE IF NOT EXISTS royalty_challans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          challan_no TEXT NOT NULL UNIQUE,
          period_month INTEGER NOT NULL,
          period_year INTEGER NOT NULL,
          opening_stock_cbm REAL DEFAULT 0,
          produced_cbm REAL DEFAULT 0,
          despatched_cbm REAL DEFAULT 0,
          closing_stock_cbm REAL DEFAULT 0,
          royalty_rate_per_cbm REAL,
          royalty_amount REAL,
          dmf_amount REAL,
          nmet_amount REAL,
          total_amount REAL,
          payment_date TEXT,
          voucher_id INTEGER,
          reconciled INTEGER DEFAULT 0,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
        );
      `);
    }
  },
  {
    version: 5,
    name: 'Create compliance and HR tables',
    up: (db) => {
      // Permits table
      db.exec(`
        CREATE TABLE IF NOT EXISTS permits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          permit_no TEXT NOT NULL UNIQUE,
          permit_type TEXT NOT NULL,
          permit_name TEXT NOT NULL,
          issued_by TEXT,
          issue_date TEXT,
          expiry_date TEXT,
          renewal_date TEXT,
          status TEXT DEFAULT 'active',
          document_url TEXT,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id)
        );
      `);

      // Safety incidents table
      db.exec(`
        CREATE TABLE IF NOT EXISTS safety_incidents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          incident_no TEXT NOT NULL UNIQUE,
          incident_date TEXT NOT NULL,
          incident_type TEXT,
          severity TEXT,
          location_id INTEGER,
          person_affected_emp_id INTEGER,
          description TEXT,
          immediate_action TEXT,
          root_cause TEXT,
          corrective_action TEXT,
          preventive_action TEXT,
          reported_to_dgms INTEGER DEFAULT 0,
          reported_at TEXT,
          status TEXT DEFAULT 'open',
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (location_id) REFERENCES locations(id),
          FOREIGN KEY (person_affected_emp_id) REFERENCES employees(id)
        );
      `);

      // Attendance table
      db.exec(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          emp_id INTEGER NOT NULL,
          attendance_date TEXT NOT NULL,
          shift_type TEXT,
          in_time TEXT,
          out_time TEXT,
          hours_worked REAL,
          ot_hours REAL DEFAULT 0,
          status TEXT DEFAULT 'present',
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (emp_id) REFERENCES employees(id),
          UNIQUE(quarry_id, emp_id, attendance_date)
        );
      `);

      // Payroll runs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS payroll_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          pay_period_month INTEGER NOT NULL,
          pay_period_year INTEGER NOT NULL,
          run_date TEXT,
          payment_date TEXT,
          total_gross REAL DEFAULT 0,
          total_deductions REAL DEFAULT 0,
          total_net REAL DEFAULT 0,
          status TEXT DEFAULT 'draft',
          approved_by INTEGER,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (approved_by) REFERENCES employees(id)
        );
      `);

      // Payroll details table
      db.exec(`
        CREATE TABLE IF NOT EXISTS payroll_details (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          payroll_run_id INTEGER NOT NULL,
          emp_id INTEGER NOT NULL,
          days_worked REAL,
          basic_pay REAL,
          da REAL DEFAULT 0,
          hra REAL DEFAULT 0,
          other_allowances REAL DEFAULT 0,
          gross_pay REAL,
          epf_employee REAL DEFAULT 0,
          epf_employer REAL DEFAULT 0,
          esi_employee REAL DEFAULT 0,
          esi_employer REAL DEFAULT 0,
          professional_tax REAL DEFAULT 0,
          tds REAL DEFAULT 0,
          other_deductions REAL DEFAULT 0,
          total_deductions REAL,
          net_pay REAL,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
          FOREIGN KEY (emp_id) REFERENCES employees(id)
        );
      `);
    }
  },
  {
    version: 6,
    name: 'Create indexes for performance',
    up: (db) => {
      // Organization hierarchy indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_quarries_org ON quarries(org_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_quarries_code ON quarries(quarry_code);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_cost_centers_quarry ON cost_centers(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_quarry ON locations(quarry_id);`);

      // Master data indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(org_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_employees_quarry ON employees(primary_quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_varieties_quarry ON varieties(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_assets_quarry ON assets(current_quarry_id);`);

      // Operations indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blocks_quarry ON blocks(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blocks_block_no ON blocks(block_no);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blocks_qr_code ON blocks(qr_code);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blast_events_quarry ON blast_events(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_blast_events_date ON blast_events(blast_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_production_logs_quarry_date ON production_logs(quarry_id, production_date);`);

      // Sales indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_orders_quarry ON sales_orders(source_quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(so_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_quarry ON invoices(despatch_quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);`);

      // Finance indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_vouchers_quarry ON vouchers(default_quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(voucher_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(voucher_type);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_voucher_lines_account ON voucher_lines(account_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_voucher_lines_quarry ON voucher_lines(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_royalty_challans_quarry_period ON royalty_challans(quarry_id, period_year, period_month);`);

      // Compliance indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_quarry ON permits(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_permits_expiry ON permits(expiry_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_safety_incidents_quarry ON safety_incidents(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_safety_incidents_date ON safety_incidents(incident_date);`);

      // HR indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(emp_id, attendance_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_quarry_date ON attendance(quarry_id, attendance_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_payroll_details_run ON payroll_details(payroll_run_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_payroll_details_emp ON payroll_details(emp_id);`);
    }
  },
  {
    version: 7,
    name: 'Create photos table for media uploads',
    up: (db) => {
      // Photos table for quarry and block images
      db.exec(`
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_type TEXT NOT NULL, -- 'quarry' or 'block'
          entity_id INTEGER NOT NULL,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER,
          mime_type TEXT,
          caption TEXT,
          category TEXT DEFAULT 'general', -- 'general', 'blast', 'cutting', 'gangsaw', 'polishing', 'zone', 'inspection'
          zone TEXT, -- For quarry zone-wise photos
          metadata TEXT, -- JSON for additional data like view_angle, coordinates, etc.
          uploaded_by INTEGER,
          uploaded_at TEXT DEFAULT (datetime('now')),
          active INTEGER DEFAULT 1,
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (uploaded_by) REFERENCES users(id)
        );
      `);

      // Indexes for photos
      db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_entity ON photos(entity_type, entity_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_quarry ON photos(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_zone ON photos(zone);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at);`);
    }
  },
  {
    version: 8,
    name: 'Create weighments, consumables, and maintenance tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS weighments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          block_id INTEGER,
          invoice_id INTEGER,
          weighment_date TEXT NOT NULL,
          vehicle_no TEXT,
          driver_name TEXT,
          tare_weight_kg REAL,
          gross_weight_kg REAL,
          net_weight_kg REAL,
          material_type TEXT DEFAULT 'block',
          weighbridge_operator TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (block_id) REFERENCES blocks(id),
          FOREIGN KEY (invoice_id) REFERENCES invoices(id)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS consumables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          item_category TEXT,
          unit TEXT DEFAULT 'nos',
          opening_stock REAL DEFAULT 0,
          received_qty REAL DEFAULT 0,
          consumed_qty REAL DEFAULT 0,
          closing_stock REAL DEFAULT 0,
          unit_cost REAL DEFAULT 0,
          total_value REAL DEFAULT 0,
          record_date TEXT NOT NULL,
          purpose TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id)
        );
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS maintenance_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id INTEGER NOT NULL,
          quarry_id INTEGER NOT NULL,
          asset_id INTEGER NOT NULL,
          job_no TEXT NOT NULL UNIQUE,
          job_type TEXT DEFAULT 'corrective',
          scheduled_date TEXT,
          started_at TEXT,
          completed_at TEXT,
          description TEXT,
          technician_emp_id INTEGER,
          parts_used TEXT,
          labour_cost REAL DEFAULT 0,
          parts_cost REAL DEFAULT 0,
          total_cost REAL DEFAULT 0,
          downtime_hours REAL DEFAULT 0,
          status TEXT DEFAULT 'open',
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (org_id) REFERENCES organizations(id),
          FOREIGN KEY (quarry_id) REFERENCES quarries(id),
          FOREIGN KEY (asset_id) REFERENCES assets(id),
          FOREIGN KEY (technician_emp_id) REFERENCES employees(id)
        );
      `);

      db.exec(`CREATE INDEX IF NOT EXISTS idx_weighments_quarry ON weighments(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_weighments_date ON weighments(weighment_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_consumables_quarry ON consumables(quarry_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_consumables_date ON consumables(record_date);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_jobs(asset_id);`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_jobs(status);`);
    }
  },
  {
    version: 9,
    name: 'Add missing GL accounts: AR, GST Payable, Royalty, TDS',
    up: (db) => {
      const newAccounts = [
        ['1103', 'Accounts Receivable', 'Asset', '1100'],
        ['2102', 'CGST Payable', 'Liability', '2100'],
        ['2103', 'SGST Payable', 'Liability', '2100'],
        ['2104', 'IGST Payable', 'Liability', '2100'],
        ['2105', 'TDS Payable', 'Liability', '2100'],
        ['5103', 'Royalty Expenses', 'Expense', '5100'],
      ];
      const org = db.prepare(`SELECT id FROM organizations LIMIT 1`).get();
      if (!org) return;
      for (const [code, name, type, parentCode] of newAccounts) {
        const parent = db.prepare(`SELECT id FROM accounts WHERE account_code = ?`).get(parentCode);
        db.prepare(`
          INSERT OR IGNORE INTO accounts (org_id, account_code, account_name, account_type, parent_account_id, active)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(org.id, code, name, type, parent ? parent.id : null);
      }
    }
  },
  {
    version: 10,
    name: 'Add is_default flag to quarries',
    up: (db) => {
      // Add column (safe to run even if already exists via try/catch)
      try { db.exec(`ALTER TABLE quarries ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`); } catch { /* already exists */ }
      // Set the oldest quarry (lowest id) as default if none is set
      const hasDefault = db.prepare(`SELECT id FROM quarries WHERE is_default = 1 LIMIT 1`).get();
      if (!hasDefault) {
        const first = db.prepare(`SELECT id FROM quarries ORDER BY id ASC LIMIT 1`).get();
        if (first) db.prepare(`UPDATE quarries SET is_default = 1 WHERE id = ?`).run(first.id);
      }
    }
  }
];

/**
 * Get current schema version
 */
const getSchemaVersion = (db) => {
  try {
    const row = db.prepare(`
      SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
    `).get();
    return row ? row.version : 0;
  } catch {
    return 0;
  }
};

/**
 * Create schema version table if it doesn't exist
 */
const createSchemaVersionTable = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
};

/**
 * Run all pending migrations
 */
export const runMigrations = () => {
  const db = getDb();
  
  console.log('🔄 Running database migrations...');
  
  // Create schema version table
  createSchemaVersionTable(db);
  
  // Get current version
  const currentVersion = getSchemaVersion(db);
  console.log(`📊 Current schema version: ${currentVersion}`);
  
  // Run pending migrations
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log('✅ Database is up to date');
    return;
  }
  
  console.log(`📦 Running ${pendingMigrations.length} pending migration(s)...`);
  
  for (const migration of pendingMigrations) {
    console.log(`  ➜ Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      db.transaction(() => {
        migration.up(db);
        db.prepare(`
          INSERT INTO schema_version (version, name) VALUES (?, ?)
        `).run(migration.version, migration.name);
      })();
      
      console.log(`  ✓ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`  ✗ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }
  
  console.log('✅ All migrations completed successfully');
};

// Run migrations if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  process.exit(0);
}
