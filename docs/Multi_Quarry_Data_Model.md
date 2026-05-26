# Multi-Quarry Scalable Data Model

## Document Information
| | |
|---|---|
| **Document** | Multi-Quarry Scalable Data Architecture |
| **Version** | 1.0 |
| **Date** | 23 May 2026 |
| **Purpose** | Define data segregation strategy for multiple quarry operations |
| **Status** | Design Specification |

---

## 1. Executive Summary

This document defines the data model architecture to support Vatsin Granite's current operations (Vatsin Granite quarry, Paradiso quarry) and future expansion to additional quarry sites. The design ensures:

- **Data Segregation:** Each quarry's operational data is logically isolated while allowing consolidated reporting
- **Shared Masters:** Common masters (customers, suppliers, chart of accounts, employees who work across sites) are shared
- **Site-Specific Configuration:** Each quarry can have different lease terms, royalty rates, equipment, and operational parameters
- **Scalability:** Adding a new quarry requires configuration, not code changes
- **Multi-Tenant Ready:** Foundation for potential future SaaS offering to other quarry operators

---

## 2. Organizational Hierarchy

### 2.1 Four-Level Hierarchy

```
Organization (Company)
  └── Quarry (Site / Division)
        └── Cost Center (Optional: Stockyard, Office, Colony)
              └── Sub-Location (Bench, Magazine, Workshop)
```

**Example for Vatsin Granite:**
```
Vatsin Granite Quarry Pvt. Ltd. (org_id=1)
  ├── Vatsin Granite Quarry (quarry_id=1, quarry_code='ABG')
  │     ├── Main Pit (cost_center_id=101)
  │     │     ├── Bench 1 (location_id=1001)
  │     │     ├── Bench 2 (location_id=1002)
  │     │     └── Bench 3 (location_id=1003)
  │     ├── Stockyard (cost_center_id=102)
  │     ├── Magazine (cost_center_id=103)
  │     └── Workshop (cost_center_id=104)
  │
  ├── Paradiso Quarry (quarry_id=2, quarry_code='PARA')
  │     ├── Main Pit (cost_center_id=201)
  │     │     ├── Bench 1 (location_id=2001)
  │     │     ├── Bench 2 (location_id=2002)
  │     │     └── Bench 3 (location_id=2003)
  │     ├── Stockyard (cost_center_id=202)
  │     ├── Magazine (cost_center_id=203)
  │     └── Workshop (cost_center_id=204)
  │
  ├── Head Office (quarry_id=3, quarry_code='HO')
  │     └── Admin (cost_center_id=301)
  │
  └── [Future Quarry 3] (quarry_id=4, quarry_code='QRY4')
        └── [To be configured]
```

### 2.2 Core Hierarchy Tables

#### Table: `organizations`
```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  org_code VARCHAR(20) UNIQUE NOT NULL,
  org_name VARCHAR(200) NOT NULL,
  legal_entity_type VARCHAR(50), -- 'Pvt Ltd', 'Public Ltd', 'Partnership', 'Proprietorship'
  pan VARCHAR(10),
  gstin VARCHAR(15), -- Primary GSTIN (may have multiple, stored in gstin_registrations)
  incorporation_date DATE,
  registered_address TEXT,
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT REFERENCES users(id),
  updated_at TIMESTAMP,
  updated_by INT
);
```

#### Table: `quarries`
```sql
CREATE TABLE quarries (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  quarry_code VARCHAR(20) UNIQUE NOT NULL, -- 'ABG', 'PARA', 'HO', 'QRY4'
  quarry_name VARCHAR(200) NOT NULL,
  quarry_type VARCHAR(50), -- 'Production', 'Stockyard', 'Head Office', 'Sales Office'
  mineral_type VARCHAR(100), -- 'Granite - Multi-colour', 'Granite - Black', 'Ordinary Stone'
  
  -- Location
  address TEXT,
  village VARCHAR(100),
  taluk VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Tamil Nadu',
  pincode VARCHAR(10),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Lease Information (if applicable)
  lease_id INT REFERENCES leases(id), -- Primary lease (quarry may have multiple)
  
  -- Operations
  operational_status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Idle', 'Closed', 'Under Development'
  commencement_date DATE,
  closure_date DATE,
  
  -- Configuration
  default_currency VARCHAR(3) DEFAULT 'INR',
  default_uom_length VARCHAR(10) DEFAULT 'MM', -- 'MM', 'CM', 'M', 'FT', 'IN'
  default_uom_weight VARCHAR(10) DEFAULT 'KG', -- 'KG', 'MT', 'LBS'
  default_uom_volume VARCHAR(10) DEFAULT 'CBM', -- 'CBM', 'CFT'
  default_density DECIMAL(5,3) DEFAULT 2.700, -- Granite typical 2.7 t/m³
  
  -- Tax Configuration
  gstin VARCHAR(15), -- Quarry-specific GSTIN if separate registration
  place_of_supply VARCHAR(100), -- For GST
  
  -- Compliance
  dgms_registration_no VARCHAR(50),
  ibm_code VARCHAR(50),
  mining_plan_approval_no VARCHAR(100),
  environmental_clearance_no VARCHAR(100),
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT,
  updated_at TIMESTAMP,
  updated_by INT,
  
  UNIQUE(org_id, quarry_code)
);

CREATE INDEX idx_quarries_org ON quarries(org_id);
CREATE INDEX idx_quarries_active ON quarries(active, operational_status);
```

