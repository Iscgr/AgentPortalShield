#!/bin/bash
# Deep debugging and application setup script for Ubuntu Server
# This script implements the "upgrade, don't remove" approach

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MarFaNet Deep Debugging & Setup Utility      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"

# Make all our scripts executable
chmod +x /workspaces/AgentPortalShield/*.sh

# Step 1: Fix TypeScript issues
echo -e "\n${YELLOW}[1/5]${NC} Fixing TypeScript errors..."
/workspaces/AgentPortalShield/fix-typescript-errors.sh

# Step 2: Fix missing ws types
echo -e "\n${YELLOW}[2/5]${NC} Installing WebSocket types..."
/workspaces/AgentPortalShield/install-ws-types.sh

# Step 3: Create type helper utility
echo -e "\n${YELLOW}[3/5]${NC} Creating type helper utilities..."
cat > /workspaces/AgentPortalShield/server/utils/type-helpers.ts << 'EOL'
/**
 * Type Assertion Helper
 * این فایل helper هایی برای کمک به تایپ‌اسکریپت در تشخیص تایپ‌ها ارائه می‌دهد
 */

/**
 * Helper function for dealing with task.aiContext in AI services
 */
export function assertAIContext<T = any>(context: unknown): T {
  if (typeof context !== 'object' || context === null) {
    return {} as T; // Return empty object as fallback
  }
  return context as T;
}

/**
 * Helper for session assertions
 */
export interface SessionWithUser extends Express.Session {
  authenticated?: boolean;
  userId?: string;
  username?: string;
  userRole?: string;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Create a type-safe wrapper around the persian-date library
 */
export function createPersianDate(input?: any): any {
  // This is just a wrapper for type safety
  const PersianDate = require('persian-date');
  return new PersianDate(input);
}

/**
 * Helper for error handling with proper types
 */
export function handleError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
EOL

# Step 4: Update AITask interfaces in relevant files
echo -e "\n${YELLOW}[4/5]${NC} Adding AITask interfaces to fix task.aiContext errors..."

# Create AI interfaces file
cat > /workspaces/AgentPortalShield/server/types/ai-interfaces.d.ts << 'EOL'
declare interface AITask {
  id: string;
  type: string;
  status: string;
  aiContext: AIContext;
  [key: string]: any;
}

declare interface AIContext {
  input?: string;
  system?: string;
  parameters?: any;
  result?: any;
  [key: string]: any;
}
EOL

# Step 5: Fix database connection with ws module
echo -e "\n${YELLOW}[5/5]${NC} Setting up proper environment for database connections..."

# Create .env file if not exists
if [ ! -f "/workspaces/AgentPortalShield/.env" ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  if [ -f "/workspaces/AgentPortalShield/.env.example" ]; then
    cp /workspaces/AgentPortalShield/.env.example /workspaces/AgentPortalShield/.env
    echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" >> /workspaces/AgentPortalShield/.env
    echo "REDIS_URL=redis://localhost:6379" >> /workspaces/AgentPortalShield/.env
    echo "NODE_ENV=development" >> /workspaces/AgentPortalShield/.env
    echo "PORT=3000" >> /workspaces/AgentPortalShield/.env
  else
    echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marfanet" > /workspaces/AgentPortalShield/.env
    echo "REDIS_URL=redis://localhost:6379" >> /workspaces/AgentPortalShield/.env
    echo "NODE_ENV=development" >> /workspaces/AgentPortalShield/.env
    echo "PORT=3000" >> /workspaces/AgentPortalShield/.env
    echo "SESSION_SECRET=marfanet-dev-secret" >> /workspaces/AgentPortalShield/.env
  fi
  echo -e "${GREEN}✅ .env file created${NC}"
else
  echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Start database services with docker-compose
echo -e "\n${YELLOW}Starting database services...${NC}"
cd /workspaces/AgentPortalShield && docker-compose up -d postgres redis
sleep 5  # Wait for services to start

echo -e "\n${GREEN}✅ All fixes have been applied!${NC}"
echo -e "\n${YELLOW}Starting the application...${NC}"
cd /workspaces/AgentPortalShield && npm run dev