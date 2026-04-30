const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const intervalDays = {
  Monatlich: 30,
  Quartalsweise: 90,
  Halbjährlich: 182,
  Jährlich: 365
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function resolveIntervalDays(type, customDays) {
  if (type === "Benutzerdefiniert") return Number(customDays || 0);
  return intervalDays[type] || 0;
}

export function calculateNextAuditDate(fromDate, type, customDays) {
  const days = resolveIntervalDays(type, customDays);
  if (!days || days < 1) throw Object.assign(new Error("Audit-Intervall ist ungültig."), { status: 400 });
  return addDays(fromDate || todayIso(), days);
}

export function auditDueState(nextAuditDate) {
  const today = new Date(`${todayIso()}T00:00:00`);
  const next = new Date(`${nextAuditDate}T00:00:00`);
  const diffDays = Math.floor((next - today) / MS_PER_DAY);
  if (diffDays < 0) return "Überfällig";
  if (diffDays <= 14) return "Fällig";
  return "Nicht fällig";
}
