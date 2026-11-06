import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dbError } from "./server-errors";

async function getAuth() {
  const mod = await import("./auth.server");
  return mod.getAuthContext();
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Only paths issued by createUpdateImageUpload / createHeroImageUpload are accepted,
// so stored image references can't point at arbitrary external URLs.
const storagePath = z.string().regex(/^(hero\/)?\d+-[a-z0-9]{1,8}\.(jpg|png)$/);
const idInput = z.object({ id: z.string().uuid() });

// YYYY-MM-DD for "today" in Thailand, regardless of the server's time zone
function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Every project the request touches must belong to the caller: the project of the
// existing record (when updating/deleting by id) AND any project/phase given in the
// payload. Trusting the payload alone would let a unit admin edit or move records
// owned by other units.
async function verifyProjectAccess(auth: any, sb: any, table: string | null, id: string | null, payloadProjectId: string | null = null, payloadPhaseId: string | null = null) {
  if (auth.role === "super_admin") return true;
  if (auth.role !== "unit_admin" || !auth.unitIds || auth.unitIds.length === 0) return false;

  const projectIds: (string | null | undefined)[] = [];

  if (id && table) {
    if (table === "projects") {
      projectIds.push(id);
    } else {
      const { data } = await sb.from(table).select("project_id").eq("id", id).maybeSingle();
      if (!data) return false;
      projectIds.push(data.project_id);
    }
  }

  if (payloadProjectId) projectIds.push(payloadProjectId);

  if (payloadPhaseId) {
    const { data } = await sb.from("phases").select("project_id").eq("id", payloadPhaseId).maybeSingle();
    if (!data) return false;
    projectIds.push(data.project_id);
  }

  if (projectIds.length === 0 || projectIds.some((p) => !p)) return false;

  const unique = [...new Set(projectIds as string[])];
  const { data: projs } = await sb.from("projects").select("id, unit_id").in("id", unique);
  if (!projs || projs.length !== unique.length) return false;
  return projs.every((p: { unit_id: string }) => auth.unitIds.includes(p.unit_id));
}

async function signImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const sb = await admin();
  const { data } = sb.storage.from("updates").getPublicUrl(path);
  return data.publicUrl;
}

async function signImages(paths: string[] | null | undefined, fallback: string | null): Promise<string[]> {
  const list = (paths && paths.length > 0 ? paths : fallback ? [fallback] : []).slice(0, 4);
  const signed = await Promise.all(list.map((p) => signImage(p)));
  return signed.filter((u): u is string => !!u);
}

// ---------- Public reads ----------

export const getAllProjectsData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sb = await admin();
    const { data, error } = await sb.from("projects").select("*, units(*)").order("updated_at", { ascending: false });
    if (error) {
      console.error("getAllProjectsData error:", error);
      return [];
    }
    
    const projects = data ?? [];

    // Projects without a cover image fall back to their latest photo update. Fetch
    // those photos in one query for all such projects instead of one query each.
    const needFallback = projects.filter((d: any) => !d.hero_image_path).map((d: any) => d.id);
    const latestPhoto = new Map<string, { image_url: string | null; image_urls: string[] | null }>();
    if (needFallback.length > 0) {
      const { data: photoUpdates, error: photoError } = await sb
        .from("updates")
        .select("project_id, image_url, image_urls, thumb_urls, created_at")
        .in("project_id", needFallback)
        .or("image_url.not.is.null,image_urls.neq.{}")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (photoError) console.error("getAllProjectsData photos error:", photoError);
      for (const u of photoUpdates ?? []) {
        if (!latestPhoto.has(u.project_id)) {
          // Prefer the small thumbnail for the card grid when one exists
          const thumbs = (u as { thumb_urls?: string[] | null }).thumb_urls;
          latestPhoto.set(u.project_id, {
            image_url: thumbs?.[0] ?? u.image_url,
            image_urls: thumbs && thumbs.length > 0 ? thumbs : u.image_urls,
          });
        }
      }
    }

    return Promise.all(projects.map(async (d: any) => {
      let heroUrl = await signImage(d.hero_image_path ?? null);
      if (!heroUrl) {
        const photo = latestPhoto.get(d.id);
        if (photo) {
          const signed = await signImages(photo.image_urls, photo.image_url);
          heroUrl = signed[0] ?? null;
        }
      }
      return {
        ...d,
        hero_url: heroUrl,
        unit_name: d.units?.name,
        unit_type: d.units?.type,
        district: d.units?.district,
        province: d.units?.province,
        lat: d.units?.lat,
        lng: d.units?.lng,
        units: undefined
      };
    }));
  } catch (err) {
    console.error("Failed to fetch all projects data (Supabase may be paused or offline):", err);
    return [];
  }
});

