
-- MarFaNet Architecture Migration - Database Schema
-- Migration Script: 001_marfanet_migration.sql

-- AI Settings Table
CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grok_api_key TEXT NOT NULL,
  grok_api_endpoint TEXT NOT NULL DEFAULT 'https://api.grok.x.ai/v1',
  ai_temperature REAL NOT NULL DEFAULT 0.7 CHECK(ai_temperature >= 0.0 AND ai_temperature <= 1.0),
  ai_max_tokens INTEGER NOT NULL DEFAULT 4096 CHECK(ai_max_tokens > 0),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for ai_settings updated_at
CREATE TRIGGER IF NOT EXISTS update_ai_settings_timestamp 
  AFTER UPDATE ON ai_settings
  FOR EACH ROW
BEGIN
  UPDATE ai_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Telegram Activities Table
CREATE TABLE IF NOT EXISTS telegram_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE NOT NULL,
  chat_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN (
    'daily_report', 'technical_report', 'leave_request', 
    'follow_up', 'task_request', 'general_message'
  )),
  content TEXT NOT NULL,
  parsed_data JSON,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_processed BOOLEAN NOT NULL DEFAULT FALSE,
  ai_response_id TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ai_response_id) REFERENCES telegram_activities(message_id) ON DELETE SET NULL
);

-- Create indexes for telegram_activities
CREATE INDEX IF NOT EXISTS idx_telegram_activities_user_id ON telegram_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_activities_message_type ON telegram_activities(message_type);
CREATE INDEX IF NOT EXISTS idx_telegram_activities_processed ON telegram_activities(processed);
CREATE INDEX IF NOT EXISTS idx_telegram_activities_created_at ON telegram_activities(created_at);

-- CRM Employees Table
CREATE TABLE IF NOT EXISTS crm_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  telegram_username TEXT UNIQUE,
  telegram_id TEXT UNIQUE NOT NULL,
  position TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  permission_level INTEGER NOT NULL DEFAULT 1 CHECK(permission_level >= 1 AND permission_level <= 3),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for crm_employees updated_at
CREATE TRIGGER IF NOT EXISTS update_crm_employees_timestamp 
  AFTER UPDATE ON crm_employees
  FOR EACH ROW
BEGIN
  UPDATE crm_employees SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- CRM Tasks Table
CREATE TABLE IF NOT EXISTS crm_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to_id INTEGER NOT NULL,
  representative_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending', 'in_progress', 'completed', 'cancelled'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN (
    'manual', 'ai_generated', 'telegram', 'system'
  )),
  due_date DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (assigned_to_id) REFERENCES crm_employees(id) ON DELETE CASCADE,
  FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL
);

-- Create indexes for crm_tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_representative ON crm_tasks(representative_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_priority ON crm_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);

-- Create trigger for crm_tasks updated_at
CREATE TRIGGER IF NOT EXISTS update_crm_tasks_timestamp 
  AFTER UPDATE ON crm_tasks
  FOR EACH ROW
BEGIN
  UPDATE crm_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- AI Directives Table
CREATE TABLE IF NOT EXISTS ai_directives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  directive_type TEXT NOT NULL CHECK(directive_type IN (
    'general', 'task_generation', 'response_style', 'follow_up', 'performance_evaluation'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_time DATETIME,
  expiry_time DATETIME,
  priority INTEGER NOT NULL DEFAULT 10 CHECK(priority >= 1 AND priority <= 100),
  created_by INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Validation: scheduled directives must have schedule_time
  CHECK(NOT scheduled OR schedule_time IS NOT NULL),
  -- Validation: schedule_time must be in future if set
  CHECK(schedule_time IS NULL OR schedule_time > CURRENT_TIMESTAMP)
);

-- Create indexes for ai_directives
CREATE INDEX IF NOT EXISTS idx_ai_directives_type ON ai_directives(directive_type);
CREATE INDEX IF NOT EXISTS idx_ai_directives_active ON ai_directives(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_directives_schedule ON ai_directives(schedule_time);
CREATE INDEX IF NOT EXISTS idx_ai_directives_priority ON ai_directives(priority);

-- Create trigger for ai_directives updated_at
CREATE TRIGGER IF NOT EXISTS update_ai_directives_timestamp 
  AFTER UPDATE ON ai_directives
  FOR EACH ROW
BEGIN
  UPDATE ai_directives SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert default AI settings
INSERT OR IGNORE INTO ai_settings (id, grok_api_key, grok_api_endpoint, ai_temperature, ai_max_tokens)
VALUES (1, '', 'https://api.grok.x.ai/v1', 0.7, 4096);

-- Insert default AI directives
INSERT OR IGNORE INTO ai_directives (
  title, content, directive_type, is_active, priority, created_by
) VALUES 
(
  'دستورالعمل کلی CRM Assistant',
  'شما یک دستیار CRM هوشمند برای سیستم MarFaNet هستید. وظیفه شما کمک به پردازش گزارش‌های روزانه کارمندان، تولید وظایف مناسب، و ارائه پاسخ‌های مفید و محترمانه به زبان فارسی است. همیشه پاسخ‌های خود را به صورت حرفه‌ای و سازنده ارائه دهید.',
  'general',
  TRUE,
  100,
  1
),
(
  'دستورالعمل تولید وظایف',
  'هنگام تولید وظایف جدید، اولویت‌بندی صحیح و تعیین مهلت مناسب را در نظر بگیرید. وظایف مرتبط با نمایندگان پرمخاطره و بدهکاران باید اولویت بالاتری داشته باشند. همیشه توضیحات واضح و قابل اجرا ارائه دهید.',
  'task_generation',
  TRUE,
  90,
  1
),
(
  'سبک پاسخ‌دهی',
  'در پاسخ‌دهی به کارمندان، از زبان محترمانه و حرفه‌ای استفاده کنید. پاسخ‌ها باید کوتاه، مفید و قابل فهم باشند. در صورت نیاز، راهنمایی‌های عملی ارائه دهید.',
  'response_style',
  TRUE,
  80,
  1
);

-- Migration completion log
INSERT INTO ai_directives (
  title, content, directive_type, is_active, priority, created_by
) VALUES (
  'Migration Log - ' || datetime('now'),
  'MarFaNet Architecture Migration completed successfully. New CRM Assistant system is now active.',
  'general',
  FALSE,
  1,
  1
);
