
# 🏗️ نمودار معماری کامل سیستم MarFaNet

## 📊 معماری کلی سیستم

```mermaid
graph TB
    %% Entry Points
    A[User Access] --> B{Authentication Route}
    
    %% Authentication Layer
    B --> C["/auth - Unified Login Page<br/>unified-auth.tsx"]
    
    %% Authentication Decision
    C --> D{User Type Detection}
    D --> E[Admin Credentials<br/>mgr/8679]
    D --> F[CRM Credentials<br/>crm/8679]
    
    %% Panel Routing
    E --> G[Admin Panel<br/>Dashboard Route]
    F --> H[CRM Panel<br/>CRM Route]
    
    %% Admin Panel Structure
    G --> I[Admin Layout]
    I --> J[Sidebar Navigation]
    I --> K[Header Controls]
    I --> L[Main Content Area]
    
    %% Admin Features
    L --> M[Dashboard<br/>Financial Overview]
    L --> N[Representatives<br/>Management]
    L --> O[Invoices<br/>Processing]
    L --> P[Payments<br/>Management]
    L --> Q[Reports<br/>Analytics]
    L --> R[Settings<br/>Configuration]
    L --> S[AI Assistant<br/>Analysis]
    
    %% CRM Panel Structure
    H --> T[CRM Layout]
    T --> U[CRM Navigation]
    T --> V[CRM Header]
    T --> W[CRM Content]
    
    %% CRM Features
    W --> X[Representatives<br/>Limited View]
    W --> Y[Performance<br/>Analytics]
    W --> Z[Workspace<br/>Task Management]
    W --> AA[Settings<br/>CRM Config]
    
    %% Backend Services
    M --> BB[API Gateway<br/>Express.js]
    N --> BB
    O --> BB
    P --> BB
    Q --> BB
    R --> BB
    S --> BB
    X --> BB
    Y --> BB
    Z --> BB
    AA --> BB
    
    %% Data Layer
    BB --> CC[Database Layer<br/>PostgreSQL]
    BB --> DD[AI Services<br/>Gemini + XAI]
    BB --> EE[External APIs<br/>Telegram]
    
    style A fill:#e1f5fe
    style C fill:#fff3e0
    style G fill:#e8f5e8
    style H fill:#f3e5f5
    style BB fill:#fff8e1
    style CC fill:#fce4ec
```

## 🔐 Authentication Flow Diagram

```mermaid
sequenceDiagram
    participant U as User Browser
    participant A as Auth Component
    participant B as Express Backend
    participant S as Session Store
    participant D as Database
    
    %% Initial Access
    U->>A: Visit /auth
    A->>U: Show Unified Login UI
    
    %% Panel Selection
    U->>A: Select Panel Type
    A->>A: Switch to Login Form
    
    %% Credential Submission
    U->>A: Submit Credentials
    A->>B: POST /api/admin/login OR /api/crm/login
    
    %% Backend Validation
    B->>D: Validate Credentials
    D-->>B: User Data + Role
    B->>S: Create Session
    S-->>B: Session ID
    
    %% Response & Redirect
    B-->>A: Success + User Data
    A->>A: Set Auth Context
    A->>U: Redirect to Panel
    
    %% Panel Access
    alt Admin Panel
        U->>U: Navigate to /dashboard
    else CRM Panel
        U->>U: Navigate to /crm
    end
```

## 🏛️ Component Architecture Hierarchy

```mermaid
graph TB
    %% Root Application
    A[App.tsx<br/>Root Component] --> B[Router<br/>Wouter]
    
    %% Context Providers
    A --> C[AuthProvider<br/>Unified Auth Context]
    A --> D[QueryClientProvider<br/>TanStack Query]
    A --> E[TooltipProvider<br/>UI Framework]
    
    %% Route Components
    B --> F[UnifiedAuth<br/>Login Page]
    B --> G[AdminLayout<br/>Admin Panel]
    B --> H[CrmDashboard<br/>CRM Panel]
    B --> I[Portal<br/>Public Access]
    
    %% Admin Layout Structure
    G --> J[AdminSidebar<br/>Navigation]
    G --> K[AdminHeader<br/>User Controls]
    G --> L[AdminPages<br/>Content]
    
    %% Admin Pages
    L --> M[Dashboard.tsx]
    L --> N[Representatives.tsx]
    L --> O[InvoiceManagement.tsx]
    L --> P[PaymentManagement.tsx]
    L --> Q[Reports.tsx]
    L --> R[Settings.tsx]
    L --> S[AiAssistant.tsx]
    
    %% CRM Structure
    H --> T[CRM Navigation<br/>Tabs]
    H --> U[CRM Content<br/>Panels]
    
    %% CRM Panels
    U --> V[NewRepresentativesManager.tsx]
    U --> W[Performance Analytics]
    U --> X[WorkspaceHub.tsx]
    U --> Y[SettingsHub.tsx]
    
    %% Workspace Components
    X --> Z[TaskCard.tsx]
    X --> AA[ReportForm.tsx]
    X --> BB[RemindersPanel.tsx]
    
    style A fill:#e3f2fd
    style G fill:#e8f5e8
    style H fill:#f3e5f5
    style F fill:#fff3e0
```

