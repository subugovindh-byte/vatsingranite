# Vatsin Granite ERP - Quarry Management System

Modern, full-stack ERP system for granite quarry operations, built with React 18, TypeScript, Node.js, Express, and SQLite.

## 🏗️ Architecture

This is a **monorepo** project using npm workspaces:

```
vatsingranite/
├── packages/
│   ├── api/          # Node.js + Express + SQLite backend
│   ├── web/          # React 18 + TypeScript + Vite frontend
│   └── shared/       # Shared TypeScript types
├── docs/             # Documentation and design files
├── data/             # SQLite database (gitignored)
├── backups/          # Database backups (gitignored)
└── package.json      # Root workspace configuration
```

## ✨ Features

### Multi-Quarry Operations
- Support for multiple quarry sites (Vatsin Granite, Paradiso, and future expansions)
- Hierarchical organization: Organization → Quarries → Cost Centers → Locations
- Data segregation with `org_id` and `quarry_id` on all transactions

### Core Modules
- **Production Management**: Blasting, block extraction, measurements, QR tagging
- **Inventory**: Block tracking with variety, grade, dimensions, CBM calculations
- **Sales**: Quotations, sales orders, invoices, e-way bills
- **Finance**: General ledger, GST compliance, royalty calculation
- **HR & Payroll**: Attendance, payroll runs, statutory deductions
- **Compliance**: Mining permits, safety incidents, MDP register, statutory returns

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Zustand, React Query, CSS Variables
- **Backend**: Node.js 20, Express, better-sqlite3, JWT auth, Zod validation
- **Database**: SQLite with WAL mode, 65+ tables, multi-quarry schema
- **Security**: JWT authentication, bcrypt password hashing, role-based access

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- npm 8+ installed

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd vatsingranite

# 2. Install all dependencies (root + all packages)
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Run database migrations
npm run migrate

# 5. Seed initial data (organization, quarries, admin user)
npm run seed

# 6. Start development servers (API + Web concurrently)
npm run dev
```

The application will be available at:
- **Web**: http://localhost:5173
- **API**: http://localhost:8080

### Default Credentials
- **Username**: `admin`
- **Password**: `Admin@123`

## 📦 Available Scripts

### Root Level
```bash
npm run dev          # Start both API and web dev servers
npm run dev:api      # Start API server only
npm run dev:web      # Start web dev server only
npm run build        # Build all packages
npm run migrate      # Run database migrations
npm run seed         # Seed initial data
npm run test         # Run tests for all packages
npm start            # Start production API server
```

### Package-Specific
```bash
# API
npm run dev -w @vatsingranite/api
npm run migrate -w @vatsingranite/api
npm run seed -w @vatsingranite/api

# Web
npm run dev -w @vatsingranite/web
npm run build -w @vatsingranite/web
npm run type-check -w @vatsingranite/web
```

## 📁 Project Structure

### Backend (packages/api/src/)
```
api/
├── config.js           # Environment configuration
├── server.js           # Express server setup
├── db/
│   ├── index.js        # Database connection
│   ├── migrate.js      # Schema migrations
│   └── seed.js         # Initial data seeding
├── middleware/
│   └── auth.js         # JWT authentication
└── routes/
    ├── auth.js         # Login, logout, user info
    ├── quarries.js     # Quarry management
    ├── blocks.js       # Block inventory
    ├── sales.js        # Sales orders & invoices
    ├── finance.js      # Accounting & GL
    ├── production.js   # Production logs
    ├── employees.js    # HR management
    └── compliance.js   # Permits & compliance
```

### Frontend (packages/web/src/)
```
web/
├── App.tsx             # Root component with routing
├── main.tsx            # App entry point
├── components/
│   └── Layout.tsx      # Main layout with header/nav
├── pages/
│   ├── LoginPage.tsx   # Login screen
│   ├── DashboardPage.tsx
│   ├── QuarriesPage.tsx
│   └── BlocksPage.tsx
├── store/
│   └── authStore.ts    # Zustand auth state
├── utils/
│   └── api.ts          # API client
└── styles/
    └── global.css      # Global styles & CSS variables
