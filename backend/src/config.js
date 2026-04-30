import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || "./data/document-audits.sqlite",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mail: {
    host: process.env.MAIL_HOST || "",
    port: process.env.MAIL_PORT || "",
    user: process.env.MAIL_USER || "",
    password: process.env.MAIL_PASSWORD || "",
    from: process.env.MAIL_FROM || ""
  }
};
