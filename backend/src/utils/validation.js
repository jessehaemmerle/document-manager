export const documentTypes = ["Richtlinie", "Arbeitsanweisung", "Prozessbeschreibung", "Anleitung", "Formular", "Sonstiges"];
export const statuses = ["Entwurf", "Aktiv", "In Prüfung", "Überarbeitung erforderlich", "Archiviert"];
export const intervals = ["Monatlich", "Quartalsweise", "Halbjährlich", "Jährlich", "Benutzerdefiniert"];
export const auditResults = ["In Ordnung", "Anpassung erforderlich", "Nicht mehr relevant"];
export const userRoles = ["Admin", "Auditor", "Viewer", "Mitarbeiter"];

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) {
    throw Object.assign(new Error(`Pflichtfelder fehlen: ${missing.join(", ")}`), { status: 400 });
  }
}

export function assertOneOf(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw Object.assign(new Error(`${label} ist ungültig.`), { status: 400 });
  }
}

export function assertUrl(value) {
  if (!/^https?:\/\//i.test(value) && !/^file:\/\//i.test(value) && !/^[a-z]:\\/i.test(value) && !/^\\\\/.test(value)) {
    throw Object.assign(new Error("Externer Link muss eine URL, ein file:// Link oder ein Netzlaufwerkpfad sein."), { status: 400 });
  }
}

export function assertEmail(value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw Object.assign(new Error("E-Mail-Adresse ist ungültig."), { status: 400 });
  }
}