#### Table: `cost_centers`
```sql
CREATE TABLE cost_centers (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  quarry_id INT NOT NULL REFERENCES quarries(id),
  cost_center_code VARCHAR(20) UNIQUE NOT NULL,
  cost_center_name VARCHAR(200) NOT NULL,
  parent_cost_center_id INT REFERENCES cost_centers(id), -- For hierarchy
  cost_center_type VARCHAR(50), -- 'Pit', 'Stockyard', 'Magazine', 'Workshop', 'Admin', 'Dispatch'
  head_employee_id INT REFERENCES employees(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cost_centers_quarry ON cost_centers(quarry_id);
```

#### Table: `locations`
```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  quarry_id INT NOT NULL REFERENCES quarries(id),
  cost_center_id INT REFERENCES cost_centers(id),
  location_code VARCHAR(20) UNIQUE NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  location_type VARCHAR(50), -- 'Bench', 'Face', 'Dump', 'Road', 'Stockpile', 'Bin'
  parent_location_id INT REFERENCES locations(id),
  
  -- Spatial
  geo_coordinates TEXT, -- GeoJSON polygon or point
  area_sqm DECIMAL(12,2),
  
  -- For Benches
  bench_level VARCHAR(20), -- 'RL +120', 'RL +110'
  bench_height_m DECIMAL(5,2),
  bench_width_m DECIMAL(5,2),
  slope_angle_deg DECIMAL(5,2),
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_quarry ON locations(quarry_id);
CREATE INDEX idx_locations_type ON locations(location_type);
```

---

## 3. Data Segregation Patterns

### 3.1 Segregation Strategy by Entity Type

| Entity Type | Segregation Level | Key Column(s) | Rationale |
|---|---|---|---|
| **Customers** | Organization | `org_id` | Customers may buy from multiple quarries; shared master |
| **Suppliers** | Organization | `org_id` | Suppliers may supply to multiple quarries; shared master |
| **Employees** | Organization | `org_id` | Employees may work at multiple sites; primary assignment to one quarry |
| **Chart of Accounts** | Organization | `org_id` | Single chart of accounts for consolidated financial statements |
| **Leases** | Quarry | `quarry_id` | Each lease is site-specific |
| **Benches/Faces** | Quarry | `quarry_id` | Operational units within a quarry |
| **Blocks** | Quarry | `quarry_id` | Blocks extracted from a specific quarry |
| **Blasts** | Quarry | `quarry_id` | Blasting events at a specific site |
| **Assets (Equipment)** | Organization | `org_id`, `current_quarry_id` | Assets can move between quarries; track current location |
| **Maintenance Jobs** | Quarry | `quarry_id` (via asset location) | Where the job was performed |
| **Inventory (Stores)** | Quarry | `quarry_id` | Each quarry maintains its own stores |
| **Sales Orders** | Organization | `org_id`, `source_quarry_id` | Order placed at org level; fulfilled from specific quarry |
| **Despatch** | Quarry | `quarry_id` | Despatch from a specific quarry |
| **Vouchers (GL)** | Organization | `org_id`, `quarry_id`, `cost_center_id` | All vouchers in single ledger; tagged for reporting |
| **Statutory Returns** | Mixed | Depends on return | GST → org level; Royalty → quarry level; MCDR → quarry level |

### 3.2 Transactional Data Pattern

Every transactional table includes:
```sql
org_id INT NOT NULL,               -- Always present for data isolation
quarry_id INT,                     -- Present if transaction is site-specific
cost_center_id INT,                -- Optional, for cost allocation
fiscal_year INT,                   -- For period-based partitioning
transaction_date DATE,             -- For date-based queries
created_at TIMESTAMP,              -- Audit
created_by INT REFERENCES users(id), -- Audit
updated_at TIMESTAMP,              -- Audit
updated_by INT,                    -- Audit
deleted_at TIMESTAMP,              -- Soft delete
deleted_by INT                     -- Soft delete
```

**Indexing Strategy:**
```sql
CREATE INDEX idx_<table>_org_quarry ON <table>(org_id, quarry_id);
CREATE INDEX idx_<table>_date ON <table>(transaction_date);
CREATE INDEX idx_<table>_fy ON <table>(fiscal_year);
```

### 3.3 Row-Level Security (PostgreSQL Example)

For multi-tenancy in a future SaaS scenario:
```sql
-- Enable RLS on transactional tables
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data for their organization
CREATE POLICY org_isolation ON blocks
  FOR ALL
  TO app_user
  USING (org_id = current_setting('app.current_org_id')::INT);

-- Application sets context on connection:
SET app.current_org_id = 1;
```

For single-tenant deployment (Vatsin Granite), RLS is optional but the data model supports it.

---

## 4. Shared vs Quarry-Specific Masters

### 4.1 Shared Masters (Organization Level)

