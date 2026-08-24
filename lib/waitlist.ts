import { asRecord } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = "23505";
const WAITLIST_ROLES = [
  "freelancer",
  "remote-worker",
  "business",
  "investor",
  "other",
] as const;

export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

export type WaitlistSignup = {
  email: string;
  role: WaitlistRole | null;
};

export function parseWaitlistSignup(
  body: unknown,
): { ok: true; signup: WaitlistSignup } | { ok: false; reason: string } {
  const record = asRecord(body);
  if (!record) {
    return { ok: false, reason: "invalid request body" };
  }

  if (typeof record.email !== "string") {
    return { ok: false, reason: "please provide a valid email address" };
  }

  const email = record.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, reason: "please provide a valid email address" };
  }

  if (record.role === undefined || record.role === null || record.role === "") {
    return { ok: true, signup: { email, role: null } };
  }

  if (typeof record.role !== "string") {
    return { ok: false, reason: "role is invalid" };
  }

  const role = record.role.trim();
  if (!isWaitlistRole(role)) {
    return { ok: false, reason: "role is invalid" };
  }

  return { ok: true, signup: { email, role } };
}

export async function insertWaitlistSignup(
  signup: WaitlistSignup,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    email: signup.email,
    role: signup.role,
  });

  if (!error || error.code === UNIQUE_VIOLATION) {
    return { ok: true };
  }

  return { ok: false, reason: "unable to join the waitlist" };
}

function isWaitlistRole(value: string): value is WaitlistRole {
  return (WAITLIST_ROLES as readonly string[]).includes(value);
}
