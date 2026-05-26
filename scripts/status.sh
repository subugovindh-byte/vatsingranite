#!/bin/bash

# Vatsin Granite ERP - Status Script
# Checks the status of all services

echo "📊 Vatsin Granite ERP - Service Status"
echo "=================================="
echo ""

# Check API Server
echo "🔵 API Server (port 8080):"
if lsof -ti:8080 > /dev/null 2>&1; then
  echo "   Status: 🟢 RUNNING"
  PID=$(lsof -ti:8080)
  echo "   PID: $PID"
  echo "   URL: http://localhost:8080"
  
  # Test health endpoint
  HEALTH=$(curl -s http://localhost:8080/health 2>/dev/null || echo "")
  if [ -n "$HEALTH" ]; then
    echo "   Health: ✅ HEALTHY"
  else
    echo "   Health: ⚠️  NOT RESPONDING"
  fi
else
  echo "   Status: 🔴 STOPPED"
fi

echo ""

# Check Web Server
echo "🟣 Web Server (port 5173):"
if lsof -ti:5173 > /dev/null 2>&1; then
  echo "   Status: 🟢 RUNNING"
  PID=$(lsof -ti:5173)
  echo "   PID: $PID"
  echo "   URL: http://localhost:5173"
else
  echo "   Status: 🔴 STOPPED"
fi

echo ""

# Check Database
echo "💾 Database:"
if [ -f data/vatsingranite.db ]; then
  SIZE=$(du -h data/vatsingranite.db | cut -f1)
  echo "   Status: ✅ EXISTS"
  echo "   Location: data/vatsingranite.db"
  echo "   Size: $SIZE"
  
  # Count tables
  TABLES=$(sqlite3 data/vatsingranite.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "?")
  echo "   Tables: $TABLES"
else
  echo "   Status: ❌ NOT FOUND"
  echo "   Run: npm run migrate && npm run seed"
fi

echo ""
echo "=================================="
