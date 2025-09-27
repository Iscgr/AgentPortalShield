#!/bin/bash

# MarFaNet Deployment Script for Ubuntu Server 22/24
# اسکریپت مستقل برای نصب و راه‌اندازی در سرور اوبونتو

set -e  # Exit on any error

echo "🚀 MarFaNet Ubuntu Server Deployment Started..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on Ubuntu
if [[ ! -f /etc/ubuntu-version ]] && [[ ! $(lsb_release -d 2>/dev/null | grep -i ubuntu) ]]; then
    print_warning "This script is optimized for Ubuntu Server 22/24"
fi

# Update system packages
print_status "Updating Ubuntu packages..."
sudo apt update && sudo apt upgrade -y

# Install required dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nginx

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed"
fi

# Install Node.js (LTS)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt install -y nodejs
else
    print_status "Node.js already installed"
fi

# Configure UFW Firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 3000/tcp # MarFaNet App
sudo ufw --force enable

# Create MarFaNet directory
MARFANET_DIR="/opt/marfanet"
sudo mkdir -p $MARFANET_DIR
sudo chown $USER:$USER $MARFANET_DIR

# Copy application files (if not already in target directory)
if [[ "$PWD" != "$MARFANET_DIR" ]]; then
    print_status "Copying application files..."
    cp -r . $MARFANET_DIR/
    cd $MARFANET_DIR
fi

# Set proper permissions
sudo chown -R $USER:$USER $MARFANET_DIR
chmod +x $MARFANET_DIR/deploy.sh

# Install npm dependencies
print_status "Installing Node.js dependencies..."
npm ci --production

# Build the application
print_status "Building MarFaNet application..."
npm run build

# Start services with Docker Compose
print_status "Starting MarFaNet services..."
docker-compose up -d database redis

# Wait for database to be ready
print_status "Waiting for database initialization..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
npm run db:push

# Create systemd service for MarFaNet
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/marfanet.service > /dev/null <<EOF
[Unit]
Description=MarFaNet Financial Management System
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$MARFANET_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=marfanet
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start MarFaNet service
sudo systemctl daemon-reload
sudo systemctl enable marfanet
sudo systemctl start marfanet

# Configure Nginx as reverse proxy
print_status "Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/marfanet > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/marfanet /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

print_status "MarFaNet deployment completed successfully!"
print_status "Application is running at: http://localhost"
print_status "Direct access: http://localhost:3000"

echo ""
echo "📋 Ubuntu Server Management Commands:"
echo "  • Check status: sudo systemctl status marfanet"
echo "  • View logs: sudo journalctl -u marfanet -f"
echo "  • Restart app: sudo systemctl restart marfanet"
echo "  • Check database: docker-compose ps"
echo "  • Access database: docker exec -it marfanet-db psql -U marfanet -d marfanet_db"

echo ""
print_status "🎉 MarFaNet is now ready for production use on Ubuntu Server!"