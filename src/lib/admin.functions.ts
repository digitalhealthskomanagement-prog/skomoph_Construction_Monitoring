import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAllUsers = createServerFn({ method: "GET" })
  .handler(async () => {
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
      .select("user_id, role, project_id");
    if (rolesError) throw new Error(rolesError.message);

    // 4. Combine data
    const users = authData.users.map(u => {
      const roleInfo = rolesData.find(r => r.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role: roleInfo?.role || null,
        project_id: roleInfo?.project_id || null,
      };
    });

    return { users };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    userId: z.string(),
    role: z.enum(["super_admin", "unit_admin"]),
    projectId: z.string().nullable(),
  }))
  .handler(async ({ data }) => {
    const { getAuthContext } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Check permissions
    const ctx = await getAuthContext();
    if (!ctx.unlocked || ctx.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    // 2. Check if role exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", data.userId)
      .single();

    if (existingRole) {
      // Update
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role, project_id: data.projectId })
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    } else {
      // Insert
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role, project_id: data.projectId });
      if (error) throw new Error(error.message);
    }

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
