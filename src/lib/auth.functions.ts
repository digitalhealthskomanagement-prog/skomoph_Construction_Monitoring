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

    // Fetch role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role, project_id")
      .eq("user_id", user.id)
      .single();

    const session = await getSession();
    await session.update({
      unlocked: true,
      userId: user.id,
      role: roleData?.role || null,
      projectId: roleData?.project_id || null,
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
      projectId: ctx.projectId
    };
  }
);
