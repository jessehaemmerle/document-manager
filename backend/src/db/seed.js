import { all, run, get } from "./database.js";
import { addDays, todayIso } from "../utils/dates.js";

const departments = [
  ["IT", "Systeme, Infrastruktur und digitale Werkzeuge", "Miriam Keller"],
  ["Produktion", "Fertigungsnahe Prozessdokumente", "Thomas Berger"],
  ["Qualitätssicherung", "Prüfanweisungen und Qualitätsstandards", "Anna Leitner"],
  ["Verwaltung", "Interne Richtlinien und Vorlagen", "Julia Weiss"],
  ["Einkauf", "Lieferanten- und Beschaffungsprozesse", "Markus Fink"],
  ["Logistik", "Lager, Versand und Warenfluss", "Nina Hofer"]
];

const users = [
  ["Miriam", "Keller", "miriam.keller@example.com", "Admin", "Vorgesetzter", "IT-Leiterin", "IT", null],
  ["David", "Rauch", "david.rauch@example.com", "Auditor", "Mitarbeiter", "System Engineer", "IT", "miriam.keller@example.com"],
  ["Thomas", "Berger", "thomas.berger@example.com", "Auditor", "Vorgesetzter", "Produktionsleiter", "Produktion", null],
  ["Lea", "Hartmann", "lea.hartmann@example.com", "Mitarbeiter", "Mitarbeiter", "Schichtkoordination", "Produktion", "thomas.berger@example.com"],
  ["Anna", "Leitner", "anna.leitner@example.com", "Auditor", "Vorgesetzter", "QS-Leitung", "Qualitätssicherung", null],
  ["Sophie", "Audit", "sophie.audit@example.com", "Auditor", "Mitarbeiter", "Audit Specialist", "Qualitätssicherung", "anna.leitner@example.com"],
  ["Julia", "Weiss", "julia.weiss@example.com", "Admin", "Vorgesetzter", "Verwaltungsleitung", "Verwaltung", null],
  ["Markus", "Fink", "markus.fink@example.com", "Mitarbeiter", "Vorgesetzter", "Einkaufsleitung", "Einkauf", null],
  ["Nina", "Hofer", "nina.hofer@example.com", "Viewer", "Vorgesetzter", "Logistikleitung", "Logistik", null],
  ["Max", "Pruefer", "max.pruefer@example.com", "Auditor", "Mitarbeiter", "Interner Auditor", "Verwaltung", "julia.weiss@example.com"]
];

const documents = [
  ["IT Sicherheitsrichtlinie", "Regeln für Accounts, Passwörter und Geräte", "https://intranet.example.com/it/security-policy", "Richtlinie", "IT", "Miriam Keller", "Aktiv", "Quartalsweise", null, -100, -10],
  ["Backup Arbeitsanweisung", "Wiederherstellung und Kontrollschritte", "https://sharepoint.example.com/docs/backup-runbook", "Arbeitsanweisung", "IT", "David Rauch", "In Prüfung", "Monatlich", null, -32, 5],
  ["Wareneingang Prozess", "Ablauf vom Empfang bis zur Freigabe", "https://wiki.example.com/process/wareneingang", "Prozessbeschreibung", "Logistik", "Nina Hofer", "Aktiv", "Halbjährlich", null, -170, 12],
  ["Prüfplan Linie 2", "Qualitätsprüfung für Produktionslinie 2", "https://sharepoint.example.com/qa/line2-checklist", "Formular", "Qualitätssicherung", "Anna Leitner", "Überarbeitung erforderlich", "Monatlich", null, -45, -2],
  ["Onboarding Anleitung", "Erste Schritte für neue Mitarbeitende", "https://intranet.example.com/hr/onboarding", "Anleitung", "Verwaltung", "Julia Weiss", "Aktiv", "Jährlich", null, -180, 185],
  ["Lieferantenbewertung", "Bewertungskriterien und Freigaben", "https://sharepoint.example.com/procurement/supplier-rating", "Arbeitsanweisung", "Einkauf", "Markus Fink", "Aktiv", "Quartalsweise", null, -80, 10],
  ["Schichtübergabe Formular", "Standardisierte Übergabe in der Produktion", "https://forms.example.com/shift-handover", "Formular", "Produktion", "Thomas Berger", "Aktiv", "Benutzerdefiniert", 45, -40, 4],
  ["Notfallhandbuch Produktion", "Sofortmaßnahmen bei Störungen", "https://wiki.example.com/production/emergency", "Anleitung", "Produktion", "Lea Hartmann", "Aktiv", "Halbjährlich", null, -220, -30],
  ["Archivierte Reisekostenregel", "Alte Fassung der Reisekostenregelung", "https://intranet.example.com/admin/travel-old", "Richtlinie", "Verwaltung", "Julia Weiss", "Archiviert", "Jährlich", null, -420, 40],
  ["Reklamationsprozess", "Bearbeitung externer Reklamationen", "https://wiki.example.com/qa/claims", "Prozessbeschreibung", "Qualitätssicherung", "Anna Leitner", "In Prüfung", "Quartalsweise", null, -60, 25]
];

