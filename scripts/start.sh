#!/bin/bash

# Vatsin Granite ERP - Start Script
# Starts both API and Web servers in development mode

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starting Vatsin Granite ERP..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "✅ .env file created"
fi

# Check if database exists
if [ ! -f data/vatsingranite.db ]; then
  echo "⚠️  Database not found. Running migrations and seeding..."
  npm run migrate
  npm run seed
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "🎯 Starting development servers..."
echo "   API:  http://localhost:8080"
echo "   Web:  http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev
