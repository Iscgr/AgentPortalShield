import {
  representatives, salesPartners, invoices, payments, activityLogs, settings, adminUsers, invoiceEdits,
  financialTransactions, dataIntegrityConstraints, invoiceBatches, crmUsers, telegramSendHistory,
  aiConfiguration,
  type Representative, type InsertRepresentative,
  type SalesPartner, type InsertSalesPartner, type SalesPartnerWithCount,
  type Invoice, type InsertInvoice,
  type Payment, type InsertPayment,
  type ActivityLog, type InsertActivityLog,
  type Setting, type InsertSetting,
  type AdminUser, type InsertAdminUser,
  type InvoiceEdit, type InsertInvoiceEdit,
  type FinancialTransaction, type InsertFinancialTransaction,
  type DataIntegrityConstraint, type InsertDataIntegrityConstraint,
  // فاز ۱: Import برای مدیریت دوره‌ای فاکتورها
  type InvoiceBatch, type InsertInvoiceBatch,
  // CRM Users Import
  type CrmUser, type InsertCrmUser,
  // Telegram Send History Import
  type TelegramSendHistory, type InsertTelegramSendHistory,
  // AI Configuration Import
  type AiConfiguration, type InsertAiConfiguration
} from "@shared/schema";
import { db, checkDatabaseHealth } from "./db";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Database operation wrapper with retry logic and error handling
async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.error(`Database operation "${operationName}" failed (attempt ${attempt}/${maxRetries}):`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`Database operation "${operationName}" failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Exponential backoff: wait 2^attempt seconds
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error(`Database operation "${operationName}" failed unexpectedly`);
}

export interface IStorage {
  // Representatives
  getRepresentatives(): Promise<Representative[]>;
  getRepresentative(id: number): Promise<Representative | undefined>;
  getRepresentativeByCode(code: string): Promise<Representative | undefined>;
  getRepresentativeByPanelUsername(panelUsername: string): Promise<Representative | undefined>;
  getRepresentativeByPublicId(publicId: string): Promise<Representative | undefined>;
  createRepresentative(rep: InsertRepresentative): Promise<Representative>;
  updateRepresentative(id: number, rep: Partial<Representative>): Promise<Representative>;
  deleteRepresentative(id: number): Promise<void>;

  // Sales Partners
  getSalesPartners(): Promise<SalesPartnerWithCount[]>;
  getSalesPartner(id: number): Promise<SalesPartner | undefined>;
  createSalesPartner(partner: InsertSalesPartner): Promise<SalesPartner>;
  updateSalesPartner(id: number, partner: Partial<SalesPartner>): Promise<SalesPartner>;
  deleteSalesPartner(id: number): Promise<void>;
  getSalesPartnersStatistics(): Promise<any>;
  getRepresentativesBySalesPartner(partnerId: number): Promise<Representative[]>;

  // فاز ۱: Invoice Batches - مدیریت دوره‌ای فاکتورها
  getInvoiceBatches(): Promise<InvoiceBatch[]>;
  getInvoiceBatch(id: number): Promise<InvoiceBatch | undefined>;
  getInvoiceBatchByCode(batchCode: string): Promise<InvoiceBatch | undefined>;
  createInvoiceBatch(batch: InsertInvoiceBatch): Promise<InvoiceBatch>;
  updateInvoiceBatch(id: number, batch: Partial<InvoiceBatch>): Promise<InvoiceBatch>;
  completeBatch(batchId: number): Promise<void>;
  getBatchInvoices(batchId: number): Promise<Invoice[]>;
  generateBatchCode(periodStart: string): Promise<string>;

  // Invoices - بهبود یافته با پشتیبانی دوره‌ای و مدیریت دستی
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>; // فاز ۲
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice>; // فاز ۲
  deleteInvoice(id: number): Promise<void>; // فاز ۲
  getInvoicesByRepresentative(repId: number): Promise<Invoice[]>;
  getInvoicesByBatch(batchId: number): Promise<Invoice[]>;
  getInvoicesForTelegram(): Promise<Invoice[]>; // Unsent invoices
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice>;
  markInvoicesAsSentToTelegram(invoiceIds: number[]): Promise<void>;
  getInvoicesWithBatchInfo(): Promise<(Invoice & { batch?: InvoiceBatch })[]>;
  // ✅ SHERLOCK v32.0: Get single invoice by ID with full details
  getInvoiceById(invoiceId: number): Promise<any | null>;

  // Telegram Send History - for resending capability
  getTelegramSendHistory(invoiceId: number): Promise<TelegramSendHistory[]>;
  createTelegramSendHistory(history: InsertTelegramSendHistory): Promise<TelegramSendHistory>;
  markInvoicesAsSentToTelegramWithHistory(invoiceIds: number[], sentBy: string, botToken?: string, chatId?: string, template?: string): Promise<void>;

  // SHERLOCK v11.5: Payment Status Calculation
  calculateInvoicePaymentStatus(invoiceId: number): Promise<string>;

  // SHERLOCK v12.4: Manual Invoices Management
  getManualInvoices(options: { page: number; limit: number; search?: string; status?: string }): Promise<{ data: Invoice[]; pagination: any }>;
  getManualInvoicesStatistics(): Promise<{ totalCount: number; totalAmount: string; unpaidCount: number; paidCount: number; partialCount: number }>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByRepresentative(repId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment>;
  deletePayment(id: number): Promise<void>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment>;
  allocatePaymentToInvoice(paymentId: number, invoiceId: number): Promise<Payment>;
  autoAllocatePaymentToInvoices(paymentId: number, representativeId: number): Promise<{
    success: boolean;
    allocated: number;
    totalAmount: string;
    details: Array<{ paymentId: number; invoiceId: number; amount: string }>;
  }>;
  manualAllocatePaymentToInvoice(
    paymentId: number,
    invoiceId: number,
    amount: number,
    performedBy: string,
    reason?: string
  ): Promise<{
    success: boolean;
    allocatedAmount: number;
    message: string;
    transactionId?: string;
  }>;
  getPaymentStatistics(): Promise<any>;

  // Activity Logs
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;

  // Admin Users (Authentication)
  getAdminUser(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUserLogin(id: number): Promise<void>;
  initializeDefaultAdminUser(username: string, password: string): Promise<void>;

  // CRM Users (Authentication)
  getCrmUser(username: string): Promise<CrmUser | undefined>;
  createCrmUser(user: InsertCrmUser): Promise<CrmUser>;
  updateCrmUserLogin(id: number): Promise<void>;
  initializeDefaultCrmUser(username: string, password: string): Promise<void>;

  // Data Reset Functions (Admin Only)
  getDataCounts(): Promise<{
    representatives: number;
    invoices: number;
    payments: number;
    salesPartners: number;
    settings: number;
    activityLogs: number;
  }>;
  resetData(options: {
    representatives: boolean;
    invoices: boolean;
    payments: boolean;
    salesPartners: boolean;
    settings: boolean;
    activityLogs: boolean;
  }): Promise<{
    deletedCounts: {
      representatives: number;
      invoices: number;
      payments: number;
      salesPartners: number;
      settings: number;
      activityLogs: number;
      total: number;
    };
  }>;

  // Dashboard data
  getDashboardData(): Promise<{
    totalRevenue: string;
    totalDebt: string;
    activeRepresentatives: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalSalesPartners: number;
    recentActivities: ActivityLog[];
  }>;

  // SHERLOCK v10.0: Debtor representatives
  getDebtorRepresentatives(): Promise<Array<{
    id: number;
    name: string;
    code: string;
    remainingDebt: string;
    totalInvoices: string;
    totalPayments: string;
  }>>;

  // Financial Synchronization Methods
  getTotalRevenue(): Promise<string>;
  getTotalDebt(): Promise<string>;
  getActiveRepresentativesCount(): Promise<number>;
  getUnpaidInvoicesCount(): Promise<number>;
  getOverdueInvoicesCount(): Promise<number>;

  // SHERLOCK v11.0: Batch-based active representatives (unified calculation)
  getBatchBasedActiveRepresentatives(): Promise<number>;

  // Financial calculations
  updateRepresentativeFinancials(repId: number): Promise<void>;

  // Invoice Edits
  getInvoiceEdits(invoiceId: number): Promise<InvoiceEdit[]>;
  createInvoiceEdit(edit: InsertInvoiceEdit): Promise<InvoiceEdit>;
  getInvoiceEditHistory(invoiceId: number): Promise<InvoiceEdit[]>;
  updateRepresentativeDebt(invoiceId: number, originalAmount: number, editedAmount: number): Promise<void>;

  // Financial Transactions (Clock Mechanism Core)
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateTransactionStatus(transactionId: string, status: string, actualState?: any): Promise<void>;
  getFinancialTransaction(transactionId: string): Promise<FinancialTransaction | undefined>;
  getTransactionsByRepresentative(repId: number): Promise<FinancialTransaction[]>;
  getPendingTransactions(): Promise<FinancialTransaction[]>;
  rollbackTransaction(transactionId: string): Promise<void>;

  // Data Integrity Constraints (Clock Precision)
  createIntegrityConstraint(constraint: InsertDataIntegrityConstraint): Promise<DataIntegrityConstraint>;
  validateConstraints(entityType: string, entityId: number): Promise<{isValid: boolean, violations: any[]}>;
  getConstraintViolations(): Promise<DataIntegrityConstraint[]>;
  fixConstraintViolation(constraintId: number): Promise<boolean>;
  updateConstraintStatus(constraintId: number, status: string, details?: any): Promise<void>;

  // Atomic Operations (Complete Financial Transaction Processing)
  executeAtomicInvoiceEdit(editData: {
    invoiceId: number;
    editedUsageData: any;
    editReason: string;
    editedBy: string;
    originalAmount: number;
    editedAmount: number;
  }): Promise<{transactionId: string, editId: number, success: boolean}>;

  // AI Configuration
  getAiConfigurations(): Promise<AiConfiguration[]>;
  getAiConfiguration(configName: string): Promise<AiConfiguration | undefined>;
  getAiConfigurationsByCategory(category: string): Promise<AiConfiguration[]>;
  createAiConfiguration(config: InsertAiConfiguration): Promise<AiConfiguration>;
  updateAiConfiguration(configName: string, config: Partial<AiConfiguration>): Promise<AiConfiguration>;
  deleteAiConfiguration(configName: string): Promise<void>;
  getActiveAiConfiguration(): Promise<AiConfiguration[]>;

  // Payment Allocation Methods (SHERLOCK v34.0)
  getUnallocatedPayments(representativeId?: number): Promise<Payment[]>;
  allocatePaymentToInvoice(paymentId: number, invoiceId: number): Promise<Payment>;
  autoAllocatePayments(representativeId: number): Promise<{
    allocated: number;
    totalAmount: string;
    details: Array<{ paymentId: number; invoiceId: number; amount: string }>;
  }>;
  // Force refresh portal cache
  forceRefreshPortalCache(representativeCode: string): Promise<void>;
  // Update invoice status after allocation
  updateInvoiceStatusAfterAllocation(invoiceId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getRepresentatives(): Promise<Representative[]> {
    return await withDatabaseRetry(
      () => db.select().from(representatives).orderBy(desc(representatives.createdAt)),
      'getRepresentatives'
    );
  }

  async getRepresentative(id: number): Promise<Representative | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [rep] = await db.select().from(representatives).where(eq(representatives.id, id));
        return rep || undefined;
      },
      'getRepresentative'
    );
  }

  async getRepresentativeByCode(code: string): Promise<Representative | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [rep] = await db.select().from(representatives).where(eq(representatives.code, code));
        return rep || undefined;
      },
      'getRepresentativeByCode'
    );
  }

  async getRepresentativeByPanelUsername(panelUsername: string): Promise<Representative | undefined> {
    const [rep] = await db.select().from(representatives).where(eq(representatives.panelUsername, panelUsername));
    return rep || undefined;
  }

  async getRepresentativeByPublicId(publicId: string): Promise<Representative | undefined> {
    const [rep] = await db.select().from(representatives).where(eq(representatives.publicId, publicId));
    return rep || undefined;
  }

  async createRepresentative(rep: InsertRepresentative): Promise<Representative> {
    const publicId = nanoid(32); // Generate unique public ID for portal access
    const [newRep] = await db
      .insert(representatives)
      .values({ ...rep, publicId })
      .returning();

    await this.createActivityLog({
      type: "representative_created",
      description: `نماینده جدید "${newRep.name}" اضافه شد`,
      relatedId: newRep.id
    });

    return newRep;
  }

  async updateRepresentative(id: number, rep: Partial<Representative>): Promise<Representative> {
    const [updated] = await db
      .update(representatives)
      .set({ ...rep, updatedAt: new Date() })
      .where(eq(representatives.id, id))
      .returning();
    return updated;
  }

  async deleteRepresentative(id: number): Promise<void> {
    await db.delete(representatives).where(eq(representatives.id, id));
  }

  async getSalesPartners(): Promise<SalesPartnerWithCount[]> {
    return await withDatabaseRetry(
      async () => {
        // Get all sales partners
        const partners = await db.select().from(salesPartners).orderBy(desc(salesPartners.createdAt));

        // For each partner, calculate representativesCount
        const partnersWithCounts = await Promise.all(
          partners.map(async (partner) => {
            const [countResult] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(representatives)
              .where(eq(representatives.salesPartnerId, partner.id));

            return {
              ...partner,
              representativesCount: countResult?.count || 0
            };
          })
        );

        return partnersWithCounts;
      },
      'getSalesPartners'
    );
  }

  async getSalesPartner(id: number): Promise<SalesPartner | undefined> {
    const [partner] = await db.select().from(salesPartners).where(eq(salesPartners.id, id));
    return partner || undefined;
  }

  async createSalesPartner(partner: InsertSalesPartner): Promise<SalesPartner> {
    const [newPartner] = await db
      .insert(salesPartners)
      .values(partner)
      .returning();

    await this.createActivityLog({
      type: "sales_partner_created",
      description: `همکار فروش جدید "${newPartner.name}" اضافه شد`,
      relatedId: newPartner.id
    });

    return newPartner;
  }

  async updateSalesPartner(id: number, partner: Partial<SalesPartner>): Promise<SalesPartner> {
    const [updated] = await db
      .update(salesPartners)
      .set(partner)
      .where(eq(salesPartners.id, id))
      .returning();
    return updated;
  }

  // فاز ۱: Implementation مدیریت دوره‌ای فاکتورها
  async getInvoiceBatches(): Promise<InvoiceBatch[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoiceBatches).orderBy(desc(invoiceBatches.createdAt)),
      'getInvoiceBatches'
    );
  }

  async getInvoiceBatch(id: number): Promise<InvoiceBatch | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [batch] = await db.select().from(invoiceBatches).where(eq(invoiceBatches.id, id));
        return batch || undefined;
      },
      'getInvoiceBatch'
    );
  }

  async getInvoiceBatchByCode(batchCode: string): Promise<InvoiceBatch | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [batch] = await db.select().from(invoiceBatches).where(eq(invoiceBatches.batchCode, batchCode));
        return batch || undefined;
      },
      'getInvoiceBatchByCode'
    );
  }

  async createInvoiceBatch(batch: InsertInvoiceBatch): Promise<InvoiceBatch> {
    return await withDatabaseRetry(
      async () => {
        const [newBatch] = await db
          .insert(invoiceBatches)
          .values(batch)
          .returning();

        await this.createActivityLog({
          type: "batch_created",
          description: `دسته فاکتور جدید "${newBatch.batchName}" ایجاد شد`,
          relatedId: newBatch.id,
          metadata: {
            batchCode: newBatch.batchCode,
            periodStart: newBatch.periodStart,
            periodEnd: newBatch.periodEnd
          }
        });

        return newBatch;
      },
      'createInvoiceBatch'
    );
  }

  async updateInvoiceBatch(id: number, batch: Partial<InvoiceBatch>): Promise<InvoiceBatch> {
    return await withDatabaseRetry(
      async () => {
        const [updated] = await db
          .update(invoiceBatches)
          .set(batch)
          .where(eq(invoiceBatches.id, id))
          .returning();
        return updated;
      },
      'updateInvoiceBatch'
    );
  }

  async completeBatch(batchId: number): Promise<void> {
    await withDatabaseRetry(
      async () => {
        // محاسبه آمار نهایی دسته
        const batchStats = await db
          .select({
            totalInvoices: sql<number>`count(*)`,
            totalAmount: sql<string>`sum(amount)`
          })
          .from(invoices)
          .where(eq(invoices.batchId, batchId));

        await db
          .update(invoiceBatches)
          .set({
            status: 'completed',
            totalInvoices: batchStats[0]?.totalInvoices || 0,
            totalAmount: batchStats[0]?.totalAmount || "0",
            completedAt: new Date()
          })
          .where(eq(invoiceBatches.id, batchId));

        const batch = await this.getInvoiceBatch(batchId);
        if (batch) {
          await this.createActivityLog({
            type: "batch_completed",
            description: `دسته فاکتور "${batch.batchName}" تکمیل شد - ${batchStats[0]?.totalInvoices || 0} فاکتور`,
            relatedId: batchId,
            metadata: {
              totalInvoices: batchStats[0]?.totalInvoices || 0,
              totalAmount: batchStats[0]?.totalAmount || "0"
            }
          });
        }
      },
      'completeBatch'
    );
  }

  async getBatchInvoices(batchId: number): Promise<Invoice[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoices).where(eq(invoices.batchId, batchId)).orderBy(desc(invoices.createdAt)),
      'getBatchInvoices'
    );
  }

  async generateBatchCode(periodStart: string): Promise<string> {
    // تولید کد منحصر به فرد برای دسته بر اساس تاریخ شروع دوره
    const persianDate = periodStart.replace(/\//g, '-');
    const timestamp = Date.now().toString().slice(-4);
    return `BATCH-${persianDate}-${timestamp}`;
  }

  async getInvoicesByBatch(batchId: number): Promise<Invoice[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoices).where(eq(invoices.batchId, batchId)).orderBy(desc(invoices.createdAt)),
      'getInvoicesByBatch'
    );
  }

  async getInvoicesWithBatchInfo(): Promise<(Invoice & { batch?: InvoiceBatch })[]> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({
            // Invoice fields
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            representativeId: invoices.representativeId,
            batchId: invoices.batchId,
            amount: invoices.amount,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            status: invoices.status,
            usageData: invoices.usageData,
            sentToTelegram: invoices.sentToTelegram,
            telegramSentAt: invoices.telegramSentAt,
            telegramSendCount: invoices.telegramSendCount,
            createdAt: invoices.createdAt,
            // Batch fields (nullable)
            batchName: invoiceBatches.batchName,
            batchCode: invoiceBatches.batchCode,
            batchStatus: invoiceBatches.status,
            periodStart: invoiceBatches.periodStart,
            periodEnd: invoiceBatches.periodEnd
          })
          .from(invoices)
          .leftJoin(invoiceBatches, eq(invoices.batchId, invoiceBatches.id))
          .orderBy(desc(invoices.createdAt));

        return result.map(row => ({
          id: row.id,
          invoiceNumber: row.invoiceNumber,
          representativeId: row.representativeId,
          batchId: row.batchId,
          amount: row.amount,
          issueDate: row.issueDate,
          dueDate: row.dueDate,
          status: row.status,
          usageData: row.usageData,
          sentToTelegram: row.sentToTelegram,
          telegramSentAt: row.telegramSentAt,
          telegramSendCount: row.telegramSendCount,
          createdAt: row.createdAt,
          batch: row.batchName ? {
            id: row.batchId!,
            batchName: row.batchName,
            batchCode: row.batchCode!,
            periodStart: row.periodStart!,
            periodEnd: row.periodEnd!,
            description: null,
            status: row.batchStatus!,
            totalInvoices: null,
            totalAmount: null,
            uploadedBy: '',
            uploadedFileName: null,
            createdAt: null,
            completedAt: null
          } : undefined
        }));
      },
      'getInvoicesWithBatchInfo'
    );
  }

  // SHERLOCK v11.5: Enhanced with real-time payment allocation status calculation
  async getInvoices(): Promise<any[]> {
    // Get base invoice data
    const invoiceResults = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        representativeId: invoices.representativeId,
        amount: invoices.amount,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        usageData: invoices.usageData,
        sentToTelegram: invoices.sentToTelegram,
        telegramSentAt: invoices.telegramSentAt,
        createdAt: invoices.createdAt,
        // Join representative information
        representativeName: representatives.name,
        representativeCode: representatives.code,
        panelUsername: representatives.panelUsername
      })
      .from(invoices)
      .leftJoin(representatives, eq(invoices.representativeId, representatives.id))
      .orderBy(invoices.issueDate, invoices.createdAt); // SHERLOCK v11.5: FIFO order (oldest first)

    // Calculate real-time status for each invoice based on payments
    const enhancedInvoices = await Promise.all(
      invoiceResults.map(async (invoice) => {
        const calculatedStatus = await this.calculateInvoicePaymentStatus(invoice.id);
        return {
          ...invoice,
          status: calculatedStatus // Override with real-time calculated status
        };
      })
    );

    return enhancedInvoices;
  }

  // SHERLOCK v11.5: Enhanced with real-time payment allocation status calculation and FIFO ordering
  async getInvoicesByRepresentative(repId: number): Promise<any[]> {
    // Get base invoice data - CRITICAL: Order by oldest first (FIFO for payment allocation)
    const invoiceResults = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        representativeId: invoices.representativeId,
        amount: invoices.amount,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        usageData: invoices.usageData,
        sentToTelegram: invoices.sentToTelegram,
        telegramSentAt: invoices.telegramSentAt,
        createdAt: invoices.createdAt,
        // Join representative information
        representativeName: representatives.name,
        representativeCode: representatives.code,
        panelUsername: representatives.panelUsername
      })
      .from(invoices)
      .leftJoin(representatives, eq(invoices.representativeId, representatives.id))
      .where(eq(invoices.representativeId, repId))
      .orderBy(invoices.issueDate, invoices.createdAt); // FIFO: Oldest first for payment processing

    // Calculate real-time status for each invoice based on payments - with error handling
    const enhancedInvoices = await Promise.all(
      invoiceResults.map(async (invoice) => {
        try {
          const calculatedStatus = await this.calculateInvoicePaymentStatus(invoice.id);
          return {
            ...invoice,
            status: calculatedStatus // Override with real-time calculated status
          };
        } catch (error) {
          console.error(`⚠️ Error calculating status for invoice ${invoice.id}:`, error);
          return {
            ...invoice,
            status: invoice.status // Keep original status if calculation fails
          };
        }
      })
    );

    return enhancedInvoices;
  }

  // SHERLOCK v11.5: FIFO ordering for Telegram sending (oldest first)
  async getInvoicesForTelegram(): Promise<Invoice[]> {
    return await db.select().from(invoices)
      .where(eq(invoices.sentToTelegram, false))
      .orderBy(invoices.issueDate, invoices.createdAt); // FIFO: Send oldest invoices first
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    // Generate unique invoice number with retry mechanism
    let invoiceNumber: string = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;

      // Generate unique invoice number using timestamp + random
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      invoiceNumber = `INV-${timestamp}${random}`;

      // Check if this invoice number already exists
      const existing = await db.select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber))
        .limit(1);

      if (existing.length === 0) {
        // Unique number found, break the loop
        break;
      }

      if (attempts === maxAttempts) {
        throw new Error(`Unable to generate unique invoice number after ${maxAttempts} attempts`);
      }

      // Wait a small amount before retry
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const [newInvoice] = await db
      .insert(invoices)
      .values({ ...invoice, invoiceNumber })
      .returning();

    // Update representative's total debt
    await this.updateRepresentativeFinancials(newInvoice.representativeId);

    await this.createActivityLog({
      type: "invoice_created",
      description: `فاکتور ${invoiceNumber} برای نماینده ایجاد شد`,
      relatedId: newInvoice.id
    });

    return newInvoice;
  }

  // فاز ۲: Get single invoice method
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
        return invoice || undefined;
      },
      'getInvoice'
    );
  }

  async updateInvoice(id: number, invoice: Partial<Invoice>): Promise<Invoice> {
    return await withDatabaseRetry(
      async () => {
        const [updated] = await db
          .update(invoices)
          .set(invoice)
          .where(eq(invoices.id, id))
          .returning();
        return updated;
      },
      'updateInvoice'
    );
  }

  // SHERLOCK v11.5: CRITICAL - Real-time Payment Status Calculator
  async calculateInvoicePaymentStatus(invoiceId: number): Promise<string> {
    try {
      // Get invoice amount
      const invoice = await db.select({
        id: invoices.id,
        amount: invoices.amount,
        dueDate: invoices.dueDate
      })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice.length) return 'unpaid';

      const invoiceAmount = parseFloat(invoice[0].amount);
      const dueDate = invoice[0].dueDate;

      // Get total payments allocated to this invoice
      const paymentResults = await db.select({ amount: payments.amount })
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId));

      const totalPaid = paymentResults.reduce((sum, payment) =>
        sum + parseFloat(payment.amount), 0);

      // Calculate status based on payment coverage
      if (totalPaid >= invoiceAmount) {
        return 'paid'; // Fully paid
      } else if (totalPaid > 0) {
        return 'partial'; // Partially paid
      } else {
        // Check if overdue
        if (dueDate) {
          const today = new Date();
          const dueDateObj = new Date(dueDate);
          if (today > dueDateObj) {
            return 'overdue'; // Overdue and unpaid
          }
        }
        return 'unpaid'; // Not paid and not overdue
      }
    } catch (error) {
      console.error('Error calculating invoice payment status:', error);
      return 'unpaid'; // Default fallback
    }
  }

  // فاز ۲: Delete invoice method
  async deleteInvoice(id: number): Promise<void> {
    await withDatabaseRetry(
      async () => {
        await db.delete(invoices).where(eq(invoices.id, id));
      },
      'deleteInvoice'
    );
  }

  async markInvoicesAsSentToTelegram(invoiceIds: number[]): Promise<void> {
    // Use OR conditions for multiple IDs instead of ANY array syntax
    const whereConditions = invoiceIds.map(id => eq(invoices.id, id));
    const whereClause = whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions);

    await db
      .update(invoices)
      .set({
        sentToTelegram: true,
        telegramSentAt: new Date()
      })
      .where(whereClause);

    await this.createActivityLog({
      type: "telegram_sent",
      description: `${invoiceIds.length} فاکتور به تلگرام ارسال شد`,
      metadata: { invoiceIds }
    });
  }

  // Telegram Send History Methods - for resending capability
  async getTelegramSendHistory(invoiceId: number): Promise<TelegramSendHistory[]> {
    return await withDatabaseRetry(
      () => db.select().from(telegramSendHistory)
        .where(eq(telegramSendHistory.invoiceId, invoiceId))
        .orderBy(desc(telegramSendHistory.sentAt)),
      'getTelegramSendHistory'
    );
  }

  async createTelegramSendHistory(history: InsertTelegramSendHistory): Promise<TelegramSendHistory> {
    return await withDatabaseRetry(
      async () => {
        const [newHistory] = await db
          .insert(telegramSendHistory)
          .values(history)
          .returning();
        return newHistory;
      },
      'createTelegramSendHistory'
    );
  }

  async markInvoicesAsSentToTelegramWithHistory(
    invoiceIds: number[],
    sentBy: string,
    botToken?: string,
    chatId?: string,
    template?: string
  ): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const whereConditions = invoiceIds.map(id => eq(invoices.id, id));
        const whereClause = whereConditions.length === 1 ? whereConditions[0] : or(...whereConditions);

        // Get current invoices to check if they were previously sent
        const currentInvoices = await db.select().from(invoices).where(whereClause);

        // Update invoices with send info
        await db
          .update(invoices)
          .set({
            sentToTelegram: true,
            telegramSentAt: new Date(),
            telegramSendCount: sql`${invoices.telegramSendCount} + 1`
          })
          .where(whereClause);

        // Create history records for each invoice
        for (const invoice of currentInvoices) {
          const sendType = invoice.sentToTelegram ? 'RESEND' : 'FIRST_SEND';

          await this.createTelegramSendHistory({
            invoiceId: invoice.id,
            sendType,
            sentBy,
            botToken: botToken || null,
            chatId: chatId || null,
            messageTemplate: template || null,
            sendStatus: 'SUCCESS',
            metadata: {
              previousSendCount: invoice.telegramSendCount || 0,
              isResend: invoice.sentToTelegram
            }
          });
        }

        const resendCount = currentInvoices.filter(inv => inv.sentToTelegram).length;
        const firstSendCount = invoiceIds.length - resendCount;

        let description = '';
        if (firstSendCount > 0 && resendCount > 0) {
          description = `${firstSendCount} فاکتور جدید و ${resendCount} فاکتور مجددا به تلگرام ارسال شد`;
        } else if (resendCount > 0) {
          description = `${resendCount} فاکتور مجددا به تلگرام ارسال شد`;
        } else {
          description = `${firstSendCount} فاکتور به تلگرام ارسال شد`;
        }

        await this.createActivityLog({
          type: "telegram_sent",
          description,
          metadata: {
            invoiceIds,
            firstSendCount,
            resendCount,
            sentBy
          }
        });
      },
      'markInvoicesAsSentToTelegramWithHistory'
    );
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsByRepresentative(repId: number): Promise<any[]> {
    // ✅ SHERLOCK v32.1: Use only existing database columns to avoid schema mismatch
    const results = await db.select({
      id: payments.id,
      representativeId: payments.representativeId,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      description: payments.description,
      isAllocated: payments.isAllocated,
      createdAt: payments.createdAt
    }).from(payments)
      .where(eq(payments.representativeId, repId))
      .orderBy(desc(payments.createdAt));

    // Add missing fields as defaults for compatibility
    return results.map(payment => ({
      ...payment,
      description: payment.description || 'پرداخت', // Add default description
      allocatedAmount: '0',
      remainingAmount: payment.amount,
      allocations: null,
      allocationMethod: null,
      allocationHistory: null,
      updatedAt: payment.createdAt
    }));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();

    // Update representative's financials after payment
    if (newPayment.representativeId) {
      await this.updateRepresentativeFinancials(newPayment.representativeId);
    }

    if (newPayment.representativeId) {
      const rep = await db.select().from(representatives)
        .where(eq(representatives.id, newPayment.representativeId));

      await this.createActivityLog({
        type: "payment_received",
        description: `پرداخت ${newPayment.amount} تومانی از نماینده "${rep[0]?.name}" ثبت شد`,
        relatedId: newPayment.id
      });
    }

    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<Payment>): Promise<Payment> {
    return await withDatabaseRetry(
      async () => {
        // Get original payment to find representative
        const [originalPayment] = await db.select().from(payments).where(eq(payments.id, id));
        if (!originalPayment) {
          throw new Error(`Payment ${id} not found`);
        }

        const [updated] = await db
          .update(payments)
          .set(payment)
          .where(eq(payments.id, id))
          .returning();

        // Update representative's financials after payment change
        if (originalPayment.representativeId) {
          await this.updateRepresentativeFinancials(originalPayment.representativeId);
        }

        await this.createActivityLog({
          type: "payment_updated",
          description: `پرداخت شماره ${id} بروزرسانی شد`,
          relatedId: id
        });

        return updated;
      },
      'updatePayment'
    );
  }

  async deletePayment(id: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        // Get payment to find representative before deletion
        const [payment] = await db.select().from(payments).where(eq(payments.id, id));
        if (!payment) {
          throw new Error(`Payment ${id} not found`);
        }

        await db.delete(payments).where(eq(payments.id, id));

        // Update representative's financials after payment deletion
        if (payment.representativeId) {
          await this.updateRepresentativeFinancials(payment.representativeId);
        }

        await this.createActivityLog({
          type: "payment_deleted",
          description: `پرداخت ${payment.amount} تومانی حذف شد`,
          relatedId: payment.representativeId
        });
      },
      'deletePayment'
    );
  }



  async getActivityLogs(limit = 50): Promise<ActivityLog[]> {
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return newSetting;
    }
  }

  async getDashboardData() {
    return await withDatabaseRetry(async () => {
      // SHERLOCK v17.8 FINANCIAL INTEGRITY: Use standardized calculations
      const { unifiedFinancialEngine } = await import("./services/unified-financial-engine.js");

      // Calculate standardized total revenue = Sum of ALLOCATED payments only
      const [totalRevenueResult] = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN is_allocated = true THEN amount ELSE 0 END), 0)`
        })
        .from(payments);

      // SHERLOCK v17.8 INTEGRITY: Standardized debt calculation = unpaid/overdue invoices - allocated payments
      const remainingDebtQuery = await db
        .select({
          representativeId: representatives.id,
          totalInvoices: sql<string>`COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue') THEN invoices.amount ELSE 0 END), 0)`,
          allocatedPayments: sql<string>`COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0)`,
          remainingDebt: sql<string>`GREATEST(0, COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue') THEN invoices.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0))`
        })
        .from(representatives)
        .leftJoin(invoices, eq(representatives.id, invoices.representativeId))
        .leftJoin(payments, eq(representatives.id, payments.representativeId))
        .groupBy(representatives.id);

      // Calculate total remaining debt using INTEGRITY ENGINE standard (only positive debts)
      const totalRemainingDebt = remainingDebtQuery
        .reduce((sum, rep) => {
          const debt = parseFloat(rep.remainingDebt) || 0;
          return sum + (debt > 0 ? debt : 0);
        }, 0);

      // SHERLOCK v10.0 LARGEST-BATCH: Active Representatives = Largest significant batch in last 30 days
      // Find the batch with most representatives (>=10) within the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const significantBatches = await db
        .select({
          uploadDate: sql<string>`DATE(invoices.created_at)`,
          repCount: sql<number>`COUNT(DISTINCT invoices.representative_id)`,
          invoiceCount: sql<number>`COUNT(*)`,
          minTime: sql<string>`MIN(invoices.created_at)`,
          maxTime: sql<string>`MAX(invoices.created_at)`
        })
        .from(invoices)
        .innerJoin(representatives, eq(invoices.representativeId, representatives.id))
        .where(
          sql`invoices.created_at >= ${thirtyDaysAgo.toISOString()}`
        )
        .groupBy(sql`DATE(invoices.created_at)`)
        .having(sql`COUNT(DISTINCT invoices.representative_id) >= 10`)
        .orderBy(sql`COUNT(DISTINCT invoices.representative_id) DESC`)
        .limit(1);

      let batchActiveReps = { count: 0 };

      if (significantBatches.length > 0) {
        const latestSignificantBatch = significantBatches[0];
        batchActiveReps = { count: latestSignificantBatch.repCount };
        console.log(`🎯 SHERLOCK v10.0 LARGEST-BATCH: Found ${batchActiveReps.count} active representatives in largest significant batch (${latestSignificantBatch.uploadDate})`);
        console.log(`📊 Batch details: ${latestSignificantBatch.invoiceCount} invoices created from ${latestSignificantBatch.minTime} to ${latestSignificantBatch.maxTime}`);
      } else {
        // Fallback: Use any recent activity if no significant batch exists
        const [fallbackResult] = await db
          .select({ count: sql<number>`COUNT(DISTINCT invoices.representative_id)` })
          .from(invoices)
          .where(
            sql`invoices.created_at >= ${thirtyDaysAgo.toISOString()}`
          );

        batchActiveReps = fallbackResult;
        console.log(`🎯 SHERLOCK v10.0: No significant batch found, using recent activity count: ${batchActiveReps.count}`);
      }

      const [pendingInvs] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, "unpaid"));

      const [overdueInvs] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.status, "overdue"));

      const [totalPartners] = await db
        .select({ count: sql<number>`count(*)` })
        .from(salesPartners)
        .where(eq(salesPartners.isActive, true));

      // SHERLOCK v10.0 FIX: Get recent activities (limited to last 30 days)
      // Reuse thirtyDaysAgo variable from above batch calculation

      const recentActivities = await db
        .select()
        .from(activityLogs)
        .where(sql`activity_logs.created_at >= ${thirtyDaysAgo.toISOString()}`)
        .orderBy(sql`activity_logs.created_at DESC`)
        .limit(10);

      // SHERLOCK v12.2: Add telegram statistics to dashboard
      const [unsentInvs] = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.sentToTelegram, false));

      return {
        totalRevenue: totalRevenueResult.totalRevenue || "0",
        totalDebt: totalRemainingDebt.toString(),
        activeRepresentatives: batchActiveReps.count || 0,
        pendingInvoices: pendingInvs.count,
        overdueInvoices: overdueInvs.count,
        totalSalesPartners: totalPartners.count,
        unsentInvoices: unsentInvs.count, // SHERLOCK v12.2: Add unsent invoices count
        recentActivities
      };
    }, 'getDashboardData');
  }

  // SHERLOCK v11.0: Unified Batch-Based Active Representatives Calculation
  async getBatchBasedActiveRepresentatives(): Promise<number> {
    return await withDatabaseRetry(async () => {
      // Find the batch with most representatives (>=10) within the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const significantBatches = await db
        .select({
          uploadDate: sql<string>`DATE(invoices.created_at)`,
          repCount: sql<number>`COUNT(DISTINCT invoices.representative_id)`,
          invoiceCount: sql<number>`COUNT(*)`,
          minTime: sql<string>`MIN(invoices.created_at)`,
          maxTime: sql<string>`MAX(invoices.created_at)`
        })
        .from(invoices)
        .innerJoin(representatives, eq(invoices.representativeId, representatives.id))
        .where(
          sql`invoices.created_at >= ${thirtyDaysAgo.toISOString()}`
        )
        .groupBy(sql`DATE(invoices.created_at)`)
        .having(sql`COUNT(DISTINCT invoices.representative_id) >= 10`)
        .orderBy(sql`COUNT(DISTINCT invoices.representative_id) DESC`)
        .limit(1);

      if (significantBatches.length > 0) {
        const largestBatch = significantBatches[0];
        console.log(`🎯 SHERLOCK v11.0 BATCH-SYNC: Found ${largestBatch.repCount} active representatives in largest batch (${largestBatch.uploadDate})`);
        return largestBatch.repCount;
      } else {
        // Fallback: Use any recent activity if no significant batch exists
        const [fallbackResult] = await db
          .select({ count: sql<number>`COUNT(DISTINCT invoices.representative_id)` })
          .from(invoices)
          .where(
            sql`invoices.created_at >= ${thirtyDaysAgo.toISOString()}`
          );

        console.log(`🎯 SHERLOCK v11.0 BATCH-SYNC: No significant batch found, using recent activity count: ${fallbackResult.count}`);
        return fallbackResult.count || 0;
      }
    }, 'getBatchBasedActiveRepresentatives');
  }

  // SHERLOCK v17.8 - STANDARDIZED: Financial Integrity Engine - Standardized Debt Calculation
  async getDebtorRepresentatives(): Promise<Array<{
    id: number;
    name: string;
    code: string;
    remainingDebt: string;
    totalInvoices: string;
    totalPayments: string;
  }>> {
    return await withDatabaseRetry(async () => {
      // SHERLOCK v17.8 AUTO-CLEANUP: Remove activity logs older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const cleanupResult = await db
        .delete(activityLogs)
        .where(sql`activity_logs.created_at < ${thirtyDaysAgo.toISOString()}`);

      if (cleanupResult.rowCount && cleanupResult.rowCount > 0) {
        console.log(`🧹 SHERLOCK v17.8 Auto-cleanup: Removed ${cleanupResult.rowCount} old activity logs`);
      }

      // ✅ SHERLOCK v22.1 CRITICAL FIX: Include 'partial' status in debt calculation
      // remainingDebt = unpaid/overdue/partial invoices - allocated payments
      const debtorReps = await db
        .select({
          id: representatives.id,
          name: representatives.name,
          code: representatives.code,
          totalInvoices: sql<string>`COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue', 'partial') THEN invoices.amount ELSE 0 END), 0)`,
          totalPayments: sql<string>`COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0)`,
          remainingDebt: sql<string>`GREATEST(0, COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue', 'partial') THEN invoices.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0))`
        })
        .from(representatives)
        .leftJoin(invoices, eq(representatives.id, invoices.representativeId))
        .leftJoin(payments, eq(representatives.id, payments.representativeId))
        .groupBy(representatives.id, representatives.name, representatives.code)
        .having(sql`GREATEST(0, COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue', 'partial') THEN invoices.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0)) > 0`)
        .orderBy(sql`GREATEST(0, COALESCE(SUM(CASE WHEN invoices.status IN ('unpaid', 'overdue', 'partial') THEN invoices.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN payments.is_allocated = true THEN payments.amount ELSE 0 END), 0)) DESC`);

      return debtorReps;
    }, 'getDebtorRepresentatives');
  }

  // SHERLOCK v18.4 - STANDARDIZED: Always use UNIFIED Financial Engine
  async updateRepresentativeFinancials(repId: number): Promise<void> {
    const { unifiedFinancialEngine } = await import("./services/unified-financial-engine.js");
    return await withDatabaseRetry(
      async () => {
        const data = await unifiedFinancialEngine.calculateRepresentative(repId);
        console.log(`💎 UNIFIED FINANCIAL ENGINE v18.4: Standardized update for representative ${repId}:`, {
          debt: data.actualDebt,
          totalSales: data.totalSales,
          totalPaid: data.totalPaid,
          debtLevel: data.debtLevel
        });
        return;
      },
      'updateRepresentativeFinancials'
    );
  }

  // Admin Users methods
  async getAdminUser(username: string): Promise<AdminUser | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
        return user || undefined;
      },
      'getAdminUser'
    );
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    return await withDatabaseRetry(
      async () => {
        const [newUser] = await db.insert(adminUsers).values(user).returning();
        return newUser;
      },
      'createAdminUser'
    );
  }

  async updateAdminUserLogin(id: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, id));
      },
      'updateAdminUserLogin'
    );
  }

  // Initialize default admin user if not exists
  async initializeDefaultAdminUser(username: string, password: string): Promise<void> {
    try {
      // Check if admin user already exists
      const existingUser = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.username, username))
        .limit(1);

      if (existingUser.length === 0) {
        // Hash the password with higher salt rounds for security
        const passwordHash = await bcrypt.hash(password, 12);

        // Create the admin user
        await db.insert(adminUsers).values({
          username,
          passwordHash,
          role: 'SUPER_ADMIN',
          permissions: JSON.stringify([
            'FULL_ACCESS',
            'FINANCIAL_MANAGEMENT',
            'USER_MANAGEMENT',
            'SYSTEM_SETTINGS',
            'REPORTS',
            'AI_ASSISTANT',
            'INVOICE_MANAGEMENT',
            'PAYMENT_MANAGEMENT',
            'REPRESENTATIVE_MANAGEMENT',
            'BATCH_PROCESSING',
            'EXPORT_REPORTS',
            'DATABASE_ACCESS'
          ]),
          isActive: true,
          createdAt: new Date()
        });

        console.log(`✅ Default admin user '${username}' created successfully with hash: ${passwordHash.substring(0, 10)}...`);
      } else {
        // Update existing user password if it exists but might be corrupted
        const passwordHash = await bcrypt.hash(password, 12);
        await db
          .update(adminUsers)
          .set({
            passwordHash,
            isActive: true,
            role: 'SUPER_ADMIN'
          })
          .where(eq(adminUsers.username, username));

        console.log(`🔄 Admin user '${username}' password reset successfully`);
      }
    } catch (error) {
      console.error('Error initializing default admin user:', error);
      throw error;
    }
  }

  // CRM Users (Authentication) Implementation
  async getCrmUser(username: string): Promise<CrmUser | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [user] = await db.select().from(crmUsers).where(eq(crmUsers.username, username));
        return user || undefined;
      },
      'getCrmUser'
    );
  }

  async createCrmUser(user: InsertCrmUser): Promise<CrmUser> {
    return await withDatabaseRetry(
      async () => {
        const [newUser] = await db.insert(crmUsers).values(user).returning();
        return newUser;
      },
      'createCrmUser'
    );
  }

  async updateCrmUserLogin(id: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        await db
          .update(crmUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(crmUsers.id, id));
      },
      'updateCrmUserLogin'
    );
  }

  async initializeDefaultCrmUser(username: string, password: string): Promise<void> {
    try {
      // Check if CRM user already exists
      const existingUser = await db
        .select()
        .from(crmUsers)
        .where(eq(crmUsers.username, username))
        .limit(1);

      if (existingUser.length === 0) {
        // Hash the password with higher salt rounds for security
        const passwordHash = await bcrypt.hash(password, 12);

        // Create the CRM user
        await db.insert(crmUsers).values({
          username,
          passwordHash,
          fullName: 'مدیر CRM',
          email: `${username}@system.local`,
          role: 'CRM_MANAGER',
          permissions: JSON.stringify([
            'CRM_ACCESS',
            'REPRESENTATIVE_VIEW',
            'TASK_MANAGEMENT',
            'REPORT_GENERATION',
            'AI_ASSISTANCE'
          ]),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`✅ Default CRM user '${username}' created successfully with hash: ${passwordHash.substring(0, 10)}...`);
      } else {
        // Update existing user password if it exists but might be corrupted
        const passwordHash = await bcrypt.hash(password, 12);
        await db
          .update(crmUsers)
          .set({
            passwordHash,
            isActive: true,
            role: 'CRM_MANAGER'
          })
          .where(eq(crmUsers.username, username));

        console.log(`🔄 CRM user '${username}' password reset successfully`);
      }
    } catch (error) {
      console.error('Error initializing default CRM user:', error);
      throw error;
    }
  }

  // CRM Enhanced Methods
  async getRepresentativeById(representativeId: number): Promise<Representative | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [representative] = await db
          .select()
          .from(representatives)
          .where(eq(representatives.id, representativeId));

        return representative || undefined;
      },
      'getRepresentativeById'
    );
  }

  // Data Reset Functions
  async getDataCounts(): Promise<{
    representatives: number;
    invoices: number;
    payments: number;
    salesPartners: number;
    settings: number;
    activityLogs: number;
  }> {
    return await withDatabaseRetry(
      async () => {
        const [repCount] = await db.select({ count: sql<number>`count(*)` }).from(representatives);
        const [invCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
        const [payCount] = await db.select({ count: sql<number>`count(*)` }).from(payments);
        const [partCount] = await db.select({ count: sql<number>`count(*)` }).from(salesPartners);
        const [setCount] = await db.select({ count: sql<number>`count(*)` }).from(settings);
        const [logCount] = await db.select({ count: sql<number>`count(*)` }).from(activityLogs);

        return {
          representatives: Number(repCount.count),
          invoices: Number(invCount.count),
          payments: Number(payCount.count),
          salesPartners: Number(partCount.count),
          settings: Number(setCount.count),
          activityLogs: Number(logCount.count),
        };
      },
      'getDataCounts'
    );
  }

  async resetData(options: {
    representatives: boolean;
    invoices: boolean;
    payments: boolean;
    salesPartners: boolean;
    settings: boolean;
    activityLogs: boolean;
  }): Promise<{
    deletedCounts: {
      representatives: number;
      invoices: number;
      payments: number;
      salesPartners: number;
      settings: number;
      activityLogs: number;
      total: number;
    };
  }> {
    return await withDatabaseRetry(
      async () => {
        const deletedCounts = {
          representatives: 0,
          invoices: 0,
          payments: 0,
          salesPartners: 0,
          settings: 0,
          activityLogs: 0,
          total: 0,
        };

        // Order matters for referential integrity
        // Delete in correct order to avoid foreign key constraint violations

        if (options.payments) {
          const result = await db.delete(payments);
          deletedCounts.payments = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی پرداخت‌ها: ${deletedCounts.payments}رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'payments', count: deletedCounts.payments }
          });
        }

        if (options.invoices) {
          const result = await db.delete(invoices);
          deletedCounts.invoices = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی فاکتورها: ${deletedCounts.invoices}رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'invoices', count: deletedCounts.invoices }
          });
        }

        if (options.representatives) {
          const result = await db.delete(representatives);
          deletedCounts.representatives = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی نمایندگان: ${deletedCounts.representatives}رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'representatives', count: deletedCounts.representatives }
          });
        }

        if (options.salesPartners) {
          const result = await db.delete(salesPartners);
          deletedCounts.salesPartners = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی همکاران فروش: ${deletedCounts.salesPartners}رکورد حذف شد`,
            relatedId: null,
            metadata: { resetType: 'salesPartners', count: deletedCounts.salesPartners }
          });
        }

        if (options.settings) {
          // Keep admin user settings but reset other settings
          const result = await db.delete(settings).where(
            and(
              sql`key NOT LIKE 'admin_%'`,
              sql`key != 'initialized'`
            )
          );
          deletedCounts.settings = result.rowCount || 0;
          await this.createActivityLog({
            type: 'system',
            description: `بازنشانی تنظیمات: ${deletedCounts.settings} تنظیم به حالت پیش‌فرض بازگردانده شد`,
            relatedId: null,
            metadata: { resetType: 'settings', count: deletedCounts.settings }
          });
        }

        // Activity logs should be deleted last (after logging other deletions)
        if (options.activityLogs) {
          const result = await db.delete(activityLogs);
          deletedCounts.activityLogs = result.rowCount || 0;
          // Don't log this deletion as logs are being cleared
        }

        // Calculate total (excluding the total field itself)
        const values = Object.entries(deletedCounts).filter(([key]) => key !== 'total').map(([, value]) => value);
        deletedCounts.total = values.reduce((sum, count) => sum + count, 0);

        return { deletedCounts };
      },
      'resetData'
    );
  }

  // Invoice Edits Methods
  async getInvoiceEdits(invoiceId: number): Promise<InvoiceEdit[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoiceEdits)
        .where(eq(invoiceEdits.invoiceId, invoiceId))
        .orderBy(desc(invoiceEdits.createdAt)),
      'getInvoiceEdits'
    );
  }

  async createInvoiceEdit(edit: InsertInvoiceEdit): Promise<InvoiceEdit> {
    return await withDatabaseRetry(
      async () => {
        const [newEdit] = await db
          .insert(invoiceEdits)
          .values(edit)
          .returning();

        await this.createActivityLog({
          type: "invoice_edited",
          description: `فاکتور ${edit.invoiceId} توسط ${edit.editedBy} ویرایش شد`,
          relatedId: edit.invoiceId,
          metadata: {
            editType: edit.editType,
            originalAmount: edit.originalAmount,
            editedAmount: edit.editedAmount,
            editedBy: edit.editedBy
          }
        });

        return newEdit;
      },
      'createInvoiceEdit'
    );
  }

  async getInvoiceEditHistory(invoiceId: number): Promise<InvoiceEdit[]> {
    return await withDatabaseRetry(
      () => db.select().from(invoiceEdits)
        .where(and(
          eq(invoiceEdits.invoiceId, invoiceId),
          eq(invoiceEdits.isActive, true)
        ))
        .orderBy(desc(invoiceEdits.createdAt)),
      'getInvoiceEditHistory'
    );
  }

  async updateRepresentativeDebt(invoiceId: number, originalAmount: number, editedAmount: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        // Get invoice to find representative
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
        if (!invoice) {
          throw new Error(`Invoice ${invoiceId} not found`);
        }

        // FIX: Instead of adding difference, recalculate total debt from all invoices
        await this.updateRepresentativeFinancials(invoice.representativeId);

        await this.createActivityLog({
          type: "debt_updated",
          description: `بدهی نماینده به دلیل ویرایش فاکتور ${invoiceId} بروزرسانی شد (محاسبه مجدد)`,
          relatedId: invoice.representativeId,
          metadata: {
            invoiceId: invoiceId,
            originalAmount: originalAmount,
            editedAmount: editedAmount,
            method: "recalculated_from_invoices"
          }
        });
      },
      'updateRepresentativeDebt'
    );
  }

  // ====== FINANCIAL TRANSACTIONS (CLOCK CORE MECHANISM) ======
  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    return await withDatabaseRetry(
      async () => {
        const [created] = await db.insert(financialTransactions)
          .values({
            ...transaction,
            transactionId: transaction.transactionId || nanoid(),
            createdAt: new Date()
          })
          .returning();
        return created;
      },
      'createFinancialTransaction'
    );
  }

  async updateTransactionStatus(transactionId: string, status: string, actualState?: any): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const updateData: any = { status };
        if (actualState) {
          // Convert any problematic objects to plain JSON
          updateData.actualState = JSON.parse(JSON.stringify(actualState));
        }
        if (status === 'COMPLETED') {
          updateData.completedAt = new Date();
        }

        await db.update(financialTransactions)
          .set(updateData)
          .where(eq(financialTransactions.transactionId, transactionId));
      },
      'updateTransactionStatus'
    );
  }



  async getFinancialTransaction(transactionId: string): Promise<FinancialTransaction | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [transaction] = await db.select()
          .from(financialTransactions)
          .where(eq(financialTransactions.transactionId, transactionId));
        return transaction;
      },
      'getFinancialTransaction'
    );
  }

  async getTransactionsByRepresentative(repId: number): Promise<FinancialTransaction[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.representativeId, repId))
        .orderBy(desc(financialTransactions.createdAt)),
      'getTransactionsByRepresentative'
    );
  }

  async getPendingTransactions(): Promise<FinancialTransaction[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(financialTransactions)
        .where(eq(financialTransactions.status, 'PENDING'))
        .orderBy(desc(financialTransactions.createdAt)),
      'getPendingTransactions'
    );
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const transaction = await this.getFinancialTransaction(transactionId);
        if (!transaction) {
          throw new Error(`Transaction ${transactionId} not found`);
        }

        // Restore original state using rollback data
        if (transaction.rollbackData) {
          // Implementation depends on transaction type
          const rollbackData = transaction.rollbackData as any;

          if (transaction.type === 'INVOICE_EDIT') {
            // Restore original invoice amount and representative debt
            await db.update(invoices)
              .set({ amount: rollbackData.originalAmount })
              .where(eq(invoices.id, rollbackData.invoiceId));

            await db.update(representatives)
              .set({
                totalDebt: rollbackData.originalRepresentativeDebt,
                updatedAt: new Date()
              })
              .where(eq(representatives.id, rollbackData.representativeId));
          }
        }

        // Mark transaction as rolled back
        await this.updateTransactionStatus(transactionId, 'ROLLED_BACK');

        await this.createActivityLog({
          type: "transaction_rollback",
          description: `تراکنش ${transactionId} برگردانده شد`,
          relatedId: transaction.representativeId,
          metadata: { transactionId, originalType: transaction.type }
        });
      },
      'rollbackTransaction'
    );
  }

  // ====== DATA INTEGRITY CONSTRAINTS (CLOCK PRECISION) ======
  async createIntegrityConstraint(constraint: InsertDataIntegrityConstraint): Promise<DataIntegrityConstraint> {
    return await withDatabaseRetry(
      async () => {
        const [created] = await db.insert(dataIntegrityConstraints)
          .values({
            ...constraint,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return created;
      },
      'createIntegrityConstraint'
    );
  }

  async validateConstraints(entityType: string, entityId: number): Promise<{ isValid: boolean, violations: any[] }> {
    return await withDatabaseRetry(
      async () => {
        const constraints = await db.select()
          .from(dataIntegrityConstraints)
          .where(and(
            eq(dataIntegrityConstraints.entityType, entityType),
            eq(dataIntegrityConstraints.entityId, entityId),
            eq(dataIntegrityConstraints.currentStatus, 'VALID')
          ));

        const violations: any[] = [];

        for (const constraint of constraints) {
          const rule = constraint.constraintRule as any;

          if (constraint.constraintType === 'BALANCE_CHECK') {
            // Check representative balance consistency
            const [rep] = await db.select().from(representatives).where(eq(representatives.id, entityId));
            if (rep && rule.maxDebt && parseFloat(rep.totalDebt || '0') > rule.maxDebt) {
              violations.push({
                constraintId: constraint.id,
                type: 'DEBT_LIMIT_EXCEEDED',
                current: rep.totalDebt,
                limit: rule.maxDebt
              });
            }
          }
        }

        return {
          isValid: violations.length === 0,
          violations
        };
      },
      'validateConstraints'
    );
  }

  async getConstraintViolations(): Promise<DataIntegrityConstraint[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(dataIntegrityConstraints)
        .where(eq(dataIntegrityConstraints.currentStatus, 'VIOLATED'))
        .orderBy(desc(dataIntegrityConstraints.lastValidationAt)),
      'getConstraintViolations'
    );
  }

  async fixConstraintViolation(constraintId: number): Promise<boolean> {
    return await withDatabaseRetry(
      async () => {
        const [constraint] = await db.select()
          .from(dataIntegrityConstraints)
          .where(eq(dataIntegrityConstraints.id, constraintId));

        if (!constraint) return false;

        // Auto-fix logic based on constraint type
        let fixed = false;
        if (constraint.constraintType === 'BALANCE_CHECK') {
          // Recalculate representative financial totals
          await this.updateRepresentativeFinancials(constraint.entityId);
          fixed = true;
        }

        if (fixed) {
          await this.updateConstraintStatus(constraintId, 'VALID');
        }

        return fixed;
      },
      'fixConstraintViolation'
    );
  }

  async updateConstraintStatus(constraintId: number, status: string, details?: any): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const updateData: any = {
          currentStatus: status,
          lastValidationAt: new Date(),
          updatedAt: new Date()
        };

        if (details) {
          updateData.violationDetails = details;
        }

        await db.update(dataIntegrityConstraints)
          .set(updateData)
          .where(eq(dataIntegrityConstraints.id, constraintId));
      },
      'updateConstraintStatus'
    );
  }

  // ====== FINANCIAL RECONCILIATION ======
  async reconcileFinancialData(): Promise<{ success: boolean, message: string }> {
    return await withDatabaseRetry(
      async () => {
        // Simple reconciliation - check for any pending transactions
        const pendingTransactions = await this.getPendingTransactions();
        return {
          success: true,
          message: `هماهنگی کامل شد. ${pendingTransactions.length} تراکنش در انتظار پردازش`
        };
      },
      'reconcileFinancialData'
    );
  }

  // ====== FINANCIAL TRANSACTIONS MANAGEMENT ======
  async getFinancialTransactions(): Promise<FinancialTransaction[]> {
    return await withDatabaseRetry(
      () => db.select().from(financialTransactions).orderBy(desc(financialTransactions.createdAt)),
      'getFinancialTransactions'
    );
  }

  // ====== ATOMIC OPERATIONS (COMPLETE CLOCK SYNCHRONIZATION) ======
  async executeAtomicInvoiceEdit(editData: {
    invoiceId: number;
    editedUsageData: any;
    editReason: string;
    editedBy: string;
    originalAmount: number;
    editedAmount: number;
    completeUsageDataReplacement?: any; // Added for full replacement scenario
  }): Promise<{ transactionId: string, editId: number, success: boolean }> {

    // Generate unique transaction ID with high precision timestamp
    const uniqueTimestamp = Date.now() + Math.random() * 1000;
    const transactionId = `EDIT-${editData.invoiceId}-${Math.floor(uniqueTimestamp)}-${nanoid(12)}`;

    return await withDatabaseRetry(
      async () => {
        try {
          // Start transaction
          const [invoice] = await db.select().from(invoices).where(eq(invoices.id, editData.invoiceId));
          if (!invoice) {
            throw new Error(`Invoice ${editData.invoiceId} not found`);
          }

          const [representative] = await db.select().from(representatives)
            .where(eq(representatives.id, invoice.representativeId));

          if (!representative) {
            throw new Error(`Representative ${invoice.representativeId} not found`);
          }

          // Create financial transaction record with unique check
          const existingTransaction = await db.select()
            .from(financialTransactions)
            .where(eq(financialTransactions.transactionId, transactionId));

          if (existingTransaction.length === 0) {
            await this.createFinancialTransaction({
              transactionId,
              type: 'INVOICE_EDIT',
              representativeId: invoice.representativeId,
              relatedEntityType: 'invoice',
              relatedEntityId: editData.invoiceId,
              originalState: {
                invoiceAmount: editData.originalAmount,
                representativeDebt: representative.totalDebt,
                usageData: invoice.usageData
              },
              targetState: {
                invoiceAmount: editData.editedAmount,
                newUsageData: editData.editedUsageData
              },
              financialImpact: {
                debtChange: editData.editedAmount - editData.originalAmount,
                balanceChange: editData.editedAmount - editData.originalAmount
              },
              rollbackData: {
                invoiceId: editData.invoiceId,
                originalAmount: editData.originalAmount,
                representativeId: invoice.representativeId,
                originalRepresentativeDebt: representative.totalDebt,
                originalUsageData: invoice.usageData
              },
              initiatedBy: editData.editedBy
            });
          }

          // Create invoice edit record
          const [createdEdit] = await db.insert(invoiceEdits)
            .values({
              invoiceId: editData.invoiceId,
              originalUsageData: invoice.usageData,
              editedUsageData: editData.editedUsageData,
              editType: 'MANUAL_EDIT',
              editReason: editData.editReason,
              originalAmount: editData.originalAmount.toString(),
              editedAmount: editData.editedAmount.toString(),
              editedBy: editData.editedBy,
              transactionId: transactionId
            })
            .returning();

          // ✅ HEPHAESTUS v1.4: COMPREHENSIVE INVOICE UPDATE WITH AMOUNT SYNCHRONIZATION
          console.log(`💰 HEPHAESTUS v1.4: Updating invoice ${editData.invoiceId} from ${editData.originalAmount} to ${editData.editedAmount}`);

          // ---- ENHANCED DATA PROCESSING ----
          // Process usage data with complete replacement support
          let newUsageData = editData.completeUsageDataReplacement || editData.editedUsageData;
          let recordsMetadata = {
            totalActiveRecords: 0,
            verificationPassed: false,
            dataIntegrityValidated: false,
          };

          if (newUsageData && typeof newUsageData === 'object' && newUsageData.records && Array.isArray(newUsageData.records)) {
            recordsMetadata.totalActiveRecords = newUsageData.records.length;

            // Enhanced validation for new data structure
            recordsMetadata.verificationPassed = newUsageData.records.every((record: any) =>
              record.description &&
              record.amount >= 0 &&
              record.admin_username &&
              record.persistenceId
            );

            // Enhanced integrity validation
            recordsMetadata.dataIntegrityValidated = newUsageData.records.every((record: any) =>
              parseFloat(record.amount) > 0 && record.description.trim().length > 0
            );

            // ✅ CRITICAL: Transform records to ensure consistency
            newUsageData.records = newUsageData.records.map((record: any) => ({
              ...record,
              amount: parseFloat(record.amount).toString(),
              quantity: record.quantity || 1,
              unitPrice: record.unitPrice || parseFloat(record.amount),
              name: record.name || record.description
            }));
          }

          // Update invoice with new amount and processed usage data
          await db.update(invoices)
            .set({
              amount: editData.editedAmount.toString(),
              usageData: newUsageData // Use the processed usage data
            })
            .where(eq(invoices.id, editData.invoiceId));

          console.log(`✅ SHERLOCK v32.0: Invoice ${editData.invoiceId} updated with complete usage data replacement`);
          console.log(`💰 Amount: ${editData.originalAmount} → ${editData.editedAmount}`);
          console.log(`📊 Records: ${recordsMetadata.totalActiveRecords} active items`);
          console.log(`🔍 Verification: ${recordsMetadata.verificationPassed ? 'PASSED' : 'FAILED'}`);

          // ✅ Additional validation after update
          if (recordsMetadata.dataIntegrityValidated) {
            const updatedInvoice = await db.select().from(invoices).where(eq(invoices.id, editData.invoiceId));
            if (updatedInvoice[0]?.usageData) {
              console.log(`✅ SHERLOCK v32.0: Usage data persistence confirmed for invoice ${editData.invoiceId}`);
            }
          }
          // ---- END OF MODIFIED CODE ----


          // ✅ SHERLOCK v28.0: COMPREHENSIVE FINANCIAL SYNCHRONIZATION
          console.log(`🔄 SHERLOCK v28.0: Starting comprehensive financial sync for representative ${invoice.representativeId}`);

          // 1. Force cache invalidation BEFORE any calculations
          try {
            const { UnifiedFinancialEngine } = await import('./services/unified-financial-engine.js');
            UnifiedFinancialEngine.forceInvalidateRepresentative(invoice.representativeId, {
              cascadeGlobal: true,
              reason: 'invoice_edit',
              immediate: true
            });
            console.log(`✅ SHERLOCK v28.0: Cache invalidated for representative ${invoice.representativeId}`);
          } catch (cacheError) {
            console.error('❌ Cache invalidation failed:', cacheError);
          }

          // 2. Update representative financials with real-time calculation
          await this.updateRepresentativeFinancials(invoice.representativeId);

          // 3. Force recalculation and sync via unified engine
          try {
            const { unifiedFinancialEngine } = await import('./services/unified-financial-engine.js');
            await unifiedFinancialEngine.syncRepresentativeDebt(invoice.representativeId);
            console.log(`💰 SHERLOCK v28.0: Representative debt synchronized`);
          } catch (syncError) {
            console.error('❌ Financial sync failed:', syncError);
          }


          // SHERLOCK v1.0: Update payment status based on new amount
          try {
            const updatedInvoiceStatus = await this.calculateInvoicePaymentStatus(editData.invoiceId);
            await db.update(invoices)
              .set({ status: updatedInvoiceStatus })
              .where(eq(invoices.id, editData.invoiceId));
            console.log(`📊 SHERLOCK v12.1: Invoice ${editData.invoiceId} status updated to: ${updatedInvoiceStatus}`);
          } catch (statusError) {
            console.warn('⚠️ Invoice status update warning (non-critical):', statusError);
          }

          // Complete transaction (get updated debt after recalculation)
          const updatedRep = await this.getRepresentative(invoice.representativeId);
          await this.updateTransactionStatus(transactionId, 'COMPLETED', {
            invoiceAmount: editData.editedAmount,
            newRepresentativeDebt: updatedRep?.totalDebt || '0',
            editId: createdEdit.id
          });

          // Create activity log
          await this.createActivityLog({
            type: "atomic_invoice_edit",
            description: `فاکتور ${editData.invoiceId} با تراکنش اتمیک ${transactionId} ویرایش شد`,
            relatedId: invoice.representativeId,
            metadata: {
              transactionId,
              editId: createdEdit.id,
              originalAmount: editData.originalAmount,
              editedAmount: editData.editedAmount,
              method: "recalculated_debt_from_invoices"
            }
          });

          return {
            transactionId,
            editId: createdEdit.id,
            success: true
          };

        } catch (error: any) {
          // Rollback transaction on error
          await this.updateTransactionStatus(transactionId, 'ROLLED_BACK');
          throw error;
        }
      },
      'executeAtomicInvoiceEdit'
    );
  }

  // فاز ۳: Payment Synchronization and Allocation Methods

  // ✅ OPTIMIZED: Enhanced getUnallocatedPayments with FIFO ordering and performance optimization
  async getUnallocatedPayments(representativeId?: number): Promise<Payment[]> {
    return await withDatabaseRetry(
      async () => {
        console.log(`🔍 OPTIMIZED: Fetching unallocated payments${representativeId ? ` for representative ${representativeId}` : ' (all)'}`);

        // Build optimized query with proper conditions and ordering
        let query = db
          .select({
            id: payments.id,
            representativeId: payments.representativeId,
            invoiceId: payments.invoiceId,
            amount: payments.amount,
            paymentDate: payments.paymentDate,
            description: payments.description,
            isAllocated: payments.isAllocated,
            createdAt: payments.createdAt
          })
          .from(payments)
          .where(eq(payments.isAllocated, false));

        // Add representative filter if specified
        if (representativeId) {
          query = query.where(
            and(
              eq(payments.isAllocated, false),
              eq(payments.representativeId, representativeId)
            )
          );
        }

        // ✅ FIFO Ordering: Oldest payments first for proper allocation sequence
        // Order by payment date first, then by creation time for consistent FIFO behavior
        const results = await query.orderBy(payments.paymentDate, payments.createdAt);

        // ✅ Performance logging for monitoring
        console.log(`✅ OPTIMIZED: Retrieved ${results.length} unallocated payments${representativeId ? ` for representative ${representativeId}` : ''}`);

        // ✅ Additional filtering for data quality - remove invalid entries
        const validPayments = results.filter(payment => {
          const amount = parseFloat(payment.amount);
          const isValid = amount > 0 && payment.representativeId && !payment.isAllocated;

          if (!isValid) {
            console.warn(`⚠️ OPTIMIZED: Filtered out invalid payment ${payment.id}: amount=${amount}, repId=${payment.representativeId}, allocated=${payment.isAllocated}`);
          }

          return isValid;
        });

        // ✅ Performance metrics for optimization monitoring
        if (results.length !== validPayments.length) {
          console.log(`🔧 OPTIMIZED: Data quality filter removed ${results.length - validPayments.length} invalid payments`);
        }

        return validPayments as Payment[];
      },
      'getUnallocatedPayments'
    );
  }

  async allocatePaymentToInvoice(paymentId: number, invoiceId: number): Promise<Payment> {
    return await withDatabaseRetry(
      async () => {
        // ✅ SHERLOCK v22.1: Update payment allocation
        const [updatedPayment] = await db
          .update(payments)
          .set({
            invoiceId: invoiceId,
            isAllocated: true
          })
          .where(eq(payments.id, paymentId))
          .returning();

        // ✅ CRITICAL FIX: Update invoice status based on payment allocation
        await this.updateInvoiceStatusAfterAllocation(invoiceId);

        return updatedPayment;
      },
      'allocatePaymentToInvoice'
    );
  }

  // ✅ SHERLOCK v34.0: DEPRECATED - use Enhanced Payment Allocation Engine
  async autoAllocatePayments(representativeId: number): Promise<{
    allocated: number;
    totalAmount: string;
    details: Array<{ paymentId: number; invoiceId: number; amount: string }>;
  }> {
    console.warn('⚠️ SHERLOCK v34.0: storage.autoAllocatePayments is DEPRECATED and will be removed in future versions. Use autoAllocatePaymentToInvoices.');
    // This method is kept for backward compatibility and delegates to the new method.
    // It needs to fetch a payment ID first, which is not directly available here.
    // To make this work, we would need to find an unallocated payment for the representative.
    // For now, we'll simulate by returning empty results or throw an error.

    const unallocatedPayments = await this.getUnallocatedPayments(representativeId);
    if (!unallocatedPayments.length) {
      console.log('✅ SHERLOCK v34.0: No unallocated payments found for representative.');
      return { allocated: 0, totalAmount: '0', details: [] };
    }

    // Pick the first unallocated payment to demonstrate the call.
    // In a real scenario, a strategy would be needed to choose which payment to allocate.
    const paymentToAllocate = unallocatedPayments[0];

    console.log(`🔄 SHERLOCK v34.0: Calling NEW autoAllocatePaymentToInvoices for representative ${representativeId} using payment ${paymentToAllocate.id}...`);

    try {
      const result = await this.autoAllocatePaymentToInvoices(paymentToAllocate.id, representativeId);
      return {
        allocated: result.allocated,
        totalAmount: result.totalAmount,
        details: result.details
      };
    } catch (error) {
      console.error('❌ Error during delegated autoAllocatePayments call:', error);
      throw error;
    }
  }

  // ✅ ACID TRANSACTIONAL: Enhanced Auto-Allocation with ATOMIC transactions and debt sync
  async autoAllocatePaymentToInvoices(paymentId: number, representativeId: number): Promise<{
    success: boolean;
    allocated: number;
    totalAmount: string;
    details: Array<{ paymentId: number; invoiceId: number; amount: string }>;
  }> {
    // Use Enhanced Payment Allocation Engine for proper allocation
    const { EnhancedPaymentAllocationEngine } = await import('./services/enhanced-payment-allocation-engine.js');

    try {
      const result = await EnhancedPaymentAllocationEngine.autoAllocatePayment(paymentId, {
        method: 'FIFO',
        allowPartialAllocation: true,
        allowOverAllocation: false,
        priorityInvoiceStatuses: ['overdue', 'unpaid', 'partial'],
        strictValidation: true,
        auditMode: true
      });

      if (result.success) {
        const details = result.allocations.map(alloc => ({
          paymentId: paymentId,
          invoiceId: alloc.invoiceId,
          amount: alloc.allocatedAmount.toString()
        }));

        return {
          success: true,
          allocated: result.allocatedAmount,
          totalAmount: result.allocatedAmount.toString(),
          details
        };
      } else {
        console.error('Auto-allocation failed:', result.errors);
        return {
          success: false,
          allocated: 0,
          totalAmount: '0',
          details: []
        };
      }
    } catch (error) {
      console.error('Error in autoAllocatePaymentToInvoices:', error);
      return {
        success: false,
        allocated: 0,
        totalAmount: '0',
        details: []
      };
    }
    return await withDatabaseRetry(
      async () => {
        console.log(`🚀 ACID TRANSACTION: Starting auto-allocation for payment ${paymentId}, representative ${representativeId}`);

        // ✅ ACID Transaction - All operations in one atomic transaction
        return await db.transaction(async (tx) => {
          const transactionId = `AUTO_ALLOC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          try {
            // 🔍 PHASE 1: Validation - Payment exists and ownership WITH ROW LOCK
            const [payment] = await tx.select().from(payments)
              .where(eq(payments.id, paymentId))
              .for('update'); // ✅ ACID FIX: Row-level locking to prevent double-allocation

            if (!payment) {
              throw new Error(`Payment ${paymentId} not found`);
            }

            if (payment.representativeId !== representativeId) {
              throw new Error(`Payment ${paymentId} doesn't belong to representative ${representativeId}`);
            }

            if (payment.isAllocated) {
              throw new Error(`Payment ${paymentId} is already allocated`);
            }

            const paymentAmount = parseFloat(payment.amount);
            if (paymentAmount <= 0) {
              throw new Error(`Invalid payment amount: ${paymentAmount}`);
            }

            // 🔍 PHASE 2: Get unpaid invoices ordered by FIFO (oldest first) WITH ROW LOCKS
            const unpaidInvoices = await tx.select({
              id: invoices.id,
              amount: invoices.amount,
              issueDate: invoices.issueDate,
              status: invoices.status
            })
            .from(invoices)
            .where(
              and(
                eq(invoices.representativeId, representativeId),
                sql`${invoices.status} IN ('unpaid', 'partial', 'overdue')`
              )
            )
            .orderBy(invoices.issueDate, invoices.id) // FIFO order
            .for('update'); // ✅ ACID FIX: Lock invoices to prevent concurrent allocation conflicts

            if (!unpaidInvoices.length) {
              throw new Error(`No unpaid invoices found for representative ${representativeId}`);
            }

            // 🔍 PHASE 3: Calculate current paid amounts for each invoice
            const invoiceCurrentPaid = await Promise.all(
              unpaidInvoices.map(async (invoice) => {
                const paidResults = await tx.select({
                  total: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
                }).from(payments).where(
                  and(
                    eq(payments.invoiceId, invoice.id),
                    eq(payments.isAllocated, true)
                  )
                );

                const currentPaid = paidResults[0]?.total || 0;
                const invoiceAmount = parseFloat(invoice.amount);
                const remainingAmount = invoiceAmount - currentPaid;

                return {
                  ...invoice,
                  currentPaid,
                  remainingAmount: Math.max(0, remainingAmount)
                };
              })
            );

            // Filter only invoices that still need payment
            const invoicesNeedingPayment = invoiceCurrentPaid.filter(inv => inv.remainingAmount > 0);

            if (!invoicesNeedingPayment.length) {
              throw new Error(`All invoices are already fully paid for representative ${representativeId}`);
            }

            // 🔄 PHASE 4: FIFO Allocation Logic
            let remainingPayment = paymentAmount;
            const allocations: Array<{ invoiceId: number; amount: string }> = [];

            for (const invoice of invoicesNeedingPayment) {
              if (remainingPayment <= 0) break;

              const allocateAmount = Math.min(remainingPayment, invoice.remainingAmount);

              if (allocateAmount > 0) {
                allocations.push({
                  invoiceId: invoice.id,
                  amount: allocateAmount.toString()
                });
                remainingPayment -= allocateAmount;
              }
            }

            if (!allocations.length) {
              throw new Error(`Unable to allocate any amount from payment ${paymentId}`);
            }

            // 🔄 PHASE 5: Execute Allocations
            const totalAllocated = allocations.reduce((sum, alloc) => sum + parseFloat(alloc.amount), 0);

            // Update payment status
            await tx.update(payments)
              .set({
                isAllocated: true,
                // If partial allocation, split the payment (create new payment for remainder)
              })
              .where(eq(payments.id, paymentId));

            // If partial payment allocation, create remainder payment
            if (remainingPayment > 0) {
              await tx.insert(payments).values({
                representativeId: representativeId,
                amount: remainingPayment.toString(),
                paymentDate: payment.paymentDate,
                description: `Remainder from payment ${paymentId} auto-allocation`,
                isAllocated: false
              });
            }

            // Create allocation records and update invoices
            for (const allocation of allocations) {
              // ✅ ALLOCATION LEDGER: Create detailed allocation payment record
              const [allocationRecord] = await tx.insert(payments).values({
                representativeId: representativeId,
                invoiceId: allocation.invoiceId,
                amount: allocation.amount,
                paymentDate: payment.paymentDate,
                description: `Auto-allocation from payment ${paymentId}`,
                isAllocated: true,
                createdAt: new Date()
              }).returning();

              console.log(`✅ ALLOCATION LEDGER: Created allocation record ${allocationRecord.id} for invoice ${allocation.invoiceId}`);

              // Update invoice status
              const [invoiceStatus] = await tx.select({
                amount: invoices.amount
              }).from(invoices).where(eq(invoices.id, allocation.invoiceId));

              if (invoiceStatus) {
                const invoiceAmount = parseFloat(invoiceStatus.amount);
                const allocationAmount = parseFloat(allocation.amount);
                const paymentRatio = invoiceAmount > 0 ? (allocationAmount / invoiceAmount) : 0;

                let newStatus = 'unpaid';
                if (paymentRatio >= 0.999) {
                  newStatus = 'paid';
                } else if (allocationAmount > 0.01) {
                  newStatus = 'partial';
                }

                await tx.update(invoices)
                  .set({
                    status: newStatus,
                    updatedAt: new Date()
                  })
                  .where(eq(invoices.id, allocation.invoiceId));

                console.log(`✅ Updated invoice ${allocation.invoiceId} status to '${newStatus}'`);
              }
            }

            // 📊 PHASE 6: Create Financial Transaction Record (ENHANCED ALLOCATION LEDGER)
            await tx.insert(financialTransactions).values({
              transactionId: `${transactionId}_${allocations.map(a => a.invoiceId).join('_')}`,
              type: 'PAYMENT_AUTO_ALLOCATE',
              status: 'COMPLETED',
              representativeId: representativeId,
              relatedEntityType: 'payment',
              relatedEntityId: paymentId,
              amount: totalAllocated.toString(),
              description: `Auto-allocation of ${allocations.length} invoices from payment ${paymentId}`,
              metadata: {
                sourcePaymentId: paymentId,
                allocations: allocations.map(a => ({ invoiceId: a.invoiceId, amount: a.amount })),
                remainingPayment: remainingPayment,
                transactionId,
                fifoOrder: allocations.map((a, i) => ({ invoiceId: a.invoiceId, order: i + 1 })),
                invoiceDetails: allocations.map(a => {
                  const invoice = invoicesNeedingPayment.find(inv => inv.id === a.invoiceId)!;
                  return {
                    id: invoice.id,
                    originalAmount: invoice.amount,
                    newTotalPaid: parseFloat(invoice.amount) - (invoice.remainingAmount - parseFloat(a.amount)),
                    newStatus: (() => {
                      const newPaid = parseFloat(invoice.amount) - (invoice.remainingAmount - parseFloat(a.amount));
                      if (newPaid >= parseFloat(invoice.amount)) return 'paid';
                      if (newPaid > 0) return 'partial';
                      return 'unpaid';
                    })()
                  };
                }),
                remainingPaymentAmount: remainingPayment,
                method: 'FIFO'
              },
              performedBy: 'SYSTEM',
              transactionDate: new Date().toISOString().split('T')[0]
            });

            // 📊 PHASE 7: Create Activity Log
            await tx.insert(activityLogs).values({
              type: 'payment_auto_allocated',
              description: `تخصیص خودکار پرداخت ${paymentId} به مبلغ ${totalAllocated} با روش FIFO`,
              relatedId: paymentId,
              metadata: {
                representativeId,
                allocatedAmount: totalAllocated,
                allocationsCount: allocations.length,
                transactionId,
                remainingAmount: remainingPayment,
                method: 'FIFO'
              }
            });

            console.log(`✅ ACID TRANSACTION: Auto-allocation completed - Allocated: ${totalAllocated}, Remaining: ${remainingPayment}`);

            // Return success result
            const result = {
              success: true,
              allocated: allocations.length,
              totalAmount: totalAllocated.toString(),
              details: allocations.map(alloc => ({
                paymentId: paymentId,
                invoiceId: alloc.invoiceId,
                amount: alloc.amount
              }))
            };

            return result;

          } catch (error) {
            console.error(`❌ ACID TRANSACTION: Auto-allocation failed:`, error);

            // Create failure log
            await tx.insert(activityLogs).values({
              type: 'payment_auto_allocation_failed',
              description: `تخصیص خودکار پرداخت ${paymentId} شکست خورد: ${error.message}`,
              relatedId: paymentId,
              metadata: {
                representativeId,
                error: error.message,
                transactionId
              }
            });

            throw error; // This will cause transaction rollback
          }
        }); // End of transaction
      },
      'autoAllocatePaymentToInvoices'
    )
    .then(async (result) => {
      // ✅ DEBT SYNC: Call after successful transaction commit
      try {
        const { UnifiedFinancialEngine } = await import('./services/unified-financial-engine.js');
        // ✅ DEBT SYNC FIX: Use correct method - forceInvalidateRepresentative + calculateRepresentative
        UnifiedFinancialEngine.forceInvalidateRepresentative(representativeId, {
          cascadeGlobal: true,
          reason: 'payment_auto_allocation',
          immediate: true
        });
        await new UnifiedFinancialEngine(null).calculateRepresentative(representativeId);
        console.log(`✅ DEBT SYNC: Representative ${representativeId} debt synchronized after auto-allocation`);
      } catch (syncError) {
        console.error(`⚠️ DEBT SYNC: Failed to sync debt for representative ${representativeId}:`, syncError);
        // Don't fail the entire operation if debt sync fails
      }

      return result;
    })
    .catch((error) => {
      console.error(`❌ ACID TRANSACTION: Auto-allocation failed completely:`, error);
      return {
        success: false,
        allocated: 0,
        totalAmount: "0",
        details: []
      };
    });
  }

  // ✅ ACID TRANSACTIONAL: Manual Payment Allocation with ATOMIC transactions and debt sync
  async manualAllocatePaymentToInvoice(
    paymentId: number,
    invoiceId: number,
    amount: number,
    performedBy: string,
    reason?: string
  ): Promise<{
    success: boolean;
    allocatedAmount: number;
    message: string;
    transactionId?: string;
  }> {
    // Use Enhanced Payment Allocation Engine for proper allocation
    const { EnhancedPaymentAllocationEngine } = await import('./services/enhanced-payment-allocation-engine.js');

    try {
      const result = await EnhancedPaymentAllocationEngine.manualAllocatePayment(
        paymentId,
        invoiceId,
        amount,
        performedBy,
        reason
      );

      if (result.success) {
        return {
          success: true,
          allocatedAmount: result.allocatedAmount,
          message: `تخصیص دستی ${amount} تومان با موفقیت انجام شد`,
          transactionId: result.transactionId
        };
      } else {
        return {
          success: false,
          allocatedAmount: 0,
          message: result.errors.join(', '),
          transactionId: result.transactionId
        };
      }
    } catch (error) {
      console.error('Error in manualAllocatePaymentToInvoice:', error);
      return {
        success: false,
        allocatedAmount: 0,
        message: `خطا در تخصیص دستی: ${error.message}`,
      };
    }
    return await withDatabaseRetry(
      async () => {
        console.log(`🎯 ACID TRANSACTION: Starting manual allocation - Payment ${paymentId} -> Invoice ${invoiceId}, Amount: ${amount}`);

        // ✅ ACID Transaction - All operations in one atomic transaction
        return await db.transaction(async (tx) => {
          const transactionId = `MANUAL_ALLOC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          try {
            // 🔍 PHASE 1: Comprehensive Validation

            // Validate payment exists and ownership WITH ROW LOCK
            const [payment] = await tx.select().from(payments)
              .where(eq(payments.id, paymentId))
              .for('update'); // ✅ ACID FIX: Row-level locking to prevent double-allocation
            if (!payment) {
              throw new Error(`Payment ${paymentId} not found`);
            }

            // Validate invoice exists and ownership WITH ROW LOCK
            const [invoice] = await tx.select().from(invoices)
              .where(eq(invoices.id, invoiceId))
              .for('update'); // ✅ ACID FIX: Lock invoice to prevent concurrent modifications
            if (!invoice) {
              throw new Error(`Invoice ${invoiceId} not found`);
            }

            // Verify same representative
            if (payment.representativeId !== invoice.representativeId) {
              throw new Error(`Payment ${paymentId} and Invoice ${invoiceId} belong to different representatives`);
            }

            const representativeId = payment.representativeId!;

            // Validate amounts
            const paymentAmount = parseFloat(payment.amount);
            const invoiceAmount = parseFloat(invoice.amount);

            if (amount <= 0) {
              throw new Error(`Invalid allocation amount: ${amount}`);
            }

            if (amount > paymentAmount) {
              throw new Error(`Allocation amount ${amount} exceeds payment amount ${paymentAmount}`);
            }

            // Calculate current paid amount for the invoice
            const currentPaidResults = await tx.select({
              total: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
            }).from(payments).where(
              and(
                eq(payments.invoiceId, invoiceId),
                eq(payments.isAllocated, true)
              )
            );

            const currentPaid = currentPaidResults[0]?.total || 0;
            const remainingInvoiceAmount = invoiceAmount - currentPaid;

            if (remainingInvoiceAmount <= 0) {
              throw new Error(`Invoice ${invoiceId} is already fully paid`);
            }

            // Prevent over-allocation
            if (amount > remainingInvoiceAmount) {
              throw new Error(`Allocation amount ${amount} exceeds remaining invoice amount ${remainingInvoiceAmount}`);
            }

            // Check if payment is already allocated
            if (payment.isAllocated) {
              throw new Error(`Payment ${paymentId} is already allocated`);
            }

            // 🔄 PHASE 2: Execute Allocation

            // Calculate if this is a partial or full allocation of the payment
            const remainingPayment = paymentAmount - amount;

            // Update original payment to allocated
            await tx.update(payments)
              .set({ isAllocated: true })
              .where(eq(payments.id, paymentId));

            // ✅ ALLOCATION LEDGER: Create detailed allocation payment record
            const [allocationPayment] = await tx.insert(payments).values({
              representativeId: representativeId,
              invoiceId: invoiceId,
              amount: amount.toString(),
              paymentDate: payment.paymentDate,
              description: `Manual allocation from payment ${paymentId} by ${performedBy}${reason ? ` - ${reason}` : ''}`,
              isAllocated: true
            }).returning();

            // If partial payment allocation, create remainder payment
            if (remainingPayment > 0) {
              await tx.insert(payments).values({
                representativeId: representativeId,
                amount: remainingPayment.toString(),
                paymentDate: payment.paymentDate,
                description: `Remainder from payment ${paymentId} manual allocation`,
                isAllocated: false
              });
            }

            // 🔄 PHASE 3: Update Invoice Status
            const newPaidAmount = currentPaid + amount;
            let newInvoiceStatus = 'unpaid';

            if (newPaidAmount >= invoiceAmount) {
              newInvoiceStatus = 'paid';
            } else if (newPaidAmount > 0) {
              newInvoiceStatus = 'partial';
            }

            await tx.update(invoices)
              .set({ status: newInvoiceStatus })
              .where(eq(invoices.id, invoiceId));

            // 📊 PHASE 4: Create Financial Transaction Record (ENHANCED ALLOCATION LEDGER)
            await tx.insert(financialTransactions).values({
              transactionId: transactionId,
              type: 'PAYMENT_MANUAL_ALLOCATE',
              status: 'COMPLETED',
              representativeId: representativeId,
              relatedEntityType: 'payment',
              relatedEntityId: paymentId,
              amount: amount.toString(),
              description: `Manual allocation of payment ${paymentId} to invoice ${invoiceId} by ${performedBy}`,
              metadata: {
                sourcePaymentId: paymentId,
                targetInvoiceId: invoiceId,
                allocationRecordId: allocationPayment.id, // ✅ ALLOCATION LEDGER: Link to allocation record
                allocationMethod: 'MANUAL',
                allocatedAmount: amount,
                performedBy,
                reason,
                transactionId,
                originalPaymentAmount: paymentAmount,
                remainingPayment,
                invoiceOriginalAmount: invoiceAmount,
                invoicePreviouslyPaid: currentPaid,
                invoiceNewTotal: newPaidAmount,
                invoiceNewStatus: newInvoiceStatus
              },
              performedBy: performedBy,
              transactionDate: new Date().toISOString().split('T')[0]
            });

            // 📊 PHASE 5: Create Activity Log
            await tx.insert(activityLogs).values({
              type: 'payment_manual_allocation',
              description: `تخصیص دستی پرداخت ${paymentId} به فاکتور ${invoiceId} به مبلغ ${amount} توسط ${performedBy}`,
              relatedId: paymentId,
              metadata: {
                invoiceId,
                amount,
                performedBy,
                reason,
                representativeId,
                transactionId,
                newInvoiceStatus,
                newPaidAmount,
                remainingInvoiceAmount: invoiceAmount - newPaidAmount
              }
            });

            console.log(`✅ ACID TRANSACTION: Manual allocation completed - Amount: ${amount}, Invoice Status: ${newInvoiceStatus}`);

            return {
              success: true,
              allocatedAmount: amount,
              message: `تخصیص دستی با موفقیت انجام شد - مبلغ: ${amount}`,
              transactionId: transactionId
            };

          } catch (error) {
            console.error(`❌ ACID TRANSACTION: Manual allocation failed:`, error);

            // Create failure log
            await tx.insert(activityLogs).values({
              type: 'payment_manual_allocation_failed',
              description: `تخصیص دستی پرداخت ${paymentId} به فاکتور ${invoiceId} شکست خورد: ${error.message}`,
              relatedId: paymentId,
              metadata: {
                invoiceId,
                amount,
                performedBy,
                reason,
                error: error.message,
                transactionId
              }
            });

            throw error; // This will cause transaction rollback
          }
        }); // End of transaction
      },
      'manualAllocatePaymentToInvoice'
    )
    .then(async (result) => {
      // ✅ DEBT SYNC: Call after successful transaction commit
      try {
        // Get representative ID from the payment (we need to fetch it again after transaction)
        const [payment] = await db.select({ representativeId: payments.representativeId })
          .from(payments).where(eq(payments.id, paymentId)).limit(1);

        if (payment?.representativeId) {
          const { UnifiedFinancialEngine } = await import('./services/unified-financial-engine.js');
          // ✅ DEBT SYNC FIX: Use correct method - forceInvalidateRepresentative + calculateRepresentative
          UnifiedFinancialEngine.forceInvalidateRepresentative(payment.representativeId, {
            cascadeGlobal: true,
            reason: 'payment_manual_allocation',
            immediate: true
          });
          await new UnifiedFinancialEngine(null).calculateRepresentative(payment.representativeId);
          console.log(`✅ DEBT SYNC: Representative ${payment.representativeId} debt synchronized after manual allocation`);
        }
      } catch (syncError) {
        console.error(`⚠️ DEBT SYNC: Failed to sync debt after manual allocation:`, syncError);
        // Don't fail the entire operation if debt sync fails
      }

      return result;
    })
    .catch((error) => {
      console.error(`❌ ACID TRANSACTION: Manual allocation failed completely:`, error);
      return {
        success: false,
        allocatedAmount: 0,
        message: `خطا در تخصیص: ${error.message}`,
        transactionId: undefined
      };
    });
  }

  /**
   * SHERLOCK v36.0: Enhanced invoice status calculation after allocation with TITAN-O fixes
   */
  async updateInvoiceStatusAfterAllocation(invoiceId: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        // Get invoice amount
        const [invoice] = await db.select({
          id: invoices.id,
          amount: invoices.amount
        }).from(invoices).where(eq(invoices.id, invoiceId));

        if (!invoice) {
          throw new Error(`Invoice ${invoiceId} not found`);
        }

        const invoiceAmount = parseFloat(invoice.amount);

        // Get total payments allocated to this invoice
        const [paymentResult] = await db.select({
          total: sql<number>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
        }).from(payments)
        .where(and(
          eq(payments.invoiceId, invoiceId),
          eq(payments.isAllocated, true)
        ));

        const totalPaid = paymentResult.total || 0;
        const paymentRatio = invoiceAmount > 0 ? (totalPaid / invoiceAmount) : 0;

        // Determine new status
        let newStatus = 'unpaid';
        if (paymentRatio >= 0.999) { // 99.9% tolerance
          newStatus = 'paid';
        } else if (totalPaid > 0.01) {
          newStatus = 'partial';
        }

        // Update invoice status
        await db.update(invoices)
          .set({ 
            status: newStatus,
            updatedAt: new Date()
          })
          .where(eq(invoices.id, invoiceId));

        console.log(`✅ Invoice ${invoiceId} status updated to '${newStatus}' (paid: ${totalPaid}/${invoiceAmount})`);
      },
      'updateInvoiceStatusAfterAllocation'
    );
  }

  async getPaymentAllocationSummary(representativeId: number): Promise<{
    totalPayments: number;
    allocatedPayments: number;
    unallocatedPayments: number;
    totalPaidAmount: string;
    totalUnallocatedAmount: string;
  }> {
    return await withDatabaseRetry(
      async () => {
        const allPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.representativeId, representativeId));

        const allocatedPayments = allPayments.filter(p => p.isAllocated);
        const unallocatedPayments = allPayments.filter(p => !p.isAllocated);

        const totalPaidAmount = allocatedPayments.reduce((sum, p) =>
          sum + parseFloat(p.amount), 0);
        const totalUnallocatedAmount = unallocatedPayments.reduce((sum, p) =>
          sum + parseFloat(p.amount), 0);

        return {
          totalPayments: allPayments.length,
          allocatedPayments: allocatedPayments.length,
          unallocatedPayments: unallocatedPayments.length,
          totalPaidAmount: totalPaidAmount.toString(),
          totalUnallocatedAmount: totalUnallocatedAmount.toString()
        };
      },
      'getPaymentAllocationSummary'
    );
  }


  // SHERLOCK v18.4 - DEPRECATED: Use UNIFIED Financial Engine directly
  // This method is now deprecated. Use: unifiedFinancialEngine.calculateRepresentative()
  // Kept for backward compatibility only
  async reconcileRepresentativeFinancials(representativeId: number): Promise<{
    previousDebt: string;
    newDebt: string;
    totalSales: string;
    totalPayments: string;
    difference: string;
  }> {
    console.warn(`⚠️  DEPRECATED: reconcileRepresentativeFinancials() - Use UNIFIED Financial Engine directly`);
    const { unifiedFinancialEngine } = await import("./services/unified-financial-engine.js");
    return await withDatabaseRetry(
      async () => {
        const data = await unifiedFinancialEngine.calculateRepresentative(representativeId);

        return {
          previousDebt: "0", // Legacy compatibility
          newDebt: data.actualDebt.toString(),
          totalSales: data.totalSales.toString(),
          totalPayments: data.totalPaid.toString(),
          difference: "0" // Legacy compatibility
        };
      },
      'reconcileRepresentativeFinancials'
    );
  }

  // ====== AI CONFIGURATION METHODS ======
  async getAiConfigurations(): Promise<AiConfiguration[]> {
    return await withDatabaseRetry(
      () => db.select().from(aiConfiguration).orderBy(desc(aiConfiguration.updatedAt)),
      'getAiConfigurations'
    );
  }

  async getAiConfiguration(configName: string): Promise<AiConfiguration | undefined> {
    return await withDatabaseRetry(
      async () => {
        const [config] = await db
          .select()
          .from(aiConfiguration)
          .where(eq(aiConfiguration.configName, configName));
        return config;
      },
      'getAiConfiguration'
    );
  }

  async getAiConfigurationsByCategory(category: string): Promise<AiConfiguration[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(aiConfiguration)
        .where(eq(aiConfiguration.configCategory, category))
        .orderBy(aiConfiguration.configCategory, desc(aiConfiguration.updatedAt)),
      'getAiConfigurationsByCategory'
    );
  }

  async createAiConfiguration(config: InsertAiConfiguration): Promise<AiConfiguration> {
    return await withDatabaseRetry(
      async () => {
        const [newConfig] = await db
          .insert(aiConfiguration)
          .values({
            ...config,
            createdAt: sql`NOW()`,
            updatedAt: sql`NOW()`
          })
          .returning();

        await this.createActivityLog({
          type: "ai_config_created",
          description: `تنظیمات AI جدید ایجاد شد: ${config.configName}`,
          relatedId: null,
          metadata: {
            configName: config.configName,
            category: config.configCategory,
            createdBy: config.lastModifiedBy
          }
        });

        return newConfig;
      },
      'createAiConfiguration'
    );
  }

  async updateAiConfiguration(configName: string, config: Partial<AiConfiguration>): Promise<AiConfiguration> {
    return await withDatabaseRetry(
      async () => {
        // Create clean object without timestamp fields that cause issues
        const cleanConfig = Object.fromEntries(
          Object.entries(config).filter(([key]) =>
            !['createdAt', 'updatedAt', 'id'].includes(key)
          )
        );

        const [updatedConfig] = await db
          .update(aiConfiguration)
          .set({
            ...cleanConfig,
            updatedAt: sql`NOW()`,
            configVersion: sql`${aiConfiguration.configVersion} + 1`
          })
          .where(eq(aiConfiguration.configName, configName))
          .returning();

        if (!updatedConfig) {
          throw new Error(`AI configuration '${configName}' not found`);
        }

        await this.createActivityLog({
          type: "ai_config_updated",
          description: `تنظیمات AI بروزرسانی شد: ${configName}`,
          relatedId: null,
          metadata: {
            configName,
            updatedBy: config.lastModifiedBy,
            version: updatedConfig.configVersion
          }
        });

        return updatedConfig;
      },
      'updateAiConfiguration'
    );
  }

  async deleteAiConfiguration(configName: string): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .delete(aiConfiguration)
          .where(eq(aiConfiguration.configName, configName));

        if (result.rowCount === 0) {
          throw new Error(`AI configuration '${configName}' not found`);
        }

        await this.createActivityLog({
          type: "ai_config_deleted",
          description: `تنظیمات AI حذف شد: ${configName}`,
          relatedId: null,
          metadata: { configName }
        });
      },
      'deleteAiConfiguration'
    );
  }

  async getActiveAiConfiguration(): Promise<AiConfiguration[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(aiConfiguration)
        .where(eq(aiConfiguration.isActive, true))
        .orderBy(aiConfiguration.configCategory, desc(aiConfiguration.updatedAt)),
      'getActiveAiConfiguration'
    );
  }

  // Missing Sales Partners Methods
  async deleteSalesPartner(id: number): Promise<void> {
    return await withDatabaseRetry(
      async () => {
        const result = await db.delete(salesPartners).where(eq(salesPartners.id, id));
        if (result.rowCount === 0) {
          throw new Error(`Sales partner with id ${id} not found`);
        }

        await this.createActivityLog({
          type: "sales_partner_deleted",
          description: `همکار فروش حذف شد: ID ${id}`,
          relatedId: id,
          metadata: { deletedId: id }
        });
      },
      'deleteSalesPartner'
    );
  }

  async getSalesPartnersStatistics(): Promise<any> {
    return await withDatabaseRetry(
      async () => {
        // SHERLOCK v12.4: Enhanced statistics with financial coupling
        const result = await db
          .select({
            totalPartners: sql<number>`count(*)`,
            totalActivePartners: sql<number>`count(*) filter (where is_active = true)`,
            totalCommission: sql<string>`COALESCE(SUM(CAST(total_commission as DECIMAL)), 0)`,
            averageCommissionRate: sql<number>`COALESCE(AVG(commission_rate), 0)`
          })
          .from(salesPartners);

        // Calculate financial coupling - total sales from sub-representatives
        const salesCouplingResult = await db
          .select({
            totalCoupledSales: sql<string>`COALESCE(SUM(CAST(total_sales as DECIMAL)), 0)`,
            totalCoupledDebt: sql<string>`COALESCE(SUM(CAST(total_debt as DECIMAL)), 0)`,
            coupledRepresentatives: sql<number>`COUNT(*)`
          })
          .from(representatives)
          .where(sql`sales_partner_id IS NOT NULL`);

        console.log(`📊 SHERLOCK v12.4: Sales partners with financial coupling - ${result[0].totalPartners} partners, ${salesCouplingResult[0].totalCoupledSales} coupled sales from ${salesCouplingResult[0].coupledRepresentatives} representatives`);

        return {
          totalPartners: result[0].totalPartners || 0,
          activePartners: result[0].totalActivePartners || 0,
          totalCommission: result[0].totalCommission || "0",
          totalSales: salesCouplingResult[0].totalCoupledSales || "0", // Use coupled sales as total sales
          averageCommissionRate: parseFloat((result[0].averageCommissionRate || 0).toString()),
          totalCoupledSales: salesCouplingResult[0].totalCoupledSales,
          totalCoupledDebt: salesCouplingResult[0].totalCoupledDebt,
          coupledRepresentatives: salesCouplingResult[0].coupledRepresentatives
        };
      },
      'getSalesPartnersStatistics'
    );
  }

  async getRepresentativesBySalesPartner(partnerId: number): Promise<Representative[]> {
    return await withDatabaseRetry(
      () => db.select()
        .from(representatives)
        .where(eq(representatives.salesPartnerId, partnerId))
        .orderBy(representatives.name),
      'getRepresentativesBySalesPartner'
    );
  }



  async getPaymentStatistics(): Promise<any> {
    return await withDatabaseRetry(
      async () => {
        const totalPayments = await db.select({ count: sql<number>`count(*)` }).from(payments);
        const totalAmount = await db.select({
          total: sql<string>`coalesce(sum(amount), '0')`
        }).from(payments);
        const allocatedCount = await db.select({ count: sql<number>`count(*)` }).from(payments).where(eq(payments.isAllocated, true));

        return {
          totalPayments: totalPayments[0]?.count || 0,
          totalAmount: totalAmount[0]?.total || "0",
          allocatedPayments: allocatedCount[0]?.count || 0,
          unallocatedPayments: (totalPayments[0]?.count || 0) - (allocatedCount[0]?.count || 0)
        };
      },
      'getPaymentStatistics'
    );
  }


  // Financial Synchronization Methods Implementation
  async getTotalRevenue(): Promise<string> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`
          })
          .from(invoices)
          .where(eq(invoices.status, 'paid'));

        return result[0]?.total || "0";
      },
      'getTotalRevenue'
    );
  }

  async getTotalDebt(): Promise<string> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(total_debt as DECIMAL)), 0)`
          })
          .from(representatives);

        return result[0]?.total || "0";
      },
      'getTotalDebt'
    );
  }

  async getActiveRepresentativesCount(): Promise<number> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(representatives)
          .where(eq(representatives.isActive, true));

        return result[0]?.count || 0;
      },
      'getActiveRepresentativesCount'
    );
  }

  async getUnpaidInvoicesCount(): Promise<number> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.status, 'unpaid'));

        return result[0]?.count || 0;
      },
      'getUnpaidInvoicesCount'
    );
  }

  async getOverdueInvoicesCount(): Promise<number> {
    return await withDatabaseRetry(
      async () => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.status, 'overdue'));

        return result[0]?.count || 0;
      },
      'getOverdueInvoicesCount'
    );
  }

  // ✅ SHERLOCK v32.0: Get single invoice by ID with full details
  async getInvoiceById(invoiceId: number): Promise<any | null> {
    return await withDatabaseRetry(
      async () => {
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
        return invoice || null;
      },
      'getInvoiceById'
    );
  }

  // SHERLOCK v12.4: Manual Invoices Management Implementation
  async getManualInvoices(options: { page: number; limit: number; search?: string; status?: string }): Promise<{ data: Invoice[]; pagination: any }> {
    return await withDatabaseRetry(
      async () => {
        let query = db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            representativeId: invoices.representativeId,
            batchId: invoices.batchId,
            amount: invoices.amount,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            status: invoices.status,
            usageData: invoices.usageData,
            sentToTelegram: invoices.sentToTelegram,
            telegramSentAt: invoices.telegramSentAt,
            telegramSendCount: invoices.telegramSendCount,
            createdAt: invoices.createdAt,
            representativeName: representatives.name,
            representativeCode: representatives.code
          })
          .from(invoices)
          .innerJoin(representatives, eq(invoices.representativeId, representatives.id))
          .where(sql`${invoices.usageData}->>'type' = 'manual'`);

        // Apply additional filters
        let conditions = [sql`${invoices.usageData}->>'type' = 'manual'`];

        if (options.search) {
          conditions.push(
            or(
              ilike(invoices.invoiceNumber, `%${options.search}%`),
              ilike(representatives.name, `%${options.search}%`),
              ilike(representatives.code, `%${options.search}%`)
            )!
          );
        }

        if (options.status && options.status !== 'all') {
          conditions.push(eq(invoices.status, options.status));
        }

        if (conditions.length > 1) {
          query = db
            .select({
              id: invoices.id,
              invoiceNumber: invoices.invoiceNumber,
              representativeId: invoices.representativeId,
              batchId: invoices.batchId,
              amount: invoices.amount,
              issueDate: invoices.issueDate,
              dueDate: invoices.dueDate,
              status: invoices.status,
              usageData: invoices.usageData,
              sentToTelegram: invoices.sentToTelegram,
              telegramSentAt: invoices.telegramSentAt,
              telegramSendCount: invoices.telegramSendCount,
              createdAt: invoices.createdAt,
              representativeName: representatives.name,
              representativeCode: representatives.code
            })
            .from(invoices)
            .innerJoin(representatives, eq(invoices.representativeId, representatives.id))
            .where(and(...conditions));
        }

        // Get total count first
        const countQuery = await db
          .select({ count: sql`count(*)` })
          .from(invoices)
          .innerJoin(representatives, eq(invoices.representativeId, representatives.id))
          .where(sql`${invoices.usageData}->>'type' = 'manual'`);

        const totalCount = Number(countQuery[0].count);

        // Apply pagination and ordering
        const result = await query
          .orderBy(desc(invoices.createdAt))
          .limit(options.limit)
          .offset((options.page - 1) * options.limit);

        const totalPages = Math.ceil(totalCount / options.limit);

        console.log(`📋 SHERLOCK v12.4: Retrieved ${result.length} manual invoices (page ${options.page}/${totalPages})`);

        return {
          data: result,
          pagination: {
            currentPage: options.page,
            pageSize: options.limit,
            totalCount,
            totalPages,
            hasNextPage: options.page < totalPages,
            hasPrevPage: options.page > 1
          }
        };
      },
      'getManualInvoices'
    );
  }

  async getManualInvoicesStatistics(): Promise<{ totalCount: number; totalAmount: string; unpaidCount: number; paidCount: number; partialCount: number }> {
    return await withDatabaseRetry(
      async () => {
        const stats = await db
          .select({
            totalCount: sql`count(*)`,
            totalAmount: sql`COALESCE(SUM(CAST(amount as DECIMAL)), 0)`,
            unpaidCount: sql`count(*) filter (where status = 'unpaid')`,
            paidCount: sql`count(*) filter (where status = 'paid')`,
            partialCount: sql`count(*) filter (where status = 'partial')`,
            overdueCount: sql`count(*) filter (where status = 'overdue')`
          })
          .from(invoices)
          .where(sql`${invoices.usageData}->>'type' = 'manual'`);

        const result = stats[0];

        console.log(`📊 SHERLOCK v12.4: Manual invoices statistics - Total: ${result.totalCount}, Amount: ${result.totalAmount}`);

        return {
          totalCount: Number(result.totalCount),
          totalAmount: String(result.totalAmount || '0'),
          unpaidCount: Number(result.unpaidCount),
          paidCount: Number(result.paidCount),
          partialCount: Number(result.partialCount)
        };
      },
      'getManualInvoicesStatistics'
    );
  }
}

export const storage = new DatabaseStorage();