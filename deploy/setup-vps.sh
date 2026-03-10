#!/bin/bash
# ==========================================
# CHERRY STAR — VPS Setup Script
# Ubuntu 22 | Node 20 | PM2 | Cloudflare Tunnel
# ==========================================
# Usage: curl -sL <url> | bash
# Or:    bash setup-vps.sh
# ==========================================

set -e

APP_DIR="/opt/cherry-star"
LOG_DIR="$APP_DIR/logs"

echo "=========================================="
echo "  🍒 CHERRY STAR — VPS Setup"
echo "=========================================="

# 1. System update
echo "📦 [1/6] Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# 2. Install Node.js 20 LTS
echo "📦 [2/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "   Node: $(node -v)"
echo "   npm:  $(npm -v)"

# 3. Install PM2
echo "📦 [3/6] Installing PM2..."
sudo npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 4. Install cloudflared
echo "📦 [4/6] Installing cloudflared..."
if ! command -v cloudflared &> /dev/null; then
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
    sudo dpkg -i /tmp/cloudflared.deb
    rm /tmp/cloudflared.deb
fi
echo "   cloudflared: $(cloudflared --version)"

# 5. Setup app directory
echo "📦 [5/6] Setting up app directory..."
sudo mkdir -p $APP_DIR $LOG_DIR
sudo chown -R $USER:$USER $APP_DIR

echo ""
echo "=========================================="
echo "  ✅ System setup complete!"
echo "=========================================="
echo ""
echo "  📂 App directory: $APP_DIR"
echo ""
echo "  👉 Next steps:"
echo "  1. Upload your project to $APP_DIR"
echo "     scp -r ./* user@vps:$APP_DIR/"
echo ""
echo "  2. Create .env file:"
echo "     cp $APP_DIR/server/.env.production $APP_DIR/server/.env"
echo "     nano $APP_DIR/server/.env"
echo "     (Fill in JWT_SECRET, BAOSTAR_API_KEY, DATABASE_URL, ADMIN_PASSWORD)"
echo ""
echo "  3. Run deploy script:"
echo "     bash $APP_DIR/deploy/deploy.sh"
echo ""
echo "  4. Setup Cloudflare Tunnel:"
echo "     cloudflared tunnel login"
echo "     cloudflared tunnel create cherry-star"
echo "     cloudflared tunnel route dns cherry-star yourdomain.com"
echo ""
echo "     Then create tunnel config:"
echo "     mkdir -p ~/.cloudflared"
echo "     cat > ~/.cloudflared/config.yml << EOF"
echo "     tunnel: <TUNNEL_ID>"
echo "     credentials-file: /home/$USER/.cloudflared/<TUNNEL_ID>.json"
echo "     ingress:"
echo "       - hostname: yourdomain.com"
echo "         service: http://localhost:3001"
echo "       - service: http_status:404"
echo "     EOF"
echo ""
echo "     Start tunnel:"
echo "     cloudflared tunnel run cherry-star"
echo ""
echo "     Or quick test (no domain needed):"
echo "     cloudflared tunnel --url http://localhost:3001"
echo ""
echo "=========================================="
