#!/bin/bash
# =============================================================================
# Pathbyte Backend — EC2 Setup Script
# Ubuntu 22.04 LTS
# Assumes: repo is already cloned, .env.production is already configured
# Run from project root: bash scripts/ec2-setup.sh
# After this completes: pm2 start ecosystem.config.js --env production
# =============================================================================

set -e

# Must be run from the project root (where package.json lives)
if [ ! -f "package.json" ]; then
  echo "ERROR: Run this script from the project root, not from the scripts/ folder."
  echo "  cd ~/pathbyte-backend"
  echo "  bash scripts/ec2-setup.sh"
  exit 1
fi

echo "============================================="
echo " Pathbyte Backend — EC2 Setup"
echo "============================================="

# -----------------------------------------------------------------------------
# 1. System update
# -----------------------------------------------------------------------------
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# -----------------------------------------------------------------------------
# 2. Node.js 20 LTS
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

# Auto-start PM2 on system reboot
pm2 startup systemd -u $USER --hp $HOME | tail -1 | sudo bash || true

# -----------------------------------------------------------------------------
# 4. Chromium + all Puppeteer system dependencies
#    generatePdf.ts defaults to /usr/bin/chromium-browser — must match
# -----------------------------------------------------------------------------
echo "[4/6] Installing Chromium and Puppeteer dependencies..."

# Detect Ubuntu version — package names changed in 24.04 (t64 suffix transition)
UBUNTU_VERSION=$(lsb_release -rs 2>/dev/null || echo "0")
echo "Detected Ubuntu version: $UBUNTU_VERSION"

# Packages that were renamed in Ubuntu 24.04
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

# Verify — chromium-browser may be a snap on 24.04, fall back to chromium
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

# Clean up apt cache to free disk space
echo "Cleaning up apt cache..."
sudo apt-get autoremove -y
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 5. Install Node dependencies (skip Puppeteer's bundled Chromium download)
# -----------------------------------------------------------------------------
echo "[5/6] Installing Node.js dependencies..."
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
yarn install

# -----------------------------------------------------------------------------
# 6. Build TypeScript
# -----------------------------------------------------------------------------
echo "[6/6] Building TypeScript..."
NODE_ENV=production yarn build

# -----------------------------------------------------------------------------
# Create PM2 ecosystem config
# -----------------------------------------------------------------------------
echo "Creating ecosystem.config.js..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "pathbyte-backend",
      script: "dist/server.js",
      instances: 1,        // keep at 1 — Puppeteer doesn't work well with cluster mode
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
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
echo " Setup Complete!"
echo "============================================="
echo ""
echo "  pm2 start ecosystem.config.js --env production"
echo "  pm2 save"
echo "  pm2 logs pathbyte-backend"
echo ""
echo "  To test Puppeteer first:"
echo "  node scripts/test-puppeteer.js"
echo ""
echo "  Chromium is at: $CHROMIUM_PATH"
echo "  Make sure PUPPETEER_EXECUTABLE_PATH=$CHROMIUM_PATH is set in your .env.production"
echo ""
