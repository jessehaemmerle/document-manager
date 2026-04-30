import { get } from "../db/database.js";
import { verifyToken } from "../utils/tokens.js";

export async function authenticate(req, _res, next) {
  try {
    const header = req.get("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload?.user_id) {
      req.user = null;
      next();
      return;
    }
    req.user = await get(
      `SELECT
        u.*,
        (u.first_name || ' ' || u.last_name) AS full_name,
        dep.name AS department_name
      FROM users u
      LEFT JOIN departments dep ON dep.id = u.department_id
      WHERE u.id = ? AND u.is_active = 1`,
      [payload.user_id]
    );
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) {
    next(Object.assign(new Error("Bitte anmelden."), { status: 401 }));
    return;
  }
  next();
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const role = req.user?.app_role;
    if (!allowedRoles.includes(role)) {
      next(Object.assign(new Error("Keine Berechtigung für diese Aktion."), { status: 403 }));
      return;
    }
    next();
  };
}

export function canAccessDocument(user, document) {
  if (!user || !document) return false;
  if (user.app_role === "Admin") return true;
  if (user.app_role === "Führungskraft") {
    return Number(document.audit_department_id || document.department_id) === Number(user.department_id);
  }
  return Number(document.assigned_user_id) === Number(user.id);
}

export function addDocumentAccessFilter(req, filters, params, alias = "d") {
  const user = req.user;
  if (!user) {
    filters.push("1 = 0");
    return;
  }
  if (user.app_role === "Admin") return;
  if (user.app_role === "Führungskraft") {
    filters.push(`COALESCE(${alias}.audit_department_id, ${alias}.department_id) = ?`);
    params.push(user.department_id);
    return;
  }
  filters.push(`${alias}.assigned_user_id = ?`);
  params.push(user.id);
}
