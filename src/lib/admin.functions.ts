import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbError } from "./server-errors";
import type { User } from "@supabase/supabase-js";

type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

async function requireSuperAdmin() {
  const { getAuthContext } = await import("./auth.server");
  const ctx = await getAuthContext();
  if (!ctx.unlocked || ctx.role !== "super_admin" || !ctx.userId) {
    throw new Error("Unauthorized");
  }
  return { ...ctx, userId: ctx.userId };
}

function isSsjUnit(unit: { type?: string | null; name?: string | null } | undefined) {
  return unit?.type === "สสจ." || Boolean(unit?.name?.includes("สสจ"));
}

// listUsers is paginated (50 per page by default), so walk every page.
async function listAllAuthUsers(sb: AdminClient) {
  const perPage = 1000;
  const all: User[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw dbError(error);
    all.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return all;
}

// Refuse changes that would leave the system without a super_admin, and stop a
// super_admin from demoting or deleting their own account by accident.
async function assertNotRemovingSuperAdmin(
  sb: AdminClient,
  actorId: string,
  targetUserId: string,
  newRole: "super_admin" | "unit_admin" | null,
) {
  if (newRole === "super_admin") return;
  if (targetUserId === actorId) {
    throw new Error(
      "ไม่สามารถลดสิทธิ์หรือลบบัญชีของตัวเองได้ กรุณาให้ Super Admin คนอื่นดำเนินการ",
    );
  }
  const { data, error } = await sb.from("user_roles").select("user_id").eq("role", "super_admin");
  if (error) throw dbError(error);
  const supers = new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
  if (supers.has(targetUserId) && supers.size <= 1) {
    throw new Error("ต้องมี Super Admin อย่างน้อย 1 คนในระบบ");
  }
}

type RoleRow = { user_id: string; role: string; unit_id: string | null };

// Replace a user's roles. These calls are not one transaction, so if the insert fails
// the previous roles are written back rather than leaving the user with none.
async function replaceRoles(sb: AdminClient, userId: string, rows: RoleRow[]) {
  const { data: previous, error: readError } = await sb
    .from("user_roles")
    .select("user_id, role, unit_id")
    .eq("user_id", userId);
  if (readError) throw dbError(readError);

  const { error: deleteError } = await sb.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw dbError(deleteError);

  const { error: insertError } = await sb.from("user_roles").insert(rows);
  if (insertError) {
    if (previous && previous.length > 0) {
      await sb.from("user_roles").insert(previous as RoleRow[]);
    }
    throw dbError(insertError);
  }
}

export const getAllUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await requireSuperAdmin();

  const authUsers = await listAllAuthUsers(supabaseAdmin);

  const [rolesRes, unitsRes] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id, role, unit_id"),
    supabaseAdmin.from("units").select("id, name, type"),
  ]);
  if (rolesRes.error) throw dbError(rolesRes.error);
  if (unitsRes.error) throw dbError(unitsRes.error);
  const rolesData = (rolesRes.data ?? []) as RoleRow[];
  const unitById = new Map(
    ((unitsRes.data ?? []) as { id: string; name: string; type: string | null }[]).map((u) => [
      u.id,
      u,
    ]),
  );

  const users = authUsers.map((u) => {
    const userRoles = rolesData.filter((r) => r.user_id === u.id);
    const isApproved = userRoles.length > 0;
    const role = userRoles.some((r) => r.role === "super_admin")
      ? "super_admin"
      : isApproved
        ? "unit_admin"
        : null;
    const meta = u.user_metadata || {};
    // user_metadata can be edited by the user themselves from the browser, so the
    // requested role and unit name are never read from it. Only the unit choice is
    // taken (the user picks it anyway), and the role is derived from that unit.
    const requestedUnitId =
      typeof meta.unit_id === "string" && unitById.has(meta.unit_id) ? meta.unit_id : null;
    const requestedUnit = requestedUnitId ? unitById.get(requestedUnitId) : undefined;
    const unitIds = isApproved
      ? (userRoles.map((r) => r.unit_id).filter(Boolean) as string[])
      : requestedUnitId
        ? [requestedUnitId]
        : [];
    const requestedRole = requestedUnit
      ? isSsjUnit(requestedUnit)
        ? "super_admin"
        : "unit_admin"
      : null;
    const hasSubmittedRegistration = Boolean(requestedUnitId || meta.registration_completed);

    return {
      id: u.id,
      email: u.email,
      full_name: meta.full_name || meta.name || "",
      position: meta.position || "",
      phone: meta.phone || "",
      unit_name: requestedUnit?.name || "",
      created_at: u.created_at,
      is_approved: isApproved,
      has_submitted_registration: hasSubmittedRegistration,
      role: role,
      requested_role: requestedRole,
      unit_ids: unitIds,
    };
  });

  return { users };
});

