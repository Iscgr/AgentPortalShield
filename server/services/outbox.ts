// Phase C: E-C1 Telegram Outbox Service
// Purpose: تضمین تحویل پیام‌های تلگرام با retry mechanism و KPI tracking

import { db } from '../db';
import { outbox, guardMetricsEvents } from '../../shared/schema';
import { eq, and, lte, or, inArray } from 'drizzle-orm';

export interface OutboxMessage {
  type: 'TELEGRAM_MESSAGE' | 'EMAIL' | 'WEBHOOK';
  payload: {
    recipient: string;
    message: string;
    options?: Record<string, any>;
  };
}

export interface OutboxMetrics {
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  pendingMessages: number;
  successRate: number;
  avgRetryCount: number;
}

export class OutboxService {
  private readonly MAX_RETRY_COUNT = 5;
  private readonly INITIAL_RETRY_DELAY = 30000; // 30 seconds
  private readonly MAX_RETRY_DELAY = 3600000; // 1 hour

  /**
   * ارسال پیام جدید به outbox برای پردازش
   */
  async enqueueMessage(message: OutboxMessage): Promise<number> {
    try {
      const [inserted] = await db.insert(outbox).values({
        type: message.type,
        payload: message.payload,
        status: 'PENDING',
        retryCount: 0,
        nextRetryAt: null
      }).returning({ id: outbox.id });

      // ثبت متریک در guard metrics
      await this.recordMetric('OUTBOX_MESSAGE_ENQUEUED', { type: message.type });
      
      return inserted.id;
    } catch (error) {
      await this.recordMetric('OUTBOX_ENQUEUE_ERROR', { error: error.message });
      throw new Error(`Failed to enqueue message: ${error.message}`);
    }
  }

  /**
   * دریافت پیام‌های آماده برای پردازش
   */
  async getReadyMessages(limit: number = 10): Promise<any[]> {
    const now = new Date();
    
    return await db.select()
      .from(outbox)
      .where(
        and(
          or(
            eq(outbox.status, 'PENDING'),
            and(
              eq(outbox.status, 'FAILED'),
              lte(outbox.nextRetryAt, now)
            )
          ),
          lte(outbox.retryCount, this.MAX_RETRY_COUNT)
        )
      )
      .orderBy(outbox.createdAt)
      .limit(limit);
  }

  /**
   * علامت‌گذاری پیام به عنوان در حال پردازش
   */
  async markAsProcessing(messageId: number): Promise<void> {
    await db.update(outbox)
      .set({ 
        status: 'PROCESSING',
        processedAt: new Date()
      })
      .where(eq(outbox.id, messageId));
  }

  /**
   * علامت‌گذاری پیام به عنوان ارسال شده
   */
  async markAsSent(messageId: number): Promise<void> {
    await db.update(outbox)
      .set({ 
        status: 'SENT',
        processedAt: new Date()
      })
      .where(eq(outbox.id, messageId));

    await this.recordMetric('OUTBOX_MESSAGE_SENT', { messageId });
  }

  /**
   * علامت‌گذاری پیام به عنوان ناموفق با برنامه‌ریزی retry
   */
  async markAsFailed(messageId: number, error: string): Promise<void> {
    const message = await db.select()
      .from(outbox)
      .where(eq(outbox.id, messageId))
      .limit(1);

    if (message.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    const currentRetryCount = message[0].retryCount;
    const newRetryCount = currentRetryCount + 1;

    if (newRetryCount > this.MAX_RETRY_COUNT) {
      // تعداد retry بیش از حد مجاز - پیام را cancelled کن
      await db.update(outbox)
        .set({ 
          status: 'CANCELLED',
          errorLast: error,
          retryCount: newRetryCount
        })
        .where(eq(outbox.id, messageId));

      await this.recordMetric('OUTBOX_MESSAGE_CANCELLED', { messageId, error });
    } else {
      // برنامه‌ریزی retry با exponential backoff
      const nextRetryDelay = Math.min(
        this.INITIAL_RETRY_DELAY * Math.pow(2, currentRetryCount),
        this.MAX_RETRY_DELAY
      );
      const nextRetryAt = new Date(Date.now() + nextRetryDelay);

      await db.update(outbox)
        .set({ 
          status: 'FAILED',
          errorLast: error,
          retryCount: newRetryCount,
          nextRetryAt: nextRetryAt
        })
        .where(eq(outbox.id, messageId));

      await this.recordMetric('OUTBOX_MESSAGE_RETRY_SCHEDULED', { 
        messageId, 
        retryCount: newRetryCount,
        nextRetryAt: nextRetryAt.toISOString()
      });
    }
  }

  /**
   * دریافت آمار outbox برای KPI monitoring
   */
  async getMetrics(): Promise<OutboxMetrics> {
    const results = await db.select({
      status: outbox.status,
      retryCount: outbox.retryCount
    }).from(outbox);

    const totalMessages = results.length;
    const sentMessages = results.filter(r => r.status === 'SENT').length;
    const failedMessages = results.filter(r => r.status === 'CANCELLED').length;
    const pendingMessages = results.filter(r => r.status === 'PENDING' || r.status === 'FAILED').length;
    
    const successRate = totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0;
    const avgRetryCount = results.reduce((sum, r) => sum + (r.retryCount || 0), 0) / totalMessages || 0;

    return {
      totalMessages,
      sentMessages,
      failedMessages,
      pendingMessages,
      successRate,
      avgRetryCount
    };
  }

  /**
   * ثبت متریک در guard metrics system
   */
  private async recordMetric(eventType: string, context: Record<string, any> = {}): Promise<void> {
    try {
      await db.insert(guardMetricsEvents).values({
        eventType,
        level: 'info',
        context
      });
    } catch (error) {
      console.error('Failed to record outbox metric:', error);
    }
  }

  /**
   * پاک‌سازی پیام‌های قدیمی (برای بهینه‌سازی فضای دیتابیس)
   */
  async cleanupOldMessages(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedMessages = await db.delete(outbox)
      .where(
        and(
          inArray(outbox.status, ['SENT', 'CANCELLED']),
          lte(outbox.createdAt, cutoffDate)
        )
      )
      .returning({ id: outbox.id });

    await this.recordMetric('OUTBOX_CLEANUP_COMPLETED', { 
      deletedCount: deletedMessages.length,
      cutoffDate: cutoffDate.toISOString()
    });

    return deletedMessages.length;
  }
}