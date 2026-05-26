import { useState, useMemo, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Row = string[];
interface Section {
  id: string;
  title: string;
  content: ContentBlock[];
}
type ContentBlock =
  | { type: 'p';         text: string }
  | { type: 'h3';        text: string }
  | { type: 'h4';        text: string }
  | { type: 'ul';        items: string[] }
  | { type: 'ol';        items: string[] }
  | { type: 'table';     headers: string[]; rows: Row[] }
  | { type: 'code';      text: string }
  | { type: 'warn';      text: string }
  | { type: 'tip';       text: string }
  | { type: 'checklist'; items: string[] };

// ── Content ───────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  // ── 1. Overview ─────────────────────────────────────────────────────────────
  {
    id: 'overview',
    title: '1. System Overview',
    content: [
      { type: 'p', text: 'Vatsin Granite ERP is an integrated quarry management platform built for granite quarry operators in Tamil Nadu. It covers the full lifecycle — from blasting and block extraction through sales, invoicing, statutory compliance, and payroll — in a single system accessible from any browser.' },
      { type: 'table', headers: ['Module', 'Purpose', 'Primary Users'], rows: [
        ['Dashboard',    'Live KPIs — production, stock, revenue, employees', 'All'],
        ['Production',   'Daily production logs per shift per quarry',         'Supervisor, Manager'],
        ['Blasting',     'Blast events, explosives consumed, DGMS audit trail','Supervisor, Manager'],
        ['Blocks',       'Block register — dimensions, CBM, variety, status',  'Supervisor, Sales'],
        ['Weighbridge',  'Vehicle weighments — gross, tare, net weight',       'Supervisor, Admin'],
        ['Assets',       'Machinery register — compressors, drills, cranes',   'Manager, Admin'],
        ['Maintenance',  'Preventive/corrective job cards per asset',          'Manager, Admin'],
        ['Consumables',  'Diesel, drill bits, explosives stock & cost',        'Supervisor, Manager'],
        ['Sales',        'Customer master, sales orders, dispatch',            'Sales, Admin'],
        ['Invoices',     'GST tax invoices — CGST/SGST/IGST, e-way bill ref', 'Sales, Accounts'],
        ['Accounts',     'Chart of accounts, journal vouchers, GL',            'Accounts, Admin'],
        ['Royalty',      'Royalty challans per quarry (IBM/DMG compliance)',   'Accounts, Admin'],
        ['GST & Tax',    'GSTR-1 / GSTR-3B summary, HSN-wise tax',            'Accounts'],
        ['Employees',    'Employee register, designation, quarry assignment',  'HR, Admin'],
        ['Payroll',      'Monthly payroll runs from attendance',               'HR, Accounts'],
        ['Compliance',   'Mining permits, TNMMCR, DGMS registrations',        'Admin, Manager'],
        ['Safety',       'Safety incidents, near-miss, training records',      'Supervisor, Admin'],
        ['Permits',      'Permit register — expiry alerts, renewal tracking',  'Admin, Manager'],
        ['Reports',      'DPR, stock report, P&L summary',                    'All'],
        ['Users',        'User accounts, roles, password management',          'Admin'],
        ['Masters',      'Org details, quarry setup, demo data',              'Admin'],
      ]},
      { type: 'h3', text: 'User Roles' },
      { type: 'table', headers: ['Role', 'Access Level'], rows: [
        ['ADMIN',       'Full access — all modules, user management, purge/reset'],
        ['MANAGER',     'Operations management — all ops modules, no user admin'],
        ['SUPERVISOR',  'Field operations — production, blasting, weighbridge, consumables'],
        ['ACCOUNTANT',  'Finance modules — accounts, invoices, royalty, GST, payroll'],
        ['SALES',       'Sales & customer modules — orders, invoices (read), block stock'],
        ['VIEWER',      'Read-only across all modules'],
      ]},
      { type: 'h3', text: 'Multi-Quarry Support' },
      { type: 'p', text: 'One login covers all quarries under the same organisation. Each quarry has its own blocks, employees, production logs, invoices, and GSTIN. The default quarry is pre-selected in forms — operators working at a specific site never need to change it.' },
    ],
  },

  // ── 2. First-Time Setup ──────────────────────────────────────────────────────
  {
    id: 'setup',
    title: '2. First-Time Setup',
    content: [
      { type: 'h3', text: '2.1 Initial Login' },
      { type: 'p', text: 'On first access the system starts with a single admin user:' },
      { type: 'ul', items: ['Username: admin', 'Password: Admin@123  ← Change immediately after first login'] },
      { type: 'warn', text: 'Change the admin password before sharing the URL with anyone. Go to System → Users → Reset Password.' },
      { type: 'h3', text: '2.2 Setup Wizard (New Installation)' },
      { type: 'p', text: 'After a factory reset, the system detects an empty quarry list and automatically redirects to the Setup Wizard. Complete two steps:' },
      { type: 'ol', items: [
        'Company Info — Enter org name, GSTIN, PAN, contact email, phone, and registered address',
        'Primary Quarry — Enter quarry name, code, district, state, GSTIN, DGMS registration number, IBM code',
      ]},
      { type: 'tip', text: 'The first quarry created becomes the default. All forms and reports pre-select this quarry. Add additional quarries later from Quarry & Blocks → Quarries.' },
      { type: 'h3', text: '2.3 Add Additional Quarries' },
      { type: 'p', text: 'Path: Quarry & Blocks → Quarries → Add Quarry' },
      { type: 'ul', items: [
        'Each quarry needs a unique code (e.g. ABG, PARA)',
        'Enter district, state, GSTIN (if registered separately), DGMS Reg. No., IBM Code',
        'Set the primary/default quarry using "Set Default" button — all forms pre-select it',
        'Secondary quarries can be removed only if they have no associated data (blocks, employees, etc.)',
      ]},
      { type: 'h3', text: '2.4 Chart of Accounts' },
      { type: 'p', text: 'The system seeds a standard quarry chart of accounts on first run. Review and add accounts as needed under Finance → Accounts.' },
      { type: 'table', headers: ['Account', 'Type', 'Purpose'], rows: [
        ['Cash in Hand',        'Asset',     'Daily petty cash'],
        ['Bank Accounts',       'Asset',     'Current account'],
        ['Accounts Receivable', 'Asset',     'Customer outstanding'],
        ['Block Inventory',     'Asset',     'Finished block stock value'],
        ['Accounts Payable',    'Liability', 'Vendor dues'],
        ['CGST Payable',        'Liability', 'GST liability'],
        ['SGST Payable',        'Liability', 'GST liability'],
        ['IGST Payable',        'Liability', 'Inter-state GST'],
        ['TDS Payable',         'Liability', 'TDS to be remitted'],
        ['Sales Revenue',       'Income',    'Domestic and export sales'],
        ['Blasting Expenses',   'Expense',   'Explosives and drilling'],
        ['Labour Expenses',     'Expense',   'Daily wages and salaries'],
        ['Royalty Expenses',    'Expense',   'IBM/DMG royalty paid'],
      ]},
      { type: 'h3', text: '2.5 Add Employees' },
      { type: 'p', text: 'Path: People → Employees → Add Employee' },
      { type: 'checklist', items: [
        'Employee code, name, designation, department',
        'Primary quarry assignment',
        'Employment type (Permanent / Contract / Daily Wage)',
        'Date of joining, basic salary',
        'Contact details',
      ]},
      { type: 'h3', text: '2.6 Add Customers' },
      { type: 'p', text: 'Path: Trade → Sales → Customers → Add Customer' },
      { type: 'ul', items: [
        'Customer code, name, type (Corporate / Dealer / Individual)',
        'GSTIN (required for B2B GST invoices)',
        'State — determines CGST+SGST (same state) vs IGST (different state)',
        'Credit limit and credit days',
      ]},
    ],
  },

  // ── 3. Daily Operations ──────────────────────────────────────────────────────
  {
    id: 'daily-ops',
    title: '3. Daily Operations',
    content: [
      { type: 'h3', text: 'Morning Checklist (Supervisor)' },
      { type: 'checklist', items: [
        'Log yesterday\'s production if not already entered (Daily Ops → Production)',
        'Check equipment status — any breakdowns? Log maintenance job',
        'Verify diesel and explosives stock — reorder if below safety level',
        'Confirm shift schedule — day / night headcount',
      ]},
      { type: 'h3', text: '3.1 Logging Daily Production' },
      { type: 'p', text: 'Path: Daily Ops → Production → Add Log' },
      { type: 'ul', items: [
        'Select quarry, date, shift (day/night)',
        'Enter blocks produced, gross CBM (cubic metres extracted)',
        'System calculates net CBM after waste factor',
        'Add notes for any stoppages or incidents',
      ]},
      { type: 'tip', text: 'Log production the same day — it feeds the DPR (Daily Production Report) and block inventory automatically.' },
      { type: 'h3', text: '3.2 Logging a Blast Event' },
      { type: 'p', text: 'Path: Daily Ops → Blasting → Add Event' },
      { type: 'ul', items: [
        'Select quarry, date, shift',
        'Number of holes drilled, depth (metres)',
        'Explosives used (kg) — ANFO or Slurry',
        'Detonators used (count)',
        'Result: blocks obtained or area cleared',
      ]},
      { type: 'warn', text: 'Every blast event must be recorded. DGMS inspectors check blasting registers — gaps in the log are a violation.' },
      { type: 'h3', text: '3.3 Weighbridge Entry' },
      { type: 'p', text: 'Path: Daily Ops → Weighbridge → Add Entry' },
      { type: 'ul', items: [
        'Vehicle number, driver, material type (block / overburden / waste)',
        'Gross weight (full truck), tare weight (empty truck)',
        'Net weight = Gross − Tare (auto-calculated)',
        'Link to block ID or sales order if outgoing material',
      ]},
      { type: 'h3', text: '3.4 Registering a New Block' },
      { type: 'p', text: 'Path: Quarry & Blocks → Blocks → Add Block' },
      { type: 'ul', items: [
        'Select quarry, variety (granite type)',
        'Dimensions: Length × Width × Height in mm',
        'System calculates CBM = (L × W × H) / 1,000,000,000',
        'Extraction date, status defaults to "Available"',
        'Block receives a unique block number automatically',
      ]},
      { type: 'tip', text: 'Block status flows: Available → Reserved (on sales order) → Sold (on invoice) → Rejected.' },
    ],
  },

  // ── 4. Sales & Invoicing ─────────────────────────────────────────────────────
  {
    id: 'sales',
    title: '4. Sales & Invoicing',
    content: [
      { type: 'h3', text: '4.1 Creating a Sales Order' },
      { type: 'p', text: 'Path: Trade → Sales → New Order' },
      { type: 'ol', items: [
        'Select customer, quarry, order date',
        'Add order lines — quantity in CBM, rate per CBM, GST rate (5% / 12% / 18%)',
        'System calculates taxable value, CGST, SGST or IGST based on customer\'s state',
        'Save — order status becomes "Confirmed"',
        'Blocks can be reserved against this order from the Blocks page',
      ]},
      { type: 'h3', text: '4.2 Raising a GST Invoice' },
      { type: 'p', text: 'Path: Trade → Invoices → New Invoice' },
      { type: 'ul', items: [
        'Link to sales order (optional — invoice can also be standalone)',
        'Select despatch quarry, invoice date, customer',
        'Place of supply — determines tax type (intra-state = CGST+SGST, inter-state = IGST)',
        'Taxable value, CGST, SGST, IGST amounts',
        'Save as Draft → review → Post (status becomes "posted")',
      ]},
      { type: 'warn', text: 'Posted invoices cannot be edited. If an error is found, raise a credit note manually via Finance → Accounts (journal voucher).' },
      { type: 'table', headers: ['Invoice Status', 'Meaning', 'Next Action'], rows: [
        ['draft',    'Being prepared, not yet sent', 'Review and post'],
        ['posted',   'Finalised, GST liability created', 'Send to customer, record payment'],
        ['paid',     'Full payment received', 'Archive'],
        ['cancelled','Voided — no tax impact', 'Raise fresh invoice if needed'],
      ]},
      { type: 'h3', text: '4.3 HSN Codes & GST Rates — Granite' },
      { type: 'table', headers: ['HSN', 'Description', 'GST Rate'], rows: [
        ['2516',        'Granite blocks (rough quarried)',      '5%'],
        ['6802',        'Dressed/cut granite slabs',           '12%'],
        ['6802 9090',   'Polished granite tiles/slabs',        '18%'],
        ['9901',        'Export — LUT/Bond',                   '0% (IGST exempt)'],
      ]},
      { type: 'tip', text: 'Most quarry-to-dealer block sales use HSN 2516 at 5% GST. Verify with your CA if selling cut or polished material.' },
      { type: 'h3', text: '4.4 Export Sales' },
      { type: 'p', text: 'Path: Trade → Export Sales' },
      { type: 'ul', items: [
        'Requires LUT (Letter of Undertaking) filed with GST portal — zero-rated supply',
        'Enter shipping bill number, port of export, country of destination',
        'Invoice raised with IGST 0% — mention LUT number on invoice',
        'File GSTR-1 with Table 6A export invoices',
      ]},
    ],
  },

  // ── 5. Finance ──────────────────────────────────────────────────────────────
  {
    id: 'finance',
    title: '5. Finance & Accounts',
    content: [
      { type: 'h3', text: '5.1 Journal Vouchers' },
      { type: 'p', text: 'Path: Finance → Accounts → New Voucher' },
      { type: 'ul', items: [
        'Voucher types: Payment, Receipt, Journal, Contra',
        'Every entry must balance — total debits must equal total credits',
        'Select quarry for multi-quarry P&L tracking',
        'Add narration — be specific (e.g. "Royalty paid to DMG — Oct 2025 — Challan 12345")',
      ]},
      { type: 'tip', text: 'Use Journal type for month-end provisions, accruals, and adjustments. Use Payment for cash/bank payments, Receipt for collections.' },
      { type: 'h3', text: '5.2 Royalty Challans' },
      { type: 'p', text: 'Path: Finance → Royalty → New Challan' },
      { type: 'ul', items: [
        'Royalty is payable to the State Government (DMG / IBM) based on quantity extracted',
        'Rate for granite in Tamil Nadu: ₹100–150 per MT depending on grade (verify current TNMMCR schedule)',
        'Enter challan number, date, period, quarry, quantity (MT), rate, amount',
        'System tracks cumulative royalty paid per quarry per financial year',
      ]},
      { type: 'warn', text: 'Royalty must be paid before despatch. A valid royalty challan must accompany every outgoing vehicle. No challan = illegal transport.' },
      { type: 'h3', text: '5.3 GST Filing Summary' },
      { type: 'table', headers: ['Return', 'Period', 'Due Date', 'What it covers'], rows: [
        ['GSTR-1',  'Monthly',    '11th of next month',  'All outward supplies (invoices raised)'],
        ['GSTR-3B', 'Monthly',    '20th of next month',  'Summary + tax payment'],
        ['GSTR-9',  'Annual',     '31 Dec after FY end', 'Annual consolidated return'],
        ['GSTR-9C', 'Annual',     '31 Dec after FY end', 'Reconciliation (if turnover > ₹5 Cr)'],
      ]},
      { type: 'p', text: 'Path: Finance → GST & Tax → Summary — exports GSTR-1 data quarry-wise. Share with your CA for filing.' },
      { type: 'h3', text: '5.4 Month-End Checklist' },
      { type: 'checklist', items: [
        'All production logs entered for the month',
        'All invoices posted (no drafts pending)',
        'Royalty challans entered for the month',
        'Payments received recorded as receipts',
        'Petty cash reconciled and vouchers entered',
        'Bank statement matched with bank receipts/payments',
        'GST liability calculated — CGST+SGST+IGST vs input credit',
        'Payroll run processed and approved',
        'TDS deducted on applicable payments (contractors, rent)',
      ]},
    ],
  },

  // ── 6. Royalty & Statutory ───────────────────────────────────────────────────
  {
    id: 'statutory',
    title: '6. Royalty & Statutory Compliance',
    content: [
      { type: 'h3', text: '6.1 Regulatory Framework — Tamil Nadu Granite Quarries' },
      { type: 'table', headers: ['Regulation', 'Authority', 'Requirement'], rows: [
        ['TNMMCR 1959',         'DMG, Tamil Nadu',        'Mining lease, royalty payment, annual returns'],
        ['Mines Act 1952',      'DGMS',                   'Safety standards, blasting rules, accident reporting'],
        ['IBM Guidelines',      'IBM, Ministry of Mines', 'Annual mineral returns (Form A/B/D), IBM code'],
        ['GST Act',             'CBIC',                   'Registration, monthly returns, e-invoicing (turnover > ₹5 Cr)'],
        ['Explosive Rules 2008','PESO / CEA',             'Licensed storage, usage log, PESO inspection'],
        ['Labour Laws',         'Labour Dept TN',         'EPF, ESI, minimum wages, contract labour'],
      ]},
      { type: 'h3', text: '6.2 Annual Returns Calendar' },
      { type: 'table', headers: ['Return / Filing', 'Due Date', 'Authority'], rows: [
        ['Form A — Annual Mineral Return',          '31 March (for prev FY)', 'IBM'],
        ['Form D — Granite quantity & export data', '31 March',               'IBM'],
        ['Royalty Annual Statement',                '30 April',               'DMG Tamil Nadu'],
        ['DGMS Annual Report',                      '31 January',             'DGMS'],
        ['GSTR-9 Annual GST Return',                '31 December',            'GSTN'],
        ['Income Tax Return (Company)',             '31 October',             'IT Dept'],
        ['EPF Annual Return (Form 3A/6A)',           'April 30',              'EPFO'],
      ]},
      { type: 'h3', text: '6.3 Permit Register' },
      { type: 'p', text: 'Path: Statutory → Permits' },
      { type: 'ul', items: [
        'Log every permit with issue date, expiry date, authority, permit number',
        'System flags permits expiring within 30 days on the Dashboard',
        'Types: Mining Lease, Explosive Storage Licence, Water Discharge (NOC), Environmental Clearance, DGMS Registration',
      ]},
      { type: 'warn', text: 'Operating with an expired mining lease is a criminal offence under TNMMCR. Set renewal reminders well before expiry.' },
      { type: 'h3', text: '6.4 Safety Incidents' },
      { type: 'p', text: 'Path: Statutory → Safety → Log Incident' },
      { type: 'ul', items: [
        'All accidents — major, minor, near-miss — must be recorded',
        'Serious accidents must be reported to DGMS within 24 hours (Form I under Mines Act)',
        'Enter: date, quarry, description, injured person, action taken, root cause',
      ]},
    ],
  },

  // ── 7. Employees & Payroll ──────────────────────────────────────────────────
  {
    id: 'payroll',
    title: '7. Employees & Payroll',
    content: [
      { type: 'h3', text: '7.1 Attendance' },
      { type: 'p', text: 'Path: People → Employees → Attendance' },
      { type: 'ul', items: [
        'Mark attendance daily per employee — Present / Absent / Half Day / Leave',
        'Can be entered in bulk for a date across all employees of a quarry',
        'Payroll run reads attendance for the pay period to calculate days worked',
      ]},
      { type: 'h3', text: '7.2 Monthly Payroll Run' },
      { type: 'p', text: 'Path: People → Payroll → New Run' },
      { type: 'ol', items: [
        'Select pay period (month and year)',
        'System calculates: Days worked × (Basic Salary / Working Days in Month)',
        'Deductions: Absence, PF contribution (employee share 12%), ESI (employee 0.75%), advance recovery',
        'Review pay details per employee',
        'Approve run — locked from further changes',
        'Export salary register for bank transfer / cash payment',
      ]},
      { type: 'table', headers: ['Statutory', 'Rate', 'Applicable When'], rows: [
        ['EPF (Employee)', '12% of Basic',          'Basic ≤ ₹15,000 (or opt-in above)'],
        ['EPF (Employer)', '12% of Basic',          'Same — employer contribution'],
        ['ESI (Employee)', '0.75% of Gross',        'Gross ≤ ₹21,000/month'],
        ['ESI (Employer)', '3.25% of Gross',        'Same — employer contribution'],
        ['PT (Tamil Nadu)', '₹208/month',           'All employees earning > ₹21,000/year'],
        ['TDS (Salary)',    'As per slab',           'Applicable for salaried above basic exemption'],
      ]},
      { type: 'warn', text: 'EPF must be remitted by the 15th of the following month. ESI by the 15th. Late payment attracts 12% p.a. interest + damages.' },
      { type: 'h3', text: '7.3 Minimum Wages — Tamil Nadu (Granite Mining)' },
      { type: 'p', text: 'Tamil Nadu revises minimum wages periodically. As of the last notification for "Stone/Granite Mining":' },
      { type: 'ul', items: [
        'Unskilled worker: ₹450–480/day (verify current GO from Labour Dept TN)',
        'Semi-skilled: ₹520–560/day',
        'Skilled (blaster, compressor operator): ₹600–650/day',
        'Highly skilled (quarry manager): ₹750+/day',
      ]},
      { type: 'tip', text: 'Verify current minimum wages from Tamil Nadu Labour Department website or your district\'s Labour Office before every salary revision.' },
    ],
  },

  // ── 8. Equipment & Consumables ───────────────────────────────────────────────
  {
    id: 'equipment',
    title: '8. Equipment & Consumables',
    content: [
      { type: 'h3', text: '8.1 Asset Register' },
      { type: 'p', text: 'Path: Equipment → Assets → Add Asset' },
      { type: 'ul', items: [
        'Asset name, category (machinery / vehicle / tool / infrastructure)',
        'Purchase date, purchase cost, current quarry',
        'Operational status: Active / Under Maintenance / Decommissioned',
        'Serial number, make/model for warranty and service tracking',
      ]},
      { type: 'table', headers: ['Typical Assets', 'Category'], rows: [
        ['Compressor (Ingersoll Rand, Atlas Copco)', 'machinery'],
        ['Drill rig / Jack hammer',                  'machinery'],
        ['Wire saw machine',                         'machinery'],
        ['Crane / Chain pulley block',               'machinery'],
        ['Tipper / Dumper truck',                    'vehicle'],
        ['JCB / Excavator / Loader',                 'vehicle'],
        ['Water tanker',                             'vehicle'],
        ['Generator set',                            'machinery'],
        ['Site office shed / Quarry shelter',        'infrastructure'],
      ]},
      { type: 'h3', text: '8.2 Maintenance Jobs' },
      { type: 'p', text: 'Path: Equipment → Maintenance → Add Job' },
      { type: 'ul', items: [
        'Select asset, quarry, job type (Preventive / Corrective / Breakdown)',
        'Description of work, scheduled date',
        'Mechanic / vendor who did the work, cost incurred',
        'Once completed, mark status "Completed"',
      ]},
      { type: 'tip', text: 'Set preventive maintenance jobs on a calendar (e.g. compressor oil change every 250 hours). Breakdown frequency drops significantly with a PM schedule.' },
      { type: 'h3', text: '8.3 Consumables Stock' },
      { type: 'p', text: 'Path: Equipment → Consumables → Add Receipt' },
      { type: 'table', headers: ['Item', 'Category', 'Track Why'], rows: [
        ['Diesel (HSD)',           'fuel',        'Largest variable cost — track per machine'],
        ['Drill bits / bits',      'drilling',    'Wear rate indicates ground hardness'],
        ['Explosives (ANFO/Slurry)','explosive',  'Regulated — every kg must be logged'],
        ['Detonators (electric/NONEL)', 'explosive', 'PESO compliance — balance every month'],
        ['Compressor oil',         'lubricant',   'PM interval tracking'],
        ['Hydraulic oil',          'lubricant',   'JCB / wire saw machine'],
        ['Steel wire rope',        'wire-saw',    'Life tracking — replace before failure'],
      ]},
      { type: 'warn', text: 'Explosive store balance must match: Opening stock + Received − Used = Closing stock. PESO inspectors verify this register every quarter.' },
    ],
  },

  // ── 9. Backup & Recovery ─────────────────────────────────────────────────────
  {
    id: 'backup',
    title: '9. Backup & Data Recovery',
    content: [
      { type: 'h3', text: '9.1 Backup Methods' },
      { type: 'p', text: 'Path: System → Masters → Admin tab → Backup section (web UI) or via CLI scripts.' },
      { type: 'table', headers: ['Method', 'What it does', 'Use when'], rows: [
        ['Local Backup',  'Copies DB to /home/backups/ on server',               'Quick snapshot before any major operation'],
        ['Blob Backup',   'Uploads DB to Azure Blob Storage',                    'Off-site recovery — run daily'],
        ['Download',      'Downloads DB file to your local machine',             'Keep a copy off-cloud'],
        ['Restore',       'Replaces live DB with an uploaded .db file',          'Disaster recovery'],
      ]},
      { type: 'h3', text: '9.2 Recommended Backup Schedule' },
      { type: 'checklist', items: [
        'Daily: Azure Blob backup (run via abg.sh backup prod or scheduled task)',
        'Weekly: Download one backup to local machine or external drive',
        'Before any purge/reset: Create a local backup first — always',
        'Before software updates: Blob backup + download',
      ]},
      { type: 'h3', text: '9.3 CLI Backup Commands' },
      { type: 'code', text: '# Backup production (server copy + blob + download)\n./scripts/abg.sh backup prod\n\n# List all backup files\n./scripts/abg.sh backups prod\n\n# Restore from a local file\n./scripts/abg.sh restore prod backups/vatsingranite-prod-2025-06-01.db' },
      { type: 'h3', text: '9.4 Data Reset Options' },
      { type: 'table', headers: ['Action', 'What is deleted', 'What is kept', 'Use case'], rows: [
        ['Purge',          'All data — quarries, customers, blocks, transactions', 'Org record + user logins', 'Go-live: wipe demo data, keep users'],
        ['Reseed',         'All data then refills with sample data',              'Org record + user logins', 'Reset back to demo state for testing'],
        ['Factory Reset',  'Everything including users',                          'Nothing — blank slate',    'Hand system to a different company'],
      ]},
      { type: 'warn', text: 'Purge and Factory Reset are permanent and immediate. Always take a backup first. These actions cannot be undone.' },
    ],
  },

  // ── 10. User Management ──────────────────────────────────────────────────────
  {
    id: 'users',
    title: '10. User Management',
    content: [
      { type: 'h3', text: '10.1 Adding a User' },
      { type: 'p', text: 'Path: System → Users → Add User (requires ADMIN role)' },
      { type: 'ul', items: [
        'Username (lowercase, no spaces — used to log in)',
        'Full name, email, phone',
        'Role — ADMIN / MANAGER / SUPERVISOR / ACCOUNTANT / SALES / VIEWER',
        'Password — set one or leave blank to auto-generate a temp password',
        'Temp passwords are shown once — copy it and share with the user securely',
      ]},
      { type: 'h3', text: '10.2 Password Policy' },
      { type: 'ul', items: [
        'Minimum 8 characters',
        'Must contain uppercase + lowercase + number + symbol',
        'Users can log in with their username OR email address',
        'Admin can reset any user\'s password at any time',
      ]},
      { type: 'h3', text: '10.3 Deactivating a User' },
      { type: 'p', text: 'Click the status badge in the Users table to toggle Active / Inactive. Inactive users cannot log in but their data and history is preserved.' },
      { type: 'tip', text: 'Never delete a user who has entered data — deactivate instead. Deletion is blocked for users who have transactions attributed to them.' },
      { type: 'h3', text: '10.4 CLI User Management' },
      { type: 'code', text: '# List all users in production\n./scripts/abg.sh users prod\n\n# Add a new user (interactive)\n./scripts/abg.sh adduser prod\n\n# Reset a user\'s password\n./scripts/abg.sh resetpwd prod rajesh.kumar' },
    ],
  },

  // ── 11. Reports ─────────────────────────────────────────────────────────────
  {
    id: 'reports',
    title: '11. Reports',
    content: [
      { type: 'h3', text: '11.1 DPR — Daily Production Report' },
      { type: 'p', text: 'Path: Reports → DPR' },
      { type: 'ul', items: [
        'Summary of production, blasting, and weighments for any date range',
        'Filter by quarry, date range',
        'Shows: blocks produced, CBM extracted, vehicles dispatched, shift-wise breakdown',
        'Required for DGMS inspection and internal management review',
      ]},
      { type: 'h3', text: '11.2 Block Stock Report' },
      { type: 'p', text: 'Path: Reports → Stock' },
      { type: 'ul', items: [
        'Available blocks by quarry, variety, grade',
        'Total CBM in stock — value at standard rate',
        'Ageing — how long each block has been in stockyard',
      ]},
      { type: 'h3', text: '11.3 Dashboard KPIs' },
      { type: 'table', headers: ['KPI', 'Source', 'Frequency'], rows: [
        ['Blocks in Stock',        'Blocks table — status=available',         'Real-time'],
        ['Month Production (CBM)', 'Production logs — current month',         'Real-time'],
        ['Revenue MTD',            'Posted invoices — current month',         'Real-time'],
        ['Active Employees',       'Employee register — active=1',            'Real-time'],
        ['Pending Invoices',       'Invoices — status=draft',                 'Real-time'],
        ['Permits Expiring Soon',  'Permits — expiry within 30 days',         'Real-time'],
      ]},
    ],
  },

  // ── 12. Troubleshooting ──────────────────────────────────────────────────────
  {
    id: 'troubleshooting',
    title: '12. Troubleshooting',
    content: [
      { type: 'h3', text: 'Common Issues' },
      { type: 'table', headers: ['Symptom', 'Likely Cause', 'Fix'], rows: [
        ['Login fails with correct password',    'Account inactive or password reset',        'Admin: check user status in System → Users'],
        ['Invoice won\'t post',                  'Required fields missing or negative totals', 'Check taxable value > 0 and all GST amounts filled'],
        ['Block CBM shows 0',                    'Dimensions entered as 0 or not saved',       'Edit block — confirm L×W×H in mm (not cm or m)'],
        ['"Quarry not found" on forms',          'Selected quarry was deactivated',            'Quarries → re-check active quarries'],
        ['Setup wizard not redirecting',         'Quarries already exist (non-empty DB)',       'Wizard only shows on blank slate after factory reset'],
        ['Purge didn\'t clear a table',          'FK constraints prevented deletion',           'Run purge again — tables with FK deps may need 2 passes'],
        ['Production site slow / 503 error',    'Azure App Service cold start or crash',       'Check health: curl https://vatsingranite-prod.azurewebsites.net/health'],
      ]},
      { type: 'h3', text: 'Health Check' },
      { type: 'code', text: '# Quick health check\ncurl https://vatsingranite-prod.azurewebsites.net/health\n# Expected: {"status":"ok","uptime":...}\n\n# Via script\n./scripts/abg.sh status' },
      { type: 'h3', text: 'View Server Logs (Azure)' },
      { type: 'code', text: '# Stream live logs\n./scripts/abg.sh logs\n\n# Or directly:\naz webapp log tail --name vatsingranite-prod --resource-group modernex-rg' },
      { type: 'h3', text: 'Emergency Recovery' },
      { type: 'ol', items: [
        'Run health check to confirm server is down vs. just slow',
        'Check Azure portal — App Service → Log Stream for errors',
        'If data corrupted: restore from latest backup (./scripts/abg.sh restore prod backups/file.db)',
        'If app crashes on startup: check that DB file exists and migrations are clean',
        'Contact support with the exact error from the log stream',
      ]},
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent)', color: '#fff', borderRadius: 2, padding: '0 2px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function sectionMatches(s: Section, q: string): boolean {
  if (!q) return true;
  const low = q.toLowerCase();
  const scan = (v: unknown): boolean => {
    if (typeof v === 'string') return v.toLowerCase().includes(low);
    if (Array.isArray(v)) return v.some(scan);
    if (v && typeof v === 'object') return Object.values(v).some(scan);
    return false;
  };
  return s.title.toLowerCase().includes(low) || s.content.some(scan);
}

// ── Block Renderer ────────────────────────────────────────────────────────────

function BlockRenderer({ block, q }: { block: ContentBlock; q: string }) {
  const hl = (t: string) => highlight(t, q);

  if (block.type === 'p') return <p style={{ margin: '8px 0', lineHeight: 1.7, color: 'var(--t2)' }}>{hl(block.text)}</p>;
  if (block.type === 'h3') return <h3 style={{ margin: '22px 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--t1)', borderBottom: '1px solid var(--bdr)', paddingBottom: 4 }}>{hl(block.text)}</h3>;
  if (block.type === 'h4') return <h4 style={{ margin: '14px 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{hl(block.text)}</h4>;

  if (block.type === 'ul') return (
    <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
      {block.items.map((it, i) => <li key={i} style={{ margin: '4px 0', color: 'var(--t2)', lineHeight: 1.6 }}>{hl(it)}</li>)}
    </ul>
  );

  if (block.type === 'ol') return (
    <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
      {block.items.map((it, i) => <li key={i} style={{ margin: '4px 0', color: 'var(--t2)', lineHeight: 1.6 }}>{hl(it)}</li>)}
    </ol>
  );

  if (block.type === 'checklist') return (
    <ul style={{ margin: '8px 0', paddingLeft: 4, listStyle: 'none' }}>
      {block.items.map((it, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, margin: '5px 0', color: 'var(--t2)', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, fontSize: 14, marginTop: 1 }}>☐</span>
          <span>{hl(it)}</span>
        </li>
      ))}
    </ul>
  );

  if (block.type === 'table') return (
    <div className="tw" style={{ margin: '12px 0' }}>
      <table className="dt" style={{ fontSize: 12 }}>
        <thead>
          <tr>{block.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{hl(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (block.type === 'code') return (
    <pre style={{
      margin: '10px 0', padding: '12px 16px',
      background: 'var(--bg)', border: '1px solid var(--bdr)',
      borderRadius: 6, fontSize: 12, lineHeight: 1.7,
      color: 'var(--accent)', overflowX: 'auto',
      fontFamily: 'monospace',
    }}>{block.text}</pre>
  );

  if (block.type === 'warn') return (
    <div style={{
      margin: '12px 0', padding: '10px 14px',
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 6, fontSize: 13, color: 'var(--t1)', lineHeight: 1.6,
    }}>
      <span style={{ fontWeight: 700, color: '#ef4444', marginRight: 6 }}>⚠ Warning:</span>{hl(block.text)}
    </div>
  );

  if (block.type === 'tip') return (
    <div style={{
      margin: '12px 0', padding: '10px 14px',
      background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)',
      borderRadius: 6, fontSize: 13, color: 'var(--t1)', lineHeight: 1.6,
    }}>
      <span style={{ fontWeight: 700, color: '#3b82f6', marginRight: 6 }}>💡 Tip:</span>{hl(block.text)}
    </div>
  );

  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(SECTIONS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => SECTIONS.filter(s => sectionMatches(s, query)), [query]);

  const scrollTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(`sec-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="ph-title">Help & Handbook</div>
          <div className="ph-sub">Operating guide for Vatsin Granite ERP — quarry management, compliance, finance, payroll</div>
        </div>
        <input
          className="fi"
          placeholder="Search handbook…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* ── Sidebar TOC ── */}
        <div style={{
          width: 220, flexShrink: 0, position: 'sticky', top: 16,
          background: 'var(--card)', border: '1px solid var(--bdr)',
          borderRadius: 8, padding: '12px 0', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                background: active === s.id ? 'var(--accent)' : 'transparent',
                color: active === s.id ? '#fff' : 'var(--t2)',
                fontSize: 12, lineHeight: 1.4,
                borderLeft: active === s.id ? '3px solid var(--accent2)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {s.title}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '12px 16px', color: 'var(--t3)', fontSize: 12 }}>No matches</div>
          )}
        </div>

        {/* ── Content ── */}
        <div ref={contentRef} style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 && (
            <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--t3)' }}>
              No sections match "{query}"
            </div>
          )}
          {filtered.map(s => (
            <div
              key={s.id}
              id={`sec-${s.id}`}
              className="card"
              style={{ marginBottom: 16, padding: '20px 24px', scrollMarginTop: 16 }}
            >
              <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>
                {highlight(s.title, query)}
              </h2>
              {s.content.map((block, i) => (
                <BlockRenderer key={i} block={block} q={query} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
