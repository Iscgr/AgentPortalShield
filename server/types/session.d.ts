import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    user?: {
      id: number;
      username: string;
      role: string;
      permissions: string[];
    };
    // ...existing code...
  }
}