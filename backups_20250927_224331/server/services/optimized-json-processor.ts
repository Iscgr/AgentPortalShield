
// 🎯 SHERLOCK v33.0 - Optimized JSON Processor
// پردازش بهینه فایل‌های JSON با pagination و کش هوشمند

import { unifiedCache } from './unified-cache-manager';

export interface ProcessingConfig {
  batchSize: number;
  maxConcurrent: number;
  enableCaching: boolean;
  useIncrementalProcessing: boolean;
}

export interface ProcessingResult {
  processed: number;
  skipped: number;
  errors: number;
  totalTime: number;
  cacheHits: number;
  details: any[];
}

export class OptimizedJsonProcessor {
  private config: ProcessingConfig;
  private processingQueue: Map<string, Promise<any>> = new Map();

  constructor(config: Partial<ProcessingConfig> = {}) {
    this.config = {
      batchSize: 50,
      maxConcurrent: 3,
      enableCaching: true,
      useIncrementalProcessing: true,
      ...config
    };
  }

  /**
   * 🎯 پردازش بهینه JSON با pagination
   */
  async processJsonData(
    jsonData: any[], 
    processor: (item: any) => Promise<any>,
    cacheKey?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      totalTime: 0,
      cacheHits: 0,
      details: []
    };

    console.log(`🔄 SHERLOCK v33.0: Processing ${jsonData.length} JSON items with batch size ${this.config.batchSize}`);

    // بررسی کش اگر فعال باشد
    if (this.config.enableCaching && cacheKey) {
      const cachedResult = unifiedCache.get<ProcessingResult>(cacheKey);
      if (cachedResult) {
        console.log(`✅ SHERLOCK v33.0: Using cached result for ${cacheKey}`);
        return cachedResult;
      }
    }

    // پردازش batch-wise
    const batches = this.createBatches(jsonData, this.config.batchSize);
    
    for (let i = 0; i < batches.length; i += this.config.maxConcurrent) {
      const currentBatches = batches.slice(i, i + this.config.maxConcurrent);
      
      const batchPromises = currentBatches.map(batch => 
        this.processBatch(batch, processor, result)
      );

      await Promise.allSettled(batchPromises);
      
      // پیشرفت
      const progress = Math.round(((i + currentBatches.length) / batches.length) * 100);
      console.log(`📊 SHERLOCK v33.0: Processing progress ${progress}%`);
    }

    result.totalTime = Date.now() - startTime;

    // ذخیره در کش
    if (this.config.enableCaching && cacheKey) {
      unifiedCache.set(cacheKey, result, {
        ttl: 1800000, // 30 minutes
        dependencies: ['json_processing']
      });
    }

    console.log(`✅ SHERLOCK v33.0: JSON processing completed in ${result.totalTime}ms`);
    return result;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(
    batch: any[], 
    processor: (item: any) => Promise<any>,
    result: ProcessingResult
  ): Promise<void> {
    try {
      const batchPromises = batch.map(async (item) => {
        try {
          const processed = await processor(item);
          result.processed++;
          result.details.push(processed);
          return processed;
        } catch (error) {
          result.errors++;
          console.error(`❌ SHERLOCK v33.0: Error processing item:`, error);
          return null;
        }
      });

      await Promise.allSettled(batchPromises);
    } catch (error) {
      console.error(`❌ SHERLOCK v33.0: Batch processing error:`, error);
      result.errors += batch.length;
    }
  }

  /**
   * 🎯 پردازش تدریجی برای فایل‌های بزرگ
   */
  async processIncrementally(
    jsonData: any[],
    processor: (item: any) => Promise<any>,
    onProgress?: (progress: number) => void
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      skipped: 0,
      errors: 0,
      totalTime: Date.now(),
      cacheHits: 0,
      details: []
    };

    console.log(`🔄 SHERLOCK v33.0: Starting incremental processing of ${jsonData.length} items`);

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const processed = await processor(jsonData[i]);
        result.processed++;
        result.details.push(processed);

        // گزارش پیشرفت
        if (onProgress && i % 10 === 0) {
          const progress = Math.round((i / jsonData.length) * 100);
          onProgress(progress);
        }

        // توقف کوتاه برای جلوگیری از blocking
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }

      } catch (error) {
        result.errors++;
        console.error(`❌ SHERLOCK v33.0: Error in incremental processing:`, error);
      }
    }

    result.totalTime = Date.now() - result.totalTime;
    console.log(`✅ SHERLOCK v33.0: Incremental processing completed`);
    
    return result;
  }

  /**
   * 🎯 کش کردن پردازش‌های قبلی
   */
  getCachedProcessingResult(cacheKey: string): ProcessingResult | null {
    return unifiedCache.get<ProcessingResult>(cacheKey);
  }

  /**
   * 🎯 پاک کردن کش پردازش
   */
  invalidateProcessingCache(pattern?: string): void {
    if (pattern) {
      unifiedCache.invalidate(pattern);
    } else {
      unifiedCache.invalidate('json_processing');
    }
  }
}

// Export instance
export const optimizedJsonProcessor = new OptimizedJsonProcessor();
