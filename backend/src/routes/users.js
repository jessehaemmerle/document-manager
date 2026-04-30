import { Router } from "express";
import { all, get, run } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { assertEmail, assertOneOf, requireFields, userRoles } from "../utils/validation.js";

export const usersRouter = Router();

const userSelect = `
  SELECT
    u.*,
    (u.first_name || ' ' || u.last_name) AS full_name,
    dep.name AS department_name,
    (m.first_name || ' ' || m.last_name) AS manager_name
  FROM users u
  LEFT JOIN departments dep ON dep.id = u.department_id
  LEFT JOIN users m ON m.id = u.manager_id
`;

function normalizeUser(body) {
  requireFields(body, ["first_name", "last_name", "email", "app_role"]);
  assertEmail(body.email);
  assertOneOf(body.app_role, userRoles, "Benutzerrolle");
  return {
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
    email: body.email.trim().toLowerCase(),
    app_role: body.app_role,
    employee_role: body.employee_role || "Mitarbeiter",
    job_title: body.job_title || "",
    department_id: body.department_id || null,
    manager_id: body.manager_id || null,
    is_active: body.is_active === false || body.is_active === 0 ? 0 : 1
  };
}

usersRouter.get("/", async (req, res, next) => {
  try {
    const filters = [];
    const params = [];
    if (req.query.search) {
      filters.push("(LOWER(u.first_name || ' ' || u.last_name) LIKE ? OR LOWER(u.email) LIKE ?)");
      params.push(`%${String(req.query.search).toLowerCase()}%`, `%${String(req.query.search).toLowerCase()}%`);
    }
    if (req.query.department_id) {
      filters.push("u.department_id = ?");
      params.push(req.query.department_id);
    }
    if (req.query.app_role) {
      filters.push("u.app_role = ?");
      params.push(req.query.app_role);
    }
    const rows = await all(`${userSelect} ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY u.last_name, u.first_name`, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await get(`${userSelect} WHERE u.id = ?`, [req.params.id]);
    if (!user) throw Object.assign(new Error("Benutzer nicht gefunden."), { status: 404 });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    const user = normalizeUser(req.body);
    const result = await run(
      `INSERT INTO users (
        first_name, last_name, email, app_role, employee_role, job_title, department_id, manager_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.first_name, user.last_name, user.email, user.app_role, user.employee_role, user.job_title, user.department_id, user.manager_id, user.is_active]
    );
    res.status(201).json(await get(`${userSelect} WHERE u.id = ?`, [result.id]));
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const user = normalizeUser(req.body);
    if (Number(req.params.id) === Number(user.manager_id)) {
      throw Object.assign(new Error("Ein Benutzer kann nicht sein eigener Vorgesetzter sein."), { status: 400 });
    }
    await run(
      `UPDATE users
       SET first_name = ?, last_name = ?, email = ?, app_role = ?, employee_role = ?, job_title = ?,
           department_id = ?, manager_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.first_name, user.last_name, user.email, user.app_role, user.employee_role, user.job_title, user.department_id, user.manager_id, user.is_active, req.params.id]
    );
    res.json(await get(`${userSelect} WHERE u.id = ?`, [req.params.id]));
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    await run("UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
