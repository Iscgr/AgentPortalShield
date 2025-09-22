
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { db } from '../db';
import { activityLogs } from '../../shared/schema';
import crypto from 'crypto';

interface SecurityConfig {
  rateLimiting: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  auditLogging: boolean;
  ipWhitelisting: string[];
  suspiciousActivityThreshold: number;
}

class AdvancedSecurityManager {
  private config: SecurityConfig;
  private suspiciousIPs = new Map<string, number>();
  private blockedIPs = new Set<string>();
  private apiKeyHashes = new Map<string, string>();

  constructor() {
    this.config = {
      rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        skipSuccessfulRequests: false
      },
      auditLogging: true,
      ipWhitelisting: [],
      suspiciousActivityThreshold: 5
    };
  }

  // Enhanced rate limiting with progressive restrictions
  createAdaptiveRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: (req: Request) => {
        const clientIP = this.getClientIP(req);
        
        // Blocked IPs get 0 requests
        if (this.blockedIPs.has(clientIP)) {
          return 0;
        }
        
        // Suspicious IPs get reduced limits
        const suspiciousCount = this.suspiciousIPs.get(clientIP) || 0;
        if (suspiciousCount >= this.config.suspiciousActivityThreshold) {
          return Math.max(10, this.config.rateLimiting.max - (suspiciousCount * 10));
        }
        
        return this.config.rateLimiting.max;
      },
      message: {
        error: 'درخواست‌های بیش از حد مجاز',
        message: 'لطفاً کمی صبر کنید و سپس دوباره تلاش کنید',
        retryAfter: '15 دقیقه'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        const clientIP = this.getClientIP(req);
        this.logSuspiciousActivity(clientIP, 'RATE_LIMIT_EXCEEDED', req);
        
        res.status(429).json({
          error: 'درخواست‌های بیش از حد مجاز',
          message: 'لطفاً کمی صبر کنید و سپس دوباره تلاش کنید'
        });
      }
    });
  }

  // Advanced request sanitization and validation
  sanitizeAndValidate() {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || '';
      const requestPath = req.path;

      // Check for blocked IPs
      if (this.blockedIPs.has(clientIP)) {
        this.logSecurityEvent(clientIP, 'BLOCKED_IP_ACCESS_ATTEMPT', req);
        return res.status(403).json({
          error: 'دسترسی مسدود شده',
          message: 'IP شما به دلیل فعالیت مشکوک مسدود شده است'
        });
      }

      // Detect potential SQL injection attempts
      if (this.detectSQLInjection(req)) {
        this.markSuspiciousIP(clientIP);
        this.logSecurityEvent(clientIP, 'SQL_INJECTION_ATTEMPT', req);
        return res.status(400).json({
          error: 'درخواست نامعتبر',
          message: 'داده‌های ورودی نامعتبر شناسایی شد'
        });
      }

      // Detect XSS attempts
      if (this.detectXSS(req)) {
        this.markSuspiciousIP(clientIP);
        this.logSecurityEvent(clientIP, 'XSS_ATTEMPT', req);
        return res.status(400).json({
          error: 'درخواست نامعتبر',
          message: 'محتوای مشکوک در درخواست شناسایی شد'
        });
      }

      // Check for suspicious user agents
      if (this.isSuspiciousUserAgent(userAgent)) {
        this.markSuspiciousIP(clientIP);
        this.logSecurityEvent(clientIP, 'SUSPICIOUS_USER_AGENT', req);
      }

      // Log all API requests for audit
      if (this.config.auditLogging) {
        this.logAPIRequest(req);
      }

      next();
    };
  }

  // Enhanced authentication middleware with session validation
  enhancedAuthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const clientIP = this.getClientIP(req);
      const sessionId = req.sessionID;
      const session = req.session as any;

      try {
        // Check session validity
        if (!session || !session.authenticated) {
          this.logSecurityEvent(clientIP, 'UNAUTHORIZED_ACCESS_ATTEMPT', req);
          return res.status(401).json({
            error: 'احراز هویت لازم است',
            message: 'لطفاً وارد سیستم شوید'
          });
        }

        // Check session expiration
        if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
          this.logSecurityEvent(clientIP, 'EXPIRED_SESSION_ACCESS', req);
          req.session.destroy(() => {});
          return res.status(401).json({
            error: 'جلسه منقضی شده',
            message: 'لطفاً مجدداً وارد شوید'
          });
        }

        // Validate session integrity
        if (!this.validateSessionIntegrity(session)) {
          this.logSecurityEvent(clientIP, 'SESSION_INTEGRITY_VIOLATION', req);
          req.session.destroy(() => {});
          return res.status(401).json({
            error: 'جلسه نامعتبر',
            message: 'لطفاً مجدداً وارد شوید'
          });
        }

        // Update last activity
        session.lastActivity = new Date().toISOString();
        
        next();
      } catch (error) {
        console.error('Enhanced auth middleware error:', error);
        res.status(500).json({
          error: 'خطای سیستم امنیتی',
          message: 'لطفاً بعداً تلاش کنید'
        });
      }
    };
  }

  // API key validation middleware
  apiKeyValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      const apiKey = req.get('X-API-Key') || req.query.apiKey as string;
      const clientIP = this.getClientIP(req);

      if (!apiKey) {
        this.logSecurityEvent(clientIP, 'MISSING_API_KEY', req);
        return res.status(401).json({
          error: 'کلید API لازم است',
          message: 'لطفاً کلید API معتبر ارائه دهید'
        });
      }

      const hashedKey = this.hashAPIKey(apiKey);
      if (!this.apiKeyHashes.has(hashedKey)) {
        this.markSuspiciousIP(clientIP);
        this.logSecurityEvent(clientIP, 'INVALID_API_KEY', req);
        return res.status(401).json({
          error: 'کلید API نامعتبر',
          message: 'کلید API ارائه شده معتبر نیست'
        });
      }

      next();
    };
  }

  // Data encryption utilities
  encryptSensitiveData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf-8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptSensitiveData(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf-8');
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Helper methods
  private getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           req.headers['x-forwarded-for'] as string || 
           'unknown';
  }

  private detectSQLInjection(req: Request): boolean {
    const sqlPatterns = [
      /(\'\s*(OR|AND)\s*\')/i,
      /(UNION\s+SELECT)/i,
      /(DROP\s+TABLE)/i,
      /(INSERT\s+INTO)/i,
      /(DELETE\s+FROM)/i,
      /(\'\s*;\s*--)/i,
      /(\'\s*;\s*\/\*)/i
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return sqlPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(req.body) || checkValue(req.query) || checkValue(req.params);
  }

  private detectXSS(req: Request): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return xssPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(req.body) || checkValue(req.query) || checkValue(req.params);
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /openvas/i,
      /nmap/i,
      /masscan/i,
      /gobuster/i,
      /dirb/i,
      /curl.*bot/i,
      /wget.*bot/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private markSuspiciousIP(ip: string): void {
    const currentCount = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, currentCount + 1);

    // Auto-block after threshold
    if (currentCount + 1 >= this.config.suspiciousActivityThreshold * 2) {
      this.blockedIPs.add(ip);
      console.log(`🚨 IP ${ip} has been automatically blocked due to suspicious activity`);
    }
  }

  private validateSessionIntegrity(session: any): boolean {
    // Check required session fields
    if (!session.userId || !session.username || !session.authenticated) {
      return false;
    }

    // Check session age (max 24 hours)
    if (session.createdAt) {
      const sessionAge = Date.now() - new Date(session.createdAt).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) {
        return false;
      }
    }

    return true;
  }

  private hashAPIKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private async logSecurityEvent(ip: string, eventType: string, req: Request): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        type: 'SECURITY_EVENT',
        description: `Security event: ${eventType} from IP ${ip}`,
        details: {
          eventType,
          ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private async logAPIRequest(req: Request): Promise<void> {
    try {
      // Only log sensitive endpoints
      const sensitiveEndpoints = ['/api/auth/', '/api/representatives/', '/api/payments/', '/api/invoices/'];
      
      if (sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
        await db.insert(activityLogs).values({
          type: 'API_REQUEST',
          description: `API request: ${req.method} ${req.path}`,
          details: {
            method: req.method,
            path: req.path,
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            sessionId: req.sessionID
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }

  // Public methods for manual security management
  blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    console.log(`🚨 IP ${ip} manually blocked`);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`✅ IP ${ip} unblocked`);
  }

  addAPIKey(apiKey: string): void {
    const hashedKey = this.hashAPIKey(apiKey);
    this.apiKeyHashes.set(hashedKey, apiKey.substring(0, 8) + '...');
    console.log(`🔑 API key added: ${apiKey.substring(0, 8)}...`);
  }

  getSecurityStats(): any {
    return {
      blockedIPs: Array.from(this.blockedIPs),
      suspiciousIPs: Object.fromEntries(this.suspiciousIPs),
      totalAPIKeys: this.apiKeyHashes.size,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const advancedSecurity = new AdvancedSecurityManager();

// Export middleware functions
export const adaptiveRateLimit = advancedSecurity.createAdaptiveRateLimit();
export const sanitizeAndValidate = advancedSecurity.sanitizeAndValidate();
export const enhancedAuth = advancedSecurity.enhancedAuthMiddleware();
export const apiKeyAuth = advancedSecurity.apiKeyValidation();

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
});
