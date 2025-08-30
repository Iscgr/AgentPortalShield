
# PHASE 6A: Design Pattern Analysis

## APPLICABLE DESIGN PATTERNS FOR N+1 QUERY OPTIMIZATION

### Pattern 1: Repository Pattern with Batch Loading
```typescript
// Current Problem: Direct DB access in calculateAllRepresentatives()
// Solution: Repository abstraction with intelligent batching

interface RepresentativeRepository {
  findAllWithFinancialData(): Promise<RepresentativeFinancialData[]>;
  findByIdsWithFinancialData(ids: number[]): Promise<RepresentativeFinancialData[]>;
}

class OptimizedRepresentativeRepository implements RepresentativeRepository {
  async findAllWithFinancialData(): Promise<RepresentativeFinancialData[]> {
    // Single query with JOINs instead of N+1 individual queries
    return await this.db.query(`
      SELECT 
        r.id, r.name, r.code,
        COALESCE(SUM(i.amount), 0) as total_invoices,
        COALESCE(SUM(p.amount), 0) as total_payments,
        r.total_debt
      FROM representatives r
      LEFT JOIN invoices i ON r.id = i.representative_id
      LEFT JOIN payments p ON r.id = p.representative_id  
      GROUP BY r.id, r.name, r.code, r.total_debt
    `);
  }
}
```

**Pattern Benefits:**
- ✅ Eliminates N+1 queries completely
- ✅ Single database roundtrip
- ✅ Maintains separation of concerns
- ✅ Testable and mockable

**Pattern Drawbacks:**
- ⚠️ Requires repository layer implementation
- ⚠️ More complex JOIN queries
- ⚠️ Potential for large result sets

### Pattern 2: Data Transfer Object (DTO) with Eager Loading
```typescript
// Specialized DTO for financial dashboard requirements
interface DashboardRepresentativeDTO {
  id: number;
  name: string;
  code: string;
  financialSummary: {
    totalInvoices: number;
    totalPayments: number;
    totalDebt: number;
    lastPaymentDate: string | null;
    invoiceCount: number;
    paymentCount: number;
  };
}

class DashboardDataService {
  async getAllRepresentativesForDashboard(): Promise<DashboardRepresentativeDTO[]> {
    // Single optimized query for dashboard-specific needs
    const query = `
      SELECT 
        r.id, r.name, r.code, r.total_debt,
        COUNT(DISTINCT i.id) as invoice_count,
        COUNT(DISTINCT p.id) as payment_count,
        COALESCE(SUM(DISTINCT i.amount), 0) as total_invoices,
        COALESCE(SUM(DISTINCT p.amount), 0) as total_payments,
        MAX(p.payment_date) as last_payment_date
      FROM representatives r
      LEFT JOIN invoices i ON r.id = i.representative_id
      LEFT JOIN payments p ON r.id = p.representative_id
      WHERE r.is_active = true
      GROUP BY r.id, r.name, r.code, r.total_debt
      ORDER BY r.total_debt DESC
    `;
    
    return await this.executeOptimizedQuery(query);
  }
}
```

**Pattern Benefits:**
- ✅ Purpose-built for specific use case
- ✅ Optimal data structure for frontend
- ✅ Single query execution
- ✅ Easy to cache

**Pattern Drawbacks:**
- ⚠️ Less flexible for other use cases
- ⚠️ Potential data duplication
- ⚠️ Requires DTO maintenance

