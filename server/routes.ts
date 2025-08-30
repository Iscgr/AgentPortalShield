import type { Express } from "express";
import { storage } from "./storage";
import { unifiedFinancialEngine } from './services/unified-financial-engine.js';

// COMPLETE BYPASS - NO AUTH, NO SESSIONS, NO VALIDATION
const noAuth = (req: any, res: any, next: any) => {
  console.log(`🔓 NO-AUTH: ${req.method} ${req.path}`);
  next();
};

export async function registerRoutes(app: Express) {
  console.log('📋 MINIMAL ROUTES: Starting registration...');

  // Test endpoint
  app.get("/api/test", (req, res) => {
    res.json({
      success: true,
      message: "API Server is working",
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });

  // MINIMAL Dashboard endpoint
  app.get("/api/dashboard", async (req, res) => {
    try {
      console.log("📊 MINIMAL DASHBOARD: Request received");

      // Simple dashboard data - no complex calculations
      const dashboardData = {
        success: true,
        data: {
          summary: {
            totalRevenue: "0",
            totalDebt: "0",
            activeRepresentatives: "0",
            totalRepresentatives: "0"
          },
          representatives: { total: "0", active: "0", inactive: 0 },
          invoices: { total: "0", paid: "0", unpaid: "0", overdue: "0" }
        },
        meta: {
          timestamp: new Date().toISOString(),
          mode: "MINIMAL"
        }
      };

      console.log("✅ MINIMAL DASHBOARD: Sending response");
      res.json(dashboardData);

    } catch (error) {
      console.error('❌ MINIMAL DASHBOARD ERROR:', error);
      res.status(500).json({
        success: false,
        error: "Dashboard error",
        timestamp: new Date().toISOString()
      });
    }
  });

  // Basic auth endpoints - minimal implementation
  app.post("/api/auth/login", async (req, res) => {
    console.log("🔐 MINIMAL LOGIN:", req.body);
    res.json({
      success: true,
      message: "Login bypassed",
      user: { username: "admin", role: "ADMIN" }
    });
  });

  app.get("/api/auth/check", (req, res) => {
    res.json({
      authenticated: true,
      user: { username: "admin", role: "ADMIN" }
    });
  });

  // Health check
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      mode: "MINIMAL"
    });
  });

  console.log('✅ MINIMAL ROUTES: Registration complete');
}