```

## 🗄️ Database Schema

The system uses a comprehensive multi-quarry schema with 65+ tables organized into:

1. **Organization Hierarchy** (4 tables)
   - organizations, quarries, cost_centers, locations

2. **Master Data** (9 tables)
   - users, roles, customers, suppliers, employees, varieties, assets, accounts

3. **Operations** (13 tables)
   - leases, blast_events, blocks, slabs, production_logs, maintenance_jobs, etc.

4. **Sales & Despatch** (9 tables)
   - sales_orders, invoices, despatch_advices, e_way_bills, etc.

5. **Finance & Accounting** (7 tables)
   - vouchers, voucher_lines, bank_accounts, royalty_challans, etc.

6. **HR & Payroll** (5 tables)
   - attendance, payroll_runs, payroll_details, leave_records, etc.

7. **Compliance & Safety** (6 tables)
   - permits, mineral_despatch_permits, safety_incidents, inspections, etc.

See [docs/ERD.puml](docs/ERD.puml) for the complete entity relationship diagram.

## 🔐 Authentication & Authorization

- **JWT-based authentication** with configurable expiry
- **Role-based access control** (RBAC)
- **Built-in roles**: Admin, Manager, Supervisor, Accountant, Sales, Viewer
- **Quarry-level permissions** for multi-site access control

## 📊 Data Model Highlights

### Block Numbering
Format: `{QUARRY_CODE}/{YEAR}/{SEQUENCE}`
- Example: `ABG/2026/00451` (Vatsin Granite, 2026, block #451)

### Multi-Quarry Segregation
Every transaction includes:
- `org_id`: Organization level (shared across all quarries)
- `quarry_id`: Quarry level (site-specific)
- `cost_center_id`: Department/section level (optional)

### GST Compliance
- Automatic CGST/SGST/IGST calculation based on place of supply
- HSN code: 2516 for Granite
- GST rate: 5%
- E-Way Bill & E-Invoice integration ready

### Royalty Calculation
- Monthly reconciliation: Opening stock + Production - Despatch = Closing stock
- Royalty = Despatch × Rate per CBM
- DMF (10-30%) and NMET (2%) add-ons

## 🛠️ Development

### Environment Variables
See [.env.example](.env.example) for all available configuration options.

Key variables:
- `PORT`: API server port (default: 8080)
- `DB_PATH`: SQLite database file path
- `JWT_SECRET`: Secret key for JWT signing
- `CORS_ORIGIN`: Allowed frontend origin

### Adding New Modules
1. Create migration in `packages/api/src/db/migrate.js`
2. Add API routes in `packages/api/src/routes/`
3. Create React pages in `packages/web/src/pages/`
4. Update shared types in `packages/shared/src/types.ts`

### Code Style
- **Backend**: ESLint with Node.js best practices
- **Frontend**: ESLint + TypeScript strict mode
- **Format**: Run `npm run lint` to check all packages

## 📖 Documentation

- [Architecture Diagram](docs/Architecture.puml)
- [Entity Relationship Diagram](docs/ERD.puml)
- [Business Process Flows](docs/BusinessFlow.puml)
- [Software Requirements Spec](docs/AB_Granite_Software_Solution_Spec.md)
- [Regulatory Compliance](docs/Regulatory_Compliance_2026.md)
- [Multi-Quarry Data Model](docs/Multi_Quarry_Data_Model.md)

## 🚢 Deployment

### Production Build
```bash
npm run build
```

This will:
1. Build shared types
2. Build React frontend (output: `packages/web/dist/`)
3. Verify API (Node.js runs directly, no build needed)

### Running in Production
```bash
NODE_ENV=production npm start
```

Serve the built frontend with a web server (nginx, Apache) or use the API server to serve static files.

## 🔒 Security Considerations

- **Always change default credentials** in production
- **Use strong JWT_SECRET** (generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- **Enable HTTPS** in production
- **Regular database backups** (use `npm run backup`)
- **Keep dependencies updated** (`npm audit` and `npm update`)

## 📝 License

Proprietary - Vatsin Granite Quarries Pvt. Ltd. © 2026

## 🤝 Support

For issues or questions, contact:
- Email: admin@vatsingranite.com
- Phone: +91-4362-123456

---

**Version**: 1.0.0  
**Last Updated**: May 23, 2026  
**Node.js**: 20+  
**Status**: ✅ Production Ready
