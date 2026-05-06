import { get, run } from "./database.js";
import { hashPassword } from "../utils/passwords.js";

const demoEmails = [
  "miriam.keller@example.com",
  "david.rauch@example.com",
  "thomas.berger@example.com",
  "lea.hartmann@example.com",
  "anna.leitner@example.com",
  "sophie.audit@example.com",
  "julia.weiss@example.com",
  "markus.fink@example.com",
  "nina.hofer@example.com",
  "max.pruefer@example.com"
];

const demoDocumentUrls = [
  "https://intranet.example.com/it/security-policy",
  "https://sharepoint.example.com/docs/backup-runbook",
  "https://wiki.example.com/process/wareneingang",
  "https://sharepoint.example.com/qa/line2-checklist",
  "https://intranet.example.com/hr/onboarding",
  "https://sharepoint.example.com/procurement/supplier-rating",
  "https://forms.example.com/shift-handover",
  "https://wiki.example.com/production/emergency",
  "https://intranet.example.com/admin/travel-old",
  "https://wiki.example.com/qa/claims"
];

const demoDepartments = ["IT", "Produktion", "Verwaltung", "Einkauf", "Logistik"];

const bootstrapAdmin = {
  firstName: "Bootstrap",
  lastName: "Admin",
  email: "admin@example.com",
  password: "admin123"
};

export async function removeDemoData() {
  await run(
    `DELETE FROM documents WHERE external_url IN (${placeholders(demoDocumentUrls)})`,
    demoDocumentUrls
  );
  await run(
    `UPDATE users
     SET manager_id = NULL
     WHERE LOWER(email) IN (${placeholders(demoEmails)}) OR manager_id IN (
       SELECT id FROM users WHERE LOWER(email) IN (${placeholders(demoEmails)})
     )`,
    [...demoEmails, ...demoEmails]
  );
  await run(
    `UPDATE departments
     SET supervisor_user_id = NULL
     WHERE supervisor_user_id IN (
       SELECT id FROM users WHERE LOWER(email) IN (${placeholders(demoEmails)})
     )`,
    demoEmails
  );
  await run(
    `DELETE FROM users WHERE LOWER(email) IN (${placeholders(demoEmails)})`,
    demoEmails
  );
  await run(
    `DELETE FROM departments
     WHERE (name IN (${placeholders(demoDepartments)}) OR name LIKE ?)
       AND id NOT IN (SELECT DISTINCT department_id FROM documents WHERE department_id IS NOT NULL)
       AND id NOT IN (SELECT DISTINCT audit_department_id FROM documents WHERE audit_department_id IS NOT NULL)
       AND id NOT IN (SELECT DISTINCT department_id FROM users WHERE department_id IS NOT NULL)`,
    [...demoDepartments, "Qualit%ssicherung"]
  );
}

export async function ensureBootstrapAdmin() {
  const activeAdmins = await get("SELECT COUNT(*) AS count FROM users WHERE app_role = 'Admin' AND is_active = 1");
  if (activeAdmins?.count) return;

  const { hash, salt } = hashPassword(bootstrapAdmin.password);
  const existingBootstrap = await get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [bootstrapAdmin.email]);
  if (existingBootstrap) {
    await run(
      `UPDATE users
       SET first_name = ?, last_name = ?, app_role = ?, job_title = ?, department_id = NULL,
           manager_id = NULL, password_hash = ?, password_salt = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        bootstrapAdmin.firstName,
        bootstrapAdmin.lastName,
        "Admin",
        "Initialer Systemzugang",
        hash,
        salt,
        existingBootstrap.id
      ]
    );
    return;
  }

  await run(
    `INSERT INTO users (
      first_name, last_name, email, app_role, job_title, department_id, manager_id, password_hash, password_salt, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bootstrapAdmin.firstName,
      bootstrapAdmin.lastName,
      bootstrapAdmin.email,
      "Admin",
      "Initialer Systemzugang",
      null,
      null,
      hash,
      salt,
      1
    ]
  );
}

function placeholders(values) {
  return values.map(() => "?").join(", ");
}
