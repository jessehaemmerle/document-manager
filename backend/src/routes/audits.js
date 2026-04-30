import { Router } from "express";
import { all } from "../db/database.js";

export const auditsRouter = Router();

auditsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await all(`
      SELECT a.*, d.title AS document_title, dep.name AS department_name
      FROM audit_logs a
      JOIN documents d ON d.id = a.document_id
      JOIN departments dep ON dep.id = d.department_id
      ORDER BY a.audit_date DESC, a.id DESC
    `));
  } catch (error) {
    next(error);
  }
});
