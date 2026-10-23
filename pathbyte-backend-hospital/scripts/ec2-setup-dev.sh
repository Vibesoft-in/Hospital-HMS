#!/bin/bash
# =============================================================================
# Pathbyte Backend — EC2 Setup Script (DEVELOPMENT)
# Ubuntu 22.04 LTS
#
# PRE-REQUISITES (do these before running this script):
#   1. Clone the repo onto the EC2:
#        git clone <your-repo-url> ~/pathbyte-backend
#        cd ~/pathbyte-backend
#
#   2. Create the dev env file:
#        mkdir -p config/environments
#        nano config/environments/.env.development
#      Fill it in (see required vars at the bottom of this script).
#
#   3. Make sure this script is executable:
#        chmod +x scripts/ec2-setup-dev.sh
#
#   4. Run from project root:
#        bash scripts/ec2-setup-dev.sh
#
#   5. After this completes:
#        pm2 start ecosystem.dev.config.js
#        pm2 save
# =============================================================================

set -e

if [ ! -f "package.json" ]; then
  echo "ERROR: Run this script from the project root."
  echo "  cd ~/pathbyte-backend"
  echo "  bash scripts/ec2-setup-dev.sh"
  exit 1
fi

echo "============================================="
echo " Pathbyte Backend — EC2 Dev Setup"
echo "============================================="

# -----------------------------------------------------------------------------
# 1. System update
# -----------------------------------------------------------------------------
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# -----------------------------------------------------------------------------
# 2. Node.js 20 LTS + Yarn
# -----------------------------------------------------------------------------
echo "[2/6] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v

sudo npm install -g yarn
yarn -v

# -----------------------------------------------------------------------------
# 3. PM2
# -----------------------------------------------------------------------------
echo "[3/6] Installing PM2..."
sudo npm install -g pm2
pm2 -v

pm2 startup systemd -u $USER --hp $HOME | tail -1 | sudo bash || true

# -----------------------------------------------------------------------------
# 4. Chromium + Puppeteer system dependencies
# -----------------------------------------------------------------------------
echo "[4/6] Installing Chromium and Puppeteer dependencies..."

UBUNTU_VERSION=$(lsb_release -rs 2>/dev/null || echo "0")
echo "Detected Ubuntu version: $UBUNTU_VERSION"

if awk "BEGIN {exit !($UBUNTU_VERSION >= 24.04)}"; then
  echo "Ubuntu 24.04+ detected — using t64 package names"
  ASOUND_PKG="libasound2t64"
  ATK_PKG="libatk1.0-0t64"
  ATK_BRIDGE_PKG="libatk-bridge2.0-0t64"
  CUPS_PKG="libcups2t64"
  GCC_PKG="libgcc-s1"
  GLIB_PKG="libglib2.0-0t64"
  GTK_PKG="libgtk-3-0t64"
else
  echo "Ubuntu 22.04 detected — using standard package names"
  ASOUND_PKG="libasound2"
  ATK_PKG="libatk1.0-0"
  ATK_BRIDGE_PKG="libatk-bridge2.0-0"
  CUPS_PKG="libcups2"
  GCC_PKG="libgcc1"
  GLIB_PKG="libglib2.0-0"
  GTK_PKG="libgtk-3-0"
fi

sudo apt-get install -y \
  chromium-browser \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  $ASOUND_PKG \
  $ATK_BRIDGE_PKG \
  $ATK_PKG \
  libc6 \
  libcairo2 \
  $CUPS_PKG \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  $GCC_PKG \
  $GLIB_PKG \
  $GTK_PKG \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  --no-install-recommends

CHROMIUM_PATH=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "NOT FOUND")

if [ "$CHROMIUM_PATH" = "NOT FOUND" ]; then
  echo "chromium-browser not found, trying 'chromium' package..."
  sudo apt-get install -y chromium
  CHROMIUM_PATH=$(which chromium 2>/dev/null || echo "NOT FOUND")
  if [ "$CHROMIUM_PATH" = "NOT FOUND" ]; then
    echo "FATAL: Could not install Chromium. Aborting."
    exit 1
  fi
fi

echo "Chromium verified at: $CHROMIUM_PATH"

sudo apt-get autoremove -y
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 5. Install Node dependencies
# -----------------------------------------------------------------------------
echo "[5/6] Installing Node.js dependencies..."
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
yarn install

# -----------------------------------------------------------------------------
# 6. Build TypeScript
# -----------------------------------------------------------------------------
echo "[6/6] Building TypeScript..."
yarn build

# -----------------------------------------------------------------------------
# Create PM2 ecosystem config for development
# -----------------------------------------------------------------------------
echo "Creating ecosystem.dev.config.js..."
cat > ecosystem.dev.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "pathbyte-backend-dev",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
      },
      // Watch for file changes and auto-restart
      // Useful on dev — comment out if you prefer manual restarts
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      out_file: "./logs/dev-out.log",
      error_file: "./logs/dev-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
EOF

mkdir -p logs
chown -R $USER:$USER logs

# -----------------------------------------------------------------------------
echo ""
echo "============================================="
echo " Dev Setup Complete!"
echo "============================================="
echo ""
echo "  Start the app:"
echo "    pm2 start ecosystem.dev.config.js"
echo "    pm2 save"
echo ""
echo "  Useful commands:"
echo "    pm2 logs pathbyte-backend-dev     # tail logs"
echo "    pm2 restart pathbyte-backend-dev  # restart after code changes"
echo "    pm2 stop pathbyte-backend-dev     # stop"
echo ""
echo "  After code changes, rebuild and restart:"
echo "    yarn build && pm2 restart pathbyte-backend-dev"
echo ""
echo "  To test Puppeteer:"
echo "    node scripts/test-puppeteer.js"
echo ""
echo "  Chromium is at: $CHROMIUM_PATH"
echo "  Make sure PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH is in your .env.development"
echo ""
echo "  Required env vars in config/environments/.env.development:"
echo "    DATABASE_URL"
echo "    PORT"
echo "    JWT_ACCESS_SECRET"
echo "    JWT_REFRESH_SECRET"
echo "    JWT_ACCESS_TTL          (optional, default: 15m)"
echo "    JWT_REFRESH_TTL         (optional, default: 7d)"
echo "    COOKIE_SECURE           (set to false for dev)"
echo "    COOKIE_DOMAIN           (optional, skip for dev)"
echo "    SHARED_COOKIE_DOMAIN    (optional)"
echo "    PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH"
echo "    AWS_REGION              (if using S3)"
echo "    AWS_ACCESS_KEY_ID       (if using S3)"
echo "    AWS_SECRET_ACCESS_KEY   (if using S3)"
echo "    S3_BUCKET_NAME          (if using S3)"
echo "    phoneNumberId           (if using WhatsApp)"
echo "    accessToken             (if using WhatsApp)"
echo "    LOG_LEVEL               (optional, default: info)"
echo ""