## 🔄 Data Flow Architecture

```mermaid
graph LR
    %% Frontend Data Flow
    A[UI Components] --> B[React Query<br/>TanStack]
    B --> C[Axios Client<br/>HTTP Requests]
    C --> D[API Gateway<br/>Express Routes]
    
    %% Backend Processing
    D --> E[Middleware Layer<br/>Auth + Validation]
    E --> F[Service Layer<br/>Business Logic]
    F --> G[Storage Interface<br/>Database Operations]
    
    %% Data Persistence
    G --> H[PostgreSQL<br/>Database]
    H --> I[Tables Structure<br/>Representatives, Invoices, etc.]
    
    %% External Integrations
    F --> J[AI Services<br/>Gemini + XAI]
    F --> K[Telegram API<br/>Notifications]
    
    %% Response Flow
    I --> G
    G --> F
    J --> F
    K --> F
    F --> D
    D --> C
    C --> B
    B --> A
    
    style A fill:#e1f5fe
    style D fill:#fff8e1
    style H fill:#fce4ec
    style J fill:#f3e5f5
```

## 🗃️ Database Schema Architecture

```mermaid
erDiagram
    ADMIN_USERS {
        id SERIAL PK
        username VARCHAR
        password_hash VARCHAR
        role VARCHAR
        permissions TEXT_ARRAY
        created_at TIMESTAMP
    }
    
    CRM_USERS {
        id SERIAL PK
        username VARCHAR
        password_hash VARCHAR
        role VARCHAR
        permissions TEXT_ARRAY
        created_at TIMESTAMP
    }
    
    REPRESENTATIVES {
        id SERIAL PK
        name VARCHAR
        code VARCHAR
        total_debt DECIMAL
        public_id VARCHAR
        created_at TIMESTAMP
    }
    
    INVOICES {
        id SERIAL PK
        representative_id INTEGER FK
        amount DECIMAL
        status VARCHAR
        invoice_date DATE
        usage_data JSONB
        created_at TIMESTAMP
    }
    
    PAYMENTS {
        id SERIAL PK
        representative_id INTEGER FK
        amount DECIMAL
        payment_date DATE
        is_allocated BOOLEAN
        description TEXT
    }
    
    WORKSPACE_TASKS {
        id SERIAL PK
        title VARCHAR
        description TEXT
        assigned_to INTEGER FK
        representative_id INTEGER FK
        priority VARCHAR
        status VARCHAR
        due_date DATE
        created_at TIMESTAMP
    }
    
    TASK_REPORTS {
        id SERIAL PK
        task_id INTEGER FK
        report_content TEXT
        ai_analysis JSONB
        submitted_by INTEGER FK
        submitted_at TIMESTAMP
    }
    
    AI_LEARNING_PATTERNS {
        id SERIAL PK
        pattern_type VARCHAR
        data JSONB
        reliability_score DECIMAL
        created_at TIMESTAMP
    }
    
    REPRESENTATIVES ||--o{ INVOICES : "has"
    REPRESENTATIVES ||--o{ PAYMENTS : "receives"
    REPRESENTATIVES ||--o{ WORKSPACE_TASKS : "related_to"
    CRM_USERS ||--o{ WORKSPACE_TASKS : "assigned_to"
    WORKSPACE_TASKS ||--o{ TASK_REPORTS : "has"
    CRM_USERS ||--o{ TASK_REPORTS : "submitted_by"
```

## 🛣️ Routing Architecture

```mermaid
graph TB
    %% Root Routes
    A[/ Root] --> B[/auth Unified Login]
    A --> C[/dashboard Admin Panel]
    A --> D[/crm CRM Panel]
    A --> E[/portal/:publicId Public Portal]
    
    %% Admin Panel Routes
    C --> F[/dashboard Main Dashboard]
    C --> G[/representatives Management]
    C --> H[/invoices Processing]
    C --> I[/payments Management]
    C --> J[/sales-partners Partners]
    C --> K[/reports Analytics]
    C --> L[/settings Configuration]
    C --> M[/ai-assistant AI Tools]
    C --> N[/financial-integrity Audit]
    
    %% CRM Panel Routes (Internal Tabs)
    D --> O[Representatives Tab]
    D --> P[Performance Tab]
    D --> Q[Workspace Tab]
    D --> R[Settings Tab]
    
    %% API Routes
    A --> S[/api/* Backend APIs]
    S --> T[/api/admin/* Admin APIs]
    S --> U[/api/crm/* CRM APIs]
    S --> V[/api/portal/* Portal APIs]
    
    %% Admin API Endpoints
    T --> W[/api/admin/login]
    T --> X[/api/admin/representatives]
    T --> Y[/api/admin/invoices]
    T --> Z[/api/admin/payments]
    
    %% CRM API Endpoints
    U --> AA[/api/crm/login]
    U --> BB[/api/crm/representatives]
    U --> CC[/api/crm/tasks]
    U --> DD[/api/crm/reports]
    
    style B fill:#fff3e0
    style C fill:#e8f5e8
    style D fill:#f3e5f5
    style E fill:#e1f5fe
    style S fill:#fff8e1
```

## 🔧 Service Layer Architecture

```mermaid
graph TB
    %% Core Services
    A[Service Layer] --> B[Authentication Services]
    A --> C[Financial Services]
    A --> D[CRM Services]
    A --> E[AI Services]
    A --> F[Integration Services]
    
    %% Authentication
    B --> G[Admin Auth Service]
    B --> H[CRM Auth Service]
    B --> I[Session Management]
    
    %% Financial
    C --> J[Invoice Processing Engine]
    C --> K[Payment Management]
    C --> L[Debt Calculation]
    C --> M[Financial Integrity]
    
    %% CRM
    D --> N[Task Management]
    D --> O[Report Analysis]
    D --> P[Performance Analytics]
    D --> Q[Workspace Storage]
    
    %% AI
    E --> R[XAI Grok Engine]
    E --> S[Gemini AI Service]
    E --> T[Persian AI Engine]
    E --> U[Learning Patterns]
    
    %% Integrations
    F --> V[Telegram Service]
    F --> W[Storage Interface]
    F --> X[Health Monitoring]
    
    style A fill:#e3f2fd
    style C fill:#e8f5e8
    style D fill:#f3e5f5
    style E fill:#fff3e0
```

## 📱 Mobile Optimization Architecture

```mermaid
graph TB
    %% Mobile Detection
    A[User Access] --> B[Mobile Detection Hook]
    B --> C{Device Type}
    
    %% Mobile Path
    C --> D[Mobile Browser]
    D --> E[Mobile Optimized Components]
    E --> F[Touch Gesture System]
    E --> G[Mobile Navigation]
    E --> H[Adaptive Forms]
    
    %% Desktop Path
    C --> I[Desktop Browser]
    I --> J[Standard Components]
    J --> K[Mouse/Keyboard Interface]
    J --> L[Full Navigation]
    J --> M[Standard Forms]
    
    %% Mobile Features
    F --> N[Swipe Gestures]
    F --> O[Touch Feedback]
    G --> P[Bottom Navigation]
    G --> Q[Slide Panels]
    H --> R[Large Input Fields]
    H --> S[Touch Buttons]
    
    style D fill:#e8f5e8
    style I fill:#f3e5f5
    style E fill:#fff3e0
```

## 🔐 Security Architecture

```mermaid
graph TB
    %% Security Layers
    A[Request] --> B[CORS Middleware]
    B --> C[Security Headers]
    C --> D[Authentication Check]
    D --> E[Authorization Validation]
    E --> F[Input Sanitization]
    F --> G[Business Logic]
    
    %% Authentication Types
    D --> H{Auth Type}
    H --> I[Admin Session Auth]
    H --> J[CRM Session Auth]
    H --> K[Portal Public Access]
    
    %% Security Features
    C --> L[XSS Protection]
    C --> M[CSRF Protection]
    C --> N[Content Security Policy]
    F --> O[SQL Injection Prevention]
    F --> P[Input Validation]
    
    %% Session Management
    I --> Q[Admin Session Store]
    J --> R[CRM Session Store]
    K --> S[Public ID Validation]
    
    style D fill:#ffebee
    style F fill:#fff3e0
    style G fill:#e8f5e8
```

---

## 📋 خلاصه معماری

### 🎯 **نقاط ورودی:**
- `/auth` - صفحه ورود یکپارچه
- `/dashboard` - پنل مدیریت
- `/crm` - پنل CRM
- `/portal/:publicId` - پرتال عمومی

### 🔐 **سیستم احراز هویت:**
- **Admin**: `mgr/8679` یا `admin/8679`
- **CRM**: `crm/8679`
- **Portal**: دسترسی عمومی بدون احراز هویت

### 🏗️ **لایه‌های اصلی:**
1. **Frontend**: React + TypeScript + TanStack Query
2. **API Gateway**: Express.js + Middleware
3. **Service Layer**: Business Logic + AI Integration  
4. **Data Layer**: PostgreSQL + Drizzle ORM

### 🤖 **خدمات هوشمند:**
- **XAI Grok Engine**: تحلیل و تولید محتوا
- **Gemini AI**: تحلیل مالی و پیشنهادات
- **Persian AI Engine**: پردازش متن فارسی

### 📱 **بهینه‌سازی موبایل:**
- تشخیص خودکار دستگاه
- رابط کاربری انطباقی  
- حرکات لمسی بهینه شده
- فرم‌های موبایل دوستدار
