import { createServerFn } from "@tanstack/react-start";

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const { getSession, matches } = await import("./gate.server");
    const expected = process.env.SITE_PASSWORD;
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!matches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await getSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const { getSession } = await import("./gate.server");
  const session = await getSession();
  await session.clear();
  return { ok: true as const };
});

export const getUnlockedStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSession } = await import("./gate.server");
    const session = await getSession();
    return { unlocked: Boolean(session.data.unlocked) };
  },
);