#### Customers
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  customer_code VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_type VARCHAR(50), -- 'Domestic-Dealer', 'Domestic-Retail', 'Export'
  gstin VARCHAR(15),
  pan VARCHAR(10),
  -- ... other fields ...
  active BOOLEAN DEFAULT TRUE
);
```
**Rationale:** A customer like "XYZ Granites Pvt Ltd" may buy blocks from both Vatsin Granite and Paradiso quarries. Single master, but sales order specifies `source_quarry_id`.

#### Suppliers
```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  supplier_code VARCHAR(20) UNIQUE NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  -- ... other fields ...
  active BOOLEAN DEFAULT TRUE
);
```

#### Chart of Accounts
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50), -- 'Asset', 'Liability', 'Income', 'Expense', 'Equity'
  parent_account_id INT REFERENCES accounts(id),
  is_cost_center_required BOOLEAN DEFAULT FALSE, -- If TRUE, vouchers must specify cost_center_id
  is_quarry_required BOOLEAN DEFAULT FALSE, -- If TRUE, vouchers must specify quarry_id
  active BOOLEAN DEFAULT TRUE
);
```
**Rationale:** Single chart of accounts for consolidated P&L and Balance Sheet. Cost-center and quarry tags on vouchers enable quarry-wise reporting.

#### Employees
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL REFERENCES organizations(id),
  emp_code VARCHAR(20) UNIQUE NOT NULL,
  emp_name VARCHAR(200) NOT NULL,
  primary_quarry_id INT REFERENCES quarries(id), -- Home base
  department VARCHAR(100),
  designation VARCHAR(100),
  employment_type VARCHAR(50), -- 'Permanent', 'Contract', 'Piece-Rate', 'Daily Wage'
  -- ... other fields (UAN, ESI, bank, etc.) ...
  active BOOLEAN DEFAULT TRUE
);
```
**Rationale:** An employee like "Quarry Manager" may oversee multiple quarries or be transferred. Primary assignment tracked; attendance and payroll captured per quarry per period.

#### Attendance (Quarry-Tagged)
```sql
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  emp_id INT NOT NULL REFERENCES employees(id),
  attendance_date DATE NOT NULL,
  shift_type VARCHAR(20), -- 'Day', 'Night', 'General'
  in_time TIME,
  out_time TIME,
  hours_worked DECIMAL(4,2),
  ot_hours DECIMAL(4,2),
  status VARCHAR(20), -- 'Present', 'Absent', 'Leave', 'Holiday'
  UNIQUE(emp_id, attendance_date, shift_type)
);

CREATE INDEX idx_attendance_quarry_date ON attendance(quarry_id, attendance_date);
```
**Rationale:** Employee's attendance captured at the quarry where they worked that day.

### 4.2 Quarry-Specific Masters

#### Leases
```sql
CREATE TABLE leases (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  lease_no VARCHAR(100) UNIQUE NOT NULL,
  mineral VARCHAR(100),
  lease_area_ha DECIMAL(10,4),
  mineable_area_ha DECIMAL(10,4),
  lease_from_date DATE,
  lease_to_date DATE,
  annual_permitted_qty_cbm DECIMAL(15,3), -- m³ per year
  royalty_rate_per_cbm DECIMAL(10,2), -- ₹ per m³
  dmf_percent DECIMAL(5,2) DEFAULT 10.00,
  nmet_percent DECIMAL(5,2) DEFAULT 2.00,
  dead_rent_per_ha DECIMAL(10,2),
  surface_rent_per_ha DECIMAL(10,2),
  
  -- Spatial
  boundary_coordinates TEXT, -- GeoJSON polygon (15-point GPS)
  survey_field_numbers TEXT, -- '223/1A1(P), 224/2A(P)'
  
  -- Documents
  gazette_notification_ref VARCHAR(100),
  gazette_date DATE,
  
  active BOOLEAN DEFAULT TRUE
);
```

#### Benches (via locations table, quarry-specific)

#### Varieties / Grades (Quarry-Specific or Shared?)
```sql
CREATE TABLE varieties (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT, -- NULL = available across all quarries; NOT NULL = quarry-specific
  variety_code VARCHAR(20) NOT NULL,
  variety_name VARCHAR(200) NOT NULL,
  color VARCHAR(100),
  grade VARCHAR(20), -- 'A', 'B', 'C', 'Export', 'Commercial'
  category VARCHAR(50), -- 'Block', 'Slab', 'Tile', 'Monument', 'Aggregate'
  default_price_per_cbm DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(org_id, variety_code)
);
```
**Rationale:** "Paradiso Classico Grade A" is specific to Paradiso quarry; "Black Granite" may be from any quarry. Flexible: `quarry_id` NULL for shared varieties.

---

## 5. Critical Transactional Entities (Multi-Quarry Design)

### 5.1 Blocks (Core Inventory)

```sql
CREATE TABLE blocks (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  
  block_no VARCHAR(50) UNIQUE NOT NULL, -- 'ABG/2026/00451', 'PARA/2026/00128'
  variety_id INT REFERENCES varieties(id),
  grade VARCHAR(20),
  color VARCHAR(100),
  
  -- Extraction
  extracted_from_location_id INT REFERENCES locations(id), -- Bench
  blast_event_id INT REFERENCES blast_events(id),
  extraction_date DATE,
  
  -- Dimensions
  length_mm INT,
  width_mm INT,
  height_mm INT,
  gross_cbm DECIMAL(10,3), -- Calculated or surveyor-measured
  net_cbm DECIMAL(10,3), -- After dressing allowance
  weight_kg DECIMAL(10,2),
  
  -- Current Status
  current_location_id INT REFERENCES locations(id), -- Stockyard, or in-transit
  status VARCHAR(50), -- 'In Stockyard', 'Reserved', 'Dispatched', 'Rejected', 'Scrap'
  
  -- Sales Linkage
  sales_order_id INT REFERENCES sales_orders(id),
  sales_order_line_id INT,
  invoice_id INT REFERENCES invoices(id),
  
  -- Traceability
  qr_code VARCHAR(100) UNIQUE,
  rfid_tag VARCHAR(100),
  photo_urls TEXT, -- JSON array of photo URLs
  
  -- Costing
  cost_per_cbm DECIMAL(10,2), -- Accumulated cost
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT
);

