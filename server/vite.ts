import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // 🚨 CRITICAL FIX: Enhanced API route protection with strict checking
  app.use((req, res, next) => {
    // ABSOLUTE API PROTECTION: Never let Vite handle any /api/ routes
    if (req.path.startsWith('/api/')) {
      console.log(`🔒 Vite middleware: PROTECTED API route ${req.path} - bypassing Vite`);
      return next();
    }
    
    // For non-API routes, apply Vite middleware carefully
    console.log(`🔍 Vite middleware: Processing static route ${req.path}`);
    
    // Additional safety check for API-like patterns
    if (req.path.includes('/api/') || req.url.includes('/api/')) {
      console.log(`🚨 Vite middleware: Detected API pattern in ${req.path} - bypassing`);
      return next();
    }
    
    vite.middlewares(req, res, next);
  });

  app.use(vite.ssrFixStacktrace);

  // 🎯 ENHANCED: Catch-all with multiple safety layers
  app.get('*', (req, res, next) => {
    // LAYER 1: Absolute API route protection
    if (req.path.startsWith('/api/') || req.url.startsWith('/api/')) {
      console.log(`🔒 Catch-all: API route ${req.path} protected from Vite`);
      return next();
    }

    // LAYER 2: Check Accept headers for HTML requests only
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    if (!acceptsHtml) {
      console.log(`🔒 Catch-all: Non-HTML request ${req.path} bypassing Vite`);
      return next();
    }

    // LAYER 3: Safe Vite handling for HTML requests
    console.log(`🏠 Catch-all: Serving SPA for ${req.path}`);
    req.url = '/';
    vite.middlewares(req, res, next);
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}