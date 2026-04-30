import { Router } from "express";
import { all } from "../db/database.js";
import { addDocumentAccessFilter } from "../middleware/roles.js";

export const auditsRouter = Router();

auditsRouter.get("/", async (_req, res, next) => {
  try {
    const filters = [];
    const params = [];
    addDocumentAccessFilter(_req, filters, params);
    res.json(await all(`
      SELECT
        a.*,
        d.title AS document_title,
        dep.name AS department_name,
        audit_dep.name AS audit_department_name,
        (assigned.first_name || ' ' || assigned.last_name) AS assigned_user_name
      FROM audit_logs a
      JOIN documents d ON d.id = a.document_id
      JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN departments audit_dep ON audit_dep.id = COALESCE(d.audit_department_id, d.department_id)
      LEFT JOIN users assigned ON assigned.id = d.assigned_user_id
      ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
      ORDER BY a.audit_date DESC, a.id DESC
    `, params));
  } catch (error) {
    next(error);
  }
});
