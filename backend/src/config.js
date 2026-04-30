import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, "../../.env") });
dotenv.config({ path: path.resolve(currentDir, "../.env") });

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const config = {
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || "./data/document-audits.sqlite",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  appBaseUrl: (process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, ""),
  authSecret: process.env.AUTH_SECRET || "local-dev-change-me",
  mail: {
    host: process.env.MAIL_HOST || "",
    port: Number(process.env.MAIL_PORT || 25),
    user: process.env.MAIL_USER || "",
    password: process.env.MAIL_PASSWORD || "",
    from: process.env.MAIL_FROM || "",
    secure: boolEnv("MAIL_SECURE", false),
    ignoreTls: boolEnv("MAIL_IGNORE_TLS", false),
    requireTls: boolEnv("MAIL_REQUIRE_TLS", false),
    rejectUnauthorized: boolEnv("MAIL_TLS_REJECT_UNAUTHORIZED", true),
    tlsServername: process.env.MAIL_TLS_SERVERNAME || process.env.MAIL_HOST || "",
    tlsCaFile: process.env.MAIL_TLS_CA_FILE || "",
    connectionTimeoutMs: Number(process.env.MAIL_CONNECTION_TIMEOUT_MS || 10000)
  },
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED !== "false",
    dryRun: process.env.MAIL_DRY_RUN === "true" || !process.env.MAIL_HOST,
    checkIntervalMinutes: Number(process.env.NOTIFICATION_CHECK_INTERVAL_MINUTES || 60)
  }
};
