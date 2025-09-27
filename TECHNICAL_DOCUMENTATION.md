
# MarFaNet Financial Management System - Technical Documentation

## 🏗️ System Architecture Overview

MarFaNet is a comprehensive financial management system built with modern full-stack architecture for managing invoices, representatives, payments, and financial operations.

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: Shadcn/UI + Tailwind CSS
- **State Management**: TanStack React Query
- **Authentication**: Session-based with bcrypt

## 📐 Application Structure

### Frontend Architecture (`client/`)
```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (header, sidebar)
│   │   └── ui/             # Shadcn/UI components
│   ├── contexts/           # React contexts (auth)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configurations
│   ├── pages/              # Page components
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
└── index.html              # HTML template
```

### Backend Architecture (`server/`)
```
server/
├── middleware/             # Express middleware
├── routes/                 # API route handlers
├── services/               # Business logic services
├── types/                  # TypeScript type definitions
├── db.ts                   # Database configuration
├── index.ts                # Server entry point
├── routes.ts               # Main router configuration
├── storage.ts              # Data access layer
└── vite.ts                 # Development server setup
```

### Shared Architecture (`shared/`)
```
shared/
└── schema.ts               # Database schema definitions
```

## 🗄️ Database Schema

### Core Entities

#### Representatives (نمایندگان)
```typescript
representatives {
  id: serial (primary key)
  code: text (unique)         // REP-001, mntzresf, etc.
  name: text                  // Shop name
  ownerName: text             // صاحب فروشگاه
  panelUsername: text         // یوزرنیم ادمین پنل
  phone: text
  telegramId: text
  publicId: text (unique)     // For public portal access
  salesPartnerId: integer     // همکار فروش معرف
  isActive: boolean
  totalDebt: decimal
  totalSales: decimal
  credit: decimal
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Invoices (فاکتورها)
```typescript
invoices {
  id: serial (primary key)
  invoiceNumber: text (unique)
  representativeId: integer (foreign key)
  batchId: integer            // ارتباط با دسته فاکتور
  amount: decimal
  issueDate: text             // Persian date: 1404/4/30
  dueDate: text
  status: text                // unpaid, paid, overdue
  usageData: json             // Raw JSON data from uploaded file
  sentToTelegram: boolean
  telegramSentAt: timestamp
  telegramSendCount: integer
  createdAt: timestamp
}
```

#### Payments (پرداخت‌ها)
```typescript
payments {
  id: serial (primary key)
  representativeId: integer (foreign key)
  invoiceId: integer (foreign key)
  amount: text
  paymentDate: text           // Persian date
  description: text
  isAllocated: boolean
  createdAt: timestamp
}
```

#### Sales Partners (همکاران فروش)
```typescript
salesPartners {
  id: serial (primary key)
  name: text
  phone: text
  email: text
  commissionRate: decimal     // نرخ کمیسیون درصدی
  totalCommission: decimal
  isActive: boolean
  createdAt: timestamp
}
```

## 🔐 Authentication System

### Admin Authentication
- Session-based authentication using express-session
- Password hashing with bcrypt
- Default admin: `mgr` / `8679`
- Role-based permissions system

### Public Portal Access
- No authentication required
- Access via unique `publicId` for each representative
- URL pattern: `/portal/{publicId}`

## 🛠️ Core Services

### Financial Engine (`unified-financial-engine.ts`)
- Calculates real-time financial data
- Handles debt calculations and payment allocations
- Ensures financial data consistency
- FIFO (First In, First Out) payment allocation

### Telegram Service (`enhanced-telegram-service.ts`)
- Automated invoice notifications
- Multi-group support
- Persian language support
- Integrated with XAI Grok for AI responses

### Payment Allocation Engine (`enhanced-payment-allocation-engine.ts`)
- Automatic payment allocation to invoices
- Manual allocation capabilities
- FIFO principle implementation
- Transaction tracking and rollback support

### Invoice Processing (`standardized-invoice-engine.ts`)
- JSON file upload and processing
- Batch invoice creation
- Usage data parsing and validation
- Persian date handling

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout

### Dashboard
- `GET /api/dashboard` - Main dashboard data

### Representatives
- `GET /api/representatives` - List all representatives
- `GET /api/representatives/:code` - Get representative details
- `POST /api/representatives` - Create new representative
- `PUT /api/representatives/:id` - Update representative
- `DELETE /api/representatives/:id` - Delete representative

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Payments
- `GET /api/payments` - List all payments
- `POST /api/payments` - Create new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Public Portal
- `GET /api/public/portal/:publicId` - Get portal data

### Settings
- `GET /api/settings/:key` - Get setting value
- `POST /api/settings/:key` - Update setting

## 🎨 Frontend Components

### Layout Components
- `Header` - Top navigation with user controls
- `Sidebar` - Main navigation menu
- `AdminLayout` - Wrapper for admin pages

### Page Components
- `Dashboard` - Main dashboard with statistics
- `Representatives` - Representative management
- `InvoiceManagement` - Invoice operations
- `Settings` - System configuration
- `Portal` - Public representative portal

### UI Components
- Based on Shadcn/UI component library
- Tailwind CSS for styling
- Responsive design with mobile optimization
- Persian/RTL support

## 🔧 Development Setup

### Environment Variables
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
TELEGRAM_BOT_TOKEN=your-bot-token
```

