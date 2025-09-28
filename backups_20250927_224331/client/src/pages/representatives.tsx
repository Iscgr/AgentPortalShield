import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Plus, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  User,
  ShoppingBag,
  Copy,
  ExternalLink,
  Calendar,
  Settings,
  FileText,
  CreditCard,
  History,
  RefreshCw,
  Edit3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { FinancialIntegrityCard } from "@/components/financial-integrity-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUnifiedAuth } from "@/contexts/unified-auth-context";
import InvoiceEditDialog from "@/components/invoice-edit-dialog";
import DebtVerificationPanel from "@/components/debt-verification-panel";

// ✅ SHERLOCK v32.0: Enhanced Real-time debt display with aggressive refresh
function RealTimeDebtCell({ representativeId, fallbackDebt }: { representativeId: number, fallbackDebt?: string }) {
  const queryClient = useQueryClient();

  const { data: financialData, isLoading, error, refetch } = useQuery({
    queryKey: [`unified-financial-representative-${representativeId}`],
    queryFn: async () => {
      console.log(`🔄 SHERLOCK v32.0: Calculating real-time debt for representative ${representativeId}`);
      return apiRequest(`/api/unified-financial/representative/${representativeId}`);
    },
    select: (response: any) => response.data || response,
    staleTime: 10000, // Reduced to 10 seconds for more frequent updates
    gcTime: 30000, // Reduced cache time
    retry: 2, // Allow more retries for reliability
    refetchOnWindowFocus: true, // Enable refetch on focus for freshest data
    refetchOnMount: true, // Always refetch on mount for accuracy
    enabled: !!representativeId // Only run if ID exists
  });

  // Force refresh when payment operations complete
  React.useEffect(() => {
    const handlePaymentUpdate = () => {
      queryClient.invalidateQueries({ 
        queryKey: [`unified-financial-representative-${representativeId}`] 
      });
    };

    // Listen for custom payment update events
    window.addEventListener(`payment-updated-${representativeId}`, handlePaymentUpdate);

    return () => {
      window.removeEventListener(`payment-updated-${representativeId}`, handlePaymentUpdate);
    };
  }, [representativeId, queryClient]);

  // Show fallback immediately if available
  if (isLoading && fallbackDebt) {
    const debt = parseFloat(fallbackDebt || '0');
    return (
      <span className={`transition-colors duration-200 ${
        debt > 1000000 ? "text-red-600 dark:text-red-400 font-semibold" : 
        debt > 500000 ? "text-orange-600 dark:text-orange-400 font-semibold" : 
        "text-green-600 dark:text-green-400"
      }`}>
        {formatCurrency(debt)}
      </span>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-16 rounded"></div>;
  }

  if (error || !financialData) {
    // Use fallback debt if API fails
    if (fallbackDebt) {
      const debt = parseFloat(fallbackDebt);
      return (
        <span className={`transition-colors duration-200 ${
          debt > 1000000 ? "text-red-600 dark:text-red-400 font-semibold" : 
          debt > 500000 ? "text-orange-600 dark:text-orange-400 font-semibold" : 
          "text-green-600 dark:text-green-400"
        }`}>
          {formatCurrency(debt)}
        </span>
      );
    }
    return <span className="text-gray-400 text-xs">خطا</span>;
  }

  const debt = financialData.actualDebt || 0;

  return (
    <span className={`transition-colors duration-200 ${
      debt > 1000000 ? "text-red-600 dark:text-red-400 font-semibold" : 
      debt > 500000 ? "text-orange-600 dark:text-orange-400 font-semibold" : 
      "text-green-600 dark:text-green-400"
    }`}>
      {formatCurrency(debt)}
    </span>
  );
}

// SHERLOCK v11.0: Updated interface with standardized terminology
interface Representative {
  id: number;
  code: string;
  name: string;
  ownerName: string;
  panelUsername: string;
  phone: string;
  telegramId?: string;
  publicId: string;
  salesPartnerId: number;
  isActive: boolean;
  totalDebt: string;
  totalSales: string;
  credit: string; // Keep for backend compatibility, mapped to payments in UI
  createdAt: string;
  updatedAt: string;
  financialData?: {
    actualDebt: number;
    paymentRatio: number;
    debtLevel: string;
    lastSync: string;
  };
}



interface RepresentativeWithDetails extends Representative {
  invoices?: Invoice[];
  payments?: Payment[];
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  dueDate?: string;
  status: string;
  sentToTelegram: boolean;
  telegramSentAt?: string;
  usageData?: any;
}

interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  description?: string;
  isAllocated: boolean;
  invoiceId?: number;
}

// Form validation schema
const representativeFormSchema = z.object({
  code: z.string().min(1, "کد نماینده الزامی است"),
  name: z.string().min(1, "نام فروشگاه الزامی است"),
  ownerName: z.string().optional(),
  panelUsername: z.string().min(1, "نام کاربری پنل الزامی است"),
  phone: z.string().optional(),
  telegramId: z.string().optional(),
  salesPartnerId: z.number().optional(),
  isActive: z.boolean().default(true)
});

