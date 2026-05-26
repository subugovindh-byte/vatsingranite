#!/bin/bash

# Vatsin Granite ERP - Restart Script
# Stops and restarts both API and Web servers

set -e

cd "$(dirname "$0")/.."

echo "🔄 Restarting Vatsin Granite ERP..."
echo ""

# Stop servers
./scripts/stop.sh

# Wait a moment for ports to be released
echo ""
echo "⏳ Waiting for ports to be released..."
sleep 2

# Start servers
echo ""
./scripts/start.sh
