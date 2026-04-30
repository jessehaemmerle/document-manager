import { Router } from "express";
import { all, get, run } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { requireFields } from "../utils/validation.js";

export const departmentsRouter = Router();

departmentsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await all(`
      SELECT
        dep.*,
        (u.first_name || ' ' || u.last_name) AS supervisor_name,
        COUNT(m.id) AS member_count
      FROM departments dep
      LEFT JOIN users u ON u.id = dep.supervisor_user_id
      LEFT JOIN users m ON m.department_id = dep.id AND m.is_active = 1
      GROUP BY dep.id
      ORDER BY dep.name
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

departmentsRouter.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    requireFields(req.body, ["name"]);
    const result = await run(
      "INSERT INTO departments (name, description, responsible_person, supervisor_user_id) VALUES (?, ?, ?, ?)",
      [req.body.name, req.body.description || "", req.body.responsible_person || "", req.body.supervisor_user_id || null]
    );
    res.status(201).json(await get("SELECT * FROM departments WHERE id = ?", [result.id]));
  } catch (error) {
    next(error);
  }
});

departmentsRouter.put("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    requireFields(req.body, ["name"]);
    await run(
      `UPDATE departments
       SET name = ?, description = ?, responsible_person = ?, supervisor_user_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.body.name, req.body.description || "", req.body.responsible_person || "", req.body.supervisor_user_id || null, req.params.id]
    );
    res.json(await get("SELECT * FROM departments WHERE id = ?", [req.params.id]));
  } catch (error) {
    next(error);
  }
});

departmentsRouter.get("/:id/users", async (req, res, next) => {
  try {
    if (req.user.app_role !== "Admin" && Number(req.user.department_id) !== Number(req.params.id)) {
      throw Object.assign(new Error("Keine Berechtigung für diese Abteilung."), { status: 403 });
    }
    res.json(await all(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.app_role,
        u.job_title,
        u.department_id,
        u.manager_id,
        u.is_active,
        (u.first_name || ' ' || u.last_name) AS full_name,
        (m.first_name || ' ' || m.last_name) AS manager_name
      FROM users u
      LEFT JOIN users m ON m.id = u.manager_id
      WHERE u.department_id = ?
      ORDER BY u.is_active DESC, u.last_name, u.first_name
    `, [req.params.id]));
  } catch (error) {
    next(error);
  }
});

departmentsRouter.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const usage = await get("SELECT COUNT(*) AS count FROM documents WHERE department_id = ?", [req.params.id]);
    if (usage.count) throw Object.assign(new Error("Abteilung wird noch von Dokumenten verwendet."), { status: 409 });
    const users = await get("SELECT COUNT(*) AS count FROM users WHERE department_id = ? AND is_active = 1", [req.params.id]);
    if (users.count) throw Object.assign(new Error("Abteilung hat noch aktive Benutzer."), { status: 409 });
    await run("DELETE FROM departments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
