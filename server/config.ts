// SHERLOCK v16.3 TELEGRAM URL FIX: Dynamic URL configuration based on environment
function getBaseUrl(): string {
  // In production deployment, use the actual domain
  if (process.env.NODE_ENV === "production") {
    // Use environment variable if available, otherwise use the production domain
    return process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : "https://agent-portal-shield-info9071.replit.app";
  }
  
  // In development, use localhost
  return `http://localhost:${process.env.PORT || 5000}`;
}

// Configuration constants for MarFaNet system
export const APP_CONFIG = {
  BASE_URL: getBaseUrl(),
  APP_NAME: "MarFaNet Financial Management System",
  APP_VERSION: "16.3.0",
  // ✅ SHERLOCK v36.0: قابل پیکربندی شدن دامنه پورتال عمومی
  PUBLIC_PORTAL_BASE_URL: process.env.PUBLIC_PORTAL_BASE_URL || process.env.PUBLIC_BASE_URL || undefined
};

// Helper function to get portal link - Always use production URL for Telegram
export function getPortalLink(publicId: string): string {
  // SHERLOCK v36.0: اولویت با متغیر محیطی - حذف دامنه استاتیک replit
  const base = APP_CONFIG.PUBLIC_PORTAL_BASE_URL
    || process.env.PORTAL_PUBLIC_URL
    || (process.env.NODE_ENV === 'production'
      ? (process.env.REPLIT_DOMAIN ? `https://${process.env.REPLIT_DOMAIN}` : undefined)
      : undefined)
    || APP_CONFIG.BASE_URL // fallback نهایی (لوکال در توسعه)
  ;
  return `${base.replace(/\/$/, '')}/portal/${publicId}`;
}