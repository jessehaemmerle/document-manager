import { all } from "../db/database.js";
import { auditDueState } from "../utils/dates.js";

export async function findDocumentsForNotifications() {
  const rows = await all(`
    SELECT d.*, dep.name AS department_name, dep.responsible_person AS department_contact
    FROM documents d
    JOIN departments dep ON dep.id = d.department_id
    WHERE d.status != 'Archiviert'
    ORDER BY d.next_audit_date ASC
  `);

  return rows
    .map((row) => ({ ...row, due_state: auditDueState(row.next_audit_date) }))
    .filter((row) => row.due_state === "Fällig" || row.due_state === "Überfällig");
}

export async function sendDueAuditNotifications() {
  const documents = await findDocumentsForNotifications();
  return {
    sent: false,
    reason: "Mailversand ist im MVP vorbereitet, aber noch nicht aktiviert.",
    candidates: documents.length
  };
}
