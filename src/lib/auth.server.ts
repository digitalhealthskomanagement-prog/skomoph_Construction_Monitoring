import { getRequestUrl, useSession } from "@tanstack/react-start/server";

export type AuthSession = {
  unlocked?: boolean;
  userId?: string;
  role?: "super_admin" | "unit_admin" | null;
  projectId?: string | null;
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
  return {
    password: process.env.SESSION_SECRET || "fallback-secret-key-must-be-32-chars",
    name: "skomoph-session",
    maxAge: 60 * 60 * 24 * 7,
    cookie: cookieOptions(),
  };
}

export async function getSession() {
  return useSession<AuthSession>(sessionConfig());
}

export async function getAuthContext() {
  const session = await getSession();
  return {
    unlocked: Boolean(session.data.unlocked),
    userId: session.data.userId,
    role: session.data.role,
    projectId: session.data.projectId,
  };
}
