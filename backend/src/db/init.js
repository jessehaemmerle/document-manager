import { run, get } from "./database.js";
import { seedDatabase } from "./seed.js";

export async function initDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      responsible_person TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      external_url TEXT NOT NULL,
      document_type TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      responsible_person TEXT NOT NULL,
      status TEXT NOT NULL,
      audit_interval_type TEXT NOT NULL,
      audit_interval_days INTEGER,
      last_audit_date TEXT,
      next_audit_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      audit_date TEXT NOT NULL,
      auditor_name TEXT NOT NULL,
      result TEXT NOT NULL,
      comment TEXT,
      old_status TEXT,
      new_status TEXT,
      old_next_audit_date TEXT,
      new_next_audit_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  const count = await get("SELECT COUNT(*) AS count FROM departments");
  if (!count?.count) {
    await seedDatabase();
  }
}
