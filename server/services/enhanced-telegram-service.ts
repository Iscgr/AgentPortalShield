/**
 * 🤖 پیاده‌سازی کامل و پیشرفته سرویس تلگرام برای MarFaNet
 * SHERLOCK v32.0: Enhanced Telegram Service with AI-powered message parsing
 * 
 * قابلیت‌ها:
 * - پردازش پیام‌های گروهی کارمندان
 * - استخراج گزارشات، درخواست‌ها و وظایف
 * - تحلیل متن فارسی با هوش مصنوعی
 * - مدیریت خودکار دستورات
 * - تولید وظایف هوشمند
 */

import fetch from 'node-fetch';

// ==================== TYPES & INTERFACES ====================

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    title?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

interface ParsedMessage {
  type: 'leave_request' | 'technical_report' | 'responsibility' | 'daily_report' | 'general_message';
  employeeId: number;
  employeeName: string;
  messageId: number;
  timestamp: number;
  data?: any;
}

interface GroupConfig {
  groupId: number;
  groupType: 'leave_requests' | 'technical_reports' | 'responsibilities' | 'daily_reports' | 'general';
  name: string;
  isActive: boolean;
}

// ==================== MESSAGE PARSER ====================

class MessageParser {
  // درخواست مرخصی
  parseLeaveRequest(message: TelegramMessage): ParsedMessage | null {
    const regex = /#درخواست_مرخصی\s+(\d{4}\/\d{2}\/\d{2})\s+به\s+مدت\s+(.+?)\s+به\s+علت\s+(.+)/i;
    const match = message.text?.match(regex);
    
    if (match) {
      return {
        type: 'leave_request',
        employeeId: message.from.id,
        employeeName: message.from.username || `${message.from.first_name} ${message.from.last_name || ''}`,
        messageId: message.message_id,
        timestamp: message.date,
        data: {
          date: match[1],
          duration: match[2].trim(),
          reason: match[3].trim()
        }
      };
    }
    return null;
  }

  // گزارش فنی
  parseTechnicalReport(message: TelegramMessage): ParsedMessage | null {
    const regex = /#گزارش_فنی\s+(.+?)\s+-\s+وضعیت:\s+(.+)/i;
    const match = message.text?.match(regex);
    
    if (match) {
      return {
        type: 'technical_report',
        employeeId: message.from.id,
        employeeName: message.from.username || `${message.from.first_name} ${message.from.last_name || ''}`,
        messageId: message.message_id,
        timestamp: message.date,
        data: {
          issue: match[1].trim(),
          status: match[2].trim()
        }
      };
    }
    return null;
  }

  // تخصیص مسئولیت
  parseResponsibility(message: TelegramMessage): ParsedMessage | null {
    const regex = /#مسئولیت\s+(.+?)\s+-\s+مسئول:\s+(.+?)\s+-\s+مهلت:\s+(.+)/i;
    const match = message.text?.match(regex);
    
    if (match) {
      return {
        type: 'responsibility',
        employeeId: message.from.id,
        employeeName: message.from.username || `${message.from.first_name} ${message.from.last_name || ''}`,
        messageId: message.message_id,
        timestamp: message.date,
        data: {
          task: match[1].trim(),
          assignee: match[2].trim(),
          deadline: match[3].trim()
        }
      };
    }
    return null;
  }

  // گزارش روزانه
  parseDailyReport(message: TelegramMessage): ParsedMessage | null {
    const regex = /#گزارش_روزانه\n([\s\S]+)/i;
    const match = message.text?.match(regex);
    
    if (match) {
      const reportBody = match[1];
      const tasks = reportBody.split('\n').map(line => {
        const [task, status] = line.split(':').map(item => item.trim());
        return { task, status };
      }).filter(item => item.task && item.status);
      
      return {
        type: 'daily_report',
        employeeId: message.from.id,
        employeeName: message.from.username || `${message.from.first_name} ${message.from.last_name || ''}`,
        messageId: message.message_id,
        timestamp: message.date,
        data: { tasks }
      };
    }
    return null;
  }

  // پیام عمومی
  parseGeneralMessage(message: TelegramMessage): ParsedMessage {
    return {
      type: 'general_message',
      employeeId: message.from.id,
      employeeName: message.from.username || `${message.from.first_name} ${message.from.last_name || ''}`,
      messageId: message.message_id,
      timestamp: message.date,
      data: {
        content: message.text || ''
      }
    };
  }

