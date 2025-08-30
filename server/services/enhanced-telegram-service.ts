
// Enhanced Telegram Service - MarFaNet Architecture Migration
// Advanced message parsing and AI-powered response system

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { TelegramApi } from 'node-telegram-bot-api';
import { nanoid } from 'nanoid';

export interface TelegramMessage {
  message_id: string;
  chat: {
    id: string;
    title?: string;
    type: string;
  };
  from: {
    id: string;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  text: string;
  date: number;
}

export interface ParsedMessageData {
  type: 'daily_report' | 'technical_report' | 'leave_request' | 'follow_up' | 'task_request' | 'general_message';
  extractedData: Record<string, any>;
  confidence: number;
  actionRequired: boolean;
}

export interface AIResponseTemplate {
  messageToEmployee: string;
  tasks?: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    dueDate?: string;
  }>;
  analysis: string;
  followUpRequired: boolean;
}

export class EnhancedTelegramService {
  private bot: TelegramApi;
  private messageProcessors: Map<string, Function>;
  
  // Command prefixes for different message types
  private readonly COMMAND_PREFIXES = {
    REPORT: ['#گزارش', '#report', '/report'],
    TASK: ['#وظیفه', '#task', '/task'],
    LEAVE: ['#مرخصی', '#leave', '/leave'],
    FOLLOW_UP: ['#پیگیری', '#followup', '/followup'],
    HELP: ['#راهنما', '#help', '/help']
  };

  // Response templates
  private readonly RESPONSE_TEMPLATES = {
    REPORT_RECEIVED: `✅ گزارش {reportType} شما دریافت شد.

📅 تاریخ ثبت: {date}
🆔 شناسه گزارش: {reportId}

این گزارش توسط دستیار هوشمند بررسی خواهد شد.`,

    TASK_CREATED: `⚠️ وظیفه جدید ایجاد شد

🆔 شناسه: {taskId}
📊 اولویت: {priority}
📝 توضیحات: {description}
⏰ مهلت انجام: {dueDate}

لطفا نتیجه پیگیری را با دستور #بروزرسانی {taskId} گزارش کنید.`,

    LEAVE_REQUEST_RECEIVED: `📝 درخواست مرخصی شما ثبت شد

📅 تاریخ: {date}
⏱️ مدت: {duration} روز
💭 دلیل: {reason}
📊 وضعیت: در انتظار بررسی

نتیجه بررسی به شما اطلاع داده خواهد شد.`,

    ERROR_INVALID_FORMAT: `❌ فرمت دستور نامعتبر است

✅ دستور صحیح: {correctFormat}
💡 مثال: {example}

برای راهنمایی بیشتر، دستور #راهنما را وارد کنید.`
  };

  constructor(botToken: string) {
    this.bot = new TelegramApi(botToken, { polling: true });
    this.messageProcessors = new Map();
    this.initializeMessageProcessors();
    this.setupBotHandlers();
  }

  /**
   * Initialize message processors for different types
   */
  private initializeMessageProcessors(): void {
    this.messageProcessors.set('daily_report', this.processDailyReport.bind(this));
    this.messageProcessors.set('technical_report', this.processTechnicalReport.bind(this));
    this.messageProcessors.set('leave_request', this.processLeaveRequest.bind(this));
    this.messageProcessors.set('follow_up', this.processFollowUp.bind(this));
    this.messageProcessors.set('task_request', this.processTaskRequest.bind(this));
    this.messageProcessors.set('general_message', this.processGeneralMessage.bind(this));
  }

