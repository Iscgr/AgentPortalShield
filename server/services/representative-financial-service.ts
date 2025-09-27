
import { OptimizedRepresentativeRepository } from './optimized-representative-repository';
import { FinancialCalculationEngine } from './financial-calculation-engine';
import { unifiedFinancialEngine } from './unified-financial-engine';

export interface DashboardRepresentativeDTO {
  id: number;
  name: string;
  code: string;
  totalDebt: number;
  totalSales: number;
  totalPaid: number;
  invoiceCount: number;
  paymentCount: number;
  lastPaymentDate: string | null;
  debtLevel: string;
  performanceScore: number;
}

export class RepresentativeFinancialService {
  
  /**
   * 🎯 PHASE 6B: Primary service method - Get all representatives with financial data
   * Replaces direct calculateAllRepresentatives() calls with service layer abstraction
   */
  async getAllRepresentativesWithFinancialSummary(): Promise<DashboardRepresentativeDTO[]> {
    try {
      console.log('🔄 PHASE 6B: Loading representatives via service layer...');
      
      // Use optimized batch calculation from unified financial engine
      const representatives = await unifiedFinancialEngine.calculateAllRepresentativesOptimized();
      
      // Transform to DTO format for presentation layer
      const dtoData = this.transformToDTO(representatives);
      
      console.log(`✅ PHASE 6B: Service layer loaded ${dtoData.length} representatives`);
      return dtoData;
      
    } catch (error) {
      console.error('❌ PHASE 6B: Service layer error:', error);
      throw new ServiceLayerError('Failed to load representative financial data', error);
    }
  }
  
  /**
   * 🔄 Individual representative refresh for real-time updates
   */
  async getRepresentativeFinancialSummary(id: number): Promise<DashboardRepresentativeDTO> {
    const representative = await unifiedFinancialEngine.calculateRepresentative(id);
    return this.transformToSingleDTO(representative);
  }
  
  /**
   * 📊 Business logic transformation to standardized DTO
   */
  private transformToDTO(data: any[]): DashboardRepresentativeDTO[] {
    return data.map(rep => this.transformToSingleDTO(rep));
  }

  private transformToSingleDTO(rep: any): DashboardRepresentativeDTO {
    return {
      id: rep.id,
      name: rep.name,
      code: rep.code,
      totalDebt: rep.totalDebt || rep.actualDebt || 0,
      totalSales: rep.totalSales || 0,
      totalPaid: rep.totalPaid || 0,
      invoiceCount: rep.invoiceCount || 0,
      paymentCount: rep.paymentCount || 0,
      lastPaymentDate: rep.lastPaymentDate || null,
      debtLevel: rep.debtLevel || 'MODERATE',
      performanceScore: this.calculatePerformanceScore(rep)
    };
  }

  private calculatePerformanceScore(rep: any): number {
    const sales = rep.totalSales || 0;
    const paid = rep.totalPaid || 0;
    if (sales === 0) return 0;
    
    const paymentRatio = paid / sales;
    return Math.round(paymentRatio * 100);
  }
}

export class ServiceLayerError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'ServiceLayerError';
  }
}