export const getAllUnitsData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sb = await admin();
    const { data, error } = await sb.from("units").select("*").order("name", { ascending: true });
    if (error) {
      console.error("getAllUnitsData error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("Failed to fetch units data (Supabase may be paused or offline):", err);
    return [];
  }
});

export const getProjectData = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    try {
      const sb = await admin();
      const projectId = data.projectId;
      const [settings, phases, events, updatesRaw, risks, resources] = await Promise.all([
        sb.from("projects").select("*, units(*)").eq("id", projectId).maybeSingle(),
        sb.from("phases").select("*").eq("project_id", projectId).order("order", { ascending: true }),
        sb.from("calendar_events").select("*").eq("project_id", projectId).order("start_date", { ascending: true }),
        sb.from("updates").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(50),
        sb.from("risks").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
        sb.from("resource_links").select("*").order("order", { ascending: true }), 
      ]);

      if (settings.error) console.error("getProjectData settings error:", settings.error);
      if (phases.error) console.error("getProjectData phases error:", phases.error);
      if (events.error) console.error("getProjectData events error:", events.error);
      if (updatesRaw.error) console.error("getProjectData updatesRaw error:", updatesRaw.error);
      if (risks.error) console.error("getProjectData risks error:", risks.error);
      if (resources.error) console.error("getProjectData resources error:", resources.error);

      const updates = await Promise.all(
        (updatesRaw.data ?? []).map(async (u) => {
          const images = await signImages(u.image_urls, u.image_url);
          const thumbs = await signImages((u as { thumb_urls?: string[] }).thumb_urls, null);
          return { ...u, image_url: images[0] ?? null, image_urls: images, thumb_urls: thumbs };
        }),
      );
      let s: any = settings.data;
      if (s) {
        s = {
          ...s,
          unit_name: s.units?.name,
          unit_type: s.units?.type,
          district: s.units?.district,
          province: s.units?.province,
          lat: s.units?.lat,
          lng: s.units?.lng,
          units: undefined
        };
      }
      let heroUrl = await signImage((s as { hero_image_path?: string | null } | null)?.hero_image_path ?? null);
      if (!heroUrl && updates && updates.length > 0) {
        // Look for the latest update that has a signed image
        const latestWithImage = updates.find(u => u.image_url || (u.image_urls && u.image_urls.length > 0));
        if (latestWithImage) {
          heroUrl = latestWithImage.image_url || latestWithImage.image_urls?.[0] || null;
        }
      }
      return {
        settings: s ? { ...s, hero_url: heroUrl } : null,
        phases: phases.data ?? [],
        events: events.data ?? [],
        updates,
        risks: risks.data ?? [],
        resources: resources.data ?? [],
      };
    } catch (err) {
      console.error("Failed to fetch project data (Supabase may be paused or offline):", err);
      return {
        settings: null,
        phases: [],
        events: [],
        updates: [],
        risks: [],
        resources: [],
      };
    }
  });


// ---------- Mutations (gated) ----------

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  type: z.enum(["milestone", "task", "meeting", "inspection"]).default("task"),
  phase_id: z.string().uuid().nullable().optional(),
  note: z.string().optional().nullable(),
  project_id: z.string().uuid().optional(),
});

export const saveEvent = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof eventSchema>) => eventSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "calendar_events", data.id || null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    if (data.id) {
      const { error } = await sb.from("calendar_events").update({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        phase_id: data.phase_id ?? null,
        note: data.note ?? null,
      }).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      let projectId = data.project_id;
      if (!projectId && data.phase_id) {
         const { data: p } = await sb.from("phases").select("project_id").eq("id", data.phase_id).single();
         projectId = p?.project_id;
      }
      if (!projectId) return { ok: false as const, reason: "invalid" as const };
      const { error } = await sb.from("calendar_events").insert({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        phase_id: data.phase_id ?? null,
        note: data.note ?? null,
        project_id: projectId,
      });
      if (error) throw dbError(error);
    }
    return { ok: true as const };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "calendar_events", data.id);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const { error } = await sb.from("calendar_events").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

const phaseSchema = z.object({
  id: z.string().uuid(),
  progress: z.number().min(0).max(100),
  project_id: z.string().uuid().optional(),
});

