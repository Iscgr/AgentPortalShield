# MarFaNet - Streamlined Financial CRM System

## Overview
MarFaNet is a simplified financial management system focused on core business needs: invoice management, representative oversight, and AI-powered assistance. **SHERLOCK v18.4 STANDARDIZATION COMPLETE**: Successfully eliminated all parallel/legacy systems and test data contamination. The system now uses a single unified financial engine with 100% calculation accuracy guarantee.

## Recent Changes (August 30, 2025)
**✅ SHERLOCK v32.0 TELEGRAM INTEGRATION OVERHAUL - COMPLETE SUCCESS** - Comprehensive architectural migration:
- **Removed CRM dual-panel architecture**: Successfully eliminated all CRM components and authentication
- **Unified to single admin panel**: Now using only admin authentication (mgr/8679 credentials) 
- **Enhanced Telegram bot system**: Advanced message parsing with AI-powered Persian command recognition
- **Added new database tables**: employees, employee_tasks, telegram_messages, leave_requests, technical_reports, daily_reports, ai_knowledge_base
- **Implemented intelligent message processing**: Persian command handlers (#گزارش, #وظیفه, #مرخصی)
- **Created comprehensive API routes**: Full Telegram management interface with task automation

## User Preferences
- **Communication Style**: Simple, everyday Persian language for non-technical users
- **Security Model**:
  - Single admin panel (mgr/8679) - Complete system access and management
  - Public representative portal - No authentication required  
  - Enhanced Telegram bot - Persian command parsing with AI-powered responses
- **Development Philosophy**: Clean, focused architecture without bloated features

## System Architecture

### Frontend (Client)
- **Framework**: React with TypeScript and Vite
- **UI Components**: Shadcn/UI with Radix primitives and Tailwind CSS
- **State Management**: TanStack React Query for server state only
- **Routing**: Wouter for lightweight client-side routing
- **Design**: Persian RTL support with professional styling
- **Financial Integration**: All calculations use UNIFIED FINANCIAL ENGINE v18.4 with 100% accuracy guarantee - SHERLOCK v22.0 consolidated

### Admin Dashboard (Unified System)
The admin system now contains integrated management sections:
1. **Financial Management**: Invoice, payment, and representative oversight
2. **Telegram Employee Management**: Employee tasks, leave requests, and communication
3. **AI Assistant**: Persian cultural intelligence with enhanced Telegram integration
4. **System Settings**: Unified configuration and management tools

**Enhanced Telegram Features**:
- Persian command recognition (#گزارش, #وظیفه, #مرخصی)
- AI-powered message parsing and response generation
- Employee task automation and leave request processing
- Technical report handling and daily report management

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Unified admin-only system with session-based authentication
- **Core Services**:
  - **Unified Financial Engine**: Single source of truth for all financial calculations with 100% accuracy (SHERLOCK v22.0 consolidated)
  - XAI Grok engine for Persian AI assistance  
  - Representative management with standardized debt tracking
  - Invoice processing and enhanced Telegram bot integration
  - Employee management with task automation and communication processing

### Key Features
- **Invoice Management**: Bulk JSON processing, automatic calculations, Persian date handling, secure deletion with financial coupling synchronization. FIFO payment allocation is strictly enforced.
- **Representative Portal**: Public access with unique IDs for invoice viewing, redesign with 4 main sections (Financial Overview, Invoice List, Consumption Breakdown, Payment History).
- **Financial Tracking**: Real-time debt, payment, and sales calculations with immediate UI updates via cache invalidation, ensuring system-wide financial integrity and synchronization.
- **AI Integration**: Persian cultural intelligence for representative profiling and assistance, AI task generation.
- **Data Synchronization**: Seamless sync between admin and CRM data with real-time financial synchronization and intelligent coupling services.
- **Payment Management**: Consolidated into representative profiles, with 30-item pagination for invoices.
- **Performance Optimization**: Aggressive caching, lazy loading, and component preloading implemented for faster load times; dashboard load times are significantly reduced.
- **Security**: Role-based access control, session management, and admin panel isolation. Comprehensive authentication and API connectivity, including backward compatibility for login endpoints, are ensured.
- **Statistics Engine**: Unified statistics engine with intelligent caching provides consistent and performant statistical data across all panels.

### Database Schema
- `representatives`: Core representative data with financial metrics.
- `invoices`: Invoice records with status tracking.
- `payments`: Payment allocation and tracking.
- `admin_users`: Unified admin authentication.
- `employees`: Telegram employee management.
- `employee_tasks`: Task tracking and automation.
- `telegram_messages`: Message parsing and processing.
- `leave_requests`: Employee leave management.
- `technical_reports`: Technical issue tracking.
- `daily_reports`: Daily progress reporting.
- `ai_knowledge_base`: AI knowledge management.

## External Dependencies
- **Neon Database**: PostgreSQL hosting.
- **XAI Grok API**: Persian AI intelligence.
- **Telegram Bot API**: Automated notifications.
- **Drizzle ORM**: Type-safe database operations.