### Development Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Push database schema
```

## 📱 Mobile Optimization

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Optimized for Android browsers
- PWA capabilities

### Performance Features
- Code splitting and lazy loading
- Optimized bundle size
- Efficient caching strategies
- Real-time data synchronization

## 🔒 Security Features

### Data Protection
- Input validation using Zod schemas
- SQL injection prevention
- XSS protection
- CSRF protection

### Access Control
- Role-based permissions
- Session management
- Secure password hashing
- API rate limiting

## 🚀 Deployment Architecture

### Production Setup
- Containerized deployment ready
- Environment-based configuration
- Database migration support
- Health check endpoints

### Monitoring
- Performance monitoring
- Error tracking
- Database health checks
- Memory usage monitoring

## 📊 Financial Calculation Logic

### Debt Calculation
```typescript
actualDebt = totalInvoiceAmount - totalAllocatedPayments
```

### Payment Allocation (FIFO)
1. Sort invoices by issue date (oldest first)
2. Allocate payment to oldest unpaid invoice
3. Continue until payment is fully allocated
4. Update invoice status accordingly

### Status Determination
- `paid`: totalPaid >= invoiceAmount
- `partial`: 0 < totalPaid < invoiceAmount
- `unpaid`: totalPaid = 0 AND not overdue
- `overdue`: totalPaid = 0 AND past due date

## 🔍 Code Quality Standards

### TypeScript Usage
- Strict type checking enabled
- Interface definitions for all entities
- Generic types for reusable components
- Comprehensive error handling

### Code Organization
- Modular architecture
- Single responsibility principle
- Clear separation of concerns
- Consistent naming conventions

### Testing Strategy
- Unit tests for core services
- Integration tests for API endpoints
- Component testing for UI
- End-to-end testing for critical flows

## 📈 Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Proper indexing
- Batch operations

### Frontend Optimization
- Component memoization
- Virtual scrolling for large lists
- Optimistic updates
- Efficient state management

### Backend Optimization
- Middleware optimization
- Response compression
- Caching strategies
- Error boundary implementation

## 🔮 Future Development Guidelines

### Scalability Considerations
- Microservices architecture preparation
- Database sharding strategies
- Load balancing implementation
- Caching layer enhancement

### Feature Extension Points
- Plugin architecture for custom features
- API versioning strategy
- Multi-tenant support preparation
- Advanced reporting capabilities

## 📝 Development Workflow

### Git Workflow
- Feature branch development
- Code review requirements
- Automated testing on CI/CD
- Semantic versioning

### Release Process
- Staging environment testing
- Database migration verification
- Performance benchmarking
- Security audit completion

This documentation serves as the complete technical reference for MarFaNet development and maintenance.