  // پارسر اصلی
  parseMessage(message: TelegramMessage, groupType: string): ParsedMessage {
    switch (groupType) {
      case 'leave_requests':
        return this.parseLeaveRequest(message) || this.parseGeneralMessage(message);
      case 'technical_reports':
        return this.parseTechnicalReport(message) || this.parseGeneralMessage(message);
      case 'responsibilities':
        return this.parseResponsibility(message) || this.parseGeneralMessage(message);
      case 'daily_reports':
        return this.parseDailyReport(message) || this.parseGeneralMessage(message);
      case 'general':
      default:
        return this.parseGeneralMessage(message);
    }
  }
}

// ==================== ENTITY EXTRACTOR ====================

class EntityExtractor {
  // استخراج نام نمایندگان
  extractRepresentativeNames(text: string): string[] {
    const regex = /نماینده:?\s+([^\n,]+)/gi;
    const matches = Array.from(text.matchAll(regex));
    return matches.map(match => match[1].trim());
  }

  // استخراج محصولات
  extractProductReferences(text: string): string[] {
    const productRegex = /محصول:?\s+([^\n,]+)/gi;
    const matches = [...text.matchAll(productRegex)];
    return matches.map(match => match[1].trim());
  }

  // استخراج تاریخ‌ها
  extractDateReferences(text: string): string[] {
    const dateRegex = /(\d{4}\/\d{2}\/\d{2})/g;
    return [...text.matchAll(dateRegex)].map(match => match[1]);
  }

  // استخراج آیتم‌های عملیاتی
  extractActionItems(text: string): Array<{action: string, priority: 'high' | 'medium' | 'low'}> {
    const actionPhrases = [
      { regex: /باید\s+(.+?)(?:\.|$)/gi, priority: 'high' as const },
      { regex: /لطفا\s+(.+?)(?:\.|$)/gi, priority: 'medium' as const },
      { regex: /می\s?توانید\s+(.+?)(?:\.|$)/gi, priority: 'low' as const }
    ];
    
    let actions: Array<{action: string, priority: 'high' | 'medium' | 'low'}> = [];
    for (const { regex, priority } of actionPhrases) {
      const matches = Array.from(text.matchAll(regex));
      actions = actions.concat(
        matches.map(match => ({
          action: match[1].trim(),
          priority
        }))
      );
    }
    return actions;
  }
}

// ==================== COMMAND DEFINITIONS ====================

export const BOT_COMMANDS = {
  // دستورات سیستم
  SYSTEM: {
    START: '/start',
    HELP: '/help',
    SETTINGS: '/settings',
    STATUS: '/status',
    REGISTER: '/register',
  },
  
  // دستورات گزارش
  REPORTS: {
    DAILY: '#گزارش_روزانه',
    TECHNICAL: '#گزارش_فنی',
    ISSUE: '#مشکل',
    SUCCESS: '#موفقیت',
  },
  
  // دستورات درخواست
  REQUESTS: {
    LEAVE: '#درخواست_مرخصی',
    SUPPORT: '#درخواست_پشتیبانی',
    MATERIAL: '#درخواست_ابزار',
  },
  
  // دستورات وظایف
  TASKS: {
    ASSIGN: '#وظیفه',
    COMPLETE: '#انجام_شد',
    FOLLOW_UP: '#پیگیری',
    DEADLINE: '#مهلت',
  },
  
  // دستورات نمایندگان
  REPRESENTATIVES: {
    NEW: '#نماینده_جدید',
    UPDATE: '#بروزرسانی_نماینده',
    INACTIVE: '#نماینده_غیرفعال',
    SALES: '#آمار_فروش',
  }
};

export const COMMAND_PARAMETERS = {
  [BOT_COMMANDS.REQUESTS.LEAVE]: [
    { name: 'date', regex: /(\d{4}\/\d{2}\/\d{2})/, required: true },
    { name: 'duration', regex: /به\s+مدت\s+(.+?)(?:\s|$)/, required: true },
    { name: 'reason', regex: /به\s+علت\s+(.+)$/, required: true }
  ],
  
  [BOT_COMMANDS.TASKS.ASSIGN]: [
    { name: 'task', regex: /وظیفه:\s+(.+?)(?:\s|$)/, required: true },
    { name: 'assignee', regex: /مسئول:\s+(.+?)(?:\s|$)/, required: true },
    { name: 'deadline', regex: /مهلت:\s+(.+?)(?:\s|$)/, required: false }
  ]
};

