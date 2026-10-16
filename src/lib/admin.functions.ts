import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAllUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthContext } = await import("./auth.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Check permissions (must be super_admin)
  const ctx = await getAuthContext();
  if (!ctx.unlocked || ctx.role !== "super_admin") {
    throw new Error("Unauthorized");
  }

  // 2. Fetch auth users
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  // 3. Fetch user_roles
  const { data: rolesData, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role, unit_id");
  if (rolesError) throw new Error(rolesError.message);

  // 4. Combine data
  const users = authData.users.map((u) => {
    const userRoles = rolesData.filter((r) => r.user_id === u.id);
    const isApproved = userRoles.length > 0;
    const role = userRoles.some((r) => r.role === "super_admin")
      ? "super_admin"
      : isApproved
        ? "unit_admin"
        : null;
    const unitIds = isApproved
      ? (userRoles.map((r) => r.unit_id).filter(Boolean) as string[])
      : ((u.user_metadata?.unit_id ? [u.user_metadata.unit_id] : []) as string[]);
    const requestedRole =
      u.user_metadata?.requested_role || (u.user_metadata?.unit_id ? "unit_admin" : null);
    const meta = u.user_metadata || {};
    const hasSubmittedRegistration = Boolean(
      meta.unit_id || meta.requested_role || meta.registration_completed,
    );

    return {
      id: u.id,
      email: u.email,
      full_name: meta.full_name || meta.name || "",
      position: meta.position || "",
      phone: meta.phone || "",
      unit_name: meta.unit_name || "",
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
      userId: z.string(),
      role: z.enum(["super_admin", "unit_admin"]),
      unitId: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getAuthContext } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check permissions (must be super_admin)
    const ctx = await getAuthContext();
    if (!ctx.unlocked || ctx.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    // 2. Delete existing roles if any
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    // 3. Insert approved role
    if (data.role === "super_admin") {
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: data.userId,
        role: "super_admin",
        unit_id: data.unitId || null,
      });
      if (error) throw new Error(error.message);
    } else {
      if (!data.unitId) {
        throw new Error("เจ้าหน้าที่ระดับ Unit Admin ต้องมีหน่วยบริการที่สังกัดอย่างน้อย 1 แห่ง (กรุณากด 'กำหนดสิทธิ์อื่น' เพื่อเลือกหน่วยบริการ)");
      }
      const { error } = await supabaseAdmin.from("user_roles").insert({
        user_id: data.userId,
        role: "unit_admin",
        unit_id: data.unitId,
      });
      if (error) throw new Error(error.message);
    }

    // 4. Update user metadata preserving existing profile
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const existingMeta = existingUser?.user?.user_metadata || {};
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        ...existingMeta,
        is_approved: true,
      },
    });

    return { success: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      role: z.enum(["super_admin", "unit_admin"]),
      unitIds: z.array(z.string()).default([]),
      fullName: z.string().optional(),
      position: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { getAuthContext } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check permissions
    const ctx = await getAuthContext();
    if (!ctx.unlocked || ctx.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    // 2. Delete existing roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    // 3. Insert new roles
    if (data.role === "super_admin") {
      await supabaseAdmin.from("user_roles").insert({
        user_id: data.userId,
        role: "super_admin",
        unit_id: null,
      });
    } else {
      if (data.unitIds.length === 0) {
        throw new Error("เจ้าหน้าที่ระดับ Unit Admin ต้องมีหน่วยบริการที่สังกัดอย่างน้อย 1 แห่ง");
      }
      const inserts = data.unitIds.map((uid) => ({
        user_id: data.userId,
        role: "unit_admin",
        unit_id: uid,
      }));
      const { error } = await supabaseAdmin.from("user_roles").insert(inserts);
      if (error) throw new Error(error.message);
    }

    // 4. Update user metadata
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

    const updatedFullName = data.fullName !== undefined ? data.fullName.trim() : (existingMeta.full_name || existingMeta.name || null);
    const updatedPosition = data.position !== undefined ? data.position.trim() : (existingMeta.position || null);
    const updatedPhone = data.phone !== undefined ? data.phone.trim() : (existingMeta.phone || null);

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

    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator(z.object({ userId: z.string() }))
  .handler(async ({ data }) => {
    const { getAuthContext } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check permissions
    const ctx = await getAuthContext();
    if (!ctx.unlocked || ctx.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    // Delete from auth.users (Cascade should delete from user_roles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { success: true };
  });