export const updatePhaseProgress = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof phaseSchema>) => phaseSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id, data.project_id || null);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const { error } = await sb.from("phases").update({ progress: data.progress }).eq("id", data.id);
    if (error) throw dbError(error);

    let projectId = data.project_id;
    if (!projectId) {
      const { data: p } = await sb.from("phases").select("project_id").eq("id", data.id).single();
      projectId = p?.project_id;
    }
    if (!projectId) return { ok: true };

    const { data: phases } = await sb.from("phases").select("progress, category, weight").eq("project_id", projectId);
    if (phases && phases.length > 0) {
      const prep = phases.filter((p) => p.category === "preparation");
      const cons = phases.filter((p) => p.category === "construction");
      const prepAvg = prep.length ? prep.reduce((s, p) => s + Number(p.progress ?? 0), 0) / prep.length : 0;
      const consWeightTotal = cons.reduce((s, p) => s + Number(p.weight ?? 0), 0);
      const consAvg = consWeightTotal > 0
        ? cons.reduce((s, p) => s + Number(p.progress ?? 0) * Number(p.weight ?? 0), 0) / consWeightTotal
        : (cons.length ? cons.reduce((s, p) => s + Number(p.progress ?? 0), 0) / cons.length : 0);
      const overall = prep.length && cons.length ? (prepAvg + consAvg) / 2 : (prep.length ? prepAvg : consAvg);
      
      await sb.from("projects").update({ total_progress: Math.round(overall * 10) / 10, updated_at: new Date().toISOString() }).eq("id", projectId);
    }
    return { ok: true as const };
  });

const updateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  reporter_name: z.string().optional().nullable(),
  phase_id: z.string().uuid().nullable().optional(),
  progress_snapshot: z.number().nullable().optional(),
  image_path: storagePath.nullable().optional(),
  image_paths: z.array(storagePath).max(4).optional(),
  thumb_paths: z.array(storagePath).max(4).optional(),
  project_id: z.string().uuid().optional(),
});

const imageUploadSchema = z.object({
  exts: z.array(z.string()).min(1).max(8),
});

export const createUpdateImageUpload = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof imageUploadSchema>) => imageUploadSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    // Image uploads can't easily be verified by project_id before uploading, but it's protected by login
    const sb = await admin();
    const tickets: { path: string; token: string }[] = [];
    for (const raw of data.exts) {
      const ext = (raw || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const safeExt = ext === "png" ? "png" : "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const { data: signed, error } = await sb.storage.from("updates").createSignedUploadUrl(path);
      if (error || !signed) throw error ? dbError(error, "storage") : new Error("สร้างลิงก์อัปโหลดรูปไม่ได้");
      tickets.push({ path, token: signed.token });
    }
    return { ok: true as const, tickets };
  });

export const postUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof updateSchema>) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, null, null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    let projectId = data.project_id;
    if (!projectId && data.phase_id) {
      const { data: p } = await sb.from("phases").select("project_id").eq("id", data.phase_id).single();
      projectId = p?.project_id;
    }
    let snapshot = data.progress_snapshot;
    if (snapshot == null && projectId) {
      const { data: proj } = await sb.from("projects").select("total_progress").eq("id", projectId).maybeSingle();
      snapshot = proj?.total_progress ?? null;
    }
    if (!projectId) return { ok: false as const, reason: "invalid" as const };
    const paths = (data.image_paths ?? (data.image_path ? [data.image_path] : [])).slice(0, 4);
    const { error } = await sb.from("updates").insert({
      title: data.title,
      body: data.body,
      reporter_name: data.reporter_name ?? null,
      phase_id: data.phase_id ?? null,
      project_id: projectId,
      progress_snapshot: snapshot,
      image_url: paths[0] ?? null,
      image_urls: paths,
      thumb_urls: (data.thumb_paths ?? []).slice(0, 4),
    });
    if (error) throw dbError(error);
    return { ok: true as const };
  });

export const deleteUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "updates", data.id);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const { error } = await sb.from("updates").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

// ---------- Risks ----------

const riskSchema = z.object({
  id: z.string().uuid().optional(),
  phase_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  mitigation: z.string().nullable().optional(),
  status: z.enum(["open", "monitoring", "closed"]).default("open"),
  project_id: z.string().uuid().optional(),
});

export const saveRisk = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof riskSchema>) => riskSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "risks", data.id || null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    let projectId = data.project_id;
    if (!projectId && data.phase_id) {
       const { data: p } = await sb.from("phases").select("project_id").eq("id", data.phase_id).single();
       projectId = p?.project_id;
    }
    const payload = {
      phase_id: data.phase_id,
      title: data.title,
      description: data.description ?? null,
      severity: data.severity,
      mitigation: data.mitigation ?? null,
      status: data.status,
      updated_at: new Date().toISOString(),
      project_id: projectId,
    };
    if (data.id) {
      const { error } = await sb.from("risks").update(payload).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await sb.from("risks").insert(payload);
      if (error) throw dbError(error);
    }
    return { ok: true as const };
  });

