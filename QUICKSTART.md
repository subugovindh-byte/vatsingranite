# 🚀 Vatsin Granite ERP - Quick Start Guide

## Prerequisites
- Node.js 20+ installed
- npm 8+ installed

## Installation Steps

### 1. Install Dependencies
```bash
cd /Users/subug/projects/vatsingranite
npm install
```

This will install dependencies for:
- Root workspace
- packages/api (Backend)
- packages/web (Frontend)
- packages/shared (Shared types)

### 2. Environment Setup
The `.env` file has already been created from `.env.example`.

Review and update if needed:
```bash
nano .env
```

Key settings:
- `JWT_SECRET`: Change this in production!
- `ADMIN_PASSWORD`: Default is Admin@123
- Database paths are pre-configured

### 3. Initialize Database
```bash
# Run migrations to create schema
npm run migrate

# Seed initial data (org, quarries, admin user, sample data)
npm run seed
```

This will create:
- Organization: Vatsin Granite Quarries Pvt. Ltd.
- Quarry 1: Vatsin Granite Quarry (ABG)
- Quarry 2: Paradiso Multi-Colour Granite Quarry (PARA)
- Admin user: username=admin, password=Admin@123
- 6 Roles: Admin, Manager, Supervisor, Accountant, Sales, Viewer
- Sample varieties, locations, customers, employees

### 4. Start Development Servers
```bash
# Start both API and Web servers concurrently
npm run dev
```

This will start:
- **API Server**: http://localhost:8080
- **Web Application**: http://localhost:5173

### 5. Login to Application
Open browser to: http://localhost:5173

Default credentials:
- **Username**: `admin`
- **Password**: `Admin@123`

## Verify Installation

### Test API Health
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-23T...",
  "environment": "development",
  "version": "1.0.0"
}
```

### Test Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'
```

Should return JWT token and user info.

## Development Workflow

### Run Servers Separately
```bash
# Terminal 1 - API Server
npm run dev:api

# Terminal 2 - Web Server  
npm run dev:web
```

### Watch for Changes
Both servers support hot-reload:
- **API**: Uses `node --watch` (Node 20+ feature)
- **Web**: Uses Vite HMR

### Type Checking (Frontend)
```bash
npm run type-check -w @vatsingranite/web
```

### Run Migrations Again (if schema changes)
```bash
npm run migrate
```

### Re-seed Database (WARNING: Clears all data)
```bash
rm -rf data/vatsingranite.db*
npm run migrate
npm run seed
```

## File Structure

```
vatsingranite/
├── data/                    # SQLite database (gitignored)
│   └── vatsingranite.db        # Main database file
├── packages/
│   ├── api/                # Backend
│   │   ├── src/
│   │   │   ├── server.js   # Express server
│   │   │   ├── config.js   # Configuration
│   │   │   ├── db/         # Database layer
│   │   │   ├── middleware/ # Auth middleware
│   │   │   └── routes/     # API endpoints
│   │   └── package.json
│   ├── web/                # Frontend
│   │   ├── src/
│   │   │   ├── App.tsx     # Main app component
│   │   │   ├── main.tsx    # Entry point
│   │   │   ├── components/ # Reusable components
│   │   │   ├── pages/      # Page components
│   │   │   ├── store/      # Zustand stores
│   │   │   ├── utils/      # API client
│   │   │   └── styles/     # CSS files
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── shared/             # Shared types
│       ├── src/
│       │   ├── index.ts
│       │   └── types.ts
│       └── package.json
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── .env                    # Environment variables
├── package.json            # Root workspace
└── README_CODE.md          # This file
```

## Common Issues

### Port Already in Use
If port 8080 or 5173 is already in use:
```bash
# Change in .env
PORT=3000  # For API

# Or kill the process
lsof -ti:8080 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Database Locked
If you see "database is locked" error:
```bash
# Stop all servers
# Remove lock files
rm -f data/vatsingranite.db-shm data/vatsingranite.db-wal
```

### Module Not Found
If you see module not found errors:
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

### TypeScript Errors (Frontend)
```bash
# Check types
npm run type-check -w @vatsingranite/web

# Restart TypeScript server in VS Code
# CMD+Shift+P -> "TypeScript: Restart TS Server"
```

## Next Steps

1. **Explore the UI**: Login and navigate through Dashboard, Quarries, Blocks pages
2. **Test API endpoints**: Use curl or Postman to test API routes
3. **Add sample blocks**: Use the API to create test blocks
4. **Customize**: Update colors, branding in `packages/web/src/styles/global.css`
5. **Implement more modules**: Add Sales, Finance, HR pages based on the design

## Production Deployment

### Build for Production
```bash
# Build all packages
npm run build

# Built files will be in:
# - packages/web/dist/  (Static files to serve)
# - packages/api/src/   (Node.js runs directly)
```

### Run Production Server
```bash
NODE_ENV=production npm start
```

### Important: Production Checklist
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change `ADMIN_PASSWORD` immediately after first login
- [ ] Set up HTTPS (nginx reverse proxy recommended)
- [ ] Configure database backups (cron job for `npm run backup`)
- [ ] Set up proper logging and monitoring
- [ ] Review and restrict CORS origins
- [ ] Set up firewall rules

## Support

For questions or issues:
- Review documentation in `docs/` folder
- Check API routes in `packages/api/src/routes/`
- Review frontend code in `packages/web/src/`

---

**Happy Coding! 🎉**
