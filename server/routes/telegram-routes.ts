/**
 * 🤖 MarFaNet Telegram Management Routes
 * SHERLOCK v32.0: Advanced Telegram Bot Integration with AI-powered message parsing
 */

import { Express } from 'express';
import { db } from '../db';
import { 
  employees, 
  employeeTasks, 
  telegramGroups, 
  telegramMessages, 
  leaveRequests, 
  technicalReports, 
  dailyReports,
  insertEmployeeSchema,
  insertEmployeeTaskSchema,
  insertTelegramGroupSchema,
  insertTelegramMessageSchema,
  insertLeaveRequestSchema,
  insertTechnicalReportSchema,
  insertDailyReportSchema
} from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { EnhancedTelegramService, MessageParser, EntityExtractor, CommandHandler } from '../services/enhanced-telegram-service';
import { getDefaultTelegramTemplate } from '../services/telegram';

let telegramService: EnhancedTelegramService | null = null;

// ==================== TELEGRAM ROUTES ====================

export function registerTelegramRoutes(app: Express, authMiddleware: any) {

  // ==================== BOT INITIALIZATION ====================
  
  // Initialize telegram service when bot token is available
  const initializeTelegramService = async () => {
    try {
      const { storage } = await import('../storage');
      const botTokenSetting = await storage.getSetting('telegram_bot_token');
      
      console.log('🔍 Checking telegram bot token:', {
        hasToken: !!botTokenSetting?.value,
        tokenLength: botTokenSetting?.value?.length || 0,
        serviceExists: !!telegramService
      });
      
      if (botTokenSetting?.value && !telegramService) {
        // Validate token format before initialization
        const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
        if (!tokenPattern.test(botTokenSetting.value)) {
          console.error('❌ Invalid bot token format');
          return false;
        }
        
        console.log('🤖 Initializing Telegram service with saved token...');
        telegramService = new EnhancedTelegramService(botTokenSetting.value);
        console.log('✅ Telegram service initialized successfully');
        return true;
      }
      return !!telegramService;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram service:', error);
      return false;
    }
  };

  // Initialize on startup
  initializeTelegramService();

  // ==================== GROUP MANAGEMENT ====================

  // Get configured Telegram groups
  app.get('/api/telegram/groups', authMiddleware, async (req, res) => {
    try {
      const { storage } = await import('../storage');
      const groupsData = await storage.getSetting('telegram_groups');
      const groups = groupsData?.value ? JSON.parse(groupsData.value) : [];
      
      console.log(`🔍 PHASE 8C: Retrieved ${groups.length} configured groups`);
      
      res.json({
        success: true,
        groups,
        totalConfigured: groups.length,
        maxGroups: 5
      });
    } catch (error: unknown) {
      console.error('❌ Error loading telegram groups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'خطا در بارگذاری گروه‌ها',
        error: errorMessage
      });
    }
  });

  // Configure new Telegram group
  app.post('/api/telegram/configure-group', authMiddleware, async (req, res) => {
    try {
      const { groupChatId, groupType, groupName, isActive = true } = req.body;
      const AUTHORIZED_BOT_ID = '@Dsyrhshnmdbot';

      console.log(`📧 PHASE 8C: Group configuration request:`, {
        groupChatId,
        groupType,
        groupName
      });

      // Validation
      if (!groupChatId || !groupType || !groupName) {
        return res.status(400).json({
          success: false,
          message: 'تمام فیلدها الزامی هستند'
        });
      }

      // Check telegram service - try to initialize if not already done
      if (!telegramService) {
        await initializeTelegramService();
      }
      
      if (!telegramService) {
        return res.status(400).json({
          success: false,
          message: 'ربات تلگرام تنظیم نشده است. ابتدا توکن ربات را تنظیم کنید'
        });
      }

      // Validate Chat ID format (should be negative for groups/supergroups)
      const chatIdStr = String(groupChatId);
      if (!chatIdStr.match(/^-?\d+$/) || (!chatIdStr.startsWith('-100') && !chatIdStr.startsWith('-'))) {
        console.error('❌ PHASE 8C: Invalid Chat ID format:', groupChatId);
        return res.status(400).json({
          success: false,
          message: 'شناسه گروه نامعتبر است. شناسه گروه‌ها باید با -100 شروع شود'
        });
      }

      console.log(`🔧 PHASE 8C: Configuring group "${groupName}" for bot ${AUTHORIZED_BOT_ID}`);

      // Test sending a message to verify access
      await telegramService.sendMessage(parseInt(groupChatId), 
        `✅ ربات ${AUTHORIZED_BOT_ID} با موفقیت به گروه "${groupName}" متصل شد!\n\n🤖 دستیار هوشمند آماده پردازش پیام‌های نوع: ${groupType}`
      );

      // Load existing groups
      const { storage } = await import('../storage');
      const existingGroupsData = await storage.getSetting('telegram_groups');
      const existingGroups = existingGroupsData?.value ? JSON.parse(existingGroupsData.value) : [];

      // Create new group configuration
      const groupConfig = {
        id: Date.now().toString(),
        groupId: parseInt(groupChatId),
        groupType: groupType || 'general',
        name: groupName,
        chatId: groupChatId,
        isActive,
        createdAt: new Date().toISOString(),
        status: 'connected'
      };

      // Check for duplicates
      const isDuplicate = existingGroups.some((g: any) => g.chatId === groupChatId);
      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: 'این گروه قبلاً تنظیم شده است'
        });
      }

      // Add to existing groups (max 5)
      if (existingGroups.length >= 5) {
        return res.status(400).json({
          success: false,
          message: 'حداکثر 5 گروه قابل تنظیم است'
        });
      }

      const updatedGroups = [...existingGroups, groupConfig];

      // Save to database
      await storage.updateSetting('telegram_groups', JSON.stringify(updatedGroups));

      // Add to telegram service
      telegramService.addGroupConfig(groupConfig);

      console.log(`✅ PHASE 8C: Group "${groupName}" configured successfully. Total groups: ${updatedGroups.length}/5`);

      res.json({
        success: true,
        message: 'گروه با موفقیت تنظیم شد',
        groupConfig,
        totalGroups: updatedGroups.length,
        maxGroups: 5
      });

    } catch (error: unknown) {
      console.error('❌ PHASE 8C: Error configuring group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'خطا در تنظیم گروه',
        error: errorMessage
      });
    }
  });

  // ==================== AI STATUS AND SETTINGS ====================

  // Get AI status for Telegram integration
  app.get('/api/telegram/ai-status', authMiddleware, async (req, res) => {
    try {
      const AUTHORIZED_BOT_ID = '@Dsyrhshnmdbot';
      console.log(`🔍 PHASE 8C: Checking AI status for bot ${AUTHORIZED_BOT_ID}`);

      const { storage } = await import('../storage');
      
      // Check XAI API key
      const xaiKeyData = await storage.getSetting('XAI_API_KEY');
      const hasApiKey = !!xaiKeyData?.value;

      // Check AI feature settings
      const taskGenData = await storage.getSetting('ai_task_generation');
      const autoAssignData = await storage.getSetting('ai_auto_assignment');
      const intelligentSchedulingData = await storage.getSetting('ai_intelligent_scheduling');

      const aiFeatures = {
        taskGeneration: taskGenData?.value === 'true',
        autoAssignment: autoAssignData?.value === 'true',
        intelligentScheduling: intelligentSchedulingData?.value === 'true'
      };

      // Test AI connection if API key exists
      let testResult = { success: false, message: 'کلید API تنظیم نشده' };
      if (hasApiKey) {
        try {
          const { XAIGrokEngine } = await import('../services/xai-grok-engine');
          const aiEngine = new XAIGrokEngine();
          await aiEngine.testConnection();
          testResult = { success: true, message: 'اتصال به Grok AI برقرار شد' };
        } catch (testError) {
          testResult = { success: false, message: 'خطا در اتصال به Grok AI' };
        }
      }

      res.json({
        success: true,
        status: 'operational',
        ai: {
          apiKey: hasApiKey,
          connection: testResult.success ? 'connected' : 'disconnected',
          features: aiFeatures,
          testResult,
          authorizedBot: AUTHORIZED_BOT_ID,
          lastChecked: new Date().toISOString()
        },
        telegram: {
          botInitialized: !!telegramService,
          authorizedBot: AUTHORIZED_BOT_ID
        }
      });

    } catch (error: unknown) {
      console.error('❌ PHASE 8C: Error checking AI status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'خطا در بررسی وضعیت AI',
        error: errorMessage
      });
    }
  });

  // ==================== STATUS ENDPOINTS ====================

  // Get Telegram bot status


  // Comprehensive Telegram validation and testing
  app.post('/api/telegram/comprehensive-test', authMiddleware, async (req, res) => {
    try {
      console.log('🧪 PHASE 8C: Starting comprehensive Telegram test...');
      
      const { storage } = await import('../storage');
      
      // 1. Check bot token
      const botTokenData = await storage.getSetting('telegram_bot_token');
      if (!botTokenData?.value) {
        return res.status(400).json({
          success: false,
          message: 'توکن ربات تنظیم نشده است',
          tests: { tokenCheck: false }
        });
      }

      // 2. Check chat ID
      const chatIdData = await storage.getSetting('telegram_chat_id');
      if (!chatIdData?.value) {
        return res.status(400).json({
          success: false,
          message: 'شناسه چت تنظیم نشده است',
          tests: { tokenCheck: true, chatIdCheck: false }
        });
      }

      // 3. Initialize service
      if (!telegramService) {
        await initializeTelegramService();
      }

      if (!telegramService) {
        return res.status(500).json({
          success: false,
          message: 'خطا در راه‌اندازی سرویس تلگرام',
          tests: { tokenCheck: true, chatIdCheck: true, serviceInit: false }
        });
      }

      // 4. Test bot connection
      const botInfo = await telegramService.apiRequest('getMe');

      // 5. Test template formatting
      const templateData = await storage.getSetting('telegram_template');
      const template = templateData?.value || getDefaultTelegramTemplate();
      
      const testData = {
        representative_name: 'احمد محمدی (تست جامع)',
        shop_owner: 'فروشگاه نمونه',
        panel_id: 'TEST_COMPREHENSIVE',
        amount: '750000',
        issue_date: '1403/12/15',
        status: 'پرداخت نشده',
        portal_link: `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'https://your-domain.com'}/portal`,
        invoice_number: 'INV_COMP_TEST'
      };

      const templateValidation = await telegramService.validateMessageTemplate(template, testData);

      // 6. Test actual message sending
      const messageSendTest = await telegramService.testActualMessageSend(parseInt(chatIdData.value));

      const allTestsPassed = templateValidation.isValid && messageSendTest;

      res.json({
        success: allTestsPassed,
        message: allTestsPassed ? 'تمام تست‌ها موفق بود' : 'برخی تست‌ها ناموفق',
        tests: {
          tokenCheck: true,
          chatIdCheck: true,
          serviceInit: true,
          botConnection: true,
          templateValidation: templateValidation.isValid,
          messageSending: messageSendTest
        },
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name
        },
        templateInfo: {
          length: templateValidation.length,
          missingVariables: templateValidation.missingVariables,
          formattedPreview: templateValidation.formattedMessage.substring(0, 200) + '...'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('❌ PHASE 8C: Comprehensive test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({
        success: false,
        message: 'خطا در تست جامع تلگرام',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/api/telegram/status', authMiddleware, async (req, res) => {
    try {
      // Try to initialize if not already done
      if (!telegramService) {
        await initializeTelegramService();
      }
      
      res.json({
        success: true,
        status: telegramService ? 'connected' : 'disconnected',
        botInitialized: !!telegramService,
        authorizedBot: '@Dsyrhshnmdbot',
        securityStatus: 'validated',
        lastUpdate: new Date().toISOString()
      });
    } catch (error: unknown) {
      console.error('❌ Error getting telegram status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Error getting telegram status',
        error: errorMessage
      });
    }
  });

  // Get Telegram settings
  app.get('/api/telegram/settings', authMiddleware, async (req, res) => {
    try {
      res.json({
        success: true,
        settings: {
          configured: !!telegramService,
          pollingEnabled: true,
          webhookEnabled: false
        }
      });
    } catch (error: unknown) {
      console.error('❌ Error getting telegram settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Error getting telegram settings',
        error: errorMessage
      });
    }
  });

// AI message processing endpoint
  app.post('/api/telegram/process-ai-message', authMiddleware, async (req, res) => {
    try {
      const { message, groupType, employeeId } = req.body;

      if (!telegramService) {
        return res.status(400).json({
          success: false,
          processed: false,
          message: 'ربات تلگرام فعال نیست'
        });
      }

      // Process message with AI
      const aiResponse = await telegramService.processAIMessage(message, {
        groupType,
        employeeId
      });

      res.json({
        success: true,
        processed: true,
        analysis: aiResponse,
        timestamp: new Date().toISOString()
      });

    } catch (error: unknown) {
      console.error('❌ Error in AI message processing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        processed: false,
        error: errorMessage
      });
    }
  });

  // Test message template formatting
  app.post('/api/telegram/test-template', authMiddleware, async (req, res) => {
    try {
      const { template, testData } = req.body;

      if (!template || !testData) {
        return res.status(400).json({
          success: false,
          message: 'قالب و داده‌های تست الزامی است'
        });
      }

      // Test template with sample data
      let formattedMessage = template
        .replace(/{representative_name}/g, testData.representativeName || 'احمد محمدی')
        .replace(/{shop_owner}/g, testData.shopOwner || 'فروشگاه نمونه')
        .replace(/{panel_id}/g, testData.panelId || 'PANEL_001')
        .replace(/{amount}/g, testData.amount || '1000000')
        .replace(/{issue_date}/g, testData.issueDate || '1403/12/15')
        .replace(/{status}/g, testData.status || 'پرداخت نشده')
        .replace(/{portal_link}/g, testData.portalLink || 'https://example.com/portal')
        .replace(/{invoice_number}/g, testData.invoiceNumber || 'INV_001')
        .replace(/{resend_indicator}/g, '');

      res.json({
        success: true,
        formattedMessage,
        length: formattedMessage.length,
        hasAllVariables: !formattedMessage.includes('{')
      });

    } catch (error: unknown) {
      console.error('❌ Error testing template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'خطا در تست قالب',
        error: errorMessage
      });
    }
  });

  // Test Telegram bot connection
  app.post('/api/telegram/test-connection', authMiddleware, async (req, res) => {
    try {
      console.log('🔍 PHASE 8C: Testing telegram connection...');
      
      if (!telegramService) {
        const initialized = await initializeTelegramService();
        if (!initialized) {
          console.error('❌ PHASE 8C: Failed to initialize telegram service');
          return res.status(400).json({
            success: false,
            message: 'ربات تلگرام تنظیم نشده است - لطفاً توکن معتبر وارد کنید'
          });
        }
      }

      // Test with getMe API call
      console.log('🤖 PHASE 8C: Calling Telegram getMe API...');
      const botInfo = await telegramService.apiRequest('getMe');
      
      console.log('✅ PHASE 8C: Telegram connection successful:', {
        id: botInfo.id,
        username: botInfo.username,
        is_bot: botInfo.is_bot
      });
      
      // Test actual message sending if chatId is available
      const { storage } = await import('../storage');
      const chatIdData = await storage.getSetting('telegram_chat_id');
      let messageSentTest = false;
      
      if (chatIdData?.value) {
        try {
          messageSentTest = await telegramService.testActualMessageSend(parseInt(chatIdData.value));
        } catch (sendError) {
          console.warn('⚠️ PHASE 8C: Message send test failed:', sendError);
        }
      }

      res.json({
        success: true,
        message: 'اتصال موفق - ربات آماده است',
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
          is_bot: botInfo.is_bot
        },
        tests: {
          apiConnection: true,
          messageSending: messageSentTest,
          chatIdConfigured: !!chatIdData?.value
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: unknown) {
      console.error('❌ PHASE 8C: Telegram connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let userMessage = 'خطا در اتصال تلگرام';
      if (errorMessage.includes('401')) {
        userMessage = 'توکن ربات نامعتبر است';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'زمان اتصال تمام شد - لطفاً مجدداً تلاش کنید';
      } else if (errorMessage.includes('network')) {
        userMessage = 'مشکل در اتصال شبکه';
      }
      
      res.status(500).json({
        success: false,
        message: userMessage,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

}

// ==================== HELPER FUNCTIONS ====================

async function createTaskFromMessage(parsedMessage: any, employeeId: number, messageId: number) {
  try {
    const [newTask] = await db.insert(employeeTasks).values({
      title: `Task from ${parsedMessage.type}`,
      description: JSON.stringify(parsedMessage.data),
      type: 'telegram_command',
      priority: 'medium',
      status: 'pending',
      assignedToId: employeeId,
      createdById: employeeId,
      metadata: { sourceMessageId: messageId }
    }).returning();

    // Update message to link the created task
    await db.update(telegramMessages)
      .set({ 
        taskCreated: true, 
        createdTaskId: newTask.id 
      })
      .where(eq(telegramMessages.id, messageId));

  } catch (error) {
    console.error('Error creating task from message:', error);
  }
}

