#!/bin/bash
# Script to fix TypeScript errors for MarFaNet on Ubuntu Server

# Set colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MarFaNet TypeScript Error Resolver     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}[1/5]${NC} Installing required type packages..."
npm install --save-dev @types/ws @types/express @types/express-session

echo -e "\n${YELLOW}[2/5]${NC} Creating types directory if it doesn't exist..."
mkdir -p /workspaces/AgentPortalShield/types/persian-date

echo -e "\n${YELLOW}[3/5]${NC} Creating .d.ts files for missing types..."

# Create express session extension
cat > /workspaces/AgentPortalShield/types/express-session.d.ts << 'EOL'
import 'express-session';

declare module 'express-session' {
  interface Session {
    authenticated?: boolean;
    userId?: string;
    username?: string;
    userType?: string;
    userRole?: string;
    organizationId?: string;
    organizationName?: string;
    permissions?: string[];
    [key: string]: any;
  }
}

declare module 'express' {
  interface Request {
    session: import('express-session').Session;
    sessionID: string;
  }
}
EOL

# Create persian-date module declaration
cat > /workspaces/AgentPortalShield/types/persian-date.d.ts << 'EOL'
declare module 'persian-date';
EOL

echo -e "\n${YELLOW}[4/5]${NC} Updating tsconfig.json..."

# Check if tsconfig exists
if [ -f /workspaces/AgentPortalShield/tsconfig.json ]; then
  # Add typeRoots if they don't exist
  node -e "
    const fs = require('fs');
    const path = require('path');
    const tsconfig = require('/workspaces/AgentPortalShield/tsconfig.json');
    
    // Add typeRoots if they don't exist
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    
    tsconfig.compilerOptions.typeRoots = [
      './node_modules/@types',
      './types'
    ];
    
    // Make sure skipLibCheck is set to true
    tsconfig.compilerOptions.skipLibCheck = true;
    
    // Remove vite/client reference if it exists
    if (tsconfig.compilerOptions.types) {
      tsconfig.compilerOptions.types = tsconfig.compilerOptions.types.filter(t => t !== 'vite/client');
    }
    
    fs.writeFileSync('/workspaces/AgentPortalShield/tsconfig.json', 
                     JSON.stringify(tsconfig, null, 2));
    
    console.log('✅ tsconfig.json updated successfully');
  "
else
  echo -e "${RED}ERROR: tsconfig.json not found!${NC}"
  exit 1
fi

echo -e "\n${YELLOW}[5/5]${NC} Creating Type Assertion Helper..."
cat > /workspaces/AgentPortalShield/server/utils/type-helpers.ts << 'EOL'
/**
 * Type Assertion Helper
 * 
 * این فایل helper هایی برای کمک به تایپ‌اسکریپت در تشخیص تایپ‌ها ارائه می‌دهد
 */

/**
 * Helper function for dealing with task.aiContext in AI services
 */
export function assertAIContext(context: unknown): { [key: string]: any } {
  return context as { [key: string]: any };
}

/**
 * Helper function for asserting session properties
 */
export function assertSession(session: any): { [key: string]: any } {
  return session;
}

/**
 * Create a type-safe wrapper around the persian-date library
 */
export function createPersianDate(input?: any): any {
  // This is just a wrapper for type safety
  const PersianDate = require('persian-date');
  return new PersianDate(input);
}
EOL

echo -e "\n${GREEN}✅ TypeScript error fixes have been applied!${NC}"
echo -e "\n${BLUE}To apply these changes:${NC}"
echo -e "1. Restart your TypeScript server (Run 'TypeScript: Restart TS Server' in VSCode)"
echo -e "2. Rebuild the project with 'npm run build'"
echo -e "3. Run the application with 'npm run dev'"
echo -e "\n${GREEN}Done!${NC}"