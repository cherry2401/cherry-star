#!/bin/bash
# ==========================================
# CHERRY STAR — Deploy / Update Script
# Run this after uploading code or pulling from git
# ==========================================

set -e

APP_DIR="/opt/cherry-star"
SERVER_DIR="$APP_DIR/server"

echo "=========================================="
echo "  🚀 CHERRY STAR — Deploying..."
echo "=========================================="

# 0. Pull latest code from GitHub
echo "📥 [0/4] Pulling latest code..."
cd $APP_DIR
git pull
echo "   ✅ Code updated"

# 1. Install frontend dependencies & build
echo "📦 [1/4] Building frontend..."
cd $APP_DIR
npm install --production=false
npm run build
echo "   ✅ Frontend built → dist/"

# 2. Install server dependencies
echo "📦 [2/4] Installing server dependencies..."
cd $SERVER_DIR
npm install

# 3. Build server (TypeScript → JavaScript)
echo "📦 [3/4] Building server..."
npm run build
echo "   ✅ Server built → server/dist/"

# 4. Restart PM2
echo "📦 [4/4] Restarting PM2..."
if pm2 list | grep -q "cherry-star"; then
    pm2 reload ecosystem.config.cjs
    echo "   ✅ PM2 reloaded (zero-downtime)"
else
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup | tail -1 | bash
    echo "   ✅ PM2 started + auto-startup enabled"
fi

echo ""
echo "=========================================="
echo "  ✅ Deploy complete!"
echo "=========================================="
echo ""
pm2 status
echo ""
echo "  🔍 Check logs:  pm2 logs cherry-star"
echo "  🔄 Restart:     pm2 reload cherry-star"
echo "  📊 Monitor:     pm2 monit"
echo ""
echo "  🌐 Quick test:  curl http://localhost:3001/health"
echo "  🌐 Tunnel test: cloudflared tunnel --url http://localhost:3001"
echo "=========================================="
