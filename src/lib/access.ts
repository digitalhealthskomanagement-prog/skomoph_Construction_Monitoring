// Project-level authorization for server functions. No imports, so it can be unit
// tested directly with Node.

// Every project the request touches must belong to the caller: the project of the
// existing record (when updating/deleting by id) AND any project/phase given in the
// payload. Trusting the payload alone would let a unit admin edit or move records
// owned by other units.
export type AccessAuth = { role?: string | null; unitIds?: string[] };

// Minimal shape of the Supabase client used here, so tests can pass a fake.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = { from: (table: string) => any };

export async function verifyProjectAccess(
  auth: AccessAuth,
  sb: QueryClient,
  table: string | null,
  id: string | null,
  payloadProjectId: string | null = null,
  payloadPhaseId: string | null = null,
): Promise<boolean> {
  if (auth.role === "super_admin") return true;
  if (auth.role !== "unit_admin" || !auth.unitIds || auth.unitIds.length === 0) return false;

  const projectIds: (string | null | undefined)[] = [];

  if (id && table) {
    if (table === "projects") {
      projectIds.push(id);
    } else {
      const { data } = await sb.from(table).select("project_id").eq("id", id).maybeSingle();
      if (!data) return false;
      projectIds.push(data.project_id);
    }
  }

  if (payloadProjectId) projectIds.push(payloadProjectId);

  if (payloadPhaseId) {
    const { data } = await sb
      .from("phases")
      .select("project_id")
      .eq("id", payloadPhaseId)
      .maybeSingle();
    if (!data) return false;
    projectIds.push(data.project_id);
  }

  if (projectIds.length === 0 || projectIds.some((p) => !p)) return false;

  const unique = [...new Set(projectIds as string[])];
  const { data: projs } = await sb.from("projects").select("id, unit_id").in("id", unique);
  if (!projs || projs.length !== unique.length) return false;
  const unitIds = auth.unitIds;
  return projs.every((p: { unit_id: string | null }) => !!p.unit_id && unitIds.includes(p.unit_id));
}
