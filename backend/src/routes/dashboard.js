import { Router } from "express";
import { all, get } from "../db/database.js";
import { addDocumentAccessFilter } from "../middleware/roles.js";
import { auditDueState, todayIso } from "../utils/dates.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (req, res, next) => {
  try {
    const filters = [];
    const params = [];
    addDocumentAccessFilter(req, filters, params);
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const documents = await all(`
      SELECT d.*, dep.name AS department_name, audit_dep.name AS audit_department_name
      FROM documents d
      JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN departments audit_dep ON audit_dep.id = COALESCE(d.audit_department_id, d.department_id)
      ${where}
    `, params);
    const currentMonth = todayIso().slice(0, 7);
    const auditsThisMonth = await get(`
      SELECT COUNT(*) AS count
      FROM audit_logs a
      JOIN documents d ON d.id = a.document_id
      ${where ? `${where} AND` : "WHERE"} substr(a.audit_date, 1, 7) = ?
    `, [...params, currentMonth]);
    const activeUserWhere = req.user.app_role === "Admin"
      ? ["is_active = 1", []]
      : req.user.app_role === "Führungskraft"
        ? ["is_active = 1 AND department_id = ?", [req.user.department_id]]
        : ["is_active = 1 AND id = ?", [req.user.id]];
    const activeUsers = await get(`SELECT COUNT(*) AS count FROM users WHERE ${activeUserWhere[0]}`, activeUserWhere[1]);

    const dueCounts = documents.reduce((acc, document) => {
      const state = auditDueState(document.next_audit_date);
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    const byStatus = documents.reduce((acc, document) => {
      acc[document.status] = (acc[document.status] || 0) + 1;
      return acc;
    }, {});

    const byDepartment = documents.reduce((acc, document) => {
      const department = document.audit_department_name || document.department_name;
      acc[department] = (acc[department] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalDocuments: documents.length,
      dueAudits: dueCounts["Fällig"] || 0,
      overdueAudits: dueCounts["Überfällig"] || 0,
      auditsThisMonth: auditsThisMonth.count,
      activeUsers: activeUsers.count,
      byStatus,
      byDepartment
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/due-documents", async (req, res, next) => {
  try {
    const filters = ["d.status != 'Archiviert'"];
    const params = [];
    addDocumentAccessFilter(req, filters, params);
    const rows = await all(`
      SELECT
        d.*,
        dep.name AS department_name,
        audit_dep.name AS audit_department_name,
        (assigned.first_name || ' ' || assigned.last_name) AS assigned_user_name
      FROM documents d
      JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN departments audit_dep ON audit_dep.id = COALESCE(d.audit_department_id, d.department_id)
      LEFT JOIN users assigned ON assigned.id = d.assigned_user_id
      WHERE ${filters.join(" AND ")}
      ORDER BY d.next_audit_date ASC
    `, params);
    const limit = Number(req.query.limit || 50);
    res.json(
      rows
        .map((row) => ({ ...row, due_state: auditDueState(row.next_audit_date) }))
        .filter((row) => row.due_state !== "Nicht fällig")
        .slice(0, limit)
    );
  } catch (error) {
    next(error);
  }
});
