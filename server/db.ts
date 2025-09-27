import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environment with enhanced error handling
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced connection configuration with retry logic and connection pooling
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SHERLOCK v32.2: Optimized connection pool
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Connection timeout
  maxUses: 7500, // Retire connections after 7500 uses
});

// ✅ ATOMOS PHASE 7C: Enhanced database with query optimization
export const db = drizzle({
  client: pool,
  schema,
  logger: process.env.NODE_ENV === 'development'
});

// ✅ ATOMOS PHASE 7C: Database Performance Optimization
export async function optimizeDatabase(): Promise<void> {
  try {
    console.log('🎯 ATOMOS PHASE 7C: Starting database optimization...');
    
    // Create essential indexes to prevent N+1 queries
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_invoice_id_optimized 
      ON payments(invoice_id) 
      WHERE amount IS NOT NULL;
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_representative_allocated
      ON payments(representative_id, is_allocated, amount) 
      WHERE is_allocated = true;
    `);
    
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_representative_created 
      ON invoices(representative_id, created_at DESC);
    `);
    
    console.log('✅ ATOMOS PHASE 7C: Database indexes optimized successfully');
    
    // Analyze tables for query planner
    await pool.query('ANALYZE invoices;');
    await pool.query('ANALYZE payments;');
    await pool.query('ANALYZE representatives;');
    
    console.log('✅ ATOMOS PHASE 7C: Database statistics updated');
  } catch (error) {
    console.warn('⚠️ ATOMOS PHASE 7C: Database optimization warning:', error.message);
    // Don't throw error - optimization is optional
  }
}

// Performance monitoring for slow queries
export function logSlowQuery(queryName: string, duration: number) {
  if (duration > 100) {
    console.warn(`⚠️ Slow query: ${queryName} - ${duration}ms`);
  }
}

// Connection health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown handler
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end();
    console.log('Database connections closed gracefully');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}