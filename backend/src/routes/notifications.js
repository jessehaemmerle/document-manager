import { Router } from "express";
import { all } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { processAuditNotifications } from "../services/notifications.js";
import { getMailTransportOptions, sendMail, verifyMailTransport } from "../services/mail.js";

export const notificationsRouter = Router();

notificationsRouter.get("/events", requireRole("Admin"), async (_req, res, next) => {
  try {
    res.json(await all(`
      SELECT
        n.*,
        d.title AS document_title
      FROM notification_events n
      JOIN documents d ON d.id = n.document_id
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT 200
    `));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/run", requireRole("Admin"), async (req, res, next) => {
  try {
    res.json(await processAuditNotifications(req.body?.reference_date));
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/mail-config", requireRole("Admin"), async (_req, res) => {
  const options = getMailTransportOptions();
  res.json({
    host: options.host,
    port: options.port,
    secure: options.secure,
    ignoreTLS: options.ignoreTLS,
    requireTLS: options.requireTLS,
    rejectUnauthorized: options.tls?.rejectUnauthorized,
    tlsServername: options.tls?.servername,
    hasCustomCa: Boolean(options.tls?.ca),
    hasAuth: Boolean(options.auth),
    configured: Boolean(options.host)
  });
});

notificationsRouter.post("/verify-mail", requireRole("Admin"), async (_req, res, next) => {
  try {
    res.json(await verifyMailTransport());
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/test-mail", requireRole("Admin"), async (req, res, next) => {
  try {
    const recipient = req.body?.to || req.user.email;
    const result = await sendMail({
      to: recipient,
      subject: "DocAudit Testmail",
      text: "Dies ist eine Testmail von DocAudit über den konfigurierten internen Mailserver.",
      html: "<p>Dies ist eine Testmail von <strong>DocAudit</strong> über den konfigurierten internen Mailserver.</p>"
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