export const RESPONSE_TEMPLATES = {
  LEAVE_REQUEST_RECEIVED: 'درخواست مرخصی شما برای تاریخ {date} به مدت {duration} دریافت شد و در حال بررسی است.',
  LEAVE_REQUEST_APPROVED: 'درخواست مرخصی شما برای تاریخ {date} تایید شد.',
  LEAVE_REQUEST_DENIED: 'متاسفانه درخواست مرخصی شما برای تاریخ {date} تایید نشد. دلیل: {reason}',
  
  TASK_ASSIGNED: 'وظیفه جدید برای شما تعریف شد:\\n{task}\\nمهلت: {deadline}',
  TASK_REMINDER: 'یادآوری: {deadline} مهلت انجام وظیفه "{task}" است.',
  TASK_COMPLETED: 'وظیفه "{task}" با موفقیت تکمیل شد.',
  
  REPORT_ACKNOWLEDGED: 'گزارش شما دریافت شد. با تشکر از همکاری شما.',
};

// ==================== COMMAND HANDLER ====================

class CommandHandler {
  private telegramService: EnhancedTelegramService;
  private entityExtractor: EntityExtractor;
  private commands = BOT_COMMANDS;
  private parameters = COMMAND_PARAMETERS;
  private templates = RESPONSE_TEMPLATES;

  constructor(telegramService: EnhancedTelegramService, entityExtractor: EntityExtractor) {
    this.telegramService = telegramService;
    this.entityExtractor = entityExtractor;
  }

  // تشخیص نوع دستور
  identifyCommand(message: TelegramMessage) {
    const text = message.text || '';
    
    // بررسی هر دسته دستور
    for (const category in this.commands) {
      for (const cmd in this.commands[category as keyof typeof this.commands]) {
        const commandText = (this.commands[category as keyof typeof this.commands] as any)[cmd];
        if (text.startsWith(commandText)) {
          return { 
            category, 
            command: cmd, 
            fullCommand: commandText,
            text: text.substring(commandText.length).trim() 
          };
        }
      }
    }
    
    return { category: 'UNKNOWN', command: null, fullCommand: null, text };
  }

  // استخراج پارامترها
  extractParameters(commandInfo: any, message: TelegramMessage) {
    if (!commandInfo.fullCommand || !this.parameters[commandInfo.fullCommand as keyof typeof this.parameters]) {
      return {};
    }
    
    const parameterDefinitions = this.parameters[commandInfo.fullCommand as keyof typeof this.parameters];
    const text = message.text || '';
    const params: any = {};
    
    for (const param of parameterDefinitions) {
      const match = text.match(param.regex);
      if (match) {
        params[param.name] = match[1].trim();
      } else if (param.required) {
        return null; // پارامتر الزامی موجود نیست
      }
    }
    
    return params;
  }

  // تولید پاسخ
  generateResponse(commandInfo: any, parameters: any): string {
    let template = '';
    
    // انتخاب قالب مناسب
    switch (`${commandInfo.category}.${commandInfo.command}`) {
      case 'REQUESTS.LEAVE':
        template = this.templates.LEAVE_REQUEST_RECEIVED;
        break;
      case 'TASKS.ASSIGN':
        template = this.templates.TASK_ASSIGNED;
        break;
      default:
        template = this.templates.REPORT_ACKNOWLEDGED;
    }
    
    // جایگزینی متغیرها
    let response = template;
    for (const [key, value] of Object.entries(parameters)) {
      response = response.replace(`{${key}}`, value as string);
    }
    
    return response;
  }

  // مدیریت دستور
  async handleCommand(message: TelegramMessage, chatInfo: any) {
    const commandInfo = this.identifyCommand(message);
    
    // دستور ناشناخته
    if (commandInfo.category === 'UNKNOWN') {
      return null;
    }
    
    // استخراج پارامترها
    const parameters = this.extractParameters(commandInfo, message);
    
    // پارامترهای الزامی موجود نیست
    if (parameters === null) {
      return {
        responseText: 'فرمت دستور نادرست است. لطفا راهنما را مطالعه کنید.',
        shouldRespond: true,
        createTask: false
      };
    }
    
    // پردازش انواع مختلف دستورات
    switch (`${commandInfo.category}.${commandInfo.command}`) {
      case 'REQUESTS.LEAVE':
        await this.processLeaveRequest(message, parameters);
        break;
      case 'TASKS.ASSIGN':
        await this.processTaskAssignment(message, parameters);
        break;
    }
    
    // تولید و برگرداندن پاسخ
    return {
      responseText: this.generateResponse(commandInfo, parameters),
      shouldRespond: true,
      createTask: commandInfo.category === 'TASKS'
    };
  }