CREATE INDEX idx_blocks_quarry ON blocks(org_id, quarry_id);
CREATE INDEX idx_blocks_status ON blocks(status);
CREATE INDEX idx_blocks_variety ON blocks(variety_id);
CREATE INDEX idx_blocks_qr ON blocks(qr_code);
```

**Block Numbering Convention:**
- Format: `{QUARRY_CODE}/{YEAR}/{SEQUENCE}`
- Example: `ABG/2026/00001`, `PARA/2026/00001`
- Sequence resets annually per quarry
- System generates next number automatically

### 5.2 Blast Events

```sql
CREATE TABLE blast_events (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  
  blast_no VARCHAR(50) UNIQUE NOT NULL, -- 'VATSIN-BL-2026-001'
  blast_date DATE NOT NULL,
  location_id INT REFERENCES locations(id), -- Bench/Face
  
  -- Blasting Details
  holes_drilled INT,
  hole_depth_m DECIMAL(5,2),
  hole_diameter_mm INT,
  spacing_m DECIMAL(4,2),
  burden_m DECIMAL(4,2),
  total_drilled_m DECIMAL(8,2),
  
  -- Explosives Consumed
  explosives_consumed_kg DECIMAL(8,2),
  detonators_used INT,
  
  -- Personnel
  blaster_id INT REFERENCES employees(id),
  blaster_cert_no VARCHAR(100),
  mines_manager_id INT REFERENCES employees(id),
  
  -- Yield
  estimated_yield_cbm DECIMAL(10,2),
  actual_yield_cbm DECIMAL(10,2), -- Sum of blocks recovered
  
  -- Safety
  vibration_ppv_mm_s DECIMAL(5,2), -- Peak Particle Velocity
  flyrock_distance_m DECIMAL(5,2),
  misfires INT DEFAULT 0,
  
  -- Geo
  blast_latitude DECIMAL(10,8),
  blast_longitude DECIMAL(11,8),
  within_lease_boundary BOOLEAN, -- Auto-validated against lease polygon
  
  -- Approvals
  approved_by INT REFERENCES employees(id),
  approved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT
);

