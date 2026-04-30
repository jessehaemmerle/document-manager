import { Router } from "express";
import { all } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { processAuditNotifications } from "../services/notifications.js";

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
