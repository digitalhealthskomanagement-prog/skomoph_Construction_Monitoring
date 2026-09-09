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
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(data.access_token);
    
    if (userError || !user) {
      return { ok: false as const, error: "Invalid token" };
    }

    // Fetch all roles for user
    let { data: roleDataArray } = await supabaseAdmin
      .from("user_roles")
      .select("role, unit_id")
      .eq("user_id", user.id);

    let role = null;
    let unitIds: string[] = [];
    
    if (roleDataArray && roleDataArray.length > 0) {
      if (roleDataArray.some(r => r.role === "super_admin")) {
        role = "super_admin";
      } else {
        role = "unit_admin";
        unitIds = roleDataArray.map(r => r.unit_id).filter(Boolean) as string[];
      }
    }

    // Auto-assign admin if missing and email matches primary root admin
    if (!role && (user.email === "digitalhealthsko.management@gmail.com" || user.email === "admin@skomoph.local")) {
      const { data: newRole } = await supabaseAdmin.from("user_roles").insert({
        user_id: user.id,
        role: "super_admin",
        unit_id: null
      }).select().single();
      if (newRole) {
        role = "super_admin";
      }
    }

    // If user has no approved role in user_roles, do NOT unlock session
    if (!role) {
      return {
        ok: false as const,
        pendingApproval: true as const,
        error: "บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติสิทธิ์การใช้งาน กรุณาติดต่อผู้ดูแลระบบ (สสจ.สระแก้ว)",
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
  .inputValidator(z.object({
    userId: z.string(),
    unitId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: unit } = await supabaseAdmin
      .from("units")
      .select("type, name")
      .eq("id", data.unitId)
      .maybeSingle();

    const isSsj = unit?.type === "สสจ." || unit?.name?.includes("สสจ");
    const requestedRole = isSsj ? "super_admin" : "unit_admin";

    // Store in user_metadata so admin can see their requested unit and role
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      {
        user_metadata: {
          unit_id: data.unitId,
          unit_name: unit?.name || null,
          requested_role: requestedRole,
          is_approved: false,
        },
      }
    );

    if (updateError) {
      console.error("requestRegistrationApproval update user error:", updateError);
    }

    // Ensure they do NOT have any active role in user_roles until approved
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);

    return { ok: true as const, requestedRole, isSsj };
  });

export const clearSessionCookie = createServerFn({ method: "POST" }).handler(async () => {
  const { getSession } = await import("./auth.server");
  const session = await getSession();
  await session.clear();
  return { ok: true as const };
});

export const getAuthStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getAuthContext } = await import("./auth.server");
    const ctx = await getAuthContext();
    return { 
      unlocked: ctx.unlocked,
      userId: ctx.userId,
      role: ctx.role,
      unitIds: ctx.unitIds
    };
  }
);
