import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || "./data/document-audits.sqlite",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  authSecret: process.env.AUTH_SECRET || "local-dev-change-me",
  mail: {
    host: process.env.MAIL_HOST || "",
    port: process.env.MAIL_PORT || "",
    user: process.env.MAIL_USER || "",
    password: process.env.MAIL_PASSWORD || "",
    from: process.env.MAIL_FROM || ""
  },
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED !== "false",
    dryRun: process.env.MAIL_DRY_RUN === "true" || !process.env.MAIL_HOST,
    checkIntervalMinutes: Number(process.env.NOTIFICATION_CHECK_INTERVAL_MINUTES || 60)
  }
};
