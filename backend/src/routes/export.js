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
