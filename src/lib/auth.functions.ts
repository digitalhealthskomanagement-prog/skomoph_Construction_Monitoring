import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessionSchema = z.object({
  access_token: z.string(),
});

export const setSessionCookie = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof sessionSchema>) => sessionSchema.parse(d))
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(data.access_token);

    if (userError || !user) {
      return { ok: false as const, error: "Invalid token" };
    }

    // Fetch all roles for user
    let { data: roleDataArray } = await supabaseAdmin
      .from("user_roles")
      .select("role, unit_id")
      .eq("user_id", user.id);

    let role: "super_admin" | "unit_admin" | null = null;
    let unitIds: string[] = [];

    // Auto-migrate role from existing account with matching email if present
    if ((!roleDataArray || roleDataArray.length === 0) && user.email) {
      try {
        const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const matchingUsers = (allUsers?.users || []).filter(
          (u) => u.email?.toLowerCase() === user.email?.toLowerCase() && u.id !== user.id,
        );
        if (matchingUsers.length > 0) {
          const oldIds = matchingUsers.map((u) => u.id);
          const { data: legacyRoles } = await supabaseAdmin
            .from("user_roles")
            .select("role, unit_id")
            .in("user_id", oldIds);

          if (legacyRoles && legacyRoles.length > 0) {
            for (const r of legacyRoles) {
              await supabaseAdmin.from("user_roles").upsert({
                user_id: user.id,
                role: r.role,
                unit_id: r.unit_id,
              });
            }
            const { data: refreshedRoles } = await supabaseAdmin
              .from("user_roles")
              .select("role, unit_id")
              .eq("user_id", user.id);
            roleDataArray = refreshedRoles;
          }
        }
      } catch (err) {
        console.error("Role migration error:", err);
      }
    }

    if (roleDataArray && roleDataArray.length > 0) {
      if (roleDataArray.some((r) => r.role === "super_admin")) {
        role = "super_admin";
      } else {
        role = "unit_admin";
        unitIds = roleDataArray.map((r) => r.unit_id).filter(Boolean) as string[];
      }
    }

    // Auto-assign admin if missing and email matches primary root admin
    if (
      !role &&
      (user.email === "digitalhealthsko.management@gmail.com" ||
        user.email === "admin@skomoph.local")
    ) {
      const { data: newRole } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "super_admin",
          unit_id: null,
        })
        .select()
        .single();
      if (newRole) {
        role = "super_admin";
      }
    }

    // If user has no approved role in user_roles, check if they need to complete registration or are pending approval
    if (!role) {
      const metadata = user.user_metadata || {};
      const hasCompletedProfile = Boolean(metadata.unit_id || metadata.requested_role);
      return {
        ok: false as const,
        pendingApproval: hasCompletedProfile,
        needsProfile: !hasCompletedProfile,
        user: {
          id: user.id,
          email: user.email,
          fullName: metadata.full_name || metadata.name || "",
          position: metadata.position || "",
          phone: metadata.phone || "",
        },
        error: hasCompletedProfile
          ? "บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติสิทธิ์การใช้งาน กรุณาติดต่อผู้ดูแลระบบ (สสจ.สระแก้ว)"
          : "กรุณากรอกข้อมูลเพื่อลงทะเบียนขอใช้งานระบบ",
      };
    }

    const session = await getSession();
    await session.update({
      unlocked: true,
      userId: user.id,
      role: role,
      unitIds: unitIds,
    });

    return { ok: true as const, role, unitIds };
  });

export const requestRegistrationApproval = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      userId: z.string(),
      unitId: z.string(),
      fullName: z.string().optional(),
      position: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: unit } = await supabaseAdmin
      .from("units")
      .select("type, name")
      .eq("id", data.unitId)
      .maybeSingle();

    const isSsj = unit?.type === "สสจ." || unit?.name?.includes("สสจ");
    const requestedRole = isSsj ? "super_admin" : "unit_admin";

    // Fetch existing user metadata
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const existingMeta = existingUser?.user?.user_metadata || {};

    // Store in user_metadata so admin can see their full profile and requested unit
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      user_metadata: {
        ...existingMeta,
        full_name: data.fullName || existingMeta.full_name || existingMeta.name || null,
        position: data.position || null,
        phone: data.phone || null,
        unit_id: data.unitId,
        unit_name: unit?.name || null,
        requested_role: requestedRole,
        is_approved: false,
      },
    });

    if (updateError) {
      console.error("requestRegistrationApproval update user error:", updateError);
    }

    // Ensure they do NOT have any active role in user_roles until approved
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);

    return { ok: true as const, requestedRole, isSsj };
  });

export const clearSessionCookie = createServerFn({ method: "POST" }).handler(async () => {
  const { getSession } = await import("./auth.server");
  const session = await getSession();
  await session.clear();
  return { ok: true as const };
});

export const getAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getAuthContext } = await import("./auth.server");
  const ctx = await getAuthContext();
  return {
    unlocked: ctx.unlocked,
    userId: ctx.userId,
    role: ctx.role,
    unitIds: ctx.unitIds,
  };
});
