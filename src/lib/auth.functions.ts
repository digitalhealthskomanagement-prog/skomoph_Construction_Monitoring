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
      .select("role, project_id")
      .eq("user_id", user.id);

    let role = null;
    let projectIds: string[] = [];
    
    if (roleDataArray && roleDataArray.length > 0) {
      if (roleDataArray.some(r => r.role === "super_admin")) {
        role = "super_admin";
      } else {
        role = "unit_admin";
        projectIds = roleDataArray.map(r => r.project_id).filter(Boolean) as string[];
      }
    }

    // Auto-assign admin if missing and email matches
    if (!role && (user.email === "digitalhealthsko.management@gmail.com" || user.email === "admin@skomoph.local")) {
      const { data: newRole } = await supabaseAdmin.from("user_roles").insert({
        user_id: user.id,
        role: "super_admin",
        project_id: null
      }).select().single();
      if (newRole) {
        role = "super_admin";
      }
    }

    const session = await getSession();
    await session.update({
      unlocked: true,
      userId: user.id,
      role: role,
      projectId: projectIds.length > 0 ? projectIds[0] : null,
      projectIds: projectIds,
    });

    return { ok: true as const };
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
      projectId: ctx.projectId,
      projectIds: ctx.projectIds
    };
  }
);
