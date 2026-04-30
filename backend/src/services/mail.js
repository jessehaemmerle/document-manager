import nodemailer from "nodemailer";
import fs from "node:fs";
import { config } from "../config.js";

let transporter;

export function getMailTransportOptions() {
  const tls = {
    rejectUnauthorized: config.mail.rejectUnauthorized
  };

  if (config.mail.tlsServername) {
    tls.servername = config.mail.tlsServername;
  }

  if (config.mail.tlsCaFile) {
    tls.ca = fs.readFileSync(config.mail.tlsCaFile);
  }

  return {
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    ignoreTLS: config.mail.ignoreTls,
    requireTLS: config.mail.requireTls,
    connectionTimeout: config.mail.connectionTimeoutMs,
    greetingTimeout: config.mail.connectionTimeoutMs,
    socketTimeout: config.mail.connectionTimeoutMs,
    tls,
    auth: config.mail.user
      ? {
          user: config.mail.user,
          pass: config.mail.password
        }
      : undefined
  };
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getMailTransportOptions());
  }
  return transporter;
}

function explainMailError(error) {
  const details = [error.message].filter(Boolean).join(" ");
  if (/certificate|cert|self signed|unable to verify/i.test(details)) {
    error.message = `${error.message} Hinweis: Der SMTP-Server verwendet vermutlich ein internes Zertifikat. Pruefe, ob MAIL_TLS_REJECT_UNAUTHORIZED=false im laufenden Container ankommt, oder hinterlege das interne CA-Zertifikat mit MAIL_TLS_CA_FILE.`;
  }
  return error;
}

export function resetMailTransporter() {
  transporter = undefined;
}

export async function verifyMailTransport() {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (error) {
    throw explainMailError(error);
  }
}

export async function sendMail({ to, subject, text, html }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    throw Object.assign(new Error("Keine E-Mail-Empfänger vorhanden."), { status: 400 });
  }

  if (config.notifications.dryRun) {
    console.log(`[mail:dry-run] ${subject} -> ${recipients.join(", ")}`);
    return { dryRun: true, recipients };
  }

  try {
    const info = await getTransporter().sendMail({
      from: config.mail.from || "DocAudit <no-reply@localhost>",
      to: recipients.join(", "),
      subject,
      text,
      html
    });
    return { dryRun: false, recipients, messageId: info.messageId };
  } catch (error) {
    throw explainMailError(error);
  }
}
