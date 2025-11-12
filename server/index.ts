import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Crear directorio para sesiones si no existe
const sessionsDir = path.join(process.cwd(), "sessions");
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true });
  console.log("📁 Created sessions directory:", sessionsDir);
}

// --- Sesión con FileStore para persistencia ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: true,  // ✅ Guardar sesión en cada request (evita pérdida)
    saveUninitialized: false,
    store: (() => {
      try {
        // Intentar usar session-file-store si está disponible
        const FileStore = require("session-file-store")(session);
        console.log("✅ Using FileStore for session persistence");
        return new FileStore({
          path: sessionsDir,
          ttl: 7 * 24 * 60 * 60, // 7 días en segundos
          retries: 0,
          reapInterval: 3600, // Limpiar sesiones expiradas cada hora
        });
      } catch (e) {
        console.warn("⚠️ FileStore not available, using MemoryStore (sessions will not persist)");
        return undefined; // Usar MemoryStore por defecto
      }
    })(),
    cookie: { 
      secure: false, // ponlo en true si sirves por HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días de duración
      httpOnly: true, // Protección contra XSS
      sameSite: 'lax' // Protección CSRF
    },
    rolling: true, // ✅ Renueva la cookie en cada request (mantiene sesión activa)
  })
);

// --- Logging de API (tal como tenías) ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json.bind(res);
  (res as any).json = (body: unknown, ...args: Parameters<Response["json"]> extends [any, ...infer U] ? U : []) => {
    capturedJsonResponse = body;
    return originalResJson(body, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse !== undefined) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {}
      }
      if (logLine.length > 5000) logLine = logLine.slice(0, 5000) + "…";
      log(logLine);
    }
  });

  next();
});

// --- Endpoints de auth muy básicos ---
// COMENTADO: Endpoint duplicado que bloquea el de routes.ts
/*
app.post("/api/login", async (req, res) => {
  const { username, password, remember } = req.body || {};

  // Demo hardcode: cambia esto por tu lookup real en DB
  if (username === "tekpro" && password === "tekpro2025") {
    // Opcional (mejor práctica): regenerar la sesión al iniciar sesión
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not initialize session" });
      }

      (req.session as any).user = { username };

      // "Remember me": cookie persistente vs cookie de sesión
      if (remember) {
        // p.ej. 30 días
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // cookie de sesión (se borra al cerrar el navegador)
        req.session.cookie.expires = false as any; // indica cookie de sesión
        req.session.cookie.maxAge = undefined as any;
      }

      return res.json({ ok: true, user: { username } });
    });
    return;
  }

  return res.status(401).json({ message: "Invalid credentials" });
});
*/

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/session", (req, res) => {
  const user = (req.session as any)?.user || null;
  res.json({ user });
});

// --- Helpers para NO bloquear assets y solo proteger HTML ---
const STATIC_PREFIXES = [
  "/assets",
  "/public",
  "/favicon.ico",
  "/robots.txt",
  "/manifest.json",
  // Vite dev:
  "/@vite",
  "/@react-refresh",
  "/src",            // archivos fuente servidos por Vite en dev
  "/node_modules",   // (algunos setups pueden servir de aquí en dev)
];

function isStaticAsset(req: Request) {
  return STATIC_PREFIXES.some((p) => req.path.startsWith(p));
}

function isApi(req: Request) {
  return req.path.startsWith("/api");
}

function isLoginRoute(req: Request) {
  return req.path === "/login" || req.path === "/signup";
}

function acceptsHtml(req: Request) {
  const a = req.headers["accept"] || "";
  return typeof a === "string" && a.includes("text/html");
}

// --- Middleware para verificar sesión en APIs ---
app.use((req, res, next) => {
  // Solo para APIs (excepto login/logout/session)
  if (req.path.startsWith("/api") && 
      req.path !== "/api/login" && 
      req.path !== "/api/logout" && 
      req.path !== "/api/session") {
    
    const user = (req.session as any)?.user;
    
    if (!user) {
      return res.status(401).json({ message: "Session expired or invalid" });
    }
  }
  
  next();
});

// --- Guardia de auth SOLO para HTML (no APIs ni assets) ---
app.use((req, res, next) => {
  // deja pasar APIs, assets y la propia ruta de login/signup
  if (isApi(req) || isStaticAsset(req) || isLoginRoute(req)) return next();

  // Solo aplica a peticiones que piden HTML (navegación)
  if (!acceptsHtml(req)) return next();

  // Si no hay sesión -> redirige a /login
  if (!(req.session as any)?.user) {
    return res.redirect("/login");
  }

  return next();
});

(async () => {
  // Mostrar credenciales disponibles
  console.log("🔐 ===== CREDENCIALES DISPONIBLES =====");
  console.log("👤 tekpro / tekpro2025");
  console.log("👤 jensen / jensen2025");
  console.log("👤 carlos / carlos2025");
  console.log("👤 ericka / ericka2025");
  console.log("🔐 =====================================");
  
  // Test de conexión a la base de datos
  try {
    console.log("🔍 [DB] Probando conexión a la base de datos...");
    const testUser = await storage.getUserByUsername("tekpro");
    console.log("✅ [DB] Conexión exitosa. Usuario test:", testUser ? testUser.username : "No encontrado");
  } catch (error) {
    console.error("❌ [DB] Error de conexión:", error);
  }
  
  // Exponer storage a routes
  app.set("storage", storage);

  // APIs de tu app
  const server = await registerRoutes(app);

  // Manejo de errores
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(status).json({ message });
    log(`[error] ${status}: ${message}`);
  });

  // Vite en dev / estáticos en prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 3008;
  const host = process.env.HOST;

  if (host) {
    server.listen(port, host, () => log(`serving on http://${host}:${port}`));
  } else {
    server.listen(port, () => log(`serving on http://localhost:${port}`));
  }
})();
