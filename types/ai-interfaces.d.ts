// Define AI Task interfaces
interface AITask {
  id: string;
  type: string;
  status: string;
  aiContext: AIContext;
  [key: string]: any;
}

interface AIContext {
  input?: string;
  system?: string;
  parameters?: any;
  result?: any;
  [key: string]: any;
}