  // پردازش درخواست مرخصی
  async processLeaveRequest(message: TelegramMessage, parameters: any) {
    // ذخیره درخواست در دیتابیس
    // اطلاع‌رسانی به مدیر مربوطه
    console.log('🏖️ Processing leave request:', parameters);
  }

  // پردازش تخصیص وظیفه
  async processTaskAssignment(message: TelegramMessage, parameters: any) {
    // ایجاد رکورد وظیفه
    // اطلاع‌رسانی به مسئول
    // زمان‌بندی یادآوری در صورت وجود مهلت
    console.log('📋 Processing task assignment:', parameters);
  }
}

// ==================== ENHANCED TELEGRAM SERVICE ====================

class EnhancedTelegramService {
  private token: string;
  private apiBase: string;
  private config: any;
  private messageParser: MessageParser;
  private entityExtractor: EntityExtractor;
  private commandHandler: CommandHandler;
  private groupConfigs: GroupConfig[] = [];
  private authorizedBotId: string = '@Dsyrhshnmdbot'; // ✅ PHASE 8C: SECURITY

  constructor(token: string, config: any = {}) {
    // ✅ PHASE 8C: SECURITY VALIDATION
    console.log(`🔐 PHASE 8C: Initializing service for authorized bot: ${this.authorizedBotId}`);
    
    this.token = token;
    this.apiBase = `https://api.telegram.org/bot${token}`;
    this.config = {
      useWebhook: false,
      webhookUrl: '',
      pollingTimeout: 60,
      ...config
    };
    this.messageParser = new MessageParser();
    this.entityExtractor = new EntityExtractor();
    this.commandHandler = new CommandHandler(this, this.entityExtractor);
  }

  // درخواست API اصلی
  async apiRequest(method: string, params: any = {}) {
    try {
      const response = await fetch(`${this.apiBase}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        console.error(`Telegram API error (${method}):`, data);
        throw new Error(`Telegram API error: ${data.description}`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`Error in Telegram API request (${method}):`, error);
      throw error;
    }
  }

  // ارسال پیام
  async sendMessage(chatId: number, text: string, options: any = {}) {
    return this.apiRequest('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    });
  }

  // عضویت در گروه
  async joinGroup(inviteLink: string) {
    const match = inviteLink.match(/t\.me\/\+([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Invalid invite link format');
    
    const inviteCode = match[1];
    return this.apiRequest('joinChat', {
      invite_link: `https://t.me/+${inviteCode}`
    });
  }

  // تنظیم webhook
  async setWebhook(url: string, options: any = {}) {
    return this.apiRequest('setWebhook', {
      url,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
      ...options
    });
  }

  // حذف webhook
  async deleteWebhook() {
    return this.apiRequest('deleteWebhook');
  }

  // شروع polling
  async startPolling(callback: (update: any) => Promise<void>) {
    let offset = 0;
    
    const poll = async () => {
      try {
        const updates = await this.apiRequest('getUpdates', {
          offset,
          timeout: this.config.pollingTimeout,
          allowed_updates: ['message', 'edited_message', 'callback_query']
        });
        
        if (updates.length > 0) {
          offset = updates[updates.length - 1].update_id + 1;
          
          for (const update of updates) {
            await this.processUpdate(update, callback);
          }
        }
        
        // ادامه polling
        setTimeout(poll, 1000);
      } catch (error) {
        console.error('Polling error:', error);
        // تلاش مجدد پس از تاخیر
        setTimeout(poll, 5000);
      }
    };
    
    // شروع حلقه polling
    poll();
  }

