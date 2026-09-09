import { createAdminClient } from "@/lib/supabase/admin";

export type AdminAuditAction = "intent_status" | "fail_enqueued";

export type AdminAuditEntry = {
  id: string;
  actor: string;
  action: AdminAuditAction;
  intentId: string | null;
  payoutId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  detail: string | null;
  createdAt: string;
};

export async function writeAdminAudit(input: {
  actor: string;
  action: AdminAuditAction;
  intentId?: string | null;
  payoutId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  detail?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    actor: input.actor,
    action: input.action,
    intent_id: input.intentId ?? null,
    payout_id: input.payoutId ?? null,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    detail: input.detail ?? null,
  });

  if (error) {
    return { ok: false, reason: "unable to write audit log" };
  }

  return { ok: true };
}

export async function listAdminAuditForIntent(
  intentId: string,
): Promise<
  { ok: true; entries: AdminAuditEntry[] } | { ok: false; reason: string }
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select(
      "id, actor, action, intent_id, payout_id, from_status, to_status, detail, created_at",
    )
    .eq("intent_id", intentId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return { ok: false, reason: "unable to load audit log" };
  }

  const entries: AdminAuditEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action as AdminAuditAction,
    intentId: row.intent_id,
    payoutId: row.payout_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    detail: row.detail,
    createdAt: row.created_at,
  }));

  return { ok: true, entries };
}
