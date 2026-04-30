export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const role = req.get("X-App-Role") || "Viewer";
    if (!allowedRoles.includes(role)) {
      next(Object.assign(new Error("Keine Berechtigung für diese Aktion."), { status: 403 }));
      return;
    }
    next();
  };
}
