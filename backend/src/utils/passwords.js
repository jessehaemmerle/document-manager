import crypto from "crypto";

const minPasswordLength = 12;

export function assertPasswordStrength(password) {
  if (typeof password !== "string" || password.length < minPasswordLength) {
    throw Object.assign(new Error(`Passwort muss mindestens ${minPasswordLength} Zeichen lang sein.`), { status: 400 });
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw Object.assign(new Error("Passwort muss Gross- und Kleinbuchstaben sowie mindestens eine Zahl enthalten."), { status: 400 });
  }
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  if (!expectedHash || Buffer.byteLength(expectedHash, "hex") !== 64) return false;
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}