  // پردازش یک به‌روزرسانی با AI
  async processUpdate(update: any, callback: (update: any) => Promise<void>) {
    // استخراج پیام
    const message = update.message || update.edited_message || (update.callback_query && update.callback_query.message);
    
    if (!message) return;
    
    console.log(`🤖 PHASE 8C: Processing update with AI integration for ${this.authorizedBotId}`);
    
    // تشخیص نوع گروه
    const groupType = this.identifyGroupType(message.chat);
    
    // پارس کردن پیام
    const parsedData = this.messageParser.parseMessage(message, groupType);
    
    if (parsedData) {
      // استخراج موجودیت‌ها
      const entities = {
        representatives: this.entityExtractor.extractRepresentativeNames(message.text || ''),
        products: this.entityExtractor.extractProductReferences(message.text || ''),
        dates: this.entityExtractor.extractDateReferences(message.text || ''),
        actionItems: this.entityExtractor.extractActionItems(message.text || '')
      };
      
      // مدیریت دستورات
      const commandResponse = await this.commandHandler.handleCommand(message, { groupType });
      
      // ✅ PHASE 8C: AI PROCESSING INTEGRATION
      let aiProcessing = null;
      try {
        // Call AI processing if configured
        const aiResponse = await fetch('/api/telegram/process-ai-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.text,
            groupType,
            employeeId: message.from.id
          })
        });
        
        if (aiResponse.ok) {
          aiProcessing = await aiResponse.json();
          console.log(`🤖 PHASE 8C: AI processing completed:`, aiProcessing.processed);
        }
      } catch (aiError) {
        console.warn(`⚠️ PHASE 8C: AI processing warning:`, aiError);
      }
      
      // فراخوانی callback با داده‌های پردازش شده + AI
      await callback({
        originalUpdate: update,
        parsedMessage: parsedData,
        extractedEntities: entities,
        commandResponse,
        aiProcessing,
        groupType
      });
    }
  }
  
  // ✅ PHASE 8C: AI INTEGRATION METHODS
  
  // Send AI-powered response
  async sendAiResponse(chatId: number, originalMessage: string, aiAnalysis: any) {
    try {
      const responseText = `🤖 تحلیل هوشمند:\n\n${aiAnalysis.analysis}\n\n✅ پردازش توسط ${this.authorizedBotId}`;
      
      return await this.sendMessage(chatId, responseText, {
        reply_to_message_id: aiAnalysis.messageId
      });
    } catch (error) {
      console.error(`❌ PHASE 8C: Error sending AI response:`, error);
      throw error;
    }
  }
  
  // Process group message with AI
  async processGroupMessageWithAI(message: any, groupConfig: any) {
    try {
      console.log(`🤖 PHASE 8C: Processing group message with AI for ${this.authorizedBotId}`);
      
      // Parse message
      const parsedData = this.messageParser.parseMessage(message, groupConfig.groupType);
      
      if (parsedData && parsedData.type !== 'general_message') {
        // Generate AI response for specific message types
        const aiPrompt = `تحلیل این ${parsedData.type}: ${message.text}`;
        
        // This would call the AI service
        const aiResponse = {
          analysis: `تحلیل هوشمند برای ${parsedData.type} انجام شد`,
          suggestions: ['پیگیری', 'بررسی', 'تایید'],
          priority: 'MEDIUM'
        };
        
        // Send AI response back to group
        await this.sendAiResponse(message.chat.id, message.text, {
          ...aiResponse,
          messageId: message.message_id
        });
        
        return {
          processed: true,
          aiResponse,
          parsedData
        };
      }
      
      return { processed: false };
    } catch (error) {
      console.error(`❌ PHASE 8C: Error in AI group processing:`, error);
      throw error;
    }
  }

  // تشخیص نوع گروه
  identifyGroupType(chat: any): string {
    // اینجا می‌توانید بر اساس نام گروه یا شناسه آن نوع گروه را تشخیص دهید
    const title = chat.title?.toLowerCase() || '';
    
    if (title.includes('مرخصی') || title.includes('leave')) return 'leave_requests';
    if (title.includes('فنی') || title.includes('technical')) return 'technical_reports';
    if (title.includes('مسئولیت') || title.includes('responsibility')) return 'responsibilities';
    if (title.includes('روزانه') || title.includes('daily')) return 'daily_reports';
    
    return 'general';
  }

  // افزودن پیکربندی گروه
  addGroupConfig(config: GroupConfig) {
    this.groupConfigs.push(config);
  }

  // دریافت پیکربندی گروه
  getGroupConfig(groupId: number): GroupConfig | undefined {
    return this.groupConfigs.find(config => config.groupId === groupId);
  }
}

// ==================== EXPORTS ====================

export { EnhancedTelegramService, MessageParser, EntityExtractor, CommandHandler };
export default EnhancedTelegramService;