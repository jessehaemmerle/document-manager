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

await initDatabase();

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));

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

app.use((req, res) => {
  res.status(404).json({ error: `Route nicht gefunden: ${req.method} ${req.path}` });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Unerwarteter Serverfehler" });
});

app.listen(config.port, () => {
  console.log(`Document Audit API running on http://localhost:${config.port}/api`);
});
