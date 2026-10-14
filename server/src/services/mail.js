import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export const OUTBOX_DIR = env.MAIL_OUTBOX_DIR
  ? path.resolve(env.MAIL_OUTBOX_DIR)
  : fileURLToPath(new URL('../../mail-outbox', import.meta.url));

let transport;
function getTransport() {
  if (transport) return transport;
  transport = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === 'true',
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : // Development: build the full message but save it to disk instead of sending
      nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  return transport;
}

// Sends an email. Never throws: a mail failure must not break checkout. Returns true when sent/saved.
export async function sendMail({ to, subject, html, text }) {
  try {
    const info = await getTransport().sendMail({ from: env.MAIL_FROM, to, subject, html, text });
    if (!env.SMTP_HOST) {
      await mkdir(OUTBOX_DIR, { recursive: true });
      const file = path.join(OUTBOX_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomBytes(3).toString('hex')}.eml`);
      await writeFile(file, info.message);
      if (env.NODE_ENV === 'development') console.log(`Email saved to ${path.relative(process.cwd(), file)} (${subject})`);
    }
    return true;
  } catch (err) {
    console.error(`Email to ${to} failed: ${err.message}`);
    return false;
  }
}
