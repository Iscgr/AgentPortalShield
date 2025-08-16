// 💰 Currency Formatter - Rial to Toman Conversion Utility
// DA VINCI v9.0 CRM Enhancement - Critical Fix for Currency Display

/**
 * Comprehensive currency formatting utility for Persian financial system
 * Handles conversion between Rials and Tomans with proper Persian number formatting
 */

import { toPersianDigits } from './persian-date';

export class CurrencyFormatter {
  /**
   * Convert Rials to Tomans (divide by 10)
   */
  static convertRialsToTomans(rialAmount: number | string): number {
    const numericAmount = typeof rialAmount === 'string' ? parseFloat(rialAmount) : rialAmount;
    if (isNaN(numericAmount)) return 0;
    return numericAmount / 10;
  }

  /**
   * Format amount to Tomans with thousand separators
   */
  static formatToTomans(rialAmount: number | string): string {
    const tomanAmount = this.convertRialsToTomans(rialAmount);
    return new Intl.NumberFormat('en-US').format(tomanAmount);
  }

  /**
   * Format amount to Persian Tomans with Persian digits
   */
  static formatToPersianTomans(rialAmount: number | string): string {
    const formattedAmount = this.formatToTomans(rialAmount);
    return toPersianDigits(formattedAmount);
  }

  /**
   * Format currency with unit display
   */
  static formatCurrency(
    amount: number | string, 
    unit: 'rial' | 'toman' = 'toman', 
    locale: 'fa-IR' | 'en-US' = 'fa-IR'
  ): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '۰ تومان';

    let finalAmount = numericAmount;
    let unitText = '';

    if (unit === 'toman') {
      finalAmount = unit === 'toman' ? this.convertRialsToTomans(numericAmount) : numericAmount;
      unitText = locale === 'fa-IR' ? 'تومان' : 'Toman';
    } else {
      unitText = locale === 'fa-IR' ? 'ریال' : 'Rial';
    }

    const formatted = new Intl.NumberFormat('en-US').format(finalAmount);
    const localizedFormatted = locale === 'fa-IR' ? toPersianDigits(formatted) : formatted;
    
    return `${localizedFormatted} ${unitText}`;
  }

  /**
   * Format currency for CRM display (always shows Tomans)
   */
  static formatForCRM(rialAmount: number | string): string {
    return this.formatCurrency(rialAmount, 'toman', 'fa-IR');
  }

  /**
   * Format compact currency for dashboard widgets
   */
  static formatCompact(rialAmount: number | string): string {
    const tomanAmount = this.convertRialsToTomans(rialAmount);
    
    if (tomanAmount >= 1000000) {
      const millions = tomanAmount / 1000000;
      return toPersianDigits(millions.toFixed(1)) + ' میلیون تومان';
    } else if (tomanAmount >= 1000) {
      const thousands = tomanAmount / 1000;
      return toPersianDigits(thousands.toFixed(1)) + ' هزار تومان';
    } else {
      return toPersianDigits(tomanAmount.toFixed(0)) + ' تومان';
    }
  }

  /**
   * Validate currency input with comprehensive error handling
   */
  static validateCurrencyInput(input: string): { isValid: boolean; error?: string; normalizedValue?: number } {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'ورودی نامعتبر' };
    }

    const cleaned = input.replace(/[,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      return { isValid: false, error: 'مقدار وارد شده عددی نیست' };
    }
    
    if (parsed < 0) {
      return { isValid: false, error: 'مقدار نمی‌تواند منفی باشد' };
    }
    
    if (parsed > Number.MAX_SAFE_INTEGER) {
      return { isValid: false, error: 'مقدار بیش از حد مجاز است' };
    }

    return { isValid: true, normalizedValue: parsed };
  }

  /**
   * Enhanced validation with business rules
   */
  static validateBusinessCurrency(input: string, context: 'debt' | 'payment' | 'sales'): { isValid: boolean; error?: string; warnings?: string[] } {
    const basicValidation = this.validateCurrencyInput(input);
    
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    const warnings: string[] = [];
    const value = basicValidation.normalizedValue!;

    // Business-specific validation rules
    switch (context) {
      case 'debt':
        if (value > 10000000000) { // 10 billion tomans
          warnings.push('مبلغ بدهی بالا - نیاز به تأیید مدیر');
        }
        break;
      case 'payment':
        if (value > 5000000000) { // 5 billion tomans
          warnings.push('پرداخت بالا - نیاز به بررسی اضافی');
        }
        break;
      case 'sales':
        if (value < 1000000) { // 1 million tomans
          warnings.push('مبلغ فروش پایین - بررسی کنید');
        }
        break;
    }

    return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * Parse currency input from user (handles Persian digits) with enhanced error handling
   */
  static parseCurrencyInput(input: string): { value: number; originalInput: string; parseSuccess: boolean } {
    const originalInput = input;
    
    // Convert Persian digits to English
    const englishInput = input
      .replace(/[۰-۹]/g, (match) => String.fromCharCode(match.charCodeAt(0) - '۰'.charCodeAt(0) + '0'.charCodeAt(0)))
      .replace(/[,\s]/g, '');
    
    const parsed = parseFloat(englishInput);
    const parseSuccess = !isNaN(parsed);
    
    return {
      value: parseSuccess ? parsed : 0,
      originalInput,
      parseSuccess
    };
  }

  /**
   * Advanced parsing with currency detection and conversion tracking
   */
  static parseWithAuditTrail(input: string, userId?: string): {
    value: number;
    originalInput: string;
    conversionApplied: boolean;
    auditInfo: {
      timestamp: string;
      userId?: string;
      inputFormat: 'persian' | 'english' | 'mixed';
      conversionRatio?: number;
    };
  } {
    const timestamp = new Date().toISOString();
    const parseResult = this.parseCurrencyInput(input);
    
    // Detect input format
    const hasPersianDigits = /[۰-۹]/.test(input);
    const hasEnglishDigits = /[0-9]/.test(input);
    let inputFormat: 'persian' | 'english' | 'mixed' = 'english';
    
    if (hasPersianDigits && hasEnglishDigits) {
      inputFormat = 'mixed';
    } else if (hasPersianDigits) {
      inputFormat = 'persian';
    }

    return {
      value: parseResult.value,
      originalInput: parseResult.originalInput,
      conversionApplied: true,
      auditInfo: {
        timestamp,
        userId,
        inputFormat,
        conversionRatio: 0.1 // Rial to Toman conversion ratio
      }
    };
  }
}

// Legacy function exports for backward compatibility
export const formatToTomans = CurrencyFormatter.formatToTomans;
export const formatToPersianTomans = CurrencyFormatter.formatToPersianTomans;
export const convertRialsToTomans = CurrencyFormatter.convertRialsToTomans;
export const formatForCRM = CurrencyFormatter.formatForCRM;
export const formatCompact = CurrencyFormatter.formatCompact;