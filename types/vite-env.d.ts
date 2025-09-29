// Vite environment type definitions
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_TOKEN: string;
  readonly VITE_ENVIRONMENT: string;
  readonly [key: string]: string | undefined;
}

// NOTE: برای جلوگیری از تداخل با index signature (string) مقدار DEV را به صورت رشته تفسیر می‌کنیم ("true"/"false").
interface ImportMetaEnvExtra {
  readonly DEV?: string; // interpret truthy via === 'true'
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot: {
    readonly data: any;
    accept(): void;
    accept(cb: (mod: any) => void): void;
    accept(deps: string[], cb: (mods: any[]) => void): void;
    dispose(cb: (data: any) => void): void;
    decline(): void;
    invalidate(): void;
    on(event: string, cb: (...args: any[]) => void): void;
  };
  readonly glob: (pattern: string) => Record<string, () => Promise<any>>;
}

// ترکیب دو اینترفیس: (Hack) - در TS declaration merging انجام می‌شود
interface ImportMeta extends ImportMetaEnvExtra {}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_TELEGRAM_BOT_TOKEN?: string;
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_NODE_ENV?: string;
  // Add other Vite environment variables as needed
}