  /**
   * Setup bot message handlers
   */
  private setupBotHandlers(): void {
    this.bot.on('message', async (msg) => {
      try {
        await this.handleIncomingMessage(msg as TelegramMessage);
      } catch (error) {
        console.error('Error handling Telegram message:', error);
      }
    });

    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error);
    });
  }

  /**
   * Main message handling pipeline
   */
  async handleIncomingMessage(message: TelegramMessage): Promise<void> {
    try {
      // 1. Parse and classify message
      const parsedData = await this.parseMessage(message);
      
      // 2. Store message in database
      const activityId = await this.storeActivity(message, parsedData);
      
      // 3. Process based on type
      const processor = this.messageProcessors.get(parsedData.type);
      if (processor) {
        await processor(message, parsedData, activityId);
      }
      
      // 4. Mark as processed
      await this.markAsProcessed(activityId);
      
    } catch (error) {
      console.error('Failed to handle message:', error);
      await this.sendErrorResponse(message.chat.id, 'خطا در پردازش پیام. لطفا مجددا تلاش کنید.');
    }
  }

  /**
   * Parse and classify incoming message
   */
  async parseMessage(message: TelegramMessage): Promise<ParsedMessageData> {
    const text = message.text || '';
    
    // Check for commands first
    const command = this.extractCommand(text);
    if (command) {
      return this.parseCommandMessage(text, command);
    }

    // Use heuristic detection for message types
    if (this.detectLeaveRequest(message)) {
      return this.parseLeaveRequest(text);
    }
    
    if (this.detectTechnicalReport(message)) {
      return this.parseTechnicalReport(text);
    }
    
    if (this.detectDailyReport(message)) {
      return this.parseDailyReport(text);
    }
    
    if (this.detectFollowUp(message)) {
      return this.parseFollowUp(text);
    }

    // Default to general message
    return {
      type: 'general_message',
      extractedData: { content: text },
      confidence: 0.5,
      actionRequired: false
    };
  }

  /**
   * Extract command from message
   */
  private extractCommand(text: string): { type: string; args: string[]; restOfMessage: string } | null {
    const firstLine = text.split('\n')[0].trim();
    const words = firstLine.split(' ');
    
    for (const [type, prefixes] of Object.entries(this.COMMAND_PREFIXES)) {
      for (const prefix of prefixes) {
        if (words[0] === prefix) {
          return {
            type,
            args: words.slice(1),
            restOfMessage: text.substring(firstLine.length).trim()
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Message type detection methods
   */
  private detectLeaveRequest(message: TelegramMessage): boolean {
    const text = message.text || '';
    return (
      text.includes('مرخصی') ||
      text.includes('درخواست مرخصی') ||
      message.chat.title === 'بخش مرخصی'
    );
  }

  private detectTechnicalReport(message: TelegramMessage): boolean {
    const text = message.text || '';
    return (
      text.includes('گزارش فنی') ||
      text.includes('#فنی') ||
      message.chat.title === 'گزارش فنی'
    );
  }

  private detectDailyReport(message: TelegramMessage): boolean {
    const text = message.text || '';
    return (
      text.includes('گزارش کار روزانه') ||
      text.includes('#گزارش_روزانه') ||
      message.chat.title === 'گزارش کار روزانه'
    );
  }

  private detectFollowUp(message: TelegramMessage): boolean {
    const text = message.text || '';
    return (
      text.includes('پیگیری') ||
      message.chat.title === 'پیگیری ها'
    );
  }

  /**
   * Message parsing methods
   */
  private parseCommandMessage(text: string, command: any): ParsedMessageData {
    switch (command.type) {
      case 'REPORT':
        return {
          type: 'daily_report',
          extractedData: {
            reportType: command.args[0] || 'روزانه',
            content: command.restOfMessage
          },
          confidence: 0.9,
          actionRequired: true
        };
      
      case 'LEAVE':
        return {
          type: 'leave_request',
          extractedData: {
            date: command.args[0],
            duration: command.args[1],
            reason: command.restOfMessage
          },
          confidence: 0.9,
          actionRequired: true
        };
      
      default:
        return {
          type: 'general_message',
          extractedData: { content: text },
          confidence: 0.7,
          actionRequired: false
        };
    }
  }

  private parseLeaveRequest(text: string): ParsedMessageData {
    const datePattern = /تاریخ[:\s]+([\d\/]+)/;
    const durationPattern = /مدت[:\s]+([\d]+)(?:\s*روز)?/;
    const reasonPattern = /(?:دلیل|علت)[:\s]+(.+)(?:\n|$)/;
    
    return {
      type: 'leave_request',
      extractedData: {
        date: (text.match(datePattern) || [])[1],
        duration: parseInt((text.match(durationPattern) || [])[1] || '1'),
        reason: (text.match(reasonPattern) || [])[1] || ''
      },
      confidence: 0.8,
      actionRequired: true
    };
  }

  private parseDailyReport(text: string): ParsedMessageData {
    const tasksPattern = /(?:وظایف انجام شده|کارهای انجام شده)[:\s]+(.+?)(?:\n|$)/s;
    const representativesPattern = /(?:نمایندگان|نماینده)[:\s]+(.+?)(?:\n|$)/s;
    const followupPattern = /(?:پیگیری|موارد پیگیری)[:\s]+(.+?)(?:\n|$)/s;
    
    return {
      type: 'daily_report',
      extractedData: {
        tasks: (text.match(tasksPattern) || [])[1] || '',
        representatives: (text.match(representativesPattern) || [])[1] || '',
        followup: (text.match(followupPattern) || [])[1] || ''
      },
      confidence: 0.85,
      actionRequired: true
    };
  }

  private parseTechnicalReport(text: string): ParsedMessageData {
    const issuePattern = /(?:مشکل|خطا|ایراد)[:\s]+(.+?)(?:\n|$)/s;
    const solutionPattern = /(?:راه حل|حل شد|برطرف شد)[:\s]+(.+?)(?:\n|$)/s;
    
    return {
      type: 'technical_report',
      extractedData: {
        issue: (text.match(issuePattern) || [])[1] || '',
        solution: (text.match(solutionPattern) || [])[1] || ''
      },
      confidence: 0.8,
      actionRequired: true
    };
  }

  private parseFollowUp(text: string): ParsedMessageData {
    const representativePattern = /(?:نماینده|R)(\d+)/;
    const issuePattern = /(.+)/s;
    
    return {
      type: 'follow_up',
      extractedData: {
        representativeId: (text.match(representativePattern) || [])[1],
        issue: text
      },
      confidence: 0.75,
      actionRequired: true
    };
  }

  /**
   * Store activity in database
   */
  private async storeActivity(message: TelegramMessage, parsedData: ParsedMessageData): Promise<string> {
    const activityId = nanoid();
    
    await db.execute(sql`
      INSERT INTO telegram_activities (
        id, message_id, chat_id, group_name, user_id, user_name,
        message_type, content, parsed_data, processed, created_at
      ) VALUES (
        ${activityId},
        ${message.message_id},
        ${message.chat.id},
        ${message.chat.title || 'Private Chat'},
        ${message.from.id},
        ${`${message.from.first_name} ${message.from.last_name || ''}`.trim()},
        ${parsedData.type},
        ${message.text},
        ${JSON.stringify(parsedData.extractedData)},
        FALSE,
        datetime('now')
      )
    `);
    
    return activityId;
  }

  /**
   * Message processors
   */
  private async processDailyReport(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    const reportId = `RPT-${Date.now()}`;
    
    await this.sendResponse(
      message.chat.id,
      this.formatTemplate(this.RESPONSE_TEMPLATES.REPORT_RECEIVED, {
        reportType: 'روزانه',
        date: new Date().toLocaleDateString('fa-IR'),
        reportId
      }),
      message.message_id
    );

    // TODO: Integrate with AI for analysis and task generation
  }

  private async processTechnicalReport(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    await this.sendResponse(
      message.chat.id,
      '🔧 گزارش فنی شما دریافت شد و در اولویت بررسی قرار گرفت.',
      message.message_id
    );
  }

  private async processLeaveRequest(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    const { date, duration, reason } = parsedData.extractedData;
    
    await this.sendResponse(
      message.chat.id,
      this.formatTemplate(this.RESPONSE_TEMPLATES.LEAVE_REQUEST_RECEIVED, {
        date: date || 'نامشخص',
        duration: duration || '1',
        reason: reason || 'نامشخص'
      }),
      message.message_id
    );
  }

  private async processFollowUp(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    const followUpId = `FLW-${Date.now()}`;
    
    await this.sendResponse(
      message.chat.id,
      `🔍 پیگیری شما با شناسه ${followUpId} ثبت شد و در حال بررسی است.`,
      message.message_id
    );
  }

  private async processTaskRequest(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    // TODO: Implement task request processing
    await this.sendResponse(
      message.chat.id,
      '✅ درخواست وظیفه شما ثبت شد.',
      message.message_id
    );
  }

  private async processGeneralMessage(message: TelegramMessage, parsedData: ParsedMessageData, activityId: string): Promise<void> {
    // TODO: Implement general message processing with AI
    console.log('General message processed:', activityId);
  }

  /**
   * Utility methods
   */
  private async sendResponse(chatId: string, text: string, replyToMessageId?: string): Promise<void> {
    const options: any = {};
    if (replyToMessageId) {
      options.reply_to_message_id = replyToMessageId;
    }
    
    await this.bot.sendMessage(chatId, text, options);
  }

  private async sendErrorResponse(chatId: string, errorMessage: string): Promise<void> {
    await this.bot.sendMessage(chatId, `❌ ${errorMessage}`);
  }

  private formatTemplate(template: string, values: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  private async markAsProcessed(activityId: string): Promise<void> {
    await db.execute(sql`
      UPDATE telegram_activities 
      SET processed = TRUE 
      WHERE id = ${activityId}
    `);
  }

  /**
   * Preserve existing invoice notification functionality
   */
  async sendInvoiceNotification(representativeId: number, invoiceData: any): Promise<void> {
    try {
      // Get representative's chat ID from database
      const representative = await db.execute(sql`
        SELECT name, phone FROM representatives WHERE id = ${representativeId}
      `);

      if (!representative.rows.length) {
        console.error('Representative not found for invoice notification:', representativeId);
        return;
      }

      const rep = representative.rows[0] as any;
      
      // Format invoice notification message
      const message = `🧾 فاکتور جدید

👤 نماینده: ${rep.name}
📞 تلفن: ${rep.phone}
🆔 شماره فاکتور: ${invoiceData.invoiceNumber}
💰 مبلغ کل: ${invoiceData.totalAmount?.toLocaleString('fa-IR')} تومان
📅 تاریخ: ${new Date().toLocaleDateString('fa-IR')}

وضعیت: ${invoiceData.status === 'paid' ? '✅ پرداخت شده' : '⏳ در انتظار پرداخت'}`;

      // Send to configured chat (implement chat ID configuration)
      const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (ADMIN_CHAT_ID) {
        await this.bot.sendMessage(ADMIN_CHAT_ID, message);
      }
      
    } catch (error) {
      console.error('Failed to send invoice notification:', error);
    }
  }
}

// Export singleton instance
export const enhancedTelegramService = new EnhancedTelegramService(
  process.env.TELEGRAM_BOT_TOKEN || ''
);
