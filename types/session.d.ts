declare module 'express-session' {
  interface SessionData {
    [key: string]: any;
  }
  
  interface Session extends SessionData {
    id: string;
    cookie: any;
    regenerate(callback: (err?: any) => void): void;
    destroy(callback: (err?: any) => void): void;
    reload(callback: (err?: any) => void): void;
    save(callback?: (err?: any) => void): void;
    touch(): void;
  }
  
  function session(options?: any): any;
  export = session;
}

declare module 'connect-pg-simple' {
  function connectPgSimple(session: any): any;
  export = connectPgSimple;
}