export default function Representatives() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRep, setSelectedRep] = useState<RepresentativeWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInvoiceEditOpen, setIsInvoiceEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentCreateOpen, setIsPaymentCreateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isPaymentDeleteConfirmOpen, setIsPaymentDeleteConfirmOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 30;

  // State for sync operations
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // SHERLOCK v11.0: Enhanced sorting logic
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return "↕️";
    return sortOrder === "asc" ? "⬆️" : "⬇️";
  };

  const { data: representatives = [], isLoading, error: repsError, refetch } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
    queryFn: async () => {
      console.log("🔍 SHERLOCK v32.0: Fetching representatives data");
      try {
        const data = await apiRequest("/api/representatives");
        console.log("✅ Representatives data loaded:", data?.length || 0, "items");

        // ✅ SHERLOCK v32.0: Debug specific representative "Abedmb"
        const abedmbRep = data?.find((rep: Representative) => 
          rep.name.toLowerCase().includes('abedmb') || 
          rep.code.toLowerCase().includes('abedmb')
        );
        if (abedmbRep) {
          console.log("🔍 SHERLOCK v32.0: Found Abedmb representative:", {
            id: abedmbRep.id,
            name: abedmbRep.name,
            code: abedmbRep.code,
            totalDebt: abedmbRep.totalDebt,
            totalSales: abedmbRep.totalSales
          });
        }

        return data;
      } catch (error) {
        console.error("❌ Error fetching representatives:", error);
        throw new Error("خطا در دریافت نمایندگان");
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - cache retention
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
    enabled: true, // Always enabled but controlled by stale time
  });

  // ✅ SHERLOCK v32.1: Optimized batch processing to prevent 400 errors
  const { data: enhancedRepsData, isLoading: enhancedRepsLoading, error: enhancedRepsError } = useQuery({
    queryKey: ["enhanced-representatives-data", representatives?.map(rep => rep.id)],
    queryFn: async () => {
      if (!representatives || representatives.length === 0) return [];

      console.log(`🔄 SHERLOCK v32.1: Processing ${representatives.length} representatives with optimized batch requests`);

      // Group representatives into batches of 20 for better performance
      const batchSize = 20;
      const batches = [];
      for (let i = 0; i < representatives.length; i += batchSize) {
        batches.push(representatives.slice(i, i + batchSize));
      }

      console.log(`📦 SHERLOCK v32.1: Split into ${batches.length} batches of max ${batchSize} representatives`);

      let enhancedRepresentatives = [...representatives]; // Start with original data

      // Process each batch with retry logic
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const representativeIds = batch.map(rep => rep.id);

        try {
          console.log(`🔄 SHERLOCK v32.1: Processing batch ${batchIndex + 1}/${batches.length} with ${representativeIds.length} representatives`);

          // Try batch calculation first
          const response = await fetch('/api/unified-financial/batch-calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ representativeIds })
          });

          if (response.ok) {
            const batchResult = await response.json();
            console.log(`✅ SHERLOCK v32.1: Batch ${batchIndex + 1} successful: ${batchResult.successful}/${batchResult.processed} representatives`);

            // Merge batch results with enhanced representatives
            if (batchResult.data && Array.isArray(batchResult.data)) {
              batchResult.data.forEach((financialData: any) => {
                if (financialData?.representativeId) {
                  const repIndex = enhancedRepresentatives.findIndex(rep => rep.id === financialData.representativeId);
                  if (repIndex !== -1) {
                    enhancedRepresentatives[repIndex] = {
                      ...enhancedRepresentatives[repIndex],
                      totalDebt: financialData.actualDebt?.toString() || enhancedRepresentatives[repIndex].totalDebt,
                      totalSales: financialData.totalSales?.toString() || enhancedRepresentatives[repIndex].totalSales,
                      financialData: {
                        actualDebt: financialData.actualDebt || 0,
                        paymentRatio: financialData.paymentRatio || 0,
                        debtLevel: financialData.debtLevel || 'UNKNOWN',
                        lastSync: financialData.calculationTimestamp || new Date().toISOString()
                      }
                    };
                  }
                }
              });
            }
          } else {
            console.warn(`⚠️ SHERLOCK v32.1: Batch ${batchIndex + 1} failed with status ${response.status}, falling back to individual requests`);

            // Fallback to individual requests for this batch
            for (const rep of batch) {
              try {
                const individualResponse = await fetch(`/api/unified-financial/representative/${rep.id}`);
                if (individualResponse.ok) {
                  const financialData = await individualResponse.json();
                  const repIndex = enhancedRepresentatives.findIndex(r => r.id === rep.id);
                  if (repIndex !== -1 && financialData.data) {
                    enhancedRepresentatives[repIndex] = {
                      ...enhancedRepresentatives[repIndex],
                      totalDebt: financialData.data.actualDebt?.toString() || rep.totalDebt,
                      totalSales: financialData.data.totalSales?.toString() || rep.totalSales,
                      financialData: {
                        actualDebt: financialData.data.actualDebt || 0,
                        paymentRatio: financialData.data.paymentRatio || 0,
                        debtLevel: financialData.data.debtLevel || 'UNKNOWN',
                        lastSync: financialData.data.calculationTimestamp || new Date().toISOString()
                      }
                    };
                  }
                }
              } catch (error) {
                console.warn(`⚠️ SHERLOCK v32.1: Individual calculation failed for rep ${rep.id}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`❌ SHERLOCK v32.1: Batch ${batchIndex + 1} processing error:`, error);
          // Continue with next batch even if this one fails
        }

        // Add delay between batches to prevent overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      return enhancedRepresentatives;
    },
    enabled: !!representatives && representatives.length > 0, // Only run if representatives data is available
    staleTime: 60000, // Cache for 1 minute
    refetchOnMount: false, // Don't refetch on mount if already loaded
    refetchOnWindowFocus: false,
    retry: 0 // No retries, handled within the loop
  });


  // SHERLOCK v27.0: Enhanced financial data with fallback rendering
  const enhancedReps = useMemo(() => {
    if (!representatives) return [];

    // Use enhanced reps data if available, otherwise fallback to original representatives
    const repsData = enhancedRepsData || representatives;

    return repsData.map(rep => {
      // Use data from enhancedRepsData if available
      const actualDebt = rep.financialData?.actualDebt ?? parseFloat(rep.totalDebt || '0');
      const totalSales = parseFloat(rep.totalSales || '0');

      return {
        ...rep,
        displayDebt: formatCurrency(actualDebt),
        displaySales: formatCurrency(totalSales),
        paymentRatio: rep.financialData?.paymentRatio || 0,
        debtLevel: rep.financialData?.debtLevel || 'UNKNOWN',
        isLoading: enhancedRepsLoading, // Indicate if the enhanced data is still loading
        lastSync: rep.financialData?.lastSync || null
      };
    });
  }, [representatives, enhancedRepsData, enhancedRepsLoading]);

  // SHERLOCK v11.0: Enhanced filtering and sorting
  const filteredRepresentatives = enhancedReps
    .filter(rep => {
      const matchesSearch = 
        rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && rep.isActive) ||
        (statusFilter === "inactive" && !rep.isActive);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'ownerName':
          aValue = a.ownerName || '';
          bValue = b.ownerName || '';
          break;
        case 'isActive':
          aValue = a.isActive ? 1 : 0;
          bValue = b.isActive ? 1 : 0;
          break;
        case 'totalSales':
          aValue = parseFloat(a.totalSales || '0');
          bValue = parseFloat(b.totalSales || '0');
          break;
        case 'totalDebt':
          aValue = parseFloat(a.totalDebt || '0');
          bValue = parseFloat(b.totalDebt || '0');
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRepresentatives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRepresentatives = filteredRepresentatives.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 ml-1" />
        فعال
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertTriangle className="w-3 h-3 ml-1" />
        غیرفعال
      </Badge>
    );
  };

  const getDebtAlert = (debt: string) => {
    const debtAmount = parseFloat(debt);
    if (debtAmount > 1000000) {
      return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    } else if (debtAmount > 500000) {
      return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    }
    return "";
  };

  // Create representative mutation
  const createRepresentativeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof representativeFormSchema>) => {
      return apiRequest("/api/representatives", {
        method: "POST",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      toast({
        title: "موفقیت",
        description: "نماینده جدید با موفقیت ایجاد شد"
      });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در ایجاد نماینده",
        variant: "destructive"
      });
    }
  });

  // Update representative mutation
  const updateRepresentativeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<z.infer<typeof representativeFormSchema>> }) => {
      return apiRequest(`/api/representatives/${id}`, {
        method: "PUT",
        data: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      toast({
        title: "موفقیت",
        description: "اطلاعات نماینده بروزرسانی شد"
      });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در بروزرسانی نماینده",
        variant: "destructive"
      });
    }
  });

  // ✅ SHERLOCK v24.0: همگام‌سازی صحیح بدهی نماینده
  const syncRepresentativeDebtMutation = useMutation({
    mutationFn: async (representativeId: number) => {
      return apiRequest(`/api/unified-financial/sync-representative/${representativeId}`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
      queryClient.invalidateQueries({ queryKey: ["unified-financial", "debtors"] });
      toast({
        title: "موفق",
        description: "بدهی نماینده همگام‌سازی شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: "خطا در همگام‌سازی بدهی نماینده",
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = async (rep: Representative) => {
    try {
      const detailsResponse = await apiRequest(`/api/representatives/${rep.code}`);
      setSelectedRep({
        ...rep,
        invoices: detailsResponse.invoices || [],
        payments: detailsResponse.payments || []
      });
      setIsDetailsOpen(true);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در دریافت جزئیات نماینده",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (rep: Representative) => {
    setSelectedRep(rep);
    setIsEditOpen(true);
  };

  const handleCopyPortalLink = (publicId: string) => {
    // ✅ SHERLOCK v32.1: Always use production URL for portal links sent to representatives
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://agent-portal-shield-info9071.replit.app'
      : window.location.origin;
    const portalLink = `${baseUrl}/representative/${publicId}`;
    navigator.clipboard.writeText(portalLink);
    toast({
      title: "کپی شد",
      description: "لینک پورتال عمومی نماینده کپی شد"
    });
  };

  // Removed unused handleEditInvoice - using inline handlers instead

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteConfirmOpen(true);
  };

  // SHERLOCK v1.0 PAYMENT DELETION HANDLER
  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
    setIsPaymentDeleteConfirmOpen(true);
  };

  // ✅ SHERLOCK v23.1: Automatic debt sync after payment
  const handleAutomaticDebtSync = async (representativeId: number) => {
    try {
      await syncRepresentativeDebtMutation.mutateAsync(representativeId);
      // Force refresh of representative data
      queryClient.invalidateQueries({ queryKey: ["representative-details", representativeId] });
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error) {
      console.error("Auto sync failed:", error);
    }
  };

  // Delete invoice mutation with automatic financial sync
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest(`/api/invoices/${invoiceId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/unified-statistics/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "حذف موفق",
        description: "فاکتور با موفقیت حذف شد و تمام اطلاعات مالی به‌روزرسانی شدند"
      });
      setIsDeleteConfirmOpen(false);
      setInvoiceToDelete(null);

      // Refresh representative details if modal is open
      if (selectedRep) {
        handleViewDetails(selectedRep);
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در حذف",
        description: error?.message || "خطا در حذف فاکتور. لطفاً دوباره تلاش کنید",
        variant: "destructive"
      });
    }
  });

  // SHERLOCK v1.0 DELETE PAYMENT MUTATION - با همگام‌سازی کامل مالی
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiRequest(`/api/payments/${paymentId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "حذف موفق",
        description: "پرداخت با موفقیت حذف شد و تمام اطلاعات مالی در پنل مدیریت و CRM بروزرسانی شدند",
        className: "bg-green-50 border-green-200 text-green-800"
      });
      setIsPaymentDeleteConfirmOpen(false);
      setPaymentToDelete(null);

      // Refresh representative details if modal is open
      if (selectedRep) {
        handleViewDetails(selectedRep);
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا در حذف پرداخت",
        description: error?.message || "خطا در حذف پرداخت. لطفاً دوباره تلاش کنید",
        variant: "destructive"
      });
    }
  });

  const handleSyncAllDebts = async () => {
    setIsSyncing(true);
    try {
      console.log('🔄 SHERLOCK v32.0: Starting comprehensive debt synchronization...');

      const response = await fetch('/api/unified-financial/sync-all-representatives', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "موفقیت",
          description: "همگام‌سازی تمام نمایندگان با موفقیت انجام شد"
        });

        // ✅ SHERLOCK v32.0: Comprehensive cache invalidation and refresh
        console.log('🔄 SHERLOCK v32.0: Invalidating all caches...');

        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
        queryClient.invalidateQueries({ queryKey: ["unified-financial"] });
        queryClient.invalidateQueries({ queryKey: ["debtor-representatives"] });
        queryClient.invalidateQueries({ queryKey: ["global-financial-summary"] });

        // Force refresh all individual representative calculations
        representatives?.forEach((rep: Representative) => {
          queryClient.invalidateQueries({ 
            queryKey: [`unified-financial-representative-${rep.id}`] 
          });
          queryClient.refetchQueries({ 
            queryKey: [`unified-financial-representative-${rep.id}`] 
          });
        });

        // Refresh main representatives data
        queryClient.refetchQueries({ queryKey: ["/api/representatives"] });

        console.log('✅ SHERLOCK v32.0: All debt data refreshed successfully');
      } else {
        toast({
          title: "خطا",
          description: '❌ خطا در همگام‌سازی: ' + (result.error || 'خطای ناشناخته'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "خطا",
        description: '❌ خطا در همگام‌سازی نمایندگان',
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerifyTotalDebt = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/unified-financial/verify-total-debt', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setVerificationResult(result.verification);
        const calculations = result.verification.calculations;
        const accuracy = result.verification.accuracy;

        let message = `📊 نتایج تایید مجموع بدهی:\n\n`;
        message += `💰 مبلغ مورد انتظار: ${result.verification.expectedAmount.toLocaleString('fa-IR')} تومان\n\n`;
        message += `📈 محاسبات:\n`;
        message += `• از جدول نمایندگان: ${calculations.fromRepresentativesTable.toLocaleString('fa-IR')} تومان\n`;
        message += `• از موتور مالی: ${calculations.fromUnifiedEngine.toLocaleString('fa-IR')} تومان\n`;
        message += `• از SQL مستقیم: ${calculations.fromDirectSQL.toLocaleString('fa-IR')} تومان\n\n`;
        message += `✅ صحت:\n`;
        message += `• جدول vs انتظار: ${accuracy.tableVsExpected ? '✅ صحیح' : '❌ ناصحیح'}\n`;
        message += `• موتور vs انتظار: ${accuracy.engineVsExpected ? '✅ صحیح' : '❌ ناصحیح'}\n`;
        message += `• SQL vs انتظار: ${accuracy.sqlVsExpected ? '✅ صحیح' : '❌ ناصحیح'}\n`;
        message += `• همگام بودن همه روش‌ها: ${accuracy.allMethodsConsistent ? '✅ بله' : '❌ خیر'}\n\n`;
        message += `📊 آمار:\n`;
        message += `• کل نمایندگان: ${result.verification.statistics.totalRepresentatives}\n`;
        message += `• نمایندگان بدهکار: ${result.verification.statistics.representativesWithDebt}\n`;

        alert(message);
      } else {
        toast({
          title: "خطا",
          description: '❌ خطا در تایید: ' + (result.error || 'خطای ناشناخته'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "خطا",
        description: '❌ خطا در تایید مجموع بدهی',
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (repsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مدیریت نمایندگان
          </h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                خطا در بارگذاری نمایندگان
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {repsError?.message || 'خطای ناشناخته در دریافت اطلاعات نمایندگان'}
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/representatives"] })}
                className="mr-4"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                تلاش مجدد
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مدیریت نمایندگان
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            مدیریت جامع اطلاعات و عملکرد نمایندگان فروش
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowVerificationPanel(!showVerificationPanel)}
            className={showVerificationPanel ? "bg-blue-100 text-blue-800" : ""}
          >
            <CheckCircle className="w-4 h-4 ml-2" />
            {showVerificationPanel ? "پنهان کردن بررسی" : "بررسی انطباق بدهی"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "شروع همگام‌سازی",
                description: "در حال همگام‌سازی آمار مالی تمام نمایندگان..."
              });
              apiRequest('/api/unified-financial/sync-all-representatives', {
                method: 'POST'
              }).then(() => {
                // بروزرسانی همه کش‌ها
                queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
                queryClient.invalidateQueries({ queryKey: ["/api/unified-financial"] });
                queryClient.invalidateQueries({ queryKey: ["debtor-representatives"] });
                queryClient.refetchQueries({ queryKey: ["/api/representatives"] });

                toast({
                  title: "موفقیت", 
                  description: "همگام‌سازی آمار مالی تمام نمایندگان کامل شد - جدول بروزرسانی شد"
                });
              }).catch((error) => {
                toast({
                  title: "خطا",
                  description: "خطا در همگام‌سازی آمار مالی",
                  variant: "destructive"
                });
              });
            }}
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            همگام‌سازی آمار مالی
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            نماینده جدید
          </Button>
        </div>
      </div>



      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="جستجو نماینده..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {toPersianDigits(filteredRepresentatives.length.toString())} نماینده یافت شد
              {totalPages > 1 && (
                <span className="mr-2">
                  (صفحه {toPersianDigits(currentPage.toString())} از {toPersianDigits(totalPages.toString())})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debt Verification Panel */}
      {showVerificationPanel && <DebtVerificationPanel />}

      {/* Representatives Table */}
      <Card>
        <CardHeader>
          <CardTitle>فهرست نمایندگان</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('code')}
                  >
                    کد {getSortIcon('code')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    نام فروشگاه {getSortIcon('name')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('ownerName')}
                  >
                    مالک {getSortIcon('ownerName')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('isActive')}
                  >
                    وضعیت {getSortIcon('isActive')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('totalSales')}
                  >
                    کل فروش {getSortIcon('totalSales')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('totalDebt')}
                  >
                    بدهی {getSortIcon('totalDebt')}
                  </TableHead>
                  <TableHead>همکار فروش</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRepresentatives.map((rep) => (
                  <TableRow 
                    key={rep.id} 
                    className={`${getDebtAlert(rep.totalDebt)} hover:bg-gray-50 dark:hover:bg-gray-800`}
                  >
                    <TableCell className="font-mono text-sm">
                      {rep.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rep.name}
                    </TableCell>
                    <TableCell>
                      {rep.ownerName || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(rep.isActive)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCurrency(parseFloat(rep.totalSales))}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rep.isLoading ? <Skeleton className="h-4 w-16 rounded" /> : <RealTimeDebtCell representativeId={rep.id} fallbackDebt={rep.totalDebt} />}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {rep.salesPartnerId ? `شریک #${rep.salesPartnerId}` : 'پیش‌فرض'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(rep)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rep)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                قبلی
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else {
                    // SHERLOCK v11.0: Smart pagination for large datasets
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, start + 4);
                    page = start + i;
                    if (page > end) return null;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {toPersianDigits(page.toString())}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                بعدی
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header Buttons for Sync and Verification */}
      <div className="flex justify-end gap-4 mt-4">
        <Button
          onClick={handleSyncAllDebts}
          disabled={isSyncing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              در حال همگام‌سازی...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              همگام‌سازی تمام بدهی‌ها
            </>
          )}
        </Button>
        <Button
          onClick={handleVerifyTotalDebt}
          disabled={isVerifying}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              در حال تایید...
            </>
          ) : (
            "تایید مجموع بدهی"
          )}
        </Button>
      </div>

      {/* Representative Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات کامل نماینده</DialogTitle>
            <DialogDescription>
              اطلاعات، تراکنش‌ها و عملکرد نماینده
            </DialogDescription>
          </DialogHeader>
          {selectedRep && (
            <div className="space-y-6">
              {/* Basic Information & Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 ml-2" />
                      اطلاعات کلی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">کد:</span>
                      <span className="font-mono">{selectedRep.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نام فروشگاه:</span>
                      <span>{selectedRep.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">مالک:</span>
                      <span>{selectedRep.ownerName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">تلفن:</span>
                      <span className="font-mono">{selectedRep.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">آی‌دی تلگرام:</span>
                      <span className="font-mono">{selectedRep.telegramId || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نام کاربری پنل:</span>
                      <span className="font-mono">{selectedRep.panelUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">شناسه عمومی:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs max-w-32 truncate">{selectedRep.publicId}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPortalLink(selectedRep.publicId)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">وضعیت:</span>
                      {getStatusBadge(selectedRep.isActive)}
                    </div>
                    <Separator />
                    <div className="pt-2 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          const baseUrl = process.env.NODE_ENV === 'production' 
                            ? 'https://agent-portal-shield-info9071.replit.app'
                            : window.location.origin;
                          window.open(`${baseUrl}/representative/${selectedRep.publicId}`, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 ml-2" />
                        نمایش پورتال عمومی
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleCopyPortalLink(selectedRep.publicId)}
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        کپی لینک پورتال
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <FinancialIntegrityCard representativeId={selectedRep.id} />
              </div>

              {/* Invoices Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 ml-2" />
                      تاریخچه فاکتورها ({selectedRep.invoices?.length || 0})
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsPaymentCreateOpen(true)}
                      data-testid="button-add-payment"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      ثبتپرداخت
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRep.invoices && selectedRep.invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>شماره فاکتور</TableHead>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>تاریخ صدور</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>تلگرام</TableHead>
                            <TableHead>عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRep.invoices.sort((a: any, b: any) => {
                            // SHERLOCK v11.5: FIFO sorting for invoice display (oldest first)
                            const dateA = new Date(a.issueDate || a.createdAt).getTime();
                            const dateB = new Date(b.issueDate || b.createdAt).getTime();
                            return dateA - dateB; // FIFO: Oldest first
                          }).map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                              <TableCell>{formatCurrency(parseFloat(invoice.amount))}</TableCell>
                              <TableCell>{invoice.issueDate}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  invoice.status === 'paid' ? 'default' : 
                                  invoice.status === 'partial' ? 'secondary' : 'destructive'
                                }>
                                  {invoice.status === 'paid' ? 'پرداخت شده' : 
                                   invoice.status === 'partial' ? 'تسویه جزئی' : 'پرداخت نشده'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {invoice.sentToTelegram ? (
                                  <Badge variant="outline" className="text-green-600">
                                    ✓ ارسال شده
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600">
                                    ✗ ارسال نشده
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        console.log('🔧 Invoice edit clicked:', invoice);
                                        setSelectedInvoice(invoice);
                                        setIsInvoiceEditOpen(true);
                                      }}
                                      title="ویرایش جزئیات فاکتور - همگام‌سازی کامل مالی"
                                      className="bg-green-50 text-green-600"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteInvoice(invoice)}
                                    title="حذف فاکتور (امن)"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      هیچ فاکتوری یافت نشد
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <CreditCard className="w-5 h-5 ml-2" />
                    تاریخچه پرداخت‌ها ({selectedRep.payments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRep.payments && selectedRep.payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>تاریخ پرداخت</TableHead>
                            <TableHead>شرح</TableHead>
                            <TableHead>وضعیت تخصیص</TableHead>
                            <TableHead>فاکتور مرتبط</TableHead>
                            <TableHead>عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRep.payments.sort((a: any, b: any) => {
                            // SHERLOCK v11.5: FIFO sorting for payment display (oldest first)
                            const dateA = new Date(a.paymentDate || a.createdAt).getTime();
                            const dateB = new Date(b.paymentDate || b.createdAt).getTime();
                            return dateA - dateB; // FIFO: Oldest first
                          }).map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-bold text-green-600">
                                {formatCurrency(parseFloat(payment.amount))}
                              </TableCell>
                              <TableCell>{payment.paymentDate}</TableCell>
                              <TableCell>{payment.description || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={payment.isAllocated ? 'default' : 'secondary'}>
                                  {payment.isAllocated ? 'تخصیص یافته' : 'تخصیص نیافته'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.invoiceId ? (
                                  <span className="font-mono text-sm">
                                    {selectedRep.invoices?.find(inv => inv.id === payment.invoiceId)?.invoiceNumber || `#${payment.invoiceId}`}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">عمومی</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeletePayment(payment)}
                                  className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white"
                                  title="حذف پرداخت - همگام‌سازی کامل آمار مالی"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      هیچ پرداختی یافت نشد
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Representative Dialog */}
      <CreateRepresentativeDialog 
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createRepresentativeMutation.mutate(data)}
        isLoading={createRepresentativeMutation.isPending}
      />

      {/* Edit Representative Dialog */}
      <EditRepresentativeDialog 
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        representative={selectedRep}
        onSubmit={(data) => selectedRep && updateRepresentativeMutation.mutate({ 
          id: selectedRep.id, 
          data 
        })}
        isLoading={updateRepresentativeMutation.isPending}
      />

      {/* Edit Invoice Dialog - Using External Component */}
      {selectedInvoice && selectedRep && isInvoiceEditOpen && (
        <InvoiceEditDialog
          invoice={selectedInvoice}
          representativeCode={selectedRep.code}
          isOpen={isInvoiceEditOpen}
          onOpenChange={setIsInvoiceEditOpen}
          onEditComplete={() => {
            console.log('🔧 Edit completed, refreshing data...');
            // Refresh representative details
            if (selectedRep) {
              handleViewDetails(selectedRep);
            }
            setIsInvoiceEditOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Delete Invoice Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 ml-2" />
              تأیید حذف فاکتور
            </DialogTitle>
            <DialogDescription>
              این عملیات قابل برگشت نیست و اطلاعات مالی نماینده به‌روزرسانی خواهد شد.
            </DialogDescription>
          </DialogHeader>

          {invoiceToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  جزئیات فاکتور مورد حذف:
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">شماره فاکتور:</span>
                    <span className="font-mono">{invoiceToDelete.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">مبلغ:</span>
                    <span className="font-bold">{formatCurrency(parseFloat(invoiceToDelete.amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">تاریخ صدور:</span>
                    <span>{invoiceToDelete.issueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">وضعیت:</span>
                    <Badge variant={invoiceToDelete.status === 'paid' ? 'default' : 'destructive'}>
                      {invoiceToDelete.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  ⚠️ تأثیرات حذف فاکتور:
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• مبلغ فاکتور از کل بدهی نماینده کم خواهد شد</li>
                  <li>• آمار کلی سیستم به‌روزرسانی می‌شود</li>
                  <li>• تاریخچه فعالیت ثبت خواهد شد</li>
                  <li>• این عملیات قابل برگشت نیست</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={deleteInvoiceMutation.isPending}
                >
                  انصراف
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteInvoiceMutation.mutate(invoiceToDelete.id)}
                  disabled={deleteInvoiceMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteInvoiceMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      در حال حذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 ml-2" />
                      تأیید حذف
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SHERLOCK v1.0 PAYMENT DELETION CONFIRMATION DIALOG */}
      <Dialog open={isPaymentDeleteConfirmOpen} onOpenChange={setIsPaymentDeleteConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 ml-2" />
              تأیید حذف پرداخت - SHERLOCK v1.0
            </DialogTitle>
            <DialogDescription>
              این عملیات قابل برگشت نیست و تمام آمار مالی در پنل مدیریت و CRM همگام‌سازی خواهد شد.
            </DialogDescription>
          </DialogHeader>

          {paymentToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                  <CreditCard className="w-4 h-4 ml-2" />
                  جزئیات پرداخت مورد حذف:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-red-600 dark:text-red-400 font-medium">شناسه پرداخت:</span>
                    <div className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-1">
                      #{paymentToDelete.id}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 font-medium">مبلغ:</span>
                    <div className="font-bold text-lg text-red-700 dark:text-red-300 mt-1">
                      {formatCurrency(parseFloat(paymentToDelete.amount))}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 font-medium">تاریخ پرداخت:</span>
                    <div className="mt-1 flex items-center">
                      <Calendar className="w-3 h-3 ml-1" />
                      {paymentToDelete.paymentDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-red-600 dark:text-red-400 font-medium">وضعیت تخصیص:</span>
                    <div className="mt-1">
                      <Badge variant={paymentToDelete.isAllocated ? 'default' : 'secondary'} className="text-xs">
                        {paymentToDelete.isAllocated ? 'تخصیص یافته' : 'تخصیص نیافته'}
                      </Badge>
                    </div>
                  </div>
                  {paymentToDelete.description && (
                    <div className="col-span-2">
                      <span className="text-red-600 dark:text-red-400 font-medium">شرح:</span>
                      <div className="mt-1 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        {paymentToDelete.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center">
                  <Settings className="w-4 h-4 ml-2" />
                  ⚠️ تأثیرات همگام‌سازی SHERLOCK v1.0:
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-2 list-disc list-inside">
                  <li><strong>آمار نماینده:</strong> بدهی، پرداختی و کل فروش بازمحاسبه خواهد شد</li>
                  <li><strong>پنل مدیریت:</strong> داشبورد و آمار کلی به‌روزرسانی می‌شود</li>
                  <li><strong>پنل CRM:</strong> تمام نمایش‌های مالی همگام‌سازی خواهد شد</li>
                  <li><strong>تاریخچه:</strong> رکورد حذف در لاگ فعالیت‌ها ثبت می‌شود</li>
                  <li><strong>⛔ هشدار:</strong> این عملیات قابل برگشت نیست</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPaymentDeleteConfirmOpen(false)}
                  disabled={deletePaymentMutation.isPending}
                  className="flex items-center"
                >
                  <span>انصراف</span>
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deletePaymentMutation.mutate(paymentToDelete.id)}
                  disabled={deletePaymentMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 flex items-center"
                >
                  {deletePaymentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                      در حال حذف نهایی...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 ml-2" />
                      تأیید حذف نهایی
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Payment Dialog */}
      {selectedRep && (
        <CreatePaymentDialog
          open={isPaymentCreateOpen}
          onOpenChange={setIsPaymentCreateOpen}
          representative={selectedRep}
          onSave={() => {
            // Refresh representative details
            handleViewDetails(selectedRep);
            setIsPaymentCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Create Representative Form Component
function CreateRepresentativeDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof representativeFormSchema>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof representativeFormSchema>>({
    resolver: zodResolver(representativeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      ownerName: "",
      panelUsername: "",
      phone: "",
      telegramId: "",
      salesPartnerId: undefined,
      isActive: true
    }
  });

  const handleSubmit = (data: z.infer<typeof representativeFormSchema>) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ایجاد نماینده جدید</DialogTitle>
          <DialogDescription>
            اطلاعات نماینده جدید را وارد کنید
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد نماینده *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: REP001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام فروشگاه *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام فروشگاه" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="panelUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام کاربری پنل *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام کاربری برای پنل مدیریت" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مالک</FormLabel>
                    <FormControl>
                      <Input placeholder="نام مالک فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="telegramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>آی‌دی تلگرام</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salesPartnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>همکار فروش</FormLabel>
                  <FormControl>
                    <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب همکار فروش" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">همکار پیش‌فرض</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="ml-2"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "در حال ایجاد..." : "ایجاد نماینده"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Representative Form Component
function EditRepresentativeDialog({ 
  open, 
  onOpenChange, 
  representative,
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative: Representative | null;
  onSubmit: (data: Partial<z.infer<typeof representativeFormSchema>>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof representativeFormSchema>>({
    resolver: zodResolver(representativeFormSchema.partial()),
    defaultValues: {
      code: representative?.code || "",
      name: representative?.name || "",
      ownerName: representative?.ownerName || "",
      panelUsername: representative?.panelUsername || "",
      phone: representative?.phone || "",
      telegramId: representative?.telegramId || "",
      isActive: representative?.isActive || true
    }
  });

  // Update form when representative changes
  React.useEffect(() => {
    if (representative) {
      form.reset({
        code: representative.code,
        name: representative.name,
        ownerName: representative.ownerName || "",
        panelUsername: representative.panelUsername,
        phone: representative.phone || "",
        telegramId: representative.telegramId || "",
        isActive: representative.isActive
      });
    }
  }, [representative, form]);

  const handleSubmit = (data: z.infer<typeof representativeFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش نماینده</DialogTitle>
          <DialogDescription>
            اطلاعات نماینده را ویرایش کنید
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد نماینده *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام فروشگاه *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام فروشگاه" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="panelUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام کاربری پنل *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مالک</FormLabel>
                    <FormControl>
                      <Input placeholder="نام مالک فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="telegramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>آی‌دی تلگرام</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">وضعیت فعال</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      نماینده فعال باشد یا خیر
                    </div>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="ml-2"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Internal EditInvoiceDialog component removed - using external component instead
  // Internal EditInvoiceDialog component removed - using external component instead

// Create Payment Dialog Component
function CreatePaymentDialog({
  open,
  onOpenChange,
  representative,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative: Representative;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("auto");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ SHERLOCK v34.0: UNIFIED FIFO Auto-Allocation System (Enhanced Engine)
  const handleAutoAllocation = async (paymentAmount: number) => {
    try {
      console.log('🔧 SHERLOCK v34.0 UNIFIED FIFO: Starting enhanced auto-allocation for oldest invoices first');

      // CRITICAL: Get unpaid invoices sorted by date (OLDEST FIRST - FIFO principle)
      const unpaidInvoices = (representative as any).invoices?.filter(
        (inv: any) => inv.status === 'unpaid' || inv.status === 'partial' || inv.status === 'overdue'
      ).sort((a: any, b: any) => {
        // FIFO: Oldest invoices first (ascending order by issue date)
        const dateA = new Date(a.issueDate || a.createdAt).getTime();
        const dateB = new Date(b.issueDate || b.createdAt).getTime();
        return dateA - dateB; // Ascending: oldest first
      }) || [];

      console.log(`📊 FIFO Order: Processing ${unpaidInvoices.length} invoices from oldest to newest`);
      if (unpaidInvoices.length > 0) {
        console.log(`🔍 First invoice (oldest): ${unpaidInvoices[0].invoiceNumber} - ${unpaidInvoices[0].issueDate || unpaidInvoices[0].createdAt}`);
        console.log(`🔍 Last invoice (newest): ${unpaidInvoices[unpaidInvoices.length-1].invoiceNumber} - ${unpaidInvoices[unpaidInvoices.length-1].issueDate || unpaidInvoices[unpaidInvoices.length-1].createdAt}`);
      }

      let remainingAmount = paymentAmount;
      const allocations: Array<{invoiceId: number, amount: number, newStatus: string}> = [];

      // Process invoices in FIFO order (oldest first)
      for (const invoice of unpaidInvoices) {
        if (remainingAmount <= 0) break;

        console.log(`🔄 Processing invoice ${invoice.invoiceNumber} (${invoice.issueDate || invoice.createdAt}) - Amount: ${invoice.amount}`);

        const invoiceAmount = parseFloat(invoice.amount);

        // Get already paid amount for partial invoices
        const alreadyPaidAmount = invoice.status === 'partial' 
          ? await getCurrentlyPaidAmount(invoice.id)
          : 0;

        const remainingInvoiceAmount = invoiceAmount - alreadyPaidAmount;
        const allocationAmount = Math.min(remainingAmount, remainingInvoiceAmount);

        if (allocationAmount > 0) {
          const totalAfterPayment = alreadyPaidAmount + allocationAmount;
          const newStatus = totalAfterPayment >= invoiceAmount ? 'paid' : 'partial';

          allocations.push({
            invoiceId: invoice.id,
            amount: allocationAmount,
            newStatus
          });

          console.log(`✅ Allocated ${allocationAmount} to invoice ${invoice.invoiceNumber} - Status: ${newStatus}`);
          remainingAmount -= allocationAmount;
        }
      }

      console.log(`📊 FIFO allocation complete. ${allocations.length} invoices allocated, ${remainingAmount} remaining`);

      // Create payment record with proper backend structure
      const paymentData = {
        representativeId: representative.id,
        amount: paymentAmount.toString(),
        paymentDate,
        description: description || `تخصیص خودکار پرداخت برای ${representative.name}`,
        selectedInvoiceId: "auto"
      };

      await apiRequest("/api/payments", {
        method: "POST",
        data: paymentData
      });

      // Update representative debt - now handled by backend
      // await updateRepresentativeDebt(paymentAmount);

    } catch (error) {
      throw error;
    }
  };

  // Helper function to get currently paid amount for an invoice
  const getCurrentlyPaidAmount = async (invoiceId: number): Promise<number> => {
    try {
      const paymentsResponse = await apiRequest(`/api/payments?invoiceId=${invoiceId}`);
      const payments = Array.isArray(paymentsResponse) ? paymentsResponse : [];
      return payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
    } catch (error) {
      console.warn('Could not fetch payment info for invoice', invoiceId, error);
      return 0;
    }
  };

  // Update representative debt with credit handling
  const updateRepresentativeDebt = async (paymentAmount: number) => {
    const currentDebt = parseFloat(representative.totalDebt);
    const newDebt = currentDebt - paymentAmount;

    // Handle credit (overpayment) scenarios
    const updateData: any = {
      totalDebt: Math.max(0, newDebt).toString()
    };

    if (newDebt < 0) {
      // Representative has overpaid - convert to credit
      updateData.credit = Math.abs(newDebt).toString();
      updateData.totalDebt = "0";
    }

    await apiRequest(`/api/crm/representatives/${representative.id}`, {
      method: "PUT",
      data: updateData
    });

    // Sync with CRM system
    await apiRequest(`/api/crm/representatives/${representative.id}/sync-debt`, {
      method: "POST",
      data: updateData
    });
  };

  // Get today's date in Persian format
  const getCurrentPersianDate = () => {
    const today = new Date();
    return today.toLocaleDateString('fa-IR');
  };

  React.useEffect(() => {
    if (open && !paymentDate) {
      setPaymentDate(getCurrentPersianDate());
    }
  }, [open, paymentDate]);

  // ✅ SHERLOCK v24.2: Extended auto session refresh for EditInvoiceDialog - 2 hours
  React.useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      // Touch session every 2 hours during edit
      apiRequest('/api/crm/auth/user?touch=true', { method: 'GET' })
        .catch(error => {
          console.warn('Session refresh failed during edit:', error);
          if (error.status === 401) {
            toast({
              title: "انقضای جلسه",
              description: "جلسه شما منقضی شده است. لطفاً مجدداً وارد شوید",
              variant: "destructive"
            });
            setTimeout(() => window.location.reload(), 2000);
          }
        });
    }, 2 * 60 * 60 * 1000); // Every 2 hours

    return () => clearInterval(interval);
  }, [open, toast]);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      if (!amount || !paymentDate) {
        toast({
          title: "خطا",
          description: "مبلغ و تاریخ پرداخت الزامی است",
          variant: "destructive"
        });
        return;
      }

      const paymentAmount = parseFloat(amount);

      // Auto-allocation logic (Smart Payment Processing)
      if (selectedInvoiceId === "auto") {
        await handleAutoAllocation(paymentAmount);
      } else {
        // Manual allocation to specific invoice
        const paymentData = {
          representativeId: representative.id,
          amount,
          paymentDate,
          description: description || `پرداخت برای ${representative.name}`,
          invoiceId: selectedInvoiceId ? parseInt(selectedInvoiceId) : null,
          isAllocated: !!selectedInvoiceId
        };

        await apiRequest("/api/payments", {
          method: "POST",
          data: paymentData
        });
      }

      // ✅ SHERLOCK v24.0: Immediate UI refresh with custom events
      window.dispatchEvent(new CustomEvent(`payment-updated-${representative.id}`));

      // Force refresh all related data immediately
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
      queryClient.invalidateQueries({ queryKey: [`unified-financial-representative-${representative.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/unified-financial/debtors"] });

      // Trigger immediate re-fetch
      await queryClient.refetchQueries({ queryKey: [`unified-financial-representative-${representative.id}`] });

      toast({
        title: "موفقیت",
        description: "پرداخت با موفقیت ثبت و تخصیص داده شد - UI بروزرسانی شد"
      });

      // Reset form
      setAmount("");
      setPaymentDate("");
      setDescription("");
      setSelectedInvoiceId("auto");

      // ✅ SHERLOCK v24.0: همگام‌سازی با force cache invalidation
      try {
        await apiRequest(`/api/unified-financial/sync-representative/${representative.id}`, {
          method: "POST"
        });
      } catch (syncError) {
        console.warn("Sync warning (non-critical):", syncError);
      }

      // Complete Financial Synchronization Checklist Implementation
      await performComprehensiveFinancialSync();

      onSave();
    } catch (error: any) {
      console.error('Payment submission error:', error);
      toast({
        title: "خطا",
        description: error?.message || "خطا در ثبت پرداخت",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Comprehensive Financial Synchronization Checklist
  const performComprehensiveFinancialSync = async () => {
    try {
      // 1. Invalidate all related query caches
      queryClient.invalidateQueries({ queryKey: ["representatives"] });
      queryClient.invalidateQueries({ queryKey: ["unified-statistics/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["crm/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["unified-statistics/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: [`representatives/${representative.code}`] });

      // 2. Force refresh current representative data
      await queryClient.refetchQueries({ queryKey: [`representatives/${representative.code}`] });

      // 3. Refresh parent component data if available
      if (window.location.pathname.includes('/crm')) {
        queryClient.invalidateQueries({ queryKey: ["crm/representatives"] });
      }

      // 4. Sync with admin panel cache if needed
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });

    } catch (syncError) {
      console.warn('Financial sync warning:', syncError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-lg admin-dialog-stable border-white/20 shadow-2xl backdrop-blur-xl"
        data-testid="create-payment-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-white text-xl" data-testid="payment-dialog-title">
            ثبت پرداخت جدید
          </DialogTitle>
          <DialogDescription className="text-blue-200" data-testid="payment-dialog-description">
            ثبت پرداخت برای {representative.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-white">
          <div>
            <Label htmlFor="amount" className="text-white">مبلغ پرداخت (ریال) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مبلغ پرداخت"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-1"
              data-testid="input-payment-amount"
            />
          </div>

          <div>
            <Label htmlFor="paymentDate" className="text-white">تاریخ پرداخت *</Label>
            <Input
              id="paymentDate"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              placeholder="1403/01/01"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-1"
              data-testid="input-payment-date"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-white">شرح پرداخت</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح پرداخت"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 mt-1"
              data-testid="input-payment-description"
            />
          </div>

          <div>
            <Label htmlFor="invoiceId" className="text-white">تخصیص به فاکتور</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger 
                className="bg-white/10 border-white/20 text-white mt-1"
                data-testid="select-invoice-allocation"
              >
                <SelectValue placeholder="انتخاب روش تخصیص" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="auto" className="text-white hover:bg-white/10">
                  🤖 تخصیص خودکار (پیشنهادی)
                </SelectItem>
                {representative && (representative as any).invoices?.filter((inv: any) => inv.status !== 'paid').map((invoice: Invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id.toString()} className="text-white hover:bg-white/10">
                    📄 {invoice.invoiceNumber} - {formatCurrency(parseFloat(invoice.amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-blue-300 mt-1">
              تخصیص خودکار: به قدیمی‌ترین فاکتورهای تسویه‌نشده تخصیص می‌یابد
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 rounded-lg border border-blue-500/30">
            <div className="text-sm text-blue-200">
              <div className="flex justify-between items-center">
                <span>💰 بدهی فعلی:</span>
                <span className={`font-bold ${parseFloat(representative.totalDebt) > 0 ? 'text-red-300' : 'text-green-300'}`}>
                  {formatCurrency(parseFloat(representative.totalDebt))}
                </span>
              </div>
              {amount && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-400/20">
                  <span>📊 وضعیت پس از پرداخت:</span>
                  <span className={`font-bold ${
                    parseFloat(representative.totalDebt) - parseFloat(amount || "0") > 0 
                      ? 'text-red-300' 
                      : parseFloat(representative.totalDebt) - parseFloat(amount || "0") < 0
                      ? 'text-green-300'
                      : 'text-blue-300'
                  }`}>
                    {parseFloat(representative.totalDebt) - parseFloat(amount || "0") > 0 
                      ? `بدهکار: ${formatCurrency(parseFloat(representative.totalDebt) - parseFloat(amount || "0"))}`
                      : parseFloat(representative.totalDebt) - parseFloat(amount || "0") < 0
                      ? `بستانکار: ${formatCurrency(Math.abs(parseFloat(representative.totalDebt) - parseFloat(amount || "0")))}`
                      : 'تسویه کامل ✅'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-white/10 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="ml-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            data-testid="button-cancel-payment"
          >
            انصراف
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
            data-testid="button-save-payment"
          >
            {isLoading ? "در حال ثبت پرداخت..." : "💰 ثبت و تخصیص پرداخت"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}