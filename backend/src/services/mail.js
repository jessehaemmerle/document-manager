import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: Number(config.mail.port || 587),
      secure: Number(config.mail.port) === 465,
      auth: config.mail.user
        ? {
            user: config.mail.user,
            pass: config.mail.password
          }
        : undefined
    });
  }
  return transporter;
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
