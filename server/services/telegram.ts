export interface TelegramMessage {
  representativeName: string;
  shopOwner: string | null;
  panelId: string;
  amount: string;
  issueDate: string;
  status: string;
  portalLink: string;
  invoiceNumber: string;
  isResend?: boolean;
  sendCount?: number;
}

export async function sendInvoiceToTelegram(
  botToken: string,
  chatId: string,
  message: TelegramMessage,
  template: string
): Promise<boolean> {
  try {
    // Determine resend indicator
    const resendIndicator = message.isResend 
      ? ` (ارسال مجدد - ${message.sendCount || 1})` 
      : '';
    
    // Replace template variables with actual data
    let messageText = template
      .replace(/{representative_name}/g, message.representativeName)
      .replace(/{shop_owner}/g, message.shopOwner || 'نامشخص')
      .replace(/{panel_id}/g, message.panelId)
      .replace(/{amount}/g, message.amount)
      .replace(/{issue_date}/g, message.issueDate)
      .replace(/{status}/g, message.status)
      .replace(/{portal_link}/g, message.portalLink)
      .replace(/{invoice_number}/g, message.invoiceNumber)
      .replace(/{resend_indicator}/g, resendIndicator);

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    console.error('خطا در ارسال پیام تلگرام:', error);
    return false;
  }
}

export async function sendBulkInvoicesToTelegram(
  botToken: string,
  chatId: string,
  messages: TelegramMessage[],
  template: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const message of messages) {
    const sent = await sendInvoiceToTelegram(botToken, chatId, message, template);
    if (sent) {
      success++;
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      failed++;
    }
  }

  return { success, failed };
}

export function getDefaultTelegramTemplate(): string {
  return `📋 فاکتور شماره {invoice_number}{resend_indicator}

🏪 نماینده: {representative_name}
👤 صاحب فروشگاه: {shop_owner}
📱 شناسه پنل: {panel_id}
💰 مبلغ فاکتور: {amount} تومان
📅 تاریخ صدور: {issue_date}
🔍 وضعیت: {status}

ℹ️ برای مشاهده جزئیات کامل فاکتور، وارد لینک زیر بشوید

{portal_link}

تولید شده توسط سیستم مدیریت مالی 🤖`;
}

export function formatInvoiceStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'unpaid': 'پرداخت نشده ❌',
    'paid': 'پرداخت شده ✅', 
    'overdue': 'سررسید گذشته ⚠️',
    'partial': 'پرداخت جزئی 🔶'
  };
  
  return statusMap[status] || 'نامشخص';
}
