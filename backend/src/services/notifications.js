import { all, get, run } from "../db/database.js";
import { config } from "../config.js";
import { sendMail } from "./mail.js";
import { todayIso } from "../utils/dates.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  return Math.floor((to - from) / MS_PER_DAY);
}

function uniqueRecipients(recipients) {
  const seen = new Set();
  return recipients.filter((recipient) => {
    if (!recipient?.email || seen.has(recipient.email)) return false;
    seen.add(recipient.email);
    return true;
  });
}

async function getLeadershipRecipients(document) {
  const recipients = [];
  if (document.supervisor_email) {
    recipients.push({ email: document.supervisor_email, name: document.supervisor_name });
  }
  if (document.assigned_manager_email) {
    recipients.push({ email: document.assigned_manager_email, name: document.assigned_manager_name });
  }

  const leaders = await all(
    `SELECT email, (first_name || ' ' || last_name) AS name
     FROM users
     WHERE is_active = 1 AND app_role = 'Führungskraft' AND department_id = ?`,
    [document.audit_department_id || document.department_id]
  );
  return uniqueRecipients([...recipients, ...leaders]);
}

function assignedRecipients(document) {
  if (!document.assigned_user_email) return [];
  return [{ email: document.assigned_user_email, name: document.assigned_user_name }];
}

function buildMail(stage, document, statusSnapshot) {
  const stageLabels = {
    due: "Audit fällig",
    plus_2_same_status: "Audit seit 2 Tagen unverändert",
    plus_5_leadership: "Eskalation: Audit seit 5 Tagen unverändert"
  };
  const subject = `${stageLabels[stage]}: ${document.title}`;
  const lines = [
    `Dokument: ${document.title}`,
    `Audit-Abteilung: ${document.audit_department_name || document.department_name}`,
    `Prüfdatum: ${document.next_audit_date}`,
    `Status am Prüfdatum: ${statusSnapshot}`,
    `Aktueller Status: ${document.status}`,
    `Zugewiesen an: ${document.assigned_user_name || "Nicht zugewiesen"}`,
    `Externer Link: ${document.external_url}`
  ];
  if (stage === "plus_2_same_status") {
    lines.splice(1, 0, "Das Dokument hat 2 Tage nach dem Prüfdatum weiterhin den gleichen Status.");
  }
  if (stage === "plus_5_leadership") {
    lines.splice(1, 0, "Das Dokument hat 5 Tage nach dem Prüfdatum weiterhin den gleichen Status. Diese Nachricht geht zusätzlich an die Führungskraft.");
  }
  const text = lines.join("\n");
  const html = `<p>${lines.map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join("<br>")}</p>`;
  return { subject, text, html };
}

async function getEvent(documentId, dueDate, stage) {
  return get(
    "SELECT * FROM notification_events WHERE document_id = ? AND due_date = ? AND stage = ?",
    [documentId, dueDate, stage]
  );
}

async function recordEvent({ document, dueDate, stage, statusSnapshot, recipients, deliveryStatus, errorMessage }) {
  await run(
    `INSERT INTO notification_events (
      document_id, due_date, stage, status_snapshot, recipients, delivery_status, error_message, sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(document_id, due_date, stage) DO UPDATE SET
      status_snapshot = excluded.status_snapshot,
      recipients = excluded.recipients,
      delivery_status = excluded.delivery_status,
      error_message = excluded.error_message,
      sent_at = excluded.sent_at`,
    [
      document.id,
      dueDate,
      stage,
      statusSnapshot,
      JSON.stringify(recipients),
      deliveryStatus,
      errorMessage || null
    ]
  );
}

