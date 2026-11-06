// Records who changed what in public.audit_log. Server-only: import dynamically from
// server function handlers. A failed audit write is logged but never fails the action.

type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

export type AuditEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  projectId?: string | null;
  summary?: string | null;
  details?: Record<string, unknown> | null;
};

export async function writeAudit(sb: AdminClient, actorId: string | undefined, entry: AuditEntry) {
  try {
    const { error } = await sb.from("audit_log").insert({
      actor_id: actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      project_id: entry.projectId ?? null,
      summary: entry.summary?.slice(0, 500) ?? null,
      details: (entry.details ?? null) as never,
    });
    if (error) console.error("[audit] insert failed:", error);
  } catch (err) {
    console.error("[audit] insert threw:", err);
  }
}

// Read a row before deleting it, so the audit entry keeps a copy of what was removed.
export async function snapshotRow(
  sb: AdminClient,
  table:
    | "projects"
    | "phases"
    | "updates"
    | "calendar_events"
    | "risks"
    | "units"
    | "resource_links",
  id: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}
