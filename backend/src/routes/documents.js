import { Router } from "express";
import { all, get, run } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { auditDueState, calculateNextAuditDate, todayIso } from "../utils/dates.js";
import { assertOneOf, assertUrl, auditResults, documentTypes, intervals, requireFields, statuses } from "../utils/validation.js";

export const documentsRouter = Router();

const baseSelect = `
  SELECT d.*, dep.name AS department_name
  FROM documents d
  JOIN departments dep ON dep.id = d.department_id
`;

function withDueState(row) {
  return row ? { ...row, due_state: auditDueState(row.next_audit_date) } : row;
}

function validateDocument(body) {
  requireFields(body, ["title", "external_url", "document_type", "department_id", "responsible_person", "status", "audit_interval_type"]);
  assertUrl(body.external_url);
  assertOneOf(body.document_type, documentTypes, "Dokumenttyp");
  assertOneOf(body.status, statuses, "Status");
  assertOneOf(body.audit_interval_type, intervals, "Audit-Intervall");
  if (body.audit_interval_type === "Benutzerdefiniert" && Number(body.audit_interval_days) < 1) {
    throw Object.assign(new Error("Benutzerdefiniertes Intervall muss mindestens 1 Tag betragen."), { status: 400 });
  }
}

documentsRouter.get("/", async (req, res, next) => {
  try {
    const filters = [];
    const params = [];
    if (req.query.search) {
      filters.push("(LOWER(d.title) LIKE ? OR LOWER(d.description) LIKE ?)");
      params.push(`%${String(req.query.search).toLowerCase()}%`, `%${String(req.query.search).toLowerCase()}%`);
    }
    if (req.query.department_id) {
      filters.push("d.department_id = ?");
      params.push(req.query.department_id);
    }
    if (req.query.document_type) {
      filters.push("d.document_type = ?");
      params.push(req.query.document_type);
    }
    if (req.query.status) {
      filters.push("d.status = ?");
      params.push(req.query.status);
    }

    const sortMap = {
      title: "d.title",
      department: "dep.name",
      status: "d.status",
      last_audit_date: "d.last_audit_date",
      next_audit_date: "d.next_audit_date"
    };
    const sort = sortMap[req.query.sort] || "d.next_audit_date";
    const direction = req.query.direction === "desc" ? "DESC" : "ASC";
    const rows = await all(`${baseSelect} ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY ${sort} ${direction}`, params);
    const enriched = rows.map(withDueState).filter((row) => !req.query.due_state || req.query.due_state === "Alle" || row.due_state === req.query.due_state);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await get(`${baseSelect} WHERE d.id = ?`, [req.params.id]);
    if (!row) throw Object.assign(new Error("Dokument nicht gefunden."), { status: 404 });
    res.json(withDueState(row));
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    validateDocument(req.body);
    const lastAuditDate = req.body.last_audit_date || null;
    const nextAuditDate = req.body.next_audit_date || calculateNextAuditDate(lastAuditDate || todayIso(), req.body.audit_interval_type, req.body.audit_interval_days);
    const result = await run(
      `INSERT INTO documents (
        title, description, external_url, document_type, department_id, responsible_person, status,
        audit_interval_type, audit_interval_days, last_audit_date, next_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.title,
        req.body.description || "",
        req.body.external_url,
        req.body.document_type,
        req.body.department_id,
        req.body.responsible_person,
        req.body.status,
        req.body.audit_interval_type,
        req.body.audit_interval_type === "Benutzerdefiniert" ? req.body.audit_interval_days : null,
        lastAuditDate,
        nextAuditDate
      ]
    );
    res.status(201).json(withDueState(await get(`${baseSelect} WHERE d.id = ?`, [result.id])));
  } catch (error) {
    next(error);
  }
});

documentsRouter.put("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    validateDocument(req.body);
    const current = await get("SELECT * FROM documents WHERE id = ?", [req.params.id]);
    if (!current) throw Object.assign(new Error("Dokument nicht gefunden."), { status: 404 });
    const nextAuditDate = req.body.next_audit_date || calculateNextAuditDate(req.body.last_audit_date || current.last_audit_date || todayIso(), req.body.audit_interval_type, req.body.audit_interval_days);
    await run(
      `UPDATE documents
       SET title = ?, description = ?, external_url = ?, document_type = ?, department_id = ?,
           responsible_person = ?, status = ?, audit_interval_type = ?, audit_interval_days = ?,
           last_audit_date = ?, next_audit_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        req.body.title,
        req.body.description || "",
        req.body.external_url,
        req.body.document_type,
        req.body.department_id,
        req.body.responsible_person,
        req.body.status,
        req.body.audit_interval_type,
        req.body.audit_interval_type === "Benutzerdefiniert" ? req.body.audit_interval_days : null,
        req.body.last_audit_date || null,
        nextAuditDate,
        req.params.id
      ]
    );
    res.json(withDueState(await get(`${baseSelect} WHERE d.id = ?`, [req.params.id])));
  } catch (error) {
    next(error);
  }
});

documentsRouter.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    await run("UPDATE documents SET status = 'Archiviert', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id/audits", async (req, res, next) => {
  try {
    res.json(await all("SELECT * FROM audit_logs WHERE document_id = ? ORDER BY audit_date DESC, id DESC", [req.params.id]));
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/:id/audits", requireRole("Admin", "Auditor"), async (req, res, next) => {
  try {
    requireFields(req.body, ["auditor_name", "result"]);
    assertOneOf(req.body.result, auditResults, "Prüfergebnis");
    if (req.body.new_status) assertOneOf(req.body.new_status, statuses, "Neuer Status");

    const document = await get("SELECT * FROM documents WHERE id = ?", [req.params.id]);
    if (!document) throw Object.assign(new Error("Dokument nicht gefunden."), { status: 404 });

    const auditDate = todayIso();
    const newStatus = req.body.new_status || document.status;
    const newNextAuditDate = req.body.new_next_audit_date || calculateNextAuditDate(auditDate, document.audit_interval_type, document.audit_interval_days);

    const result = await run(
      `INSERT INTO audit_logs (
        document_id, audit_date, auditor_name, result, comment, old_status, new_status,
        old_next_audit_date, new_next_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document.id,
        auditDate,
        req.body.auditor_name,
        req.body.result,
        req.body.comment || "",
        document.status,
        newStatus,
        document.next_audit_date,
        newNextAuditDate
      ]
    );

    await run(
      "UPDATE documents SET status = ?, last_audit_date = ?, next_audit_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, auditDate, newNextAuditDate, document.id]
    );

    res.status(201).json(await get("SELECT * FROM audit_logs WHERE id = ?", [result.id]));
  } catch (error) {
    next(error);
  }
});