async function sendStage(document, stage, statusSnapshot, recipients) {
  const existing = await getEvent(document.id, document.next_audit_date, stage);
  if (existing && ["sent", "dry-run"].includes(existing.delivery_status)) {
    return { skipped: true, stage, reason: "already-sent" };
  }

  const normalizedRecipients = uniqueRecipients(recipients);
  try {
    const mail = buildMail(stage, document, statusSnapshot);
    const result = await sendMail({
      to: normalizedRecipients.map((recipient) => recipient.email),
      ...mail
    });
    await recordEvent({
      document,
      dueDate: document.next_audit_date,
      stage,
      statusSnapshot,
      recipients: normalizedRecipients,
      deliveryStatus: result.dryRun ? "dry-run" : "sent"
    });
    return { sent: true, stage, deliveryStatus: result.dryRun ? "dry-run" : "sent" };
  } catch (error) {
    await recordEvent({
      document,
      dueDate: document.next_audit_date,
      stage,
      statusSnapshot,
      recipients: normalizedRecipients,
      deliveryStatus: "failed",
      errorMessage: error.message
    });
    return { sent: false, stage, deliveryStatus: "failed", error: error.message };
  }
}

export async function findDocumentsForNotifications(referenceDate = todayIso()) {
  return all(
    `SELECT
      d.*,
      dep.name AS department_name,
      audit_dep.name AS audit_department_name,
      assigned.email AS assigned_user_email,
      (assigned.first_name || ' ' || assigned.last_name) AS assigned_user_name,
      supervisor.email AS supervisor_email,
      (supervisor.first_name || ' ' || supervisor.last_name) AS supervisor_name,
      manager.email AS assigned_manager_email,
      (manager.first_name || ' ' || manager.last_name) AS assigned_manager_name
    FROM documents d
    JOIN departments dep ON dep.id = d.department_id
    LEFT JOIN departments audit_dep ON audit_dep.id = COALESCE(d.audit_department_id, d.department_id)
    LEFT JOIN users assigned ON assigned.id = d.assigned_user_id AND assigned.is_active = 1
    LEFT JOIN users manager ON manager.id = assigned.manager_id AND manager.is_active = 1
    LEFT JOIN users supervisor ON supervisor.id = audit_dep.supervisor_user_id AND supervisor.is_active = 1
    WHERE d.status != 'Archiviert' AND date(d.next_audit_date) <= date(?)
    ORDER BY d.next_audit_date ASC, d.title ASC`,
    [referenceDate]
  );
}

export async function processAuditNotifications(referenceDate = todayIso()) {
  if (!config.notifications.enabled) {
    return { enabled: false, processedDocuments: 0, results: [] };
  }

  const documents = await findDocumentsForNotifications(referenceDate);
  const results = [];

  for (const document of documents) {
    const daysAfterDue = daysBetween(document.next_audit_date, referenceDate);
    if (daysAfterDue < 0) continue;

    const dueEvent = await getEvent(document.id, document.next_audit_date, "due");
    const statusSnapshot = dueEvent?.status_snapshot || document.status;
    const leadership = await getLeadershipRecipients(document);
    const assigned = assignedRecipients(document);
    const primaryRecipients = assigned.length ? assigned : leadership;

    results.push(await sendStage(document, "due", statusSnapshot, primaryRecipients));

    if (daysAfterDue >= 2 && document.status === statusSnapshot) {
      results.push(await sendStage(document, "plus_2_same_status", statusSnapshot, primaryRecipients));
    }

    if (daysAfterDue >= 5 && document.status === statusSnapshot) {
      results.push(await sendStage(document, "plus_5_leadership", statusSnapshot, [...primaryRecipients, ...leadership]));
    }
  }

  return {
    enabled: true,
    dryRun: config.notifications.dryRun,
    processedDocuments: documents.length,
    results
  };
}

export function startNotificationScheduler() {
  if (!config.notifications.enabled) return null;
  const intervalMs = Math.max(5, config.notifications.checkIntervalMinutes) * 60 * 1000;
  processAuditNotifications().catch((error) => console.error("Notification run failed", error));
  return setInterval(() => {
    processAuditNotifications().catch((error) => console.error("Notification run failed", error));
  }, intervalMs);
}
