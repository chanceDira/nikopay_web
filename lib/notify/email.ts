import nodemailer from "nodemailer";

import { getPublicChain } from "@/lib/chain-config";
import { CONTACT } from "@/lib/contact";
import { formatRwf, formatUsdt } from "@/lib/rates";
import type { ChainId } from "@/lib/settlement/types";

export type PayoutEmailProofs = {
  chain: ChainId;
  depositTx?: string;
  depositExplorerUrl?: string;
  momoReferenceId?: string;
  momoFinancialId?: string;
  rate?: number;
  feeRwf?: number;
  walletAddress?: string;
};

export type PaidEmailInput = {
  to: string;
  intentId: string;
  netRwf: number;
  usdtAmount: number;
  msisdn: string;
  momoRef?: string;
} & PayoutEmailProofs;

export type FailedEmailInput = {
  to: string;
  intentId: string;
  netRwf: number;
  usdtAmount: number;
  msisdn: string;
  momoStatus: "failed" | "timeout";
  providerReason?: string;
} & PayoutEmailProofs;

export type SmtpEmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  siteUrl: string;
};

const DEFAULT_PUBLIC_SITE_URL = "https://nikopay-mvp.vercel.app";

/** Public https origin for links in emails. Never localhost. */
export function resolvePublicSiteUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const candidates = [
    env.EMAIL_SITE_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    DEFAULT_PUBLIC_SITE_URL,
  ];

  for (const raw of candidates) {
    const normalized = normalizePublicOrigin(raw);
    if (normalized) {
      return normalized;
    }
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

function normalizePublicOrigin(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  let raw = value.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return null;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

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

  return {
    ok: true,
    config: {
      host,
      port,
      secure,
      user,
      pass,
      from,
      siteUrl: resolvePublicSiteUrl(),
    },
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
  const chainName = getPublicChain(input.chain).name;
  const momoFinancial =
    input.momoFinancialId ?? input.momoRef ?? "confirmed";

  const textLines = [
    "Your NikoPay payout was confirmed by MTN Mobile Money.",
    "",
    "Payment details",
    `Payment ID: ${input.intentId}`,
    `USDT deposited: ${usdt}`,
    `Amount paid: ${amount}`,
    ...(input.rate !== undefined ? [`Rate: ${input.rate} RWF per USDT`] : []),
    ...(input.feeRwf !== undefined ? [`Fee: ${formatRwf(input.feeRwf)}`] : []),
    `Recipient (MoMo): ${input.msisdn}`,
    ...(input.walletAddress ? [`Sender wallet: ${input.walletAddress}`] : []),
    `Chain: ${chainName}`,
    "",
    "Blockchain proof",
    input.depositTx
      ? `Deposit tx: ${input.depositTx}`
      : "Deposit tx: recorded on your payment",
    ...(input.depositExplorerUrl
      ? [`Explorer: ${input.depositExplorerUrl}`]
      : []),
    "",
    "MoMo proof",
    `Financial transaction ID: ${momoFinancial}`,
    ...(input.momoReferenceId
      ? [`Transfer reference: ${input.momoReferenceId}`]
      : []),
    "",
    `Track status: ${statusUrl}`,
    "",
    `Questions? ${CONTACT.email}`,
  ];

  const htmlItems = [
    detailItem("Payment ID", input.intentId),
    detailItem("USDT deposited", usdt),
    detailItem("Amount paid", amount),
    ...(input.rate !== undefined
      ? [detailItem("Rate", `${input.rate} RWF per USDT`)]
      : []),
    ...(input.feeRwf !== undefined
      ? [detailItem("Fee", formatRwf(input.feeRwf))]
      : []),
    detailItem("Recipient (MoMo)", input.msisdn),
    ...(input.walletAddress
      ? [detailItem("Sender wallet", input.walletAddress)]
      : []),
    detailItem("Chain", chainName),
  ];

  const html = `
    <p>Your NikoPay payout was confirmed by MTN Mobile Money.</p>
    <h3>Payment details</h3>
    <ul>${htmlItems.join("")}</ul>
    <h3>Blockchain proof</h3>
    <ul>
      ${detailItem("Deposit tx", input.depositTx ?? "recorded on your payment")}
      ${
        input.depositExplorerUrl
          ? `<li><strong>Explorer:</strong> <a href="${escapeHtml(input.depositExplorerUrl)}">${escapeHtml(input.depositExplorerUrl)}</a></li>`
          : ""
      }
    </ul>
    <h3>MoMo proof</h3>
    <ul>
      ${detailItem("Financial transaction ID", momoFinancial)}
      ${
        input.momoReferenceId
          ? detailItem("Transfer reference", input.momoReferenceId)
          : ""
      }
    </ul>
    <p><a href="${escapeHtml(statusUrl)}">View payment status</a></p>
    <p>Questions? <a href="mailto:${escapeHtml(CONTACT.email)}">${escapeHtml(CONTACT.email)}</a></p>
  `.trim();

  return { subject, text: textLines.join("\n"), html };
}

export function buildFailedEmailContent(
  input: FailedEmailInput,
  siteUrl: string,
): { subject: string; text: string; html: string } {
  const statusUrl = `${siteUrl}/app/payments/${input.intentId}`;
  const subject = "NikoPay payout did not complete";
  const amount = formatRwf(input.netRwf);
  const usdt = formatUsdt(input.usdtAmount);
  const chainName = getPublicChain(input.chain).name;
  const momoLabel =
    input.momoStatus === "timeout" ? "timed out" : "failed";

  const textLines = [
    "MTN Mobile Money confirmed that your NikoPay payout did not reach the recipient.",
    "Your USDT deposit was received and is held while we review the payout.",
    "",
    "Payment details",
    `Payment ID: ${input.intentId}`,
    `USDT deposited: ${usdt}`,
    `Intended MoMo amount: ${amount}`,
    ...(input.rate !== undefined ? [`Rate: ${input.rate} RWF per USDT`] : []),
    ...(input.feeRwf !== undefined ? [`Fee: ${formatRwf(input.feeRwf)}`] : []),
    `Recipient (MoMo): ${input.msisdn}`,
    ...(input.walletAddress ? [`Sender wallet: ${input.walletAddress}`] : []),
    `Chain: ${chainName}`,
    "",
    "Blockchain proof (deposit received)",
    input.depositTx
      ? `Deposit tx: ${input.depositTx}`
      : "Deposit tx: recorded on your payment",
    ...(input.depositExplorerUrl
      ? [`Explorer: ${input.depositExplorerUrl}`]
      : []),
    "",
    "MoMo status",
    `Result: ${momoLabel} (confirmed by MTN)`,
    ...(input.momoReferenceId
      ? [`Transfer reference: ${input.momoReferenceId}`]
      : []),
    ...(input.providerReason
      ? [`Provider reason: ${input.providerReason}`]
      : []),
    "",
    "We will follow up manually. Reply to this email or contact support if you need help.",
    `Track status: ${statusUrl}`,
    "",
    `Support: ${CONTACT.email}`,
  ];

  const html = `
    <p>MTN Mobile Money confirmed that your NikoPay payout did not reach the recipient.</p>
    <p>Your USDT deposit was received and is held while we review the payout.</p>
    <h3>Payment details</h3>
    <ul>
      ${detailItem("Payment ID", input.intentId)}
      ${detailItem("USDT deposited", usdt)}
      ${detailItem("Intended MoMo amount", amount)}
      ${
        input.rate !== undefined
          ? detailItem("Rate", `${input.rate} RWF per USDT`)
          : ""
      }
      ${input.feeRwf !== undefined ? detailItem("Fee", formatRwf(input.feeRwf)) : ""}
      ${detailItem("Recipient (MoMo)", input.msisdn)}
      ${
        input.walletAddress
          ? detailItem("Sender wallet", input.walletAddress)
          : ""
      }
      ${detailItem("Chain", chainName)}
    </ul>
    <h3>Blockchain proof (deposit received)</h3>
    <ul>
      ${detailItem("Deposit tx", input.depositTx ?? "recorded on your payment")}
      ${
        input.depositExplorerUrl
          ? `<li><strong>Explorer:</strong> <a href="${escapeHtml(input.depositExplorerUrl)}">${escapeHtml(input.depositExplorerUrl)}</a></li>`
          : ""
      }
    </ul>
    <h3>MoMo status</h3>
    <ul>
      ${detailItem("Result", `${momoLabel} (confirmed by MTN)`)}
      ${
        input.momoReferenceId
          ? detailItem("Transfer reference", input.momoReferenceId)
          : ""
      }
      ${
        input.providerReason
          ? detailItem("Provider reason", input.providerReason)
          : ""
      }
    </ul>
    <p>We will follow up manually. Reply to this email or contact support if you need help.</p>
    <p><a href="${escapeHtml(statusUrl)}">View payment status</a></p>
    <p>Support: <a href="mailto:${escapeHtml(CONTACT.email)}">${escapeHtml(CONTACT.email)}</a></p>
  `.trim();

  return { subject, text: textLines.join("\n"), html };
}

export async function sendPaidEmail(
  input: PaidEmailInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return sendMail(input.to, (siteUrl) =>
    buildPaidEmailContent(input, siteUrl),
  );
}

export async function sendFailedEmail(
  input: FailedEmailInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return sendMail(input.to, (siteUrl) =>
    buildFailedEmailContent(input, siteUrl),
  );
}

async function sendMail(
  to: string,
  build: (
    siteUrl: string,
  ) => { subject: string; text: string; html: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const loaded = getEmailConfig();
  if (!loaded.ok) {
    return loaded;
  }

  const { config } = loaded;
  const content = build(config.siteUrl);

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
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: "email send failed" };
  }
}

function detailItem(label: string, value: string): string {
  return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
