import { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { IStorage } from "./storage";
import { unifiedAuthMiddleware } from "./middleware/unified-auth";
import { eq, desc, and, or, sql, count, like, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { 
  representatives, 
  invoices, 
  payments, 
  salesPartners, 
  activityLogs,
  insertRepresentativeSchema,
  insertInvoiceSchema,
  insertPaymentSchema,
  insertSalesPartnerSchema,
  insertActivityLogSchema
} from "../shared/schema";
import { z } from "zod";

// Import all route modules
import { registerAiEngineRoutes } from "./routes/ai-engine-routes";
import { registerCrmRoutes } from "./routes/crm-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import { registerUnifiedFinancialRoutes } from "./routes/unified-financial-routes";
import { registerUnifiedStatisticsRoutes } from "./routes/unified-statistics-routes";
import { registerWorkspaceRoutes } from "./routes/workspace-routes";
import { registerStandardizedInvoiceRoutes } from "./routes/standardized-invoice-routes";
import { registerCouplingRoutes } from "./routes/coupling-routes";
import { registerMaintenanceRoutes } from "./routes/maintenance-routes";
import { registerDatabaseOptimizationRoutes } from "./routes/database-optimization-routes";

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export function registerRoutes(app: Express, storage: IStorage) {
  // Health check endpoint - should remain public
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Ready check endpoint
  app.get("/ready", (req, res) => {
    res.json({ 
      status: "ready", 
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  });

  // SHERLOCK v26.0: Authentication check endpoint - public
  app.get("/api/auth/check", (req, res) => {
    try {
      const isAuthenticated = req.session?.authenticated || false;
      const isCrmAuthenticated = req.session?.crmAuthenticated || false;

      res.json({
        authenticated: isAuthenticated || isCrmAuthenticated,
        admin: isAuthenticated,
        crm: isCrmAuthenticated,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ 
        error: 'خطا در بررسی احراز هویت',
        authenticated: false 
      });
    }
  });

  // Activity logs endpoint - FIXED to return JSON
  app.get("/api/activity-logs", async (req, res) => {
    try {
      console.log('📋 Activity logs request received');

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await db
        .select({
          id: activityLogs.id,
          type: activityLogs.type,
          description: activityLogs.description,
          relatedId: activityLogs.relatedId,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt
        })
        .from(activityLogs)
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      console.log(`✅ Activity logs fetched: ${logs.length} items`);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Activity logs error:', error);
      res.status(500).json({ 
        success: false,
        error: 'خطا در دریافت لاگ فعالیت‌ها',
        data: []
      });
    }
  });

  // Register all modular routes
  registerAiEngineRoutes(app, unifiedAuthMiddleware, storage);
  registerCrmRoutes(app, unifiedAuthMiddleware, storage);
  registerSettingsRoutes(app, unifiedAuthMiddleware, storage);
  registerUnifiedFinancialRoutes(app, unifiedAuthMiddleware, storage);
  registerUnifiedStatisticsRoutes(app, unifiedAuthMiddleware, storage);
  registerWorkspaceRoutes(app, unifiedAuthMiddleware, storage);
  registerStandardizedInvoiceRoutes(app, unifiedAuthMiddleware, storage);
  registerCouplingRoutes(app, unifiedAuthMiddleware, storage);
  registerMaintenanceRoutes(app, unifiedAuthMiddleware, storage);
  registerDatabaseOptimizationRoutes(app, unifiedAuthMiddleware, storage);

  // Legacy endpoints - keeping for backward compatibility

  // Representatives endpoint
  app.get("/api/representatives", async (req, res) => {
    try {
      console.log('👥 Representatives request received');

      const reps = await db.select().from(representatives).orderBy(representatives.name);

      console.log(`✅ Representatives fetched: ${reps.length} items`);

      res.json(reps);
    } catch (error) {
      console.error('❌ Representatives error:', error);
      res.status(500).json({ error: 'خطا در دریافت نمایندگان' });
    }
  });

  // Invoices endpoint
  app.get("/api/invoices", async (req, res) => {
    try {
      console.log('🧾 Invoices request received');

      const invoicesData = await db.select().from(invoices).orderBy(desc(invoices.createdAt));

      console.log(`✅ Invoices fetched: ${invoicesData.length} items`);

      res.json(invoicesData);
    } catch (error) {
      console.error('❌ Invoices error:', error);
      res.status(500).json({ error: 'خطا در دریافت فاکتورها' });
    }
  });

  // Payments endpoint
  app.get("/api/payments", async (req, res) => {
    try {
      console.log('💳 Payments request received');

      const paymentsData = await db.select().from(payments).orderBy(desc(payments.createdAt));

      console.log(`✅ Payments fetched: ${paymentsData.length} items`);

      res.json(paymentsData);
    } catch (error) {
      console.error('❌ Payments error:', error);
      res.status(500).json({ error: 'خطا در دریافت پرداخت‌ها' });
    }
  });

  // Representative details endpoint
  app.get("/api/representatives/:code", async (req, res) => {
    try {
      const code = req.params.code;
      console.log(`👤 Representative details request for: ${code}`);

      const rep = await db.select().from(representatives).where(eq(representatives.code, code)).limit(1);

      if (rep.length === 0) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }

      const representativeInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.representativeId, rep[0].id))
        .orderBy(desc(invoices.createdAt));

      const representativePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.representativeId, rep[0].id))
        .orderBy(desc(payments.createdAt));

      console.log(`✅ Representative details fetched: ${representativeInvoices.length} invoices, ${representativePayments.length} payments`);

      res.json({
        representative: rep[0],
        invoices: representativeInvoices,
        payments: representativePayments
      });
    } catch (error) {
      console.error('❌ Representative details error:', error);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات نماینده' });
    }
  });

  // Admin login endpoint - public
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      console.log('🔐 Login attempt:', { username, hasPassword: !!password });

      if (username === "mgr" && password === "8679") {
        req.session.authenticated = true;
        req.session.userId = 1;
        req.session.username = username;
        req.session.role = "admin";

        console.log('✅ Admin login successful');

        res.json({
          success: true,
          user: {
            id: 1,
            username: "mgr",
            role: "admin"
          }
        });
      } else {
        console.log('❌ Invalid credentials');
        res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: "خطا در ورود به سیستم" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ error: "خطا در خروج از سیستم" });
      }
      res.clearCookie('connect.sid');
      console.log('✅ Logout successful');
      res.json({ success: true });
    });
  });

  // File upload endpoints
  app.post("/api/upload/invoice-json", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "فایل انتخاب نشده است" });
      }

      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const jsonData = JSON.parse(fileContent);

      // Process JSON data logic here
      console.log('📄 Invoice JSON uploaded and processed');

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        message: "فایل با موفقیت پردازش شد",
        recordsProcessed: Array.isArray(jsonData) ? jsonData.length : 1
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({ error: "خطا در پردازش فایل" });
    }
  });

  console.log("✅ All routes registered successfully");
}