#!/bin/bash

# Xpensist Production Deployment Script
# Run this before deploying to ensure everything is ready

set -euo pipefail

echo "📋 Xpensist Production Readiness Check"
echo "======================================"
echo ""

# Check Node.js version
echo "✓ Checking Node.js..."
node --version

# Check if .env exists
echo ""
echo "✓ Checking environment configuration..."
if [ -f ".env" ]; then
    echo "  ✅ .env file found"
else
    echo "  ⚠️  .env file not found - copy from .env.example and fill in values"
fi

# Backend checks
echo ""
echo "✓ Backend checks..."
cd backend || exit 1

if node -e "require('./src/app.js')" 2>/dev/null; then
    echo "  ✅ Backend compiles without errors"
else
    echo "  ⚠️  Backend has errors - run 'npm run dev' to debug"
fi

echo "  Running backend security tests..."
npm run test:security
echo "  ✅ Backend security tests passed"

echo "  Running backend auth smoke test..."
npm run test:auth-smoke
echo "  ✅ Backend auth smoke test passed"

# Check dependencies
if [ -d "node_modules" ]; then
    echo "  ✅ Backend dependencies installed"
else
    echo "  ⚠️  Running npm install..."
    npm install
fi

cd ..

# Frontend checks
echo ""
echo "✓ Frontend checks..."
cd frontend || exit 1

if [ -d "node_modules" ]; then
    echo "  ✅ Frontend dependencies installed"
else
    echo "  ⚠️  Running npm install..."
    npm install
fi

# Try build
echo "  Attempting production build..."
npm run build >/dev/null 2>&1
if [ -d "dist" ]; then
    echo "  ✅ Frontend builds successfully"
else
    echo "  ⚠️  Build failed - run 'npm run build' to debug"
fi

if [ "${SKIP_E2E:-0}" = "1" ]; then
    echo "  ⏭️  Skipping frontend e2e smoke test (SKIP_E2E=1)"
else
    echo "  Running frontend auth UI smoke test..."
    npm run test:e2e:auth
    echo "  ✅ Frontend auth UI smoke test passed"
fi

cd ..

echo ""
echo "======================================"
echo "🚀 Ready for deployment! Remember to:"
echo "  1. Push to main/production branch"
echo "  2. Verify Cloudflare Pages deployment"
echo "  3. Deploy backend to your VPS"
echo "  4. Test production environment thoroughly"
echo ""
