import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

export function getMailTransportOptions() {
  return {
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    ignoreTLS: config.mail.ignoreTls,
    requireTLS: config.mail.requireTls,
    connectionTimeout: config.mail.connectionTimeoutMs,
    greetingTimeout: config.mail.connectionTimeoutMs,
    socketTimeout: config.mail.connectionTimeoutMs,
    tls: {
      rejectUnauthorized: config.mail.rejectUnauthorized
    },
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

export function resetMailTransporter() {
  transporter = undefined;
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

  const info = await getTransporter().sendMail({
    from: config.mail.from || "DocAudit <no-reply@localhost>",
    to: recipients.join(", "),
    subject,
    text,
    html
  });
  return { dryRun: false, recipients, messageId: info.messageId };
}
