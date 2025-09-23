
/**
 * ATOMOS v3.0: LEGACY PAYMENT ROUTER - REMOVED
 * این router حذف شده و با سیستم جدید جایگزین خواهد شد
 */

import { Router } from 'express';

export const paymentManagementRouter = Router();

// تمام endpoints قدیمی حذف شدند
// سیستم جدید در v3.0 پیاده‌سازی خواهد شد

paymentManagementRouter.use((req, res) => {
  res.status(410).json({
    success: false,
    error: "Payment management system v2.0 has been deprecated. New system v3.0 is being implemented.",
    version: "ATOMOS_v3.0_CLEANUP"
  });
});

export default paymentManagementRouter;
