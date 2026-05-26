#!/bin/bash

# Vatsin Granite ERP - Stop Script
# Stops all running Vatsin Granite ERP processes

echo "🛑 Stopping Vatsin Granite ERP servers..."
echo ""

# Find and kill processes on port 8080 (API)
API_PIDS=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$API_PIDS" ]; then
  echo "   Stopping API server (port 8080)..."
  echo "$API_PIDS" | xargs kill -9 2>/dev/null || true
  echo "   ✅ API server stopped"
else
  echo "   ℹ️  API server not running"
fi

# Find and kill processes on port 5173 (Web)
WEB_PIDS=$(lsof -ti:5173 2>/dev/null || true)
if [ -n "$WEB_PIDS" ]; then
  echo "   Stopping Web server (port 5173)..."
  echo "$WEB_PIDS" | xargs kill -9 2>/dev/null || true
  echo "   ✅ Web server stopped"
else
  echo "   ℹ️  Web server not running"
fi

# Also kill any node processes running our servers
ABGRANITE_PIDS=$(ps aux | grep -E "(vatsingranite|concurrently|vite)" | grep -v grep | awk '{print $2}' || true)
if [ -n "$ABGRANITE_PIDS" ]; then
  echo "   Cleaning up remaining processes..."
  echo "$ABGRANITE_PIDS" | xargs kill -9 2>/dev/null || true
fi

echo ""
echo "✅ All Vatsin Granite ERP servers stopped"
