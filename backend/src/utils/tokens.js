import crypto from "crypto";
import { config } from "../config.js";

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signToken(payload) {
  const issuedAt = Date.now();
  const body = base64Url({ ...payload, issued_at: issuedAt, expires_at: issuedAt + config.tokenTtlMs });
  const signature = crypto.createHmac("sha256", config.authSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(token) {
  try {
    if (!token || !token.includes(".")) return null;
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = crypto.createHmac("sha256", config.authSecret).update(body).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.expires_at || Number(payload.expires_at) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
