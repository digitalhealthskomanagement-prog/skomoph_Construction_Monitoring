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
      const userRoles = rolesData.filter(r => r.user_id === u.id);
      const role = userRoles.some(r => r.role === "super_admin") ? "super_admin" : (userRoles.length > 0 ? "unit_admin" : null);
      const projectIds = userRoles.map(r => r.project_id).filter(Boolean);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role: role,
        project_ids: projectIds,
      };
    });

    return { users };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    userId: z.string(),
    role: z.enum(["super_admin", "unit_admin"]),
    projectIds: z.array(z.string()).default([]),
  }))
  .handler(async ({ data }) => {
    const { getAuthContext } = await import("./auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Check permissions
    const ctx = await getAuthContext();
    if (!ctx.unlocked || ctx.role !== "super_admin") {
      throw new Error("Unauthorized");
    }

    // 2. Delete existing roles
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);

    // 3. Insert new roles
    if (data.role === "super_admin" || data.projectIds.length === 0) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role, project_id: null });
      if (error) throw new Error(error.message);
    } else {
      const inserts = data.projectIds.map(pid => ({
        user_id: data.userId,
        role: data.role,
        project_id: pid
      }));
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert(inserts);
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