export const approveUser = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["super_admin", "unit_admin"]),
      unitId: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ctx = await requireSuperAdmin();

    if (data.role === "unit_admin" && !data.unitId) {
      throw new Error(
        "เจ้าหน้าที่ระดับ Unit Admin ต้องมีหน่วยบริการที่สังกัดอย่างน้อย 1 แห่ง (กรุณากด 'กำหนดสิทธิ์อื่น' เพื่อเลือกหน่วยบริการ)",
      );
    }
    await assertNotRemovingSuperAdmin(supabaseAdmin, ctx.userId, data.userId, data.role);

    await replaceRoles(supabaseAdmin, data.userId, [
      {
        user_id: data.userId,
        role: data.role,
        unit_id: data.role === "super_admin" ? null : (data.unitId ?? null),
      },
    ]);

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const existingMeta = existingUser?.user?.user_metadata || {};
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        ...existingMeta,
        is_approved: true,
      },
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit(supabaseAdmin, ctx.userId, {
      action: "approve",
      entity: "user",
      entityId: data.userId,
      summary: `${existingUser?.user?.email ?? data.userId} → ${data.role}`,
      details: { role: data.role, unit_id: data.unitId ?? null },
    });
    return { success: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["super_admin", "unit_admin"]),
      unitIds: z.array(z.string().uuid()).max(200).default([]),
      fullName: z.string().max(200).optional(),
      position: z.string().max(200).optional(),
      phone: z.string().max(50).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ctx = await requireSuperAdmin();

    if (data.role === "unit_admin" && data.unitIds.length === 0) {
      throw new Error("เจ้าหน้าที่ระดับ Unit Admin ต้องมีหน่วยบริการที่สังกัดอย่างน้อย 1 แห่ง");
    }
    await assertNotRemovingSuperAdmin(supabaseAdmin, ctx.userId, data.userId, data.role);

    await replaceRoles(
      supabaseAdmin,
      data.userId,
      data.role === "super_admin"
        ? [{ user_id: data.userId, role: "super_admin", unit_id: null }]
        : data.unitIds.map((uid) => ({ user_id: data.userId, role: "unit_admin", unit_id: uid })),
    );

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const existingMeta = existingUser?.user?.user_metadata || {};

    let unitName = existingMeta.unit_name;
    if (data.role === "unit_admin" && data.unitIds[0]) {
      const { data: u } = await supabaseAdmin
        .from("units")
        .select("name")
        .eq("id", data.unitIds[0])
        .maybeSingle();
      if (u?.name) unitName = u.name;
    }

    const updatedFullName =
      data.fullName !== undefined
        ? data.fullName.trim()
        : existingMeta.full_name || existingMeta.name || null;
    const updatedPosition =
      data.position !== undefined ? data.position.trim() : existingMeta.position || null;
    const updatedPhone = data.phone !== undefined ? data.phone.trim() : existingMeta.phone || null;

    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        ...existingMeta,
        full_name: updatedFullName,
        name: updatedFullName,
        position: updatedPosition,
        phone: updatedPhone,
        unit_name: unitName,
        is_approved: true,
        unit_id: data.role === "unit_admin" ? data.unitIds[0] || null : null,
      },
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit(supabaseAdmin, ctx.userId, {
      action: "role_change",
      entity: "user",
      entityId: data.userId,
      summary: `${existingUser?.user?.email ?? data.userId} → ${data.role}`,
      details: { role: data.role, unit_ids: data.unitIds },
    });
    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ctx = await requireSuperAdmin();
    await assertNotRemovingSuperAdmin(supabaseAdmin, ctx.userId, data.userId, null);

    const { data: target } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const deletedEmail = target?.user?.email;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw dbError(error);
    // user_roles.user_id has no foreign key to auth.users, so remove the rows here
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    const { writeAudit } = await import("./audit.server");
    await writeAudit(supabaseAdmin, ctx.userId, {
      action: "delete",
      entity: "user",
      entityId: data.userId,
      summary: deletedEmail ?? data.userId,
      details: { email: deletedEmail ?? null },
    });
    return { success: true };
  });


export const getAuditLog = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limit: z.number().int().min(1).max(500).default(200),
      projectId: z.string().uuid().optional(),
      before: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requireSuperAdmin();

    let q = supabaseAdmin
      .from("audit_log")
      .select("id, created_at, actor_id, action, entity, entity_id, project_id, summary, details")
      .order("id", { ascending: false })
      .limit(data.limit);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.before) q = q.lt("id", data.before);
    const { data: rows, error } = await q;
    if (error) throw dbError(error, "getAuditLog");

    const projectIds = [...new Set((rows ?? []).map((r) => r.project_id).filter(Boolean))] as string[];
    const [users, projectsRes] = await Promise.all([
      listAllAuthUsers(supabaseAdmin),
      projectIds.length
        ? supabaseAdmin.from("projects").select("id, title").in("id", projectIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);
    const emailById = new Map(users.map((u) => [u.id, u.email ?? ""]));
    const titleById = new Map((projectsRes.data ?? []).map((p) => [p.id, p.title]));

    return {
      rows: (rows ?? []).map((r) => ({
        ...r,
        // Sent as a JSON string: server-function results must be plain serializable types
        details: r.details == null ? null : JSON.stringify(r.details),
        actor_email: r.actor_id ? (emailById.get(r.actor_id) ?? "(ผู้ใช้ที่ถูกลบ)") : "-",
        project_title: r.project_id ? (titleById.get(r.project_id) ?? null) : null,
      })),
    };
  });
