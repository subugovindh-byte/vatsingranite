# Vatsin Granite ERP - Python Management Script

Complete server management using Python with command-line arguments.

## 📋 Features

- ✅ Start/Stop/Restart servers
- ✅ Check service status with health checks
- ✅ Database migrations and seeding
- ✅ Database backup and reset
- ✅ View application logs
- ✅ Auto-setup environment
- ✅ Colorful terminal output
- ✅ Cross-platform support

## 🚀 Quick Start

### Check Status
```bash
python3 manage.py status
```

### Start Servers
```bash
# Start all servers (API + Web)
python3 manage.py start

# Start API server only
python3 manage.py start --api

# Start Web server only
python3 manage.py start --web

# Or use npm shortcuts
npm run manage:start
```

### Stop Servers
```bash
python3 manage.py stop

# Or
npm run manage:stop
```

### Restart Servers
```bash
python3 manage.py restart

# Or
npm run manage:restart
```

## 📖 All Commands

### Server Management

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start development servers | `python3 manage.py start` |
| `start --api` | Start API server only | `python3 manage.py start --api` |
| `start --web` | Start Web server only | `python3 manage.py start --web` |
| `stop` | Stop all servers | `python3 manage.py stop` |
| `restart` | Restart all servers | `python3 manage.py restart` |
| `status` | Check service status | `python3 manage.py status` |

### Database Management

| Command | Description | Example |
|---------|-------------|---------|
| `migrate` | Run database migrations | `python3 manage.py migrate` |
| `seed` | Seed database with initial data | `python3 manage.py seed` |
| `backup` | Backup database | `python3 manage.py backup` |
| `reset` | Reset database (⚠️ deletes all data) | `python3 manage.py reset` |

### Application Management

| Command | Description | Example |
|---------|-------------|---------|
| `setup` | Setup environment (install deps, migrate, seed) | `python3 manage.py setup` |
| `logs` | View application logs | `python3 manage.py logs` |
| `logs --follow` | Follow logs in real-time | `python3 manage.py logs -f` |

## 📊 Status Command Output

The `status` command provides comprehensive information:

```
============================================================
              Vatsin Granite ERP - Service Status               
============================================================

🔵 API Server (port 8080):
   Status: 🟢 RUNNING
   PIDs: 12345
   URL: http://localhost:8080
   Health: ✅ HEALTHY
   Version: 1.0.0

🟣 Web Server (port 5173):
   Status: 🟢 RUNNING
   PIDs: 12346
   URL: http://localhost:5173

💾 Database:
   Status: ✅ EXISTS
   Location: /path/to/vatsingranite.db
   Size: 0.39 MB
   Tables: 31

============================================================
```

## 🎯 Common Workflows

### First Time Setup
```bash
# Option 1: Let start command auto-setup
python3 manage.py start
# (Will prompt to setup if prerequisites missing)

# Option 2: Manual setup
python3 manage.py setup
python3 manage.py start
```

### Daily Development
```bash
# Morning: Start servers
python3 manage.py start

# Check if everything is running
python3 manage.py status

# Evening: Stop servers
python3 manage.py stop
```

### Database Operations
```bash
# Backup before changes
python3 manage.py backup

# Make schema changes, then migrate
python3 manage.py migrate

# Reset database for fresh start
python3 manage.py reset
```

### Debugging
```bash
# Check status
python3 manage.py status

# View recent logs
python3 manage.py logs

# Follow logs in real-time
python3 manage.py logs --follow

# Restart if issues
python3 manage.py restart
```

## 🔧 NPM Shortcuts

For convenience, you can use npm commands:

```bash
# Start servers
npm run manage:start

# Stop servers
npm run manage:stop

# Restart servers
npm run manage:restart

# Check status
npm run manage:status

# Run any command
npm run manage -- <command> <options>
# Example:
npm run manage -- start --api
npm run manage -- backup
```

## 💡 Advanced Usage

### Auto-Setup on First Start

When you run `start` for the first time, the script checks:
- ✅ Node.js and npm installed
- ✅ `.env` file exists
- ✅ Dependencies installed
- ✅ Database initialized

If anything is missing, it offers to set up automatically:
```bash
python3 manage.py start
# Prompts: "Run setup? (y/n):"
# Type 'y' to auto-setup everything
```

### Database Backup Management

Backups are automatically managed:
- Stored in `backups/` directory
- Timestamped: `vatsingranite_20260523_151030.db`
- Keeps last 30 backups (older ones auto-deleted)
- Includes WAL and SHM files

### Start Individual Services

Useful for development:
```bash
# Terminal 1: API only
python3 manage.py start --api

# Terminal 2: Web only (in another terminal)
python3 manage.py start --web
```

## 🎨 Color Output

The script uses color-coded output for clarity:
- 🟢 Green: Success messages
- 🔴 Red: Error messages
- 🟡 Yellow: Warnings
- 🔵 Blue: Info messages
- 🟣 Purple: Section headers

## 🐛 Troubleshooting

### Script Won't Run
```bash
# Make sure it's executable
chmod +x manage.py

# Check Python version (needs 3.6+)
python3 --version
```

### Ports Already in Use
```bash
# Stop will force-kill processes on ports
python3 manage.py stop

# Then start again
python3 manage.py start
```

### Database Issues
```bash
# Check status first
python3 manage.py status

# If database missing
python3 manage.py migrate
python3 manage.py seed

# If corrupted, reset
python3 manage.py reset
```

### Servers Won't Stop
```bash
# Force kill on specific ports
lsof -ti:8080 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Or use stop command
python3 manage.py stop
```

## 📝 Help Command

Get help anytime:
```bash
python3 manage.py --help
```

Output:
```
usage: manage.py [-h] [--api] [--web] [--follow]
                 {start,stop,restart,status,migrate,seed,backup,reset,logs,setup}

Vatsin Granite ERP Server Management

positional arguments:
  {start,stop,restart,status,migrate,seed,backup,reset,logs,setup}
                        Command to execute

options:
  -h, --help            show this help message and exit
  --api                 API server only (for start command)
  --web                 Web server only (for start command)
  --follow, -f          Follow logs (for logs command)
```

## 🔒 Security Notes

- Database backups stored locally in `backups/` (add to `.gitignore`)
- `.env` file never committed to git
- Logs may contain sensitive data - review before sharing

## 📦 Requirements

- Python 3.6+
- Node.js 20+
- npm 8+
- SQLite3 (for database commands)

## 🚀 Production

For production deployment:
```bash
# Build application
npm run build

# Start production server
npm start
```

Note: Use process managers like PM2 or systemd for production, not the dev management script.

---

**Pro Tip**: Create an alias for convenience:
```bash
# Add to ~/.zshrc or ~/.bashrc
alias erp='python3 /Users/subug/projects/vatsingranite/manage.py'

# Then use:
erp status
erp start
erp stop
```

---

**Version**: 1.0.0  
**Last Updated**: May 23, 2026  
**Python**: 3.6+
