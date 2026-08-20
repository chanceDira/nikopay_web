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

export function getEmailConfig():
  | { ok: true; apiKey: string; from: string; siteUrl: string }
  | { ok: false; reason: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "email is not configured" };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "NikoPay <onboarding@resend.dev>";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://nikopay-mvp.vercel.app"
  ).replace(/\/$/, "");

  return { ok: true, apiKey, from, siteUrl };
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
  const config = getEmailConfig();
  if (!config.ok) {
    return config;
  }

  const content = buildPaidEmailContent(input, config.siteUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return { ok: false, reason: "email send failed" };
    }

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
