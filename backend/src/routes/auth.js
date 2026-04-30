import { Router } from "express";
import { get } from "../db/database.js";
import { authenticate, requireAuth } from "../middleware/roles.js";
import { signToken } from "../utils/tokens.js";
import { verifyPassword } from "../utils/passwords.js";
import { requireFields } from "../utils/validation.js";

export const authRouter = Router();

function publicUser(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name,
    email: user.email,
    app_role: user.app_role,
    job_title: user.job_title,
    department_id: user.department_id,
    department_name: user.department_name
  };
}

authRouter.post("/login", async (req, res, next) => {
  try {
    requireFields(req.body, ["email", "password"]);
    const user = await get(
      `SELECT
        u.*,
        (u.first_name || ' ' || u.last_name) AS full_name,
        dep.name AS department_name
      FROM users u
      LEFT JOIN departments dep ON dep.id = u.department_id
      WHERE LOWER(u.email) = LOWER(?) AND u.is_active = 1`,
      [req.body.email]
    );
    if (!user?.password_hash || !user?.password_salt || !verifyPassword(req.body.password, user.password_salt, user.password_hash)) {
      throw Object.assign(new Error("E-Mail oder Passwort ist ungültig."), { status: 401 });
    }
    const token = signToken({ user_id: user.id });
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, requireAuth, async (req, res) => {
  res.json(publicUser(req.user));
});