export const deleteRisk = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "risks", data.id);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const { error } = await sb.from("risks").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

// ---------- Project settings (gated) ----------

const settingsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  budget_baht: z.number().nullable().optional(),
  budget_source: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
  org_tagline: z.string().nullable().optional(),
  intro_text: z.string().nullable().optional(),
  prep_heading: z.string().nullable().optional(),
  prep_subtitle: z.string().nullable().optional(),
  cons_heading: z.string().nullable().optional(),
  cons_subtitle: z.string().nullable().optional(),
  calendar_start_month: z.string().nullable().optional(),
  hero_image_path: storagePath.nullable().optional(),
  is_active: z.boolean().optional(),
});

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof settingsSchema>) => settingsSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "projects", data.id, data.id);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const { id, ...rest } = data;
    const payload = { ...rest, updated_at: new Date().toISOString() };
    const { error } = await sb.from("projects").update(payload).eq("id", id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

// ---------- Unit management (Super Admin only) ----------

const unitSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().default("สระแก้ว"),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const saveUnit = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof unitSchema>) => unitSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "forbidden" as const };
    
    const sb = await admin();
    const payload = {
      name: data.name,
      type: data.type ?? null,
      district: data.district ?? null,
      province: data.province ?? "สระแก้ว",
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      updated_at: new Date().toISOString(),
    };
    
    if (data.id) {
      const { error } = await sb.from("units").update(payload).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await sb.from("units").insert(payload);
      if (error) throw dbError(error);
    }
    return { ok: true as const };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "forbidden" as const };
    
    const sb = await admin();
    const { error } = await sb.from("units").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; unitId: string }) =>
    z.object({ title: z.string().min(1).max(300), unitId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    
    // Only super_admin or unit_admin of that unit can create project
    if (auth.role !== "super_admin" && !auth.unitIds?.includes(data.unitId)) {
      return { ok: false as const, reason: "forbidden" as const };
    }
    
    // Standard e-bidding preparation steps: [code, name, duration in days]. Dates are
    // laid out back to back starting today (Thai time), instead of fixed 2026 dates.
    const prepSteps: [string, string, number][] = [
      ["1.1", "เสนอแต่งตั้งคณะกรรมการกำหนดขอบเขตงาน (TOR) และราคากลาง", 5],
      ["1.2", "คณะกรรมการฯ จัดทำแบบรูปรายการและราคากลาง", 20],
      ["1.3", "เสนอรายงานผลราคากลาง และขอความเห็นชอบ", 1],
      ["1.4", "จัดทำรายงานขอซื้อขอจ้าง พร้อมแต่งตั้งคณะกรรมการพิจารณาผลฯ", 6],
      ["1.5", "เผยแพร่ร่างประกาศเพื่อรับฟังคำวิจารณ์ (7 วันทำการ)", 11],
      ["1.6", "รายงานผลรับฟังความคิดเห็น และผู้บริหารลงนามประกาศเชิญชวน", 1],
      ["1.7", "เผยแพร่ประกาศประกวดราคา e-bidding (20 วันทำการ)", 28],
      ["1.8", "ผู้เสนอราคายื่นข้อเสนอทางระบบอิเล็กทรอนิกส์", 1],
      ["1.9", "คณะกรรมการพิจารณาผลการประกวดราคาฯ", 5],
      ["1.10", "รายงานผลการพิจารณาให้ผู้มีอำนาจลงนาม", 1],
      ["1.11", "ประกาศผู้ชนะการเสนอราคา", 1],
      ["1.12", "เว้นระยะเวลาอุทธรณ์ (7 วันทำการ)", 11],
      ["1.13", "รายงานผลอุทธรณ์ / เสนอผู้บริหารเรียกทำสัญญา", 1],
      ["1.14", "ผู้รับจ้างเตรียมหลักประกัน และตรวจสอบเอกสารเพื่อลงนาม", 17],
      ["1.15", "ผู้มีอำนาจลงนามสัญญาจ้างก่อสร้าง (เริ่มต้นนับเวลาก่อสร้าง)", 1],
    ];
    const today = bangkokToday();
    let cursor = today;
    const defaultPhaseRows = prepSteps.map(([code, name, days], i) => {
      const startDate = cursor;
      const endDate = addDays(startDate, days - 1);
      cursor = addDays(endDate, 1);
      return {
        category: "preparation",
        code,
        name,
        order: 101 + i,
        color: "#0ea5e9",
        duration_label: `${days} วัน`,
        start_date: startDate,
        end_date: endDate,
        progress: 0,
      };
    });
    const lastPrepEnd = defaultPhaseRows[defaultPhaseRows.length - 1].end_date;

    const sb = await admin();
    const { data: proj, error } = await sb.from("projects").insert({
      title: data.title,
      unit_id: data.unitId,
      start_date: today,
      end_date: lastPrepEnd,
      is_active: true,
    }).select("id").single();
    if (error || !proj) throw error ? dbError(error) : new Error("สร้างโครงการไม่สำเร็จ");

    const defaultPhases = defaultPhaseRows.map((row) => ({ ...row, project_id: proj.id }));
    const { error: phaseError } = await sb.from("phases").insert(defaultPhases);
    if (phaseError) throw dbError(phaseError);

    return { ok: true as const };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    const sb = await admin();
    
    // Check if they are super admin, or they have access to this project's unit
    if (auth.role !== "super_admin") {
      const { data: proj } = await sb.from("projects").select("unit_id").eq("id", data.id).single();
      if (!proj || !auth.unitIds?.includes(proj.unit_id)) {
        return { ok: false as const, reason: "forbidden" as const };
      }
    }
    const { error } = await sb.from("projects").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });


export const createHeroImageUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { ext: string }) => z.object({ ext: z.string().max(10) }).parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };
    
    const sb = await admin();
    const clean = (data.ext || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const ext = clean === "png" ? "png" : "jpg";
    const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data: signed, error } = await sb.storage.from("updates").createSignedUploadUrl(path);
    if (error || !signed) throw error ? dbError(error, "storage") : new Error("สร้างลิงก์อัปโหลดรูปไม่ได้");
    return { ok: true as const, path, token: signed.token };
  });

// ---------- Phases (gated) ----------

const phaseUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.enum(["preparation", "construction"]).default("construction"),
  code: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  duration_label: z.string().nullable().optional(),
  color: z.string().default("#0ea5e9"),
  order: z.number().default(0),
  progress: z.number().min(0).max(100).default(0),
  project_id: z.string().uuid().optional(),
});

export const savePhase = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof phaseUpsertSchema>) => phaseUpsertSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id || null, data.project_id || null);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    const payload = {
      name: data.name,
      category: data.category,
      code: data.code ?? null,
      weight: data.weight ?? null,
      duration_label: data.duration_label ?? null,
      color: data.color,
      order: data.order,
      progress: data.progress,
      project_id: data.project_id,
    };
    if (data.id) {
      const { error } = await sb.from("phases").update(payload).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await sb.from("phases").insert(payload);
      if (error) throw dbError(error);
    }
    return { ok: true as const };
  });

export const deletePhase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id);
    if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };

    await sb.from("calendar_events").update({ phase_id: null }).eq("phase_id", data.id);
    await sb.from("updates").update({ phase_id: null }).eq("phase_id", data.id);
    await sb.from("risks").delete().eq("phase_id", data.id);
    const { error } = await sb.from("phases").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });

export const reorderPhases = createServerFn({ method: "POST" })
  .inputValidator((d: { ids: string[] }) => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthenticated" as const };

    const sb = await admin();
    for (const id of data.ids) {
      const hasAccess = await verifyProjectAccess(auth, sb, "phases", id);
      if (!hasAccess) return { ok: false as const, reason: "forbidden" as const };
    }

    await Promise.all(data.ids.map((id, i) => sb.from("phases").update({ order: i }).eq("id", id)));
    return { ok: true as const };
  });

// ---------- Resource links (gated) ----------
// Resource links are global. Only super_admin can modify them for now to keep it safe.

const resourceSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"),
  icon: z.string().default("link"),
  order: z.number().default(0),
});

export const saveResourceLink = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof resourceSchema>) => resourceSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    // Only super_admin can modify global resource links
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "forbidden" as const };

    const sb = await admin();
    const payload = {
      label: data.label,
      description: data.description ?? null,
      url: data.url,
      icon: data.icon,
      order: data.order,
    };
    if (data.id) {
      const { error } = await sb.from("resource_links").update(payload).eq("id", data.id);
      if (error) throw dbError(error);
    } else {
      const { error } = await sb.from("resource_links").insert(payload);
      if (error) throw dbError(error);
    }
    return { ok: true as const };
  });

export const deleteResourceLink = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => idInput.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "forbidden" as const };

    const sb = await admin();
    const { error } = await sb.from("resource_links").delete().eq("id", data.id);
    if (error) throw dbError(error);
    return { ok: true as const };
  });
