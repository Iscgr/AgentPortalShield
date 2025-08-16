import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "" 
});

export interface FinancialAnalysis {
  summary: string;
  recommendations: string[];
  insights: string[];
  alerts: string[];
}

export interface RepresentativeAnalysis {
  riskLevel: "low" | "medium" | "high";
  paymentPattern: string;
  recommendations: string[];
  creditScore: number;
}

export async function analyzeFinancialData(
  totalRevenue: string,
  totalDebt: string,
  activeRepresentatives: number,
  overdueCount: number
): Promise<FinancialAnalysis> {
  try {
    const prompt = `
شما یک تحلیلگر مالی هوشمند هستید. داده‌های مالی زیر را تحلیل کنید:

- درآمد کل: ${totalRevenue} تومان
- مطالبات معوق: ${totalDebt} تومان  
- نمایندگان فعال: ${activeRepresentatives}
- فاکتورهای سررسید گذشته: ${overdueCount}

لطفاً تحلیل مالی جامعی ارائه دهید و پیشنهادات عملی برای بهبود وضعیت مالی شرکت MarFaNet ارائه کنید.
پاسخ را در قالب JSON با فیلدهای summary, recommendations, insights, alerts ارائه دهید.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            insights: {
              type: "array", 
              items: { type: "string" }
            },
            alerts: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["summary", "recommendations", "insights", "alerts"]
        }
      },
      contents: prompt
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson) as FinancialAnalysis;
    } else {
      throw new Error("پاسخ خالی از مدل هوش مصنوعی");
    }
  } catch (error) {
    console.error("خطا در تحلیل مالی:", error);
    return {
      summary: "خطا در دریافت تحلیل مالی رخ داد",
      recommendations: ["لطفاً دوباره تلاش کنید"],
      insights: [],
      alerts: ["سیستم هوش مصنوعی در دسترس نیست"]
    };
  }
}

export async function analyzeRepresentative(
  repData: {
    name: string;
    totalDebt: string;
    totalSales: string; 
    invoiceCount: number;
    averagePaymentDays?: number;
  }
): Promise<RepresentativeAnalysis> {
  try {
    const prompt = `
تحلیل نماینده زیر را انجام دهید:

- نام: ${repData.name}
- بدهی کل: ${repData.totalDebt} تومان
- فروش کل: ${repData.totalSales} تومان
- تعداد فاکتورها: ${repData.invoiceCount}
- میانگین روزهای پرداخت: ${repData.averagePaymentDays || 'نامشخص'}

سطح ریسک، الگوی پرداخت و پیشنهادات مدیریتی ارائه دهید.
امتیاز اعتباری از 0 تا 100 تعیین کنید.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            riskLevel: { 
              type: "string",
              enum: ["low", "medium", "high"]
            },
            paymentPattern: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            creditScore: { 
              type: "number",
              minimum: 0,
              maximum: 100
            }
          },
          required: ["riskLevel", "paymentPattern", "recommendations", "creditScore"]
        }
      },
      contents: prompt
    });

    const rawJson = response.text;
    if (rawJson) {
      return JSON.parse(rawJson) as RepresentativeAnalysis;
    } else {
      throw new Error("پاسخ خالی از مدل هوش مصنوعی");
    }
  } catch (error) {
    console.error("خطا در تحلیل نماینده:", error);
    return {
      riskLevel: "medium",
      paymentPattern: "اطلاعات کافی برای تحلیل وجود ندارد",
      recommendations: ["بررسی دقیق‌تر وضعیت مالی"],
      creditScore: 50
    };
  }
}

export async function generateFinancialReport(data: any): Promise<string> {
  try {
    const prompt = `
گزارش مالی تحلیلی برای شرکت MarFaNet بر اساس داده‌های زیر تهیه کنید:
${JSON.stringify(data, null, 2)}

گزارش شامل خلاصه اجرایی، تحلیل روندها، و پیشنهادات استراتژیک باشد.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt
    });

    return response.text || "خطا در تولید گزارش";
  } catch (error) {
    console.error("خطا در تولید گزارش:", error);
    return "خطا در دریافت گزارش از سیستم هوش مصنوعی";
  }
}

export async function answerFinancialQuestion(question: string): Promise<string> {
  try {
    const systemPrompt = `
شما یک مشاور مالی هوشمند برای شرکت MarFaNet هستید که در حوزه توزیع پنل‌های پراکسی فعالیت می‌کند.
به سوالات مالی و حسابداری پاسخ دقیق و کاربردی دهید.
از زبان فارسی استفاده کنید و پاسخ‌ها را ساده و قابل فهم ارائه دهید.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt
      },
      contents: question
    });

    return response.text || "متاسفانه نتوانستم پاسخ مناسبی ارائه دهم";
  } catch (error) {
    console.error("خطا در پاسخ به سوال:", error);
    return "خطا در دریافت پاسخ از دستیار هوشمند";
  }
}
