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

  // 🚨 CRITICAL FIX: Complete API route isolation from Vite
  app.use((req, res, next) => {
    // ABSOLUTE API PROTECTION: Never let Vite handle any /api/ routes
    if (req.path.startsWith('/api/') || req.url.startsWith('/api/')) {
      console.log(`🔒 Vite middleware: BYPASSING API route ${req.path}`);
      return next();
    }

    // Additional safety checks for API patterns
    if (req.path.includes('/api/') || req.url.includes('/api/') || req.originalUrl?.includes('/api/')) {
      console.log(`🚨 Vite middleware: BYPASSING API pattern in ${req.path}`);
      return next();
    }

    // Only process static assets and UI routes
    if (req.path.startsWith('/src/') || req.path.startsWith('/@') || req.path.endsWith('.tsx') || req.path.endsWith('.ts') || req.path.endsWith('.css')) {
      console.log(`🔍 Vite middleware: Processing dev asset ${req.path}`);
      return vite.middlewares(req, res, next);
    }

    // For root and other UI routes, serve the app
    if (req.path === '/' || (!req.path.includes('.') && !req.path.startsWith('/api/'))) {
      console.log(`🏠 Vite middleware: Serving app for ${req.path}`);
      return vite.middlewares(req, res, next);
    }

    // Let other middleware handle everything else
    next();
  });

  app.use(vite.ssrFixStacktrace);
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