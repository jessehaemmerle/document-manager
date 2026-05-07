import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { initDatabase } from "./db/init.js";
import { documentsRouter } from "./routes/documents.js";
import { departmentsRouter } from "./routes/departments.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { auditsRouter } from "./routes/audits.js";
import { exportRouter } from "./routes/export.js";
import { usersRouter } from "./routes/users.js";
import { authRouter } from "./routes/auth.js";
import { authenticate, requireAuth } from "./middleware/roles.js";
import { notificationsRouter } from "./routes/notifications.js";
import { startNotificationScheduler } from "./services/notifications.js";

await initDatabase();

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (config.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }
    callback(Object.assign(new Error("CORS origin not allowed."), { status: 403 }));
  }
}));
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(morgan(config.isProduction ? "combined" : "dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use(authenticate);
app.use("/api", requireAuth);
app.use("/api/documents", documentsRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/users", usersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/audits", auditsRouter);
app.use("/api/export", exportRouter);
app.use("/api/notifications", notificationsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route nicht gefunden: ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  } else if (!config.isProduction) {
    console.warn(err.message);
  }
  res.status(status).json({ error: status >= 500 ? "Unerwarteter Serverfehler" : err.message });
});

app.listen(config.port, () => {
  console.log(`Document Audit API running on http://localhost:${config.port}/api`);
  startNotificationScheduler();
});