### Pattern 3: Command Query Responsibility Segregation (CQRS)
```typescript
// Separate read model optimized for queries
interface ReadModel {
  representative_financial_summary: {
    representative_id: number;
    name: string;
    code: string;
    total_debt: number;
    invoice_count: number;
    payment_count: number;
    total_invoice_amount: number;
    total_payment_amount: number;
    last_updated: Date;
  }[];
}

class FinancialReadModelService {
  async getRepresentativeFinancialSummary(): Promise<ReadModel['representative_financial_summary']> {
    // Query pre-computed read model instead of calculating on-the-fly
    return await this.db.select().from('representative_financial_summary');
  }
  
  async refreshReadModel(): Promise<void> {
    // Periodic refresh of materialized view
    await this.db.raw(`
      REFRESH MATERIALIZED VIEW representative_financial_summary;
    `);
  }
}

// Materialized View Definition
const createMaterializedView = `
  CREATE MATERIALIZED VIEW representative_financial_summary AS
  SELECT 
    r.id as representative_id,
    r.name,
    r.code,
    r.total_debt,
    COUNT(i.id) as invoice_count,
    COUNT(p.id) as payment_count,
    COALESCE(SUM(i.amount), 0) as total_invoice_amount,
    COALESCE(SUM(p.amount), 0) as total_payment_amount,
    NOW() as last_updated
  FROM representatives r
  LEFT JOIN invoices i ON r.id = i.representative_id
  LEFT JOIN payments p ON r.id = p.representative_id
  GROUP BY r.id, r.name, r.code, r.total_debt;
`;
```

**Pattern Benefits:**
- ✅ Extremely fast read performance
- ✅ Zero computation at query time
- ✅ Scalable for large datasets
- ✅ Separates read/write concerns

**Pattern Drawbacks:**
- ⚠️ Data freshness concerns
- ⚠️ Additional storage requirements
- ⚠️ Complex refresh strategies
- ⚠️ Eventual consistency

### Pattern 4: Facade Pattern with Caching
```typescript
class RepresentativeFinancialFacade {
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  
  async getAllRepresentativesFinancialData(): Promise<RepresentativeFinancialData[]> {
    const cacheKey = 'all_representatives_financial';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    // Execute optimized query
    const data = await this.executeOptimizedBatchQuery();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  private async executeOptimizedBatchQuery(): Promise<RepresentativeFinancialData[]> {
    // Single query with all required data
    return await this.db.query(`
      SELECT 
        r.*,
        financial_data.invoice_count,
        financial_data.payment_count,
        financial_data.total_invoice_amount,
        financial_data.total_payment_amount,
        financial_data.last_payment_date
      FROM representatives r
      LEFT JOIN (
        SELECT 
          representative_id,
          COUNT(DISTINCT i.id) as invoice_count,
          COUNT(DISTINCT p.id) as payment_count,
          COALESCE(SUM(DISTINCT i.amount), 0) as total_invoice_amount,
          COALESCE(SUM(DISTINCT p.amount), 0) as total_payment_amount,
          MAX(p.payment_date) as last_payment_date
        FROM representatives rep
        LEFT JOIN invoices i ON rep.id = i.representative_id
        LEFT JOIN payments p ON rep.id = p.representative_id
        GROUP BY rep.id
      ) financial_data ON r.id = financial_data.representative_id
      WHERE r.is_active = true
    `);
  }
}
```

**Pattern Benefits:**
- ✅ Simple to implement
- ✅ Immediate performance improvement
- ✅ Backward compatible
- ✅ Cache invalidation control

**Pattern Drawbacks:**
- ⚠️ Cache management complexity
- ⚠️ Memory usage concerns
- ⚠️ Cache consistency challenges
- ⚠️ Stale data risk

## PATTERN EVALUATION MATRIX

| Pattern | Implementation Effort | Performance Impact | Maintainability | Scalability | Risk Level |
|---------|----------------------|-------------------|-----------------|-------------|------------|
| **Repository** | Medium | High | High | High | Low |
| **DTO/Eager Loading** | Low | High | Medium | Medium | Low |
| **CQRS/Materialized** | High | Very High | Medium | Very High | Medium |
| **Facade/Cache** | Low | High | Medium | Medium | Low |

## RECOMMENDED PATTERN COMBINATION

**Primary Pattern: Repository + DTO (Hybrid Approach)**
- Repository pattern for data access abstraction
- Specialized DTOs for different use cases
- Single optimized queries instead of N+1

**Secondary Pattern: Facade + Cache**
- Caching layer for frequently accessed data
- Cache invalidation on data updates
- Fallback to optimized queries

**Future Enhancement: CQRS**
- Materialized views for complex analytical queries
- Event-driven read model updates
- Ultimate scalability solution
```
