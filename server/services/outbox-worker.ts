// Phase C: E-C1 Telegram Outbox Worker
// Purpose: پردازش پیام‌های outbox با exponential backoff strategy

import { OutboxService } from './outbox';
import { FeatureFlagManager } from './feature-flag-manager';
import { db } from '../db';
import { guardMetricsEvents } from '../../shared/schema';

export interface TelegramAPI {
  sendMessage(chatId: string, message: string, options?: any): Promise<void>;
}

export class OutboxWorker {
  private readonly outboxService: OutboxService;
  private readonly featureFlagManager: FeatureFlagManager;
  private readonly telegramAPI: TelegramAPI;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL = 10000; // 10 seconds
  private readonly BATCH_SIZE = 5;

  constructor(
    outboxService: OutboxService,
    featureFlagManager: FeatureFlagManager,
    telegramAPI: TelegramAPI
  ) {
    this.outboxService = outboxService;
    this.featureFlagManager = featureFlagManager;
    this.telegramAPI = telegramAPI;
  }

  /**
   * شروع پردازش پیام‌های outbox
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('OutboxWorker is already running');
      return;
    }

    const isEnabled = await this.featureFlagManager.isEnabled('outbox_enabled');
    if (!isEnabled) {
      console.log('Outbox worker disabled by feature flag');
      return;
    }

    this.isRunning = true;
    console.log('Starting OutboxWorker...');

    await this.recordMetric('OUTBOX_WORKER_STARTED');

    this.intervalId = setInterval(async () => {
      try {
        await this.processMessages();
      } catch (error) {
        console.error('Error in OutboxWorker processing:', error);
        await this.recordMetric('OUTBOX_WORKER_ERROR', { error: error.message });
      }
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * توقف پردازش پیام‌های outbox
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('OutboxWorker stopped');
    await this.recordMetric('OUTBOX_WORKER_STOPPED');
  }

  /**
   * پردازش دسته‌ای پیام‌های آماده
   */
  private async processMessages(): Promise<void> {
    const isEnabled = await this.featureFlagManager.isEnabled('outbox_enabled');
    if (!isEnabled) {
      await this.stop();
      return;
    }

    const readyMessages = await this.outboxService.getReadyMessages(this.BATCH_SIZE);
    
    if (readyMessages.length === 0) {
      return;
    }

    console.log(`Processing ${readyMessages.length} outbox messages`);
    await this.recordMetric('OUTBOX_BATCH_PROCESSING_STARTED', { 
      messageCount: readyMessages.length 
    });

    const processPromises = readyMessages.map(message => 
      this.processMessage(message).catch(error => {
        console.error(`Failed to process message ${message.id}:`, error);
        return { success: false, messageId: message.id, error: error.message };
      })
    );

    const results = await Promise.allSettled(processPromises);
    
    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value && r.value.success
    ).length;

    await this.recordMetric('OUTBOX_BATCH_PROCESSING_COMPLETED', {
      totalMessages: readyMessages.length,
      successCount,
      failureCount: readyMessages.length - successCount
    });
  }

  /**
   * پردازش یک پیام منفرد
   */
  private async processMessage(message: any): Promise<{ success: boolean; messageId: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // علامت‌گذاری به عنوان در حال پردازش
      await this.outboxService.markAsProcessing(message.id);

      // پردازش بر اساس نوع پیام
      switch (message.type) {
        case 'TELEGRAM_MESSAGE':
          await this.processTelegramMessage(message);
          break;
        case 'EMAIL':
          await this.processEmailMessage(message);
          break;
        case 'WEBHOOK':
          await this.processWebhookMessage(message);
          break;
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }

      // علامت‌گذاری به عنوان ارسال شده
      await this.outboxService.markAsSent(message.id);

      const processingTime = Date.now() - startTime;
      await this.recordMetric('OUTBOX_MESSAGE_PROCESSED_SUCCESS', {
        messageId: message.id,
        type: message.type,
        processingTimeMs: processingTime
      });

      return { success: true, messageId: message.id };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      await this.outboxService.markAsFailed(message.id, error.message);
      
      await this.recordMetric('OUTBOX_MESSAGE_PROCESSED_FAILURE', {
        messageId: message.id,
        type: message.type,
        error: error.message,
        processingTimeMs: processingTime
      });

      return { success: false, messageId: message.id, error: error.message };
    }
  }

  /**
   * پردازش پیام تلگرام
   */
  private async processTelegramMessage(message: any): Promise<void> {
    const { payload } = message;
    
    if (!payload.recipient || !payload.message) {
      throw new Error('Invalid telegram message payload: missing recipient or message');
    }

    await this.telegramAPI.sendMessage(
      payload.recipient,
      payload.message,
      payload.options || {}
    );
  }

  /**
   * پردازش پیام ایمیل (پیاده‌سازی آینده)
   */
  private async processEmailMessage(message: any): Promise<void> {
    // TODO: پیاده‌سازی ارسال ایمیل
    throw new Error('Email processing not implemented yet');
  }

  /**
   * پردازش webhook (پیاده‌سازی آینده)
   */
  private async processWebhookMessage(message: any): Promise<void> {
    // TODO: پیاده‌سازی webhook
    throw new Error('Webhook processing not implemented yet');
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
      console.error('Failed to record worker metric:', error);
    }
  }

  /**
   * دریافت وضعیت worker
   */
  getStatus(): { isRunning: boolean; processingInterval: number; batchSize: number } {
    return {
      isRunning: this.isRunning,
      processingInterval: this.PROCESSING_INTERVAL,
      batchSize: this.BATCH_SIZE
    };
  }
}