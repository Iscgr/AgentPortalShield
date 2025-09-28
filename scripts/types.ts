// Common types for script API interactions
// Matches with server schema.ts

export interface Representative {
  id: number;
  code: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
}

export interface Invoice {
  id: number;
  representativeId: number;
  amount: string;
  dueDate: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  representativeId: number;
  invoiceId?: string;
  amount: string;
  paymentDate: string;
  description: string;
  isAllocated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  data: {
    debt: string;
    totalSales: string;
    paymentRatio: number;
    overdue: string;
  };
}

// Custom fetch options for node-fetch
// Note: node-fetch v3 doesn't support credentials like browser fetch
export type NodeFetchOptions = {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
};