#!/bin/bash
# Script for installing required packages and fixing TypeScript issues

echo "🔧 Installing required dependencies..."
npm install --save-dev @types/express @types/express-session @types/ws
npm install express-session

echo "🔄 Updating tsconfig.json..."
node -e "
const fs = require('fs');
const path = require('path');
const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
let tsConfig = require(tsConfigPath);

// Add typeRoots if it doesn't exist
if (!tsConfig.compilerOptions.typeRoots) {
  tsConfig.compilerOptions.typeRoots = ['./node_modules/@types', './types'];
}

// Remove vite/client reference if it exists
if (tsConfig.compilerOptions.types) {
  tsConfig.compilerOptions.types = tsConfig.compilerOptions.types.filter(t => t !== 'vite/client');
}

fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
console.log('✅ tsconfig.json updated successfully!');
"

echo "✅ Setup complete! Run 'npm run build' to verify the fixes."