# MarFaNet Financial Management System

## Overview

MarFaNet is a comprehensive financial management system built for managing invoices, representatives, payments, and financial operations. The system features a modern full-stack architecture with React frontend, Node.js/Express backend, and PostgreSQL database with Drizzle ORM. It includes advanced features such as AI-powered financial analysis, Telegram integration, and real-time financial monitoring with automated reconciliation capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side application is built with React 18 and TypeScript, using Vite as the build tool. The architecture follows a component-based approach with:

- **UI Framework**: Shadcn/UI components with Tailwind CSS for styling, implementing a "claymorphism" design theme with soft pastel colors
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Unified authentication context supporting both admin and CRM user roles
- **Mobile Optimization**: Built-in mobile responsiveness with touch-friendly interfaces and performance optimizations

The frontend structure separates concerns with dedicated folders for components, pages, contexts, hooks, and utilities. The layout system includes responsive sidebar navigation and header components that adapt to different screen sizes.

### Backend Architecture
The server uses Express.js with TypeScript and follows a modular architecture:

- **Database Layer**: Drizzle ORM with PostgreSQL, featuring connection pooling and health monitoring
- **Authentication**: Session-based authentication with bcrypt for password hashing, supporting multiple user types (admin, CRM users)
- **API Structure**: RESTful endpoints organized by feature domains (invoices, representatives, payments, etc.)
- **Middleware**: Performance monitoring, CORS handling, and unified authentication middleware
- **Services Layer**: Business logic separated into dedicated service classes for financial operations, AI analysis, and integrations

Key architectural patterns include:
- Unified Financial Engine for centralized financial calculations
- Real-time monitoring and consistency validation
- Batch processing capabilities for large-scale operations
- Feature flag management for controlled rollouts

### Data Storage Solutions
The system uses PostgreSQL as the primary database with the following schema design:

- **Core Entities**: Representatives, invoices, payments, sales partners
- **Financial Tracking**: Dedicated tables for financial transactions and audit trails
- **User Management**: Separate admin and CRM user systems with role-based permissions
- **AI Integration**: Storage for AI configurations, knowledge base, and decision logs
- **Monitoring**: Activity logs and data integrity constraints for system health

The database includes optimized indexes for financial queries and implements connection pooling for performance.

### Authentication and Authorization
Multi-layered authentication system supporting:

- **Admin Users**: Full system access with session-based authentication
- **CRM Users**: Limited access for customer relationship management tasks
- **Public Portal**: Unauthenticated access for representatives to view their data
- **Session Management**: PostgreSQL-backed session store with automatic cleanup

Authorization is role-based with middleware protecting sensitive endpoints and operations.

## External Dependencies

### Database and ORM
- **PostgreSQL**: Primary database using Neon serverless hosting
- **Drizzle ORM**: Type-safe database operations with migration support
- **Connection Pooling**: Enhanced connection management with retry logic

### AI and Analytics
- **Google Gemini AI**: Financial analysis and recommendation engine
- **XAI Grok Engine**: Advanced AI processing for Persian language support
- **Custom AI Services**: Persian cultural intelligence and learning engines

### Communication Services
- **Telegram Bot Integration**: Automated invoice delivery and notifications
- **SMS/Email**: Planned integration for multi-channel communication

### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: Pre-built component library with consistent design system

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Production bundling for server code
- **Drizzle Kit**: Database migration and schema management

### Monitoring and Performance
- **Performance Monitoring**: Custom middleware for request tracking
- **Health Checks**: Database connectivity and system status endpoints
- **Feature Flags**: Runtime configuration for gradual feature rollouts
- **Batch Processing**: Optimized operations for large datasets

The system is designed for deployment on cloud platforms with environment-based configuration for development, staging, and production environments.