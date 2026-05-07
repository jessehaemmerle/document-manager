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

function numberEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return value;
}

function splitOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const clientOrigins = splitOrigins(process.env.CLIENT_ORIGIN || "http://localhost:5173");
const authSecret = process.env.AUTH_SECRET || "local-dev-change-me";
const tokenTtlMinutes = numberEnv("AUTH_TOKEN_TTL_MINUTES", 480);
const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || (isProduction ? "" : "admin123");

if (isProduction) {
  if (authSecret === "local-dev-change-me" || authSecret === "change-this-for-production" || authSecret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a unique value with at least 32 characters in production.");
  }
  if (!clientOrigins.length || clientOrigins.some((origin) => origin.includes("localhost") || origin.startsWith("http://"))) {
    throw new Error("CLIENT_ORIGIN must contain the public HTTPS origin in production.");
  }
}

export const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || "./data/document-audits.sqlite",
  clientOrigins,
  appBaseUrl: (process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, ""),
  authSecret,
  tokenTtlMs: tokenTtlMinutes * 60 * 1000,
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "100kb",
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@example.com",
    password: bootstrapAdminPassword
  },
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
