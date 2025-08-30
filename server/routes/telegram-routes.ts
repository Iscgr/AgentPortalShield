/**
 * 🤖 MarFaNet Telegram Management Routes
 * SHERLOCK v32.0: Advanced Telegram Bot Integration with AI-powered message parsing
 * 
 * Features:
 * - Employee management and authentication
 * - Message parsing and command handling
 * - Task generation and management
 * - Leave request processing
 * - Technical report handling
 * - Daily report management
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

let telegramService: EnhancedTelegramService | null = null;

// ==================== VALIDATION SCHEMAS ====================

const webhookUpdateSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional()
    }),
    chat: z.object({
      id: z.number(),
      title: z.string().optional(),
      type: z.enum(['private', 'group', 'supergroup', 'channel'])
    }),
    date: z.number(),
    text: z.string().optional()
  }).optional(),
  edited_message: z.object({}).optional(),
  callback_query: z.object({}).optional()
});

const configSchema = z.object({
  token: z.string().min(1),
  webhook_url: z.string().url().optional(),
  use_polling: z.boolean().default(false),
  polling_timeout: z.number().default(60)
});

// ==================== TELEGRAM ROUTES ====================

export function registerTelegramRoutes(app: Express, authMiddleware: any) {
  
  // ==================== BOT CONFIGURATION ====================
  
  // Configure Telegram bot
  app.post('/api/telegram/config', authMiddleware, async (req, res) => {
    try {
      const config = configSchema.parse(req.body);
      
      // Initialize or reinitialize telegram service
      telegramService = new EnhancedTelegramService(config.token, {
        useWebhook: !config.use_polling,
        webhookUrl: config.webhook_url,
        pollingTimeout: config.polling_timeout
      });
      
      if (config.use_polling) {
        // Start polling
        await telegramService.startPolling(async (update) => {
          await handleTelegramUpdate(update);
        });
        
        res.json({
          success: true,
          message: 'Telegram bot configured with polling',
          mode: 'polling'
        });
      } else if (config.webhook_url) {
        // Set webhook
        await telegramService.setWebhook(config.webhook_url);
        
        res.json({
          success: true,
          message: 'Telegram bot configured with webhook',
          mode: 'webhook',
          webhook_url: config.webhook_url
        });
      } else {
        res.status(400).json({
          error: 'Either enable polling or provide webhook URL'
        });
      }
    } catch (error) {
      console.error('Error configuring Telegram bot:', error);
      res.status(500).json({
        error: 'Failed to configure Telegram bot',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Webhook endpoint
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const update = webhookUpdateSchema.parse(req.body);
      await handleTelegramUpdate(update);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(200).json({ ok: true }); // Telegram requires 200 even on errors
    }
  });
  
  // ==================== EMPLOYEE MANAGEMENT ====================
  
  // Get all employees
  app.get('/api/telegram/employees', authMiddleware, async (req, res) => {
    try {
      const allEmployees = await db.select().from(employees).orderBy(desc(employees.createdAt));
      res.json({ employees: allEmployees });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });
  
  // Add new employee
  app.post('/api/telegram/employees', authMiddleware, async (req, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      const [newEmployee] = await db.insert(employees).values(employeeData).returning();
      
      res.json({
        success: true,
        message: 'Employee added successfully',
        employee: newEmployee
      });
    } catch (error) {
      console.error('Error adding employee:', error);
      res.status(500).json({
        error: 'Failed to add employee',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Update employee
  app.put('/api/telegram/employees/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employeeData = insertEmployeeSchema.partial().parse(req.body);
      
      const [updatedEmployee] = await db
        .update(employees)
        .set({ ...employeeData, updatedAt: new Date() })
        .where(eq(employees.id, id))
        .returning();
      
      if (!updatedEmployee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      
      res.json({
        success: true,
        message: 'Employee updated successfully',
        employee: updatedEmployee
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });
  
  // ==================== TASK MANAGEMENT ====================
  
  // Get tasks
  app.get('/api/telegram/tasks', authMiddleware, async (req, res) => {
    try {
      const tasks = await db.select().from(employeeTasks).orderBy(desc(employeeTasks.createdAt));
      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });
  
  // Create task
  app.post('/api/telegram/tasks', authMiddleware, async (req, res) => {
    try {
      const taskData = insertEmployeeTaskSchema.parse(req.body);
      const [newTask] = await db.insert(employeeTasks).values(taskData).returning();
      
      res.json({
        success: true,
        message: 'Task created successfully',
        task: newTask
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });
  
  // Update task status
  app.put('/api/telegram/tasks/:id/status', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const [updatedTask] = await db
        .update(employeeTasks)
        .set({ 
          status, 
          updatedAt: new Date(),
          completedAt: status === 'completed' ? new Date() : null
        })
        .where(eq(employeeTasks.id, id))
        .returning();
      
      if (!updatedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json({
        success: true,
        message: 'Task status updated successfully',
        task: updatedTask
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ error: 'Failed to update task status' });
    }
  });
  
  // ==================== MESSAGE MANAGEMENT ====================
  
  // Get telegram messages
  app.get('/api/telegram/messages', authMiddleware, async (req, res) => {
    try {
      const messages = await db.select().from(telegramMessages).orderBy(desc(telegramMessages.receivedAt));
      res.json({ messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });
  
  // ==================== LEAVE REQUESTS ====================
  
  // Get leave requests
  app.get('/api/telegram/leave-requests', authMiddleware, async (req, res) => {
    try {
      const requests = await db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
      res.json({ leaveRequests: requests });
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
  });
  
  // Approve/Deny leave request
  app.put('/api/telegram/leave-requests/:id/review', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, reviewComment } = req.body;
      
      const [updatedRequest] = await db
        .update(leaveRequests)
        .set({
          status,
          reviewComment,
          reviewedAt: new Date(),
          reviewedById: req.session?.user?.id || 1 // Admin user ID
        })
        .where(eq(leaveRequests.id, id))
        .returning();
      
      if (!updatedRequest) {
        return res.status(404).json({ error: 'Leave request not found' });
      }
      
      // Send response to employee via Telegram
      if (telegramService) {
        // Find employee and send notification
        // Implementation will be added later
      }
      
      res.json({
        success: true,
        message: 'Leave request reviewed successfully',
        leaveRequest: updatedRequest
      });
    } catch (error) {
      console.error('Error reviewing leave request:', error);
      res.status(500).json({ error: 'Failed to review leave request' });
    }
  });
  
  // ==================== TECHNICAL REPORTS ====================
  
  // Get technical reports
  app.get('/api/telegram/technical-reports', authMiddleware, async (req, res) => {
    try {
      const reports = await db.select().from(technicalReports).orderBy(desc(technicalReports.createdAt));
      res.json({ technicalReports: reports });
    } catch (error) {
      console.error('Error fetching technical reports:', error);
      res.status(500).json({ error: 'Failed to fetch technical reports' });
    }
  });
  
  // ==================== DAILY REPORTS ====================
  
  // Get daily reports
  app.get('/api/telegram/daily-reports', authMiddleware, async (req, res) => {
    try {
      const reports = await db.select().from(dailyReports).orderBy(desc(dailyReports.createdAt));
      res.json({ dailyReports: reports });
    } catch (error) {
      console.error('Error fetching daily reports:', error);
      res.status(500).json({ error: 'Failed to fetch daily reports' });
    }
  });
  
  // ==================== STATISTICS ====================
  
  // Get telegram statistics
  app.get('/api/telegram/statistics', authMiddleware, async (req, res) => {
    try {
      const stats = {
        totalEmployees: await db.select().from(employees).then(rows => rows.length),
        activeTasks: await db.select().from(employeeTasks).where(eq(employeeTasks.status, 'pending')).then(rows => rows.length),
        pendingLeaveRequests: await db.select().from(leaveRequests).where(eq(leaveRequests.status, 'pending')).then(rows => rows.length),
        unprocessedMessages: await db.select().from(telegramMessages).where(eq(telegramMessages.processed, false)).then(rows => rows.length),
        dailyReportsToday: await db.select().from(dailyReports).where(eq(dailyReports.reportDate, new Date().toLocaleDateString('fa-IR'))).then(rows => rows.length)
      };
      
      res.json({ statistics: stats });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });
}

// ==================== TELEGRAM UPDATE HANDLER ====================

async function handleTelegramUpdate(update: any) {
  try {
    console.log('🤖 Processing Telegram update:', update.parsedMessage?.type || 'unknown');
    
    const parsedMessage = update.parsedMessage;
    const entities = update.extractedEntities;
    const commandResponse = update.commandResponse;
    
    if (!parsedMessage) return;
    
    // Find or create employee
    let employee = await db.select().from(employees)
      .where(eq(employees.telegramId, parsedMessage.employeeId.toString()))
      .then(rows => rows[0]);
    
    if (!employee) {
      // Create new employee
      const [newEmployee] = await db.insert(employees).values({
        telegramId: parsedMessage.employeeId.toString(),
        firstName: parsedMessage.employeeName.split(' ')[0],
        lastName: parsedMessage.employeeName.split(' ')[1] || '',
        username: parsedMessage.employeeName,
        isActive: true
      }).returning();
      employee = newEmployee;
    }
    
    // Save telegram message
    const [savedMessage] = await db.insert(telegramMessages).values({
      messageId: parsedMessage.messageId.toString(),
      chatId: update.originalUpdate.message?.chat?.id?.toString() || '',
      fromUserId: parsedMessage.employeeId.toString(),
      employeeId: employee.id,
      text: parsedMessage.data?.content || '',
      messageType: parsedMessage.type,
      parsedData: parsedMessage.data,
      entities: entities,
      processed: true,
      responseRequired: !!commandResponse,
      responseText: commandResponse?.responseText,
      receivedAt: new Date(parsedMessage.timestamp * 1000),
      processedAt: new Date()
    }).returning();
    
    // Handle specific message types
    switch (parsedMessage.type) {
      case 'leave_request':
        await handleLeaveRequest(parsedMessage, employee.id, savedMessage.id);
        break;
      case 'technical_report':
        await handleTechnicalReport(parsedMessage, employee.id, savedMessage.id);
        break;
      case 'daily_report':
        await handleDailyReport(parsedMessage, employee.id, savedMessage.id);
        break;
    }
    
    // Create task if needed
    if (commandResponse?.createTask) {
      await createTaskFromMessage(parsedMessage, employee.id, savedMessage.id);
    }
    
    // Send response if needed
    if (commandResponse?.shouldRespond && telegramService) {
      await telegramService.sendMessage(
        update.originalUpdate.message.chat.id,
        commandResponse.responseText
      );
      
      // Update message as responded
      await db.update(telegramMessages)
        .set({ responseSent: true })
        .where(eq(telegramMessages.id, savedMessage.id));
    }
    
  } catch (error) {
    console.error('Error handling Telegram update:', error);
  }
}

async function handleLeaveRequest(parsedMessage: any, employeeId: number, messageId: number) {
  try {
    await db.insert(leaveRequests).values({
      employeeId,
      telegramMessageId: messageId,
      requestDate: parsedMessage.data.date,
      duration: parsedMessage.data.duration,
      reason: parsedMessage.data.reason,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error handling leave request:', error);
  }
}

async function handleTechnicalReport(parsedMessage: any, employeeId: number, messageId: number) {
  try {
    await db.insert(technicalReports).values({
      employeeId,
      telegramMessageId: messageId,
      issue: parsedMessage.data.issue,
      status: parsedMessage.data.status || 'reported',
      priority: 'medium'
    });
  } catch (error) {
    console.error('Error handling technical report:', error);
  }
}

async function handleDailyReport(parsedMessage: any, employeeId: number, messageId: number) {
  try {
    await db.insert(dailyReports).values({
      employeeId,
      telegramMessageId: messageId,
      reportDate: new Date().toLocaleDateString('fa-IR'),
      tasks: parsedMessage.data.tasks || []
    });
  } catch (error) {
    console.error('Error handling daily report:', error);
  }
}

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