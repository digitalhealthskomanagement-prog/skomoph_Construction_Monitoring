import { getRequestUrl, useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

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
    password: process.env.SESSION_SECRET!,
    name: "kk-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: cookieOptions(),
  };
}

export function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function requireUnlocked() {
  const session = await useSession<GateSession>(sessionConfig());
  if (!session.data.unlocked) {
    return false;
  }
  return true;
}

export async function hasUnlockedSession() {
  const session = await useSession<GateSession>(sessionConfig());
  return Boolean(session.data.unlocked);
}

export async function getSession() {
  return useSession<GateSession>(sessionConfig());
}
