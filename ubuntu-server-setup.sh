#!/bin/bash
# Setup script for MarFaNet on Ubuntu Server 22.04/24.04
# This script handles all necessary setup steps for running the application on Ubuntu Server

# Text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MarFaNet Setup for Ubuntu Server     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Step 1: Update system
echo -e "\n${YELLOW}[1/7]${NC} Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Docker and Docker Compose
echo -e "\n${YELLOW}[2/7]${NC} Setting up Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt update
    sudo apt install -y docker-ce docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 3: Install Node.js
echo -e "\n${YELLOW}[3/7]${NC} Setting up Node.js environment..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js v18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}Node.js installed successfully: $(node -v)${NC}"
else
    echo -e "${GREEN}Node.js already installed: $(node -v)${NC}"
fi

# Step 4: Setup application directory
echo -e "\n${YELLOW}[4/7]${NC} Setting up application directory..."
APP_DIR="/opt/marfanet"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
fi

# Clone the repository or copy files if needed
if [ ! -d "$APP_DIR/.git" ] && [ -d ".git" ]; then
    echo "Copying application files to $APP_DIR..."
    rsync -av --exclude node_modules --exclude .git ./ $APP_DIR/
else
    echo -e "${GREEN}Application directory ready at $APP_DIR${NC}"
fi

# Step 5: Configure environment variables
echo -e "\n${YELLOW}[5/7]${NC} Setting up environment variables..."
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" >> $APP_DIR/.env
        echo "REDIS_URL=redis://localhost:6379" >> $APP_DIR/.env
        echo "NODE_ENV=production" >> $APP_DIR/.env
        echo "PORT=3000" >> $APP_DIR/.env
        echo -e "${GREEN}Environment file created from example${NC}"
    else
        echo -e "${RED}Warning: No .env.example file found${NC}"
    fi
else
    echo -e "${GREEN}Environment file already exists${NC}"
fi

# Step 6: Install dependencies and build app
echo -e "\n${YELLOW}[6/7]${NC} Installing dependencies and building application..."
cd $APP_DIR
npm install
npm run build

# Step 7: Setup database and services
echo -e "\n${YELLOW}[7/7]${NC} Setting up database and services..."
cd $APP_DIR

# Start database containers
docker-compose up -d postgres redis

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Setup database schema
npm run db:push

# Create systemd service for the application
echo -e "\n${YELLOW}Creating systemd service for MarFaNet...${NC}"
sudo tee /etc/systemd/system/marfanet.service > /dev/null << EOF
[Unit]
Description=MarFaNet Financial Management System
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=marfanet
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable marfanet.service
sudo systemctl start marfanet.service

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${YELLOW}MarFaNet is now running at: http://localhost:3000${NC}"
echo -e "${YELLOW}API Endpoint: http://localhost:3000/api/dashboard${NC}"
echo -e "${GREEN}----------------------------------------${NC}"
echo -e "${BLUE}To view logs:${NC} sudo journalctl -u marfanet -f"
echo -e "${BLUE}To restart:${NC} sudo systemctl restart marfanet"
echo -e "${BLUE}To stop:${NC} sudo systemctl stop marfanet"