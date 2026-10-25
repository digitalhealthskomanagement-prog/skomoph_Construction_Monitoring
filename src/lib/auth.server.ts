import { getRequestUrl, useSession } from "@tanstack/react-start/server";

export type AuthSession = {
  unlocked?: boolean;
  userId?: string;
  role?: "super_admin" | "unit_admin" | null;
  unitIds?: string[];
};

function cookieOptions() {
  const url = getRequestUrl();
  const isHttps = url.protocol === "https:";

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}

export function sessionConfig() {
  // No fallback: a known secret would let anyone forge an admin session cookie
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  }
  return {
    password: secret,
    name: "skomoph-session",
    maxAge: 60 * 60 * 24 * 7,
    cookie: cookieOptions(),
  };
}

export async function getSession() {
  return useSession<AuthSession>(sessionConfig());
}

// The cookie only proves who the user is. Roles are re-read from user_roles on every
// call so that revoking a role or deleting a user takes effect immediately.
export async function getAuthContext() {
  const session = await getSession();
  const userId = session.data.userId;
  if (!session.data.unlocked || !userId) {
    return { unlocked: false, userId: undefined, role: null, unitIds: [] as string[] };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, unit_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  if (!roles || roles.length === 0) {
    return { unlocked: false, userId, role: null, unitIds: [] as string[] };
  }

  const isSuper = roles.some((r) => r.role === "super_admin");
  return {
    unlocked: true,
    userId,
    role: (isSuper ? "super_admin" : "unit_admin") as AuthSession["role"],
    unitIds: isSuper ? [] : (roles.map((r) => r.unit_id).filter(Boolean) as string[]),
  };
}
