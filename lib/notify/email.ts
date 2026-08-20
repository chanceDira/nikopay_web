import nodemailer from "nodemailer";

import { CONTACT } from "@/lib/contact";
import { formatRwf, formatUsdt } from "@/lib/rates";

export type PaidEmailInput = {
  to: string;
  intentId: string;
  netRwf: number;
  usdtAmount: number;
  msisdn: string;
  momoRef?: string;
};

export type SmtpEmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  siteUrl: string;
};

export function getEmailConfig():
  | { ok: true; config: SmtpEmailConfig }
  | { ok: false; reason: string } {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim() || (user ? `NikoPay <${user}>` : "");

  if (!user || !pass || !from) {
    return { ok: false, reason: "email is not configured" };
  }

  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : 465;
  if (!Number.isInteger(port) || port <= 0) {
    return { ok: false, reason: "email is not configured" };
  }

  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === undefined || secureEnv === ""
      ? port === 465
      : secureEnv === "true" || secureEnv === "1";

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://nikopay-mvp.vercel.app"
  ).replace(/\/$/, "");

  return {
    ok: true,
    config: { host, port, secure, user, pass, from, siteUrl },
  };
}

export function buildPaidEmailContent(
  input: PaidEmailInput,
  siteUrl: string,
): { subject: string; text: string; html: string } {
  const statusUrl = `${siteUrl}/app/payments/${input.intentId}`;
  const subject = "NikoPay payout confirmed";
  const amount = formatRwf(input.netRwf);
  const usdt = formatUsdt(input.usdtAmount);
  const refLine = input.momoRef
    ? `MTN reference: ${input.momoRef}`
    : "MTN reference: confirmed";

  const text = [
    "Your NikoPay payout was confirmed by MTN Mobile Money.",
    "",
    `Amount: ${amount}`,
    `USDT deposited: ${usdt}`,
    `Recipient: ${input.msisdn}`,
    refLine,
    "",
    `Track status: ${statusUrl}`,
    "",
    `Questions? ${CONTACT.email}`,
  ].join("\n");

  const html = `
    <p>Your NikoPay payout was confirmed by MTN Mobile Money.</p>
    <ul>
      <li><strong>Amount:</strong> ${escapeHtml(amount)}</li>
      <li><strong>USDT deposited:</strong> ${escapeHtml(usdt)}</li>
      <li><strong>Recipient:</strong> ${escapeHtml(input.msisdn)}</li>
      <li><strong>${escapeHtml(refLine)}</strong></li>
    </ul>
    <p><a href="${escapeHtml(statusUrl)}">View payment status</a></p>
    <p>Questions? <a href="mailto:${escapeHtml(CONTACT.email)}">${escapeHtml(CONTACT.email)}</a></p>
  `.trim();

  return { subject, text, html };
}

export async function sendPaidEmail(
  input: PaidEmailInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const loaded = getEmailConfig();
  if (!loaded.ok) {
    return loaded;
  }

  const { config } = loaded;
  const content = buildPaidEmailContent(input, config.siteUrl);

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: "email send failed" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