export async function seedDatabase() {
  const existingDepartments = await get("SELECT COUNT(*) AS count FROM departments");
  const departmentIds = new Map();
  if (!existingDepartments?.count) {
    for (const department of departments) {
      const result = await run(
        "INSERT INTO departments (name, description, responsible_person) VALUES (?, ?, ?)",
        department
      );
      departmentIds.set(department[0], result.id);
    }
  } else {
    const rows = await all("SELECT id, name FROM departments");
    rows.forEach((department) => departmentIds.set(department.name, department.id));
  }

  const userIds = new Map();
  const existingUsers = await get("SELECT COUNT(*) AS count FROM users");
  if (!existingUsers?.count) {
    for (const user of users) {
      const [firstName, lastName, email, appRole, employeeRole, jobTitle, departmentName] = user;
      const result = await run(
        `INSERT INTO users (
          first_name, last_name, email, app_role, employee_role, job_title, department_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, appRole, employeeRole, jobTitle, departmentIds.get(departmentName)]
      );
      userIds.set(email, result.id);
    }

    for (const user of users) {
      const [, , email, , , , , managerEmail] = user;
      if (managerEmail) {
        await run("UPDATE users SET manager_id = ? WHERE email = ?", [userIds.get(managerEmail), email]);
      }
    }

    const supervisors = [
      ["IT", "miriam.keller@example.com"],
      ["Produktion", "thomas.berger@example.com"],
      ["Qualitätssicherung", "anna.leitner@example.com"],
      ["Verwaltung", "julia.weiss@example.com"],
      ["Einkauf", "markus.fink@example.com"],
      ["Logistik", "nina.hofer@example.com"]
    ];
    for (const [departmentName, email] of supervisors) {
      await run("UPDATE departments SET supervisor_user_id = ? WHERE name = ?", [userIds.get(email), departmentName]);
    }
  }

  const existingDocuments = await get("SELECT COUNT(*) AS count FROM documents");
  if (existingDocuments?.count) return;

  const today = todayIso();
  const documentIds = [];
  for (const doc of documents) {
    const [title, description, externalUrl, type, department, responsible, status, interval, customDays, lastOffset, nextOffset] = doc;
    const result = await run(
      `INSERT INTO documents (
        title, description, external_url, document_type, department_id, responsible_person, status,
        audit_interval_type, audit_interval_days, last_audit_date, next_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        externalUrl,
        type,
        departmentIds.get(department),
        responsible,
        status,
        interval,
        customDays,
        addDays(today, lastOffset),
        addDays(today, nextOffset)
      ]
    );
    documentIds.push(result.id);
  }

  const auditComments = [
    ["In Ordnung", "Keine Abweichungen festgestellt."],
    ["Anpassung erforderlich", "Kleine redaktionelle Anpassungen empfohlen."],
    ["In Ordnung", "Link und Inhalte geprüft."],
    ["Nicht mehr relevant", "Inhalt wird perspektivisch archiviert."],
    ["In Ordnung", "Verantwortliche Person bestätigt Aktualität."]
  ];

  for (let index = 0; index < 12; index += 1) {
    const documentId = documentIds[index % documentIds.length];
    const [result, comment] = auditComments[index % auditComments.length];
    const auditDate = addDays(today, -120 + index * 9);
    const oldNext = addDays(auditDate, 20);
    const newNext = addDays(auditDate, 90);
    await run(
      `INSERT INTO audit_logs (
        document_id, audit_date, auditor_name, result, comment, old_status, new_status,
        old_next_audit_date, new_next_audit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        documentId,
        auditDate,
        index % 2 ? "Sophie Audit" : "Max Pruefer",
        result,
        comment,
        index % 3 === 0 ? "In Prüfung" : "Aktiv",
        result === "Nicht mehr relevant" ? "Archiviert" : "Aktiv",
        oldNext,
        newNext
      ]
    );
  }
}