CREATE INDEX idx_blast_quarry ON blast_events(org_id, quarry_id);
CREATE INDEX idx_blast_date ON blast_events(blast_date);
```

### 5.3 Assets (Equipment) - Mobile Across Quarries

```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  
  asset_no VARCHAR(50) UNIQUE NOT NULL, -- 'EX-001', 'DR-005'
  asset_name VARCHAR(200) NOT NULL,
  asset_category VARCHAR(100), -- 'Excavator', 'Drill', 'Compressor', 'Wire Saw', 'Dumper', 'Loader'
  asset_type VARCHAR(100), -- 'Hydraulic Excavator', 'Crawler Drill', 'Screw Compressor'
  
  make VARCHAR(100), -- 'Komatsu', 'Hitachi', 'Atlas Copco'
  model VARCHAR(100), -- 'PC200-8', 'ZX350'
  year_of_manufacture INT,
  serial_no VARCHAR(100),
  
  -- Registration (if vehicle)
  registration_no VARCHAR(50),
  chassis_no VARCHAR(100),
  engine_no VARCHAR(100),
  
  -- Current Location
  current_quarry_id INT REFERENCES quarries(id),
  current_location_id INT REFERENCES locations(id), -- Pit, Workshop, etc.
  
  -- Ownership
  ownership_type VARCHAR(50), -- 'Owned', 'Leased', 'Hired'
  owned_by VARCHAR(200), -- If hired, owner name
  
  -- Financial
  purchase_date DATE,
  purchase_cost DECIMAL(15,2),
  current_book_value DECIMAL(15,2),
  depreciation_method VARCHAR(20), -- 'WDV', 'SLM'
  depreciation_rate_percent DECIMAL(5,2),
  
  -- Operational
  operational_status VARCHAR(50) DEFAULT 'Operational', -- 'Operational', 'Under Maintenance', 'Breakdown', 'Idle', 'Disposed'
  hour_meter_reading INT, -- Current reading (for PM scheduling)
  last_pm_date DATE,
  next_pm_due_date DATE,
  next_pm_due_hours INT,
  
  -- Statutory
  insurance_policy_no VARCHAR(100),
  insurance_expiry_date DATE,
  fitness_certificate_no VARCHAR(100),
  fitness_expiry_date DATE,
  puc_expiry_date DATE,
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assets_org ON assets(org_id);
CREATE INDEX idx_assets_quarry ON assets(current_quarry_id);
CREATE INDEX idx_assets_category ON assets(asset_category);
```

**Asset Transfer Between Quarries:**
```sql
CREATE TABLE asset_transfers (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  asset_id INT NOT NULL REFERENCES assets(id),
  from_quarry_id INT REFERENCES quarries(id),
  to_quarry_id INT REFERENCES quarries(id),
  transfer_date DATE NOT NULL,
  transfer_type VARCHAR(50), -- 'Permanent', 'Temporary', 'Hire'
  return_date DATE, -- If temporary
  reason TEXT,
  approved_by INT REFERENCES employees(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.4 Sales Orders (Multi-Quarry Fulfillment)

```sql
CREATE TABLE sales_orders (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  
  so_no VARCHAR(50) UNIQUE NOT NULL, -- 'SO/2026/001'
  so_date DATE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id),
  
  -- Fulfillment
  source_quarry_id INT REFERENCES quarries(id), -- Primary fulfillment quarry
  fulfillment_type VARCHAR(50), -- 'Single Quarry', 'Multi Quarry'
  
  -- Financial
  total_value DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'INR',
  advance_received DECIMAL(15,2) DEFAULT 0,
  
  -- Export
  is_export BOOLEAN DEFAULT FALSE,
  buyer_country VARCHAR(100),
  port_of_discharge VARCHAR(100),
  incoterms VARCHAR(20), -- 'FOB', 'CFR', 'CIF'
  
  -- Status
  status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT
);

CREATE TABLE sales_order_lines (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  so_id INT NOT NULL REFERENCES sales_orders(id),
  
  line_no INT NOT NULL,
  variety_id INT REFERENCES varieties(id),
  grade VARCHAR(20),
  color VARCHAR(100),
  
  -- Quantity
  qty_cbm DECIMAL(10,3),
  qty_mt DECIMAL(10,3),
  
  -- Pricing
  rate_per_cbm DECIMAL(10,2),
  rate_per_mt DECIMAL(10,2),
  line_value DECIMAL(15,2),
  
  -- Fulfillment
  fulfillment_quarry_id INT REFERENCES quarries(id), -- Line-level quarry assignment
  reserved_block_ids TEXT, -- JSON array of block IDs
  dispatched_qty_cbm DECIMAL(10,3) DEFAULT 0,
  
  UNIQUE(so_id, line_no)
);

CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_quarry ON sales_orders(source_quarry_id);
CREATE INDEX idx_so_date ON sales_orders(so_date);
```

**Rationale:** A customer orders 100 m³ of Paradiso Grade A. Sales order specifies `source_quarry_id = 2` (Paradiso). Order lines can be fulfilled from different quarries if needed (e.g., 80 m³ from Paradiso, 20 m³ from future Quarry 3 if same variety available).

### 5.5 Invoices & Despatch

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  despatch_quarry_id INT NOT NULL REFERENCES quarries(id), -- Where goods despatched from
  
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_type VARCHAR(50), -- 'Tax Invoice', 'Export Invoice', 'Credit Note', 'Debit Note'
  
  customer_id INT NOT NULL REFERENCES customers(id),
  so_id INT REFERENCES sales_orders(id),
  
  -- Tax
  place_of_supply VARCHAR(100),
  gstin_of_supplier VARCHAR(15), -- Quarry's GSTIN
  gstin_of_buyer VARCHAR(15),
  taxable_value DECIMAL(15,2),
  cgst_amount DECIMAL(15,2),
  sgst_amount DECIMAL(15,2),
  igst_amount DECIMAL(15,2),
  total_tax DECIMAL(15,2),
  invoice_value DECIMAL(15,2),
  
  -- E-Invoice & E-Way Bill
  irn VARCHAR(100), -- Invoice Reference Number
  ack_no VARCHAR(50),
  ack_date TIMESTAMP,
  qr_code TEXT,
  e_way_bill_no VARCHAR(20),
  
  -- Export
  shipping_bill_no VARCHAR(50),
  shipping_bill_date DATE,
  port_code VARCHAR(10),
  
  status VARCHAR(50) DEFAULT 'Draft',
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoice_lines (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  invoice_id INT NOT NULL REFERENCES invoices(id),
  
  line_no INT NOT NULL,
  block_id INT REFERENCES blocks(id),
  variety_id INT REFERENCES varieties(id),
  hsn_code VARCHAR(10), -- '2516', '6802'
  description TEXT,
  
  qty_cbm DECIMAL(10,3),
  qty_mt DECIMAL(10,3),
  rate_per_cbm DECIMAL(10,2),
  taxable_value DECIMAL(15,2),
  gst_rate DECIMAL(5,2), -- 5.00, 18.00
  gst_amount DECIMAL(15,2),
  line_total DECIMAL(15,2),
  
  UNIQUE(invoice_id, line_no)
);

CREATE INDEX idx_invoices_quarry ON invoices(despatch_quarry_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
```

### 5.6 General Ledger (Vouchers) - Multi-Dimensional

```sql
CREATE TABLE vouchers (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  
  voucher_no VARCHAR(50) UNIQUE NOT NULL, -- 'JV/2026/001', 'PV/2026/001'
  voucher_type VARCHAR(50), -- 'Journal', 'Payment', 'Receipt', 'Contra'
  voucher_date DATE NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_period INT, -- 1-12 for monthly
  
  reference_no VARCHAR(100), -- External reference (cheque no, invoice no)
  narration TEXT,
  
  -- Multi-dimensional allocation
  default_quarry_id INT REFERENCES quarries(id), -- Default if lines don't specify
  default_cost_center_id INT REFERENCES cost_centers(id),
  
  -- Approvals
  status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Approved', 'Posted', 'Cancelled'
  approved_by INT REFERENCES employees(id),
  approved_at TIMESTAMP,
  posted_by INT,
  posted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT
);

CREATE TABLE voucher_lines (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  voucher_id INT NOT NULL REFERENCES vouchers(id),
  
  line_no INT NOT NULL,
  account_id INT NOT NULL REFERENCES accounts(id),
  
  -- Dimensions
  quarry_id INT REFERENCES quarries(id), -- Line-level override
  cost_center_id INT REFERENCES cost_centers(id),
  
  -- Amount
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'INR',
  exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
  
  -- Party
  party_type VARCHAR(50), -- 'Customer', 'Supplier', 'Employee', 'Asset', 'Bank'
  party_id INT,
  
  -- Tax
  gst_rate DECIMAL(5,2),
  gst_amount DECIMAL(15,2),
  
  -- Reference
  reference_type VARCHAR(50), -- 'Invoice', 'Bill', 'Block', 'Asset', 'Payroll'
  reference_id INT,
  
  UNIQUE(voucher_id, line_no)
);

CREATE INDEX idx_vouchers_org ON vouchers(org_id);
CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_fy ON vouchers(fiscal_year, fiscal_period);
CREATE INDEX idx_voucher_lines_account ON voucher_lines(account_id);
CREATE INDEX idx_voucher_lines_quarry ON voucher_lines(quarry_id);
```

**Example Voucher (Royalty Payment for VATSIN Quarry):**
```
Voucher: PV/2026/123, Date: 2026-05-05, Type: Payment
  Line 1: Dr. Royalty Expense (Account: 5010) - ₹1,50,000, Quarry: ABG, Cost Center: Main Pit
  Line 2: Dr. DMF Expense (Account: 5011) - ₹15,000, Quarry: ABG, Cost Center: Main Pit
  Line 3: Dr. NMET Expense (Account: 5012) - ₹3,000, Quarry: ABG, Cost Center: Main Pit
  Line 4: Cr. Bank - HDFC Current (Account: 1020) - ₹1,68,000
```

**Quarry-wise P&L Query:**
```sql
SELECT 
  q.quarry_name,
  a.account_name,
  SUM(vl.debit_amount - vl.credit_amount) AS net_amount
FROM voucher_lines vl
JOIN vouchers v ON vl.voucher_id = v.id
JOIN accounts a ON vl.account_id = a.id
JOIN quarries q ON vl.quarry_id = q.id
WHERE v.org_id = 1
  AND v.fiscal_year = 2026
  AND v.status = 'Posted'
  AND a.account_type = 'Expense'
GROUP BY q.quarry_name, a.account_name
ORDER BY q.quarry_name, a.account_name;
```

---

## 6. Royalty & Compliance (Quarry-Specific)

### 6.1 Royalty Calculation (Per Quarry)

```sql
CREATE TABLE royalty_challans (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  
  challan_no VARCHAR(50) UNIQUE NOT NULL, -- 'ROY/ABG/2026/04'
  period_month INT NOT NULL, -- 1-12
  period_year INT NOT NULL,
  
  -- Quantity
  opening_stock_cbm DECIMAL(15,3),
  produced_cbm DECIMAL(15,3),
  total_available_cbm DECIMAL(15,3),
  despatched_cbm DECIMAL(15,3),
  closing_stock_cbm DECIMAL(15,3),
  
  -- Rates (as per lease)
  royalty_rate_per_cbm DECIMAL(10,2),
  dmf_percent DECIMAL(5,2),
  nmet_percent DECIMAL(5,2),
  
  -- Amounts
  royalty_amount DECIMAL(15,2),
  dmf_amount DECIMAL(15,2),
  nmet_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  
  -- Payment
  payment_date DATE,
  payment_ref VARCHAR(100),
  voucher_id INT REFERENCES vouchers(id),
  
  -- Reconciliation
  dept_acknowledgement_no VARCHAR(100),
  dept_acknowledgement_date DATE,
  reconciled BOOLEAN DEFAULT FALSE,
  variance_cbm DECIMAL(10,3),
  variance_amount DECIMAL(15,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_royalty_quarry ON royalty_challans(quarry_id);
CREATE INDEX idx_royalty_period ON royalty_challans(period_year, period_month);
```

### 6.2 Mineral Despatch Permits (Per Quarry)

```sql
CREATE TABLE mineral_despatch_permits (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  quarry_id INT NOT NULL REFERENCES quarries(id),
  
  permit_no VARCHAR(50) UNIQUE NOT NULL, -- System-generated or from TN portal
  permit_date DATE NOT NULL,
  permit_type VARCHAR(50), -- 'Regular', 'Inter-District', 'Inter-State'
  
  -- Linkage
  despatch_advice_id INT REFERENCES despatch_advices(id),
  invoice_id INT REFERENCES invoices(id),
  
  -- Quantity & Mineral
  mineral VARCHAR(100),
  qty_cbm DECIMAL(10,3),
  qty_mt DECIMAL(10,3),
  
  -- Destination
  destination_address TEXT,
  destination_pincode VARCHAR(10),
  vehicle_no VARCHAR(20),
  driver_name VARCHAR(100),
  
  -- Validity
  valid_from_date DATE,
  valid_to_date DATE,
  
  -- Portal Integration
  portal_reference_no VARCHAR(100), -- From TN portal
  portal_qr_code TEXT,
  portal_status VARCHAR(50), -- 'Issued', 'In Transit', 'Delivered', 'Cancelled'
  
  -- Usage
  used_date DATE,
  used_at_location VARCHAR(100), -- Check-post / destination
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mdp_quarry ON mineral_despatch_permits(quarry_id);
CREATE INDEX idx_mdp_date ON mineral_despatch_permits(permit_date);
CREATE INDEX idx_mdp_vehicle ON mineral_despatch_permits(vehicle_no);
```

---

## 7. Reporting Dimensions

### 7.1 Standard Report Dimensions

Every report supports filtering and grouping by:
- **Organization:** For future multi-company
- **Quarry:** ABG, Paradiso, or All
- **Cost Center:** Pit, Stockyard, Workshop, etc.
- **Time Period:** Date range, month, quarter, FY
- **Variety / Grade / Color:** Product dimension
- **Customer / Supplier:** Party dimension
- **Asset / Equipment:** For equipment reports

### 7.2 Consolidated vs Quarry-wise Reporting

**Consolidated (Organization Level):**
- Consolidated P&L, Balance Sheet, Cash Flow
- Consolidated customer outstanding
- Consolidated inventory value (all quarries)
- Consolidated tax returns (GST, TDS, IT)
- Consolidated employee headcount, payroll

**Quarry-wise:**
- Production (m³, blocks) per quarry
- Royalty paid per quarry
- Cost per m³ per quarry
- EBITDA per quarry
- MCDR returns per quarry
- Safety incidents per quarry
- Equipment utilization per quarry

**Comparative:**
- ABG vs Paradiso: Production, cost, margin, recovery %
- Bench-wise within a quarry: Cost per m³, yield
- Month-on-month, year-on-year trends per quarry

### 7.3 Drill-Down Capability

Example: MD Dashboard → Quarry Tile (ABG) → Production (m³) → Bench Breakdown → Block List → Block Details → Photos → Blast Event → Explosives Consumed

---

## 8. Data Migration Strategy

### 8.1 Master Data
- **Customers, Suppliers, Employees:** Import via CSV with org_id = 1
- **Chart of Accounts:** Tally ledger export → map to new chart → import with org_id = 1
- **Assets:** Equipment list → import with current_quarry_id assignment

### 8.2 Opening Balances
- **Blocks in Stockyard:** Import with quarry_id, current_location_id, opening balance flag
- **Bank Balances:** Opening voucher per bank account, quarry-wise if segregated
- **GL Opening Balance:** Journal voucher dated 1 Apr 2026 (or cutover date)

### 8.3 Transactional History
- **Decision:** Import last 2 years (FY 2024-25, FY 2025-26) for trend analysis
- **Earlier data:** Archive in DMS, accessible via search but not in transactional tables

---

## 9. Adding a New Quarry - Checklist

### 9.1 Configuration Steps
1. **Create Quarry Master:** Insert into `quarries` table
   - Assign quarry_code, name, type, location, GSTIN (if separate)
   - Link to lease (if applicable)
2. **Create Cost Centers:** Pit, Stockyard, Magazine, Workshop, Admin
3. **Create Locations (Benches):** Per mining plan
4. **Assign Assets:** Transfer or hire-in equipment, update `current_quarry_id`
5. **Assign Employees:** Set `primary_quarry_id` for on-site staff
6. **Configure Varieties:** Add quarry-specific varieties (or mark shared varieties as available)
7. **Set Royalty Rates:** Update lease with applicable rates
8. **Configure Tax:** GSTIN, place of supply
9. **Create Users & Roles:** Quarry Manager, Foreman, Accountant with quarry-level access
10. **Load Opening Stock:** If taking over existing stockyard

### 9.2 Zero Code Change
All configuration via database inserts and admin UI. Application logic uses `quarry_id` as a dimension; no hard-coding of quarry-specific business rules.

---

## 10. Multi-Tenancy (Future SaaS Consideration)

### 10.1 Shared Database, Isolated Data (Current Design)
- All organizations in single database
- `org_id` on every table ensures logical isolation
- PostgreSQL RLS enforces isolation at row level
- Connection pooling per organization

### 10.2 Database-per-Tenant (Alternative)
- Each organization gets a separate database
- Simpler isolation, easier backup/restore per tenant
- More complex schema upgrades (must apply to N databases)

**Recommendation for Vatsin Granite:** Start with shared database (current design). If offering SaaS to other quarries, continue shared DB up to ~100 tenants; beyond that, consider DB-per-tenant or hybrid (large tenants get dedicated DB).

---

## 11. Performance Considerations

### 11.1 Partitioning
For large transactional tables (voucher_lines, attendance, blocks):
- **Partition by fiscal year:** Improves query performance for current-year data
- **PostgreSQL declarative partitioning:**
  ```sql
  CREATE TABLE voucher_lines (
    ...
    fiscal_year INT NOT NULL,
    ...
  ) PARTITION BY RANGE (fiscal_year);
  
  CREATE TABLE voucher_lines_2024 PARTITION OF voucher_lines
    FOR VALUES FROM (2024) TO (2025);
  CREATE TABLE voucher_lines_2025 PARTITION OF voucher_lines
    FOR VALUES FROM (2025) TO (2026);
  -- Add new partition each year
  ```

### 11.2 Indexing
- **Composite indexes:** (org_id, quarry_id, date) for frequent filters
- **Partial indexes:** For active records only: `WHERE active = TRUE`
- **GIN/GiST indexes:** For full-text search (block search, customer search)
- **Spatial indexes:** For geo-queries (lease polygon, blast proximity)

### 11.3 Caching
- **Quarry metadata:** Cache in application memory (rarely changes)
- **Rate masters:** Cache royalty rates, GST rates, min wages (version-aware)
- **User permissions:** Cache role-quarry-module mapping per session

### 11.4 Archival
- **Policy:** Archive transactions > 5 years to separate archive schema/database
- **Statutory retention:** Keep financial, statutory data for 8-10 years (may be in archive, but accessible)
- **Archival table example:**
  ```sql
  CREATE TABLE archive.vouchers AS SELECT * FROM public.vouchers WHERE FALSE;
  -- Annual job: Move FY 2020 data to archive.vouchers
  ```

---

## 12. API Design for Multi-Quarry

### 12.1 RESTful API Pattern

**Base URL:** `/api/v1`

**Quarry-Specific Endpoints:**
```
GET    /quarries                      # List all quarries (org-filtered)
GET    /quarries/{quarry_id}          # Quarry details
GET    /quarries/{quarry_id}/blocks   # Blocks in this quarry
POST   /quarries/{quarry_id}/blocks   # Create block in this quarry
GET    /quarries/{quarry_id}/production # Production dashboard for quarry
GET    /quarries/{quarry_id}/reports/royalty # Royalty report for quarry
```

**Organization-Level Endpoints:**
```
GET    /customers                     # All customers (org-filtered by session)
GET    /sales-orders                  # All sales orders (org-filtered)
GET    /reports/consolidated/pl       # Consolidated P&L (all quarries)
GET    /reports/comparative           # ABG vs Paradiso comparison
```

**Context Injection:**
```javascript
// Middleware extracts org_id from authenticated user session
req.org_id = req.user.org_id;

// If quarry_id in path, validate user has access to that quarry
if (req.params.quarry_id) {
  // Check user's role-quarry mapping
  if (!canAccessQuarry(req.user, req.params.quarry_id)) {
    return res.status(403).json({ error: 'Access denied to this quarry' });
  }
}

// All queries automatically filter by org_id
const blocks = await Block.findAll({
  where: {
    org_id: req.org_id,
    quarry_id: req.params.quarry_id,
    active: true
  }
});
```

### 12.2 GraphQL Alternative

```graphql
query {
  organization(id: 1) {
    name
    quarries {
      id
      name
      blocks(status: "In Stockyard") {
        blockNo
        variety { name }
        grossCbm
      }
    }
  }
}
```

**Advantage:** Client specifies exact data needed, reduces over-fetching. Single query can fetch multi-quarry data.

---

## 13. User Access Control (Multi-Quarry)

### 13.1 Role-Quarry-Module Matrix

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  org_id INT NOT NULL,
  role_code VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(200) NOT NULL,
  description TEXT
);

CREATE TABLE role_quarry_access (
  id SERIAL PRIMARY KEY,
  role_id INT NOT NULL REFERENCES roles(id),
  quarry_id INT NOT NULL REFERENCES quarries(id),
  access_level VARCHAR(50), -- 'Read', 'Write', 'Approve', 'Admin'
  UNIQUE(role_id, quarry_id)
);

CREATE TABLE role_module_permissions (
  id SERIAL PRIMARY KEY,
  role_id INT NOT NULL REFERENCES roles(id),
  module_code VARCHAR(50), -- 'M1', 'M2', ..., 'M30'
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT FALSE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_approve BOOLEAN DEFAULT FALSE,
  UNIQUE(role_id, module_code)
);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  quarry_id INT REFERENCES quarries(id), -- NULL = org-wide role
  UNIQUE(user_id, role_id, quarry_id)
);
```

**Example Roles:**
- **MD:** Read access to all quarries, all modules
- **VATSIN Quarry Manager:** Full access to ABG quarry (quarry_id=1), read-only to Paradiso
- **Paradiso Foreman:** Create/update in M1, M2, M22 for Paradiso quarry only
- **Finance Manager:** Full finance modules (M11-M13) across all quarries
- **Compliance Officer:** Full M15-M19 across all quarries

**Access Check:**
```javascript
function canAccessQuarry(user, quarry_id, permission) {
  // Get user's roles for this quarry
  const roles = user.roles.filter(r => 
    r.quarry_id === quarry_id || r.quarry_id === null // Org-wide roles
  );
  
  // Check if any role has the required permission
  return roles.some(r => r.permissions.includes(permission));
}
```

---

## 14. Conclusion

This multi-quarry data model provides:

1. **Logical Isolation:** Each quarry's operations are independently tracked while sharing common masters
2. **Consolidated Reporting:** Organization-level financial statements and operational KPIs
3. **Scalability:** Adding Quarry 3, 4, N requires configuration, not code
4. **Flexibility:** Assets and employees can move between quarries with full audit trail
5. **Compliance:** Quarry-specific statutory returns (royalty, MCDR) auto-generated with correct segregation
6. **Cost Accounting:** Accurate cost per m³ per quarry, enabling profitability comparison

**Next Steps:**
- Review and validate with stakeholders
- Implement in Entity Relationship Diagram (ERD)
- Update Architecture Diagram to show multi-quarry deployment
- Create seed data for Vatsin Granite (org_id=1) and two quarries (ABG, Paradiso)

---

**Document Control:**
- **Version:** 1.0
- **Date:** 23 May 2026
- **Author:** Solution Architect
- **Approval:** Pending

---

*— End of Multi-Quarry Data Model Document —*
