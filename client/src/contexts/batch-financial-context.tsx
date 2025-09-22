/**
 * ✅ PERFORMANCE OPTIMIZATION: Batch Financial Data Context
 * Prevents Query Storm by batching multiple representative requests
 */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BatchRequest {
  representativeId: number;
  resolve: (data: any) => void;
  reject: (error: any) => void;
}

interface BatchFinancialContextType {
  requestRepresentativeData: (representativeId: number) => Promise<any>;
  batchStatus: {
    pendingRequests: number;
    totalBatches: number;
    lastBatchTime: number | null;
  };
}

const BatchFinancialContext = createContext<BatchFinancialContextType | null>(null);

export function BatchFinancialProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [batchStatus, setBatchStatus] = useState({
    pendingRequests: 0,
    totalBatches: 0,
    lastBatchTime: null as number | null
  });

  // ✅ BATCH CONFIGURATION
  const BATCH_SIZE = 30; // Max representatives per batch
  const BATCH_DELAY = 150; // Wait 150ms to collect more requests
  const MAX_WAIT_TIME = 500; // Max wait time before forcing batch

  // ✅ BATCH QUEUE MANAGEMENT
  const pendingRequests = useRef<BatchRequest[]>([]);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);
  const requestStartTime = useRef<number | null>(null);

  // ✅ EXECUTE BATCH: Send batched request to server
  const executeBatch = useCallback(async () => {
    if (pendingRequests.current.length === 0) return;

    const currentBatch = [...pendingRequests.current];
    pendingRequests.current = [];

    console.log(`🚀 BATCH FINANCIAL: Executing batch for ${currentBatch.length} representatives`);
    
    setBatchStatus(prev => ({
      ...prev,
      pendingRequests: 0,
      totalBatches: prev.totalBatches + 1,
      lastBatchTime: Date.now()
    }));

    try {
      const representativeIds = currentBatch.map(req => req.representativeId);
      
      // ✅ CALL BATCH API
      const response = await apiRequest('/api/unified-financial/representatives/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ representativeIds })
      });

      if (!response.success) {
        throw new Error(response.error || 'Batch request failed');
      }

      console.log(`✅ BATCH FINANCIAL: Received data for ${response.data.length} representatives`);
      console.log(`🎯 BATCH FINANCIAL: Processing time: ${response.meta.processingTime}ms`);

      // ✅ RESOLVE INDIVIDUAL REQUESTS
      currentBatch.forEach(request => {
        const representativeData = response.data.find((data: any) => data.id === request.representativeId);
        
        if (representativeData) {
          // ✅ CACHE INDIVIDUAL RESULTS for future queries
          queryClient.setQueryData(
            [`unified-financial-representative-${request.representativeId}`],
            { data: representativeData }
          );
          
          request.resolve({ data: representativeData });
        } else {
          console.warn(`⚠️ BATCH FINANCIAL: No data found for representative ${request.representativeId}`);
          request.reject(new Error(`No data found for representative ${request.representativeId}`));
        }
      });

    } catch (error) {
      console.error('❌ BATCH FINANCIAL: Batch execution error:', error);
      
      // ✅ REJECT ALL REQUESTS in batch
      currentBatch.forEach(request => {
        request.reject(error);
      });
    }
  }, [queryClient]);

  // ✅ SCHEDULE BATCH: Smart batching with delays
  const scheduleBatch = useCallback(() => {
    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    const now = Date.now();
    const waitTime = requestStartTime.current ? now - requestStartTime.current : 0;

    // ✅ FORCE BATCH if max wait time reached or batch is full
    if (waitTime >= MAX_WAIT_TIME || pendingRequests.current.length >= BATCH_SIZE) {
      console.log(`⚡ BATCH FINANCIAL: Force executing batch (wait: ${waitTime}ms, size: ${pendingRequests.current.length})`);
      executeBatch();
      return;
    }

    // ✅ SCHEDULE DELAYED BATCH
    batchTimer.current = setTimeout(() => {
      executeBatch();
    }, BATCH_DELAY);

  }, [executeBatch]);

  // ✅ REQUEST REPRESENTATIVE DATA
  const requestRepresentativeData = useCallback((representativeId: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      // ✅ CHECK CACHE FIRST
      const cached = queryClient.getQueryData([`unified-financial-representative-${representativeId}`]);
      if (cached) {
        console.log(`⚡ BATCH FINANCIAL: Cache hit for representative ${representativeId}`);
        resolve(cached);
        return;
      }

      // ✅ ADD TO BATCH QUEUE
      if (pendingRequests.current.length === 0) {
        requestStartTime.current = Date.now();
      }

      pendingRequests.current.push({
        representativeId,
        resolve,
        reject
      });

      setBatchStatus(prev => ({
        ...prev,
        pendingRequests: pendingRequests.current.length
      }));

      console.log(`📊 BATCH FINANCIAL: Added rep ${representativeId} to batch (${pendingRequests.current.length}/${BATCH_SIZE})`);

      // ✅ SCHEDULE BATCH EXECUTION
      scheduleBatch();
    });
  }, [queryClient, scheduleBatch]);

  // ✅ CLEANUP on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
    };
  }, []);

  return (
    <BatchFinancialContext.Provider value={{
      requestRepresentativeData,
      batchStatus
    }}>
      {children}
    </BatchFinancialContext.Provider>
  );
}

// ✅ HOOK for using batch financial context
export function useBatchFinancialData() {
  const context = useContext(BatchFinancialContext);
  if (!context) {
    throw new Error('useBatchFinancialData must be used within BatchFinancialProvider');
  }
  return context;
}