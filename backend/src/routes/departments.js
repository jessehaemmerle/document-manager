import { Router } from "express";
import { all, get, run } from "../db/database.js";
import { requireRole } from "../middleware/roles.js";
import { requireFields } from "../utils/validation.js";

export const departmentsRouter = Router();

departmentsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await all("SELECT * FROM departments ORDER BY name");
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

departmentsRouter.post("/", requireRole("Admin"), async (req, res, next) => {
  try {
    requireFields(req.body, ["name"]);
    const result = await run(
      "INSERT INTO departments (name, description, responsible_person) VALUES (?, ?, ?)",
      [req.body.name, req.body.description || "", req.body.responsible_person || ""]
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
       SET name = ?, description = ?, responsible_person = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.body.name, req.body.description || "", req.body.responsible_person || "", req.params.id]
    );
    res.json(await get("SELECT * FROM departments WHERE id = ?", [req.params.id]));
  } catch (error) {
    next(error);
  }
});

departmentsRouter.delete("/:id", requireRole("Admin"), async (req, res, next) => {
  try {
    const usage = await get("SELECT COUNT(*) AS count FROM documents WHERE department_id = ?", [req.params.id]);
    if (usage.count) throw Object.assign(new Error("Abteilung wird noch von Dokumenten verwendet."), { status: 409 });
    await run("DELETE FROM departments WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
