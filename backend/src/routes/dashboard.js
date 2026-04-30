import { Router } from "express";
import { all, get } from "../db/database.js";
import { auditDueState, todayIso } from "../utils/dates.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (_req, res, next) => {
  try {
    const documents = await all(`
      SELECT d.*, dep.name AS department_name
      FROM documents d
      JOIN departments dep ON dep.id = d.department_id
    `);
    const currentMonth = todayIso().slice(0, 7);
    const auditsThisMonth = await get("SELECT COUNT(*) AS count FROM audit_logs WHERE substr(audit_date, 1, 7) = ?", [currentMonth]);

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
      acc[document.department_name] = (acc[document.department_name] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalDocuments: documents.length,
      dueAudits: dueCounts["Fällig"] || 0,
      overdueAudits: dueCounts["Überfällig"] || 0,
      auditsThisMonth: auditsThisMonth.count,
      byStatus,
      byDepartment
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/due-documents", async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT d.*, dep.name AS department_name
      FROM documents d
      JOIN departments dep ON dep.id = d.department_id
      WHERE d.status != 'Archiviert'
      ORDER BY d.next_audit_date ASC
    `);
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
