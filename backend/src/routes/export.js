import { Router } from "express";
import { all } from "../db/database.js";
import { sendCsv, toCsv } from "../utils/csv.js";
import { auditDueState } from "../utils/dates.js";

export const exportRouter = Router();

const auditColumns = [
  { key: "id", label: "ID" },
  { key: "document_id", label: "Dokument-ID" },
  { key: "document_title", label: "Dokument" },
  { key: "audit_date", label: "Prüfdatum" },
  { key: "auditor_name", label: "Prüfer" },
  { key: "result", label: "Ergebnis" },
  { key: "comment", label: "Kommentar" },
  { key: "old_status", label: "Alter Status" },
  { key: "new_status", label: "Neuer Status" },
  { key: "old_next_audit_date", label: "Altes nächstes Prüfdatum" },
  { key: "new_next_audit_date", label: "Neues nächstes Prüfdatum" }
];

exportRouter.get("/documents", async (_req, res, next) => {
  try {
    const rows = await all(`
      SELECT d.*, dep.name AS department_name
      FROM documents d
      JOIN departments dep ON dep.id = d.department_id
      ORDER BY d.title
    `);
    const csv = toCsv(rows.map((row) => ({ ...row, due_state: auditDueState(row.next_audit_date) })), [
      { key: "id", label: "ID" },
      { key: "title", label: "Titel" },
      { key: "description", label: "Beschreibung" },
      { key: "external_url", label: "Externer Link" },
      { key: "document_type", label: "Dokumenttyp" },
      { key: "department_name", label: "Abteilung" },
      { key: "responsible_person", label: "Verantwortlich" },
      { key: "status", label: "Status" },
      { key: "due_state", label: "Audit-Fälligkeit" },
      { key: "last_audit_date", label: "Letztes Audit" },
      { key: "next_audit_date", label: "Nächstes Audit" }
    ]);
    sendCsv(res, "dokumente.csv", csv);
  } catch (error) {
    next(error);
  }
});

exportRouter.get("/audits", async (_req, res, next) => {
  try {
    const rows = await all(`
      SELECT a.*, d.title AS document_title
      FROM audit_logs a
      JOIN documents d ON d.id = a.document_id
      ORDER BY a.audit_date DESC
    `);
    sendCsv(res, "audit-historie.csv", toCsv(rows, auditColumns));
  } catch (error) {
    next(error);
  }
});

exportRouter.get("/users", async (_req, res, next) => {
  try {
    const rows = await all(`
      SELECT
        u.id,
        (u.first_name || ' ' || u.last_name) AS full_name,
        u.email,
        u.app_role,
        u.employee_role,
        u.job_title,
        dep.name AS department_name,
        (m.first_name || ' ' || m.last_name) AS manager_name,
        CASE WHEN u.is_active = 1 THEN 'Aktiv' ELSE 'Inaktiv' END AS status
      FROM users u
      LEFT JOIN departments dep ON dep.id = u.department_id
      LEFT JOIN users m ON m.id = u.manager_id
      ORDER BY u.last_name, u.first_name
    `);
    sendCsv(res, "benutzer.csv", toCsv(rows, [
      { key: "id", label: "ID" },
      { key: "full_name", label: "Name" },
      { key: "email", label: "E-Mail" },
      { key: "app_role", label: "App-Rolle" },
      { key: "employee_role", label: "Mitarbeiter-Rolle" },
      { key: "job_title", label: "Funktion" },
      { key: "department_name", label: "Abteilung" },
      { key: "manager_name", label: "Vorgesetzter" },
      { key: "status", label: "Status" }
    ]));
  } catch (error) {
    next(error);
  }
});

exportRouter.get("/documents/:id/audits", async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT a.*, d.title AS document_title
      FROM audit_logs a
      JOIN documents d ON d.id = a.document_id
      WHERE a.document_id = ?
      ORDER BY a.audit_date DESC
    `, [req.params.id]);
    sendCsv(res, `audit-historie-dokument-${req.params.id}.csv`, toCsv(rows, auditColumns));
  } catch (error) {
    next(error);
  }
});
