import { all, run, get } from "./database.js";
import { ensureBootstrapAdmin, removeDemoData } from "./bootstrap.js";

export async function initDatabase() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      responsible_person TEXT,
      supervisor_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ensureColumn("departments", "supervisor_user_id", "INTEGER");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      app_role TEXT NOT NULL,
      job_title TEXT,
      department_id INTEGER,
      manager_id INTEGER,
      password_hash TEXT,
      password_salt TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  await ensureColumn("users", "password_hash", "TEXT");
  await ensureColumn("users", "password_salt", "TEXT");

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
      audit_department_id INTEGER,
      assigned_user_id INTEGER,
      last_audit_date TEXT,
      next_audit_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (audit_department_id) REFERENCES departments(id),
      FOREIGN KEY (assigned_user_id) REFERENCES users(id)
    )
  `);

  await ensureColumn("documents", "audit_department_id", "INTEGER");
  await ensureColumn("documents", "assigned_user_id", "INTEGER");

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

  await run(`
    CREATE TABLE IF NOT EXISTS notification_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      stage TEXT NOT NULL,
      status_snapshot TEXT NOT NULL,
      recipients TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      error_message TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(document_id, due_date, stage),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
  `);

  await removeDemoData();
  await ensureBootstrapAdmin();

  await run("UPDATE documents SET audit_department_id = department_id WHERE audit_department_id IS NULL");
  await run(`
    UPDATE documents
    SET assigned_user_id = (
      SELECT id
      FROM users
      WHERE LOWER(first_name || ' ' || last_name) = LOWER(documents.responsible_person)
      LIMIT 1
    )
    WHERE assigned_user_id IS NULL
  `);
  if (await columnExists("users", "employee_role")) {
    await run("UPDATE users SET app_role = 'Mitarbeiter' WHERE app_role IN ('Auditor', 'Viewer') AND employee_role = 'Mitarbeiter'");
    await run("UPDATE users SET app_role = 'Führungskraft' WHERE app_role IN ('Auditor', 'Viewer')");
  } else {
    await run("UPDATE users SET app_role = 'Mitarbeiter' WHERE app_role IN ('Auditor', 'Viewer')");
  }
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((row) => row.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function columnExists(table, column) {
  const columns = await all(`PRAGMA table_info(${table})`);
  return columns.some((row) => row.name === column);
}
