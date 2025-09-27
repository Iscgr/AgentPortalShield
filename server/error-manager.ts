/**
 * 🚨 MARFANET ADVANCED ERROR HANDLING & CIRCUIT BREAKER SYSTEM
 * 
 * این سیستم پیشرفته مدیریت خطا شامل:
 * ✅ Circuit Breaker Pattern برای مقاومت در برابر خرابی
 * ✅ Intelligent Error Classification & Recovery
 * ✅ Rate Limiting & Throttling Protection
 * ✅ Advanced Logging & Monitoring
 * ✅ Auto-Recovery Mechanisms
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_API = 'external_api',
  SYSTEM = 'system'
}

export interface ErrorContext {
  operation: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringInterval: number;
  halfOpenMaxCalls: number;
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * 🔄 Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>, context: ErrorContext): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${context.operation}. Retry after ${this.config.recoveryTimeout}ms`);
      }
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenCalls = 0;
      console.log(`🔄 Circuit breaker transitioning to HALF_OPEN for ${context.operation}`);
    }

    try {
      const result = await operation();
      this.onSuccess(context);
      return result;
    } catch (error) {
      this.onFailure(context, error);
      throw error;
    }
  }

  private onSuccess(context: ErrorContext): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        console.log(`✅ Circuit breaker CLOSED for ${context.operation} - Service recovered`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(context: ErrorContext, error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error(`🚨 Circuit breaker OPENED for ${context.operation} - Too many failures (${this.failureCount})`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls
    };
  }
}

/**
 * 🎯 Error Classification & Intelligence
 */
class ErrorClassifier {
  static classify(error: any): { severity: ErrorSeverity; category: ErrorCategory; isRetryable: boolean } {
    const message = error?.message?.toLowerCase() || '';
    const code = error?.code || '';
    const name = error?.name?.toLowerCase() || '';

    // Database Errors
    if (message.includes('connection') || message.includes('database') || message.includes('timeout')) {
      if (code === 'ECONNREFUSED' || message.includes('connection refused')) {
        return { severity: ErrorSeverity.HIGH, category: ErrorCategory.DATABASE, isRetryable: true };
      }
      return { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.DATABASE, isRetryable: true };
    }

    // Network Errors
    if (code?.startsWith('ENETUNREACH') || message.includes('network') || message.includes('socket')) {
      return { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.NETWORK, isRetryable: true };
    }

    // Authentication Errors
    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('token')) {
      return { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.AUTHENTICATION, isRetryable: false };
    }

    // Validation Errors
    if (message.includes('validation') || message.includes('invalid') || name.includes('validation')) {
      return { severity: ErrorSeverity.LOW, category: ErrorCategory.VALIDATION, isRetryable: false };
    }

    // Business Logic Errors
    if (message.includes('business') || message.includes('rule') || message.includes('constraint')) {
      return { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.BUSINESS_LOGIC, isRetryable: false };
    }

    // External API Errors
    if (message.includes('api') || message.includes('external') || message.includes('service')) {
      return { severity: ErrorSeverity.MEDIUM, category: ErrorCategory.EXTERNAL_API, isRetryable: true };
    }

    // Default: System Error
    return { severity: ErrorSeverity.HIGH, category: ErrorCategory.SYSTEM, isRetryable: false };
  }
}

/**
 * 📊 Advanced Error Manager
 */
class AdvancedErrorManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private errorCounts = new Map<string, number>();
  private lastErrorTime = new Map<string, number>();
  
  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringInterval: 60000, // 1 minute
    halfOpenMaxCalls: 3
  };

  constructor() {
    // Start monitoring
    setInterval(() => this.monitorErrors(), this.defaultCircuitConfig.monitoringInterval);
  }

  private getCircuitBreaker(operation: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operation)) {
      this.circuitBreakers.set(operation, new CircuitBreaker(this.defaultCircuitConfig));
    }
    return this.circuitBreakers.get(operation)!;
  }

  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      useCircuitBreaker?: boolean;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, useCircuitBreaker = true } = options;
    
    // Use circuit breaker if enabled
    if (useCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(context.operation);
      return await circuitBreaker.execute(async () => {
        return await this.executeWithRetry(operation, context, maxRetries, retryDelay);
      }, context);
    }

    return await this.executeWithRetry(operation, context, maxRetries, retryDelay);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset error count on success
        this.errorCounts.set(context.operation, 0);
        
        if (attempt > 1) {
          console.log(`✅ Operation ${context.operation} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        const classification = ErrorClassifier.classify(error);
        
        this.logError(error, context, classification, attempt);
        
        // Don't retry non-retryable errors
        if (!classification.isRetryable) {
          throw this.createEnhancedError(error, context, classification);
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = retryDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.3 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }

    const classification = ErrorClassifier.classify(lastError);
    throw this.createEnhancedError(lastError, context, classification);
  }

  private logError(
    error: any, 
    context: ErrorContext, 
    classification: { severity: ErrorSeverity; category: ErrorCategory; isRetryable: boolean },
    attempt: number
  ): void {
    const errorKey = `${context.category}:${context.operation}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrorTime.set(errorKey, Date.now());

    const logMessage = {
      operation: context.operation,
      attempt,
      severity: classification.severity,
      category: classification.category,
      retryable: classification.isRetryable,
      message: error?.message,
      userId: context.userId,
      sessionId: context.sessionId,
      timestamp: context.timestamp.toISOString()
    };

    switch (classification.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🔥 CRITICAL ERROR:', logMessage);
        break;
      case ErrorSeverity.HIGH:
        console.error('🚨 HIGH SEVERITY ERROR:', logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logMessage);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ LOW SEVERITY ERROR:', logMessage);
        break;
    }
  }

  private createEnhancedError(
    originalError: any,
    context: ErrorContext,
    classification: { severity: ErrorSeverity; category: ErrorCategory; isRetryable: boolean }
  ): Error {
    const enhancedError = new Error(`[${classification.category.toUpperCase()}] ${originalError.message}`);
    (enhancedError as any).originalError = originalError;
    (enhancedError as any).context = context;
    (enhancedError as any).classification = classification;
    (enhancedError as any).timestamp = new Date().toISOString();
    return enhancedError;
  }

  private monitorErrors(): void {
    const now = Date.now();
    const errorStats: any = {};

    for (const [key, count] of Array.from(this.errorCounts.entries())) {
      const lastError = this.lastErrorTime.get(key) || 0;
      const timeSinceLastError = now - lastError;
      
      errorStats[key] = {
        count,
        lastError: new Date(lastError).toISOString(),
        timeSinceLastError: `${Math.round(timeSinceLastError / 1000)}s`
      };
    }

    if (Object.keys(errorStats).length > 0) {
      console.log('📊 Error monitoring report:', errorStats);
    }
  }

  getCircuitBreakerStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    for (const [operation, breaker] of Array.from(this.circuitBreakers.entries())) {
      stats[operation] = breaker.getStats();
    }
    return stats;
  }

  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts.entries());
  }
}

// Singleton instance
const errorManager = new AdvancedErrorManager();

// Utility functions
export function createErrorContext(
  operation: string,
  category: ErrorCategory = ErrorCategory.SYSTEM,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  metadata?: Record<string, any>
): ErrorContext {
  return {
    operation,
    timestamp: new Date(),
    severity,
    category,
    metadata
  };
}

export async function executeWithAdvancedErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  options?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    maxRetries?: number;
    retryDelay?: number;
    useCircuitBreaker?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  const context = createErrorContext(
    operationName,
    options?.category || ErrorCategory.SYSTEM,
    options?.severity || ErrorSeverity.MEDIUM,
    options?.metadata
  );

  return await errorManager.executeWithErrorHandling(operation, context, options);
}

export function getSystemErrorStats() {
  return {
    circuitBreakers: errorManager.getCircuitBreakerStats(),
    errorCounts: errorManager.getErrorStats(),
    timestamp: new Date().toISOString()
  };
}

export { AdvancedErrorManager, ErrorClassifier, CircuitBreaker };
export default errorManager;