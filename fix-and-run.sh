#!/bin/bash
# Master script to fix all TypeScript errors and run the application

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MarFaNet TypeScript Error Resolver     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Make scripts executable
echo -e "\n${YELLOW}Making scripts executable...${NC}"
chmod +x /workspaces/AgentPortalShield/setup-typings.sh
chmod +x /workspaces/AgentPortalShield/run-app.sh
chmod +x /workspaces/AgentPortalShield/ubuntu-server-setup.sh

# Install required TypeScript type definitions
echo -e "\n${YELLOW}Installing TypeScript type definitions...${NC}"
cd /workspaces/AgentPortalShield
npm install --save-dev @types/express @types/express-session @types/ws

# Fix tsconfig.json
echo -e "\n${YELLOW}Updating tsconfig.json...${NC}"
node -e "
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read the current tsconfig.json
    const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
    
    // Add typeRoots if not exists
    tsConfig.compilerOptions = tsConfig.compilerOptions || {};
    tsConfig.compilerOptions.typeRoots = ['./node_modules/@types', './types'];
    
    // Fix types array if it exists
    if (Array.isArray(tsConfig.compilerOptions.types)) {
      tsConfig.compilerOptions.types = tsConfig.compilerOptions.types
        .filter(t => t !== 'vite/client');
    }
    
    // Add skipLibCheck to ignore node_modules errors
    tsConfig.compilerOptions.skipLibCheck = true;
    
    // Save the updated tsconfig
    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✓ tsconfig.json updated successfully');
  } catch (error) {
    console.error('Error updating tsconfig.json:', error);
    process.exit(1);
  }
"

# Create proper .env file if needed
echo -e "\n${YELLOW}Setting up environment variables...${NC}"
if [ ! -f "/workspaces/AgentPortalShield/.env" ]; then
  if [ -f "/workspaces/AgentPortalShield/.env.example" ]; then
    cp /workspaces/AgentPortalShield/.env.example /workspaces/AgentPortalShield/.env
    echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" >> /workspaces/AgentPortalShield/.env
    echo "REDIS_URL=redis://localhost:6379" >> /workspaces/AgentPortalShield/.env
    echo "✓ .env file created from example"
  else
    echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" > /workspaces/AgentPortalShield/.env
    echo "REDIS_URL=redis://localhost:6379" >> /workspaces/AgentPortalShield/.env
    echo "PORT=3000" >> /workspaces/AgentPortalShield/.env
    echo "SESSION_SECRET=marfanet-dev-secret" >> /workspaces/AgentPortalShield/.env
    echo "✓ Basic .env file created"
  fi
else
  echo "✓ .env file already exists"
fi

# Start database services
echo -e "\n${YELLOW}Starting database services...${NC}"
cd /workspaces/AgentPortalShield
docker-compose up -d postgres redis
echo "✓ Database services started"

# Wait for database to be ready
echo -e "\n${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Build the application
echo -e "\n${YELLOW}Building the application...${NC}"
npm run build

# Run the application
echo -e "\n${GREEN}✅ Setup complete! Starting the application...${NC}"
npm run dev