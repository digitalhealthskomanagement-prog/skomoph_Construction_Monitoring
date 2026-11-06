import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    // Always drop whatever session cookie this browser already holds before deciding.
    // Otherwise a cookie left by the previous user on a shared computer (it lives for
    // days, independently of the Supabase session) would keep acting as that user.
    const session = await getSession();
    await session.clear();

    if (userError || !user) {
      return { ok: false as const, error: "Invalid token" };
    }

    // Fetch all roles for user
    const { data: roleDataArray } = await supabaseAdmin
      .from("user_roles")
      .select("role, unit_id")
      .eq("user_id", user.id);

    let role: "super_admin" | "unit_admin" | null = null;
    let unitIds: string[] = [];

    if (roleDataArray && roleDataArray.length > 0) {
      if (roleDataArray.some((r) => r.role === "super_admin")) {
        role = "super_admin";
      } else {
        role = "unit_admin";
        unitIds = roleDataArray.map((r) => r.unit_id).filter(Boolean) as string[];
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

    await session.update({
      unlocked: true,
      userId: user.id,
      role: role,
      unitIds: unitIds,
    });

    return { ok: true as const, role, unitIds };
  });

export const requestRegistrationApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      unitId: z.string().uuid(),
      fullName: z.string().max(200).optional(),
      position: z.string().max(200).optional(),
      phone: z.string().max(50).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only ever act on the caller's own account, taken from the verified bearer token
    const userId = context.userId;

    // An already approved user must not be able to drop their own roles (and lock
    // themselves out) by submitting the registration form again.
    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (existingRoles && existingRoles.length > 0) {
      throw new Error("บัญชีนี้ได้รับอนุมัติสิทธิ์แล้ว หากต้องการเปลี่ยนหน่วยบริการ กรุณาติดต่อผู้ดูแลระบบ");
    }

    const { data: unit } = await supabaseAdmin
      .from("units")
      .select("type, name")
      .eq("id", data.unitId)
      .maybeSingle();

    if (!unit) throw new Error("ไม่พบหน่วยบริการที่เลือก");

    const isSsj = unit?.type === "สสจ." || unit?.name?.includes("สสจ");
    const requestedRole = isSsj ? "super_admin" : "unit_admin";

    // Fetch existing user metadata
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = existingUser?.user?.user_metadata || {};

    // Store in user_metadata so admin can see their full profile and requested unit
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMeta,
        full_name: data.fullName || existingMeta.full_name || existingMeta.name || null,
        position: data.position || null,
        phone: data.phone || null,
        unit_id: data.unitId,
        unit_name: unit?.name || null,
        requested_role: requestedRole,
        is_approved: false,
        registration_completed: true,
      },
    });

    if (updateError) {
      console.error("requestRegistrationApproval update user error:", updateError);
    }

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
