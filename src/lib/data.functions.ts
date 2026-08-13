import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getAuth() {
  const mod = await import("./auth.server");
  return mod.getAuthContext();
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verifyProjectAccess(auth: any, sb: any, table: string | null, id: string | null, payloadProjectId: string | null = null, payloadPhaseId: string | null = null) {
  if (auth.role === "super_admin") return true;
  if (auth.role !== "unit_admin" || !auth.unitIds || auth.unitIds.length === 0) return false;
  
  let targetProjectId = payloadProjectId;
  
  if (!targetProjectId && payloadPhaseId) {
    const { data } = await sb.from("phases").select("project_id").eq("id", payloadPhaseId).maybeSingle();
    targetProjectId = data?.project_id;
  }

  if (!targetProjectId && id && table) {
    if (table === "projects") {
      targetProjectId = id;
    } else {
      const { data } = await sb.from(table).select("project_id").eq("id", id).maybeSingle();
      targetProjectId = data?.project_id;
    }
  }

  if (!targetProjectId) return false;

  // Check if any of the user's units own this project
  const { data: proj } = await sb.from("projects").select("unit_id").eq("id", targetProjectId).maybeSingle();
  return proj && auth.unitIds.includes(proj.unit_id);
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
  const sb = await admin();
  const { data, error } = await sb.from("projects").select("*, units(*)").order("updated_at", { ascending: false });
  if (error) console.error("getAllProjectsData error:", error);
  
  const projects = data ?? [];
  return Promise.all(projects.map(async (d: any) => {
    let heroUrl = await signImage(d.hero_image_path ?? null);
    if (!heroUrl) {
      const { data: latestUpdate } = await sb.from("updates").select("image_url, image_urls").eq("project_id", d.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latestUpdate) {
        const signed = await signImages(latestUpdate.image_urls, latestUpdate.image_url);
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
});

export const getAllUnitsData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data } = await sb.from("units").select("*").order("name", { ascending: true });
  return data ?? [];
});

export const getProjectData = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
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

  if (settings.error) throw settings.error;
  if (phases.error) throw phases.error;
  if (events.error) throw events.error;
  if (updatesRaw.error) throw updatesRaw.error;
  if (risks.error) throw risks.error;
  if (resources.error) throw resources.error;
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
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "calendar_events", data.id || null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    if (data.id) {
      const { error } = await sb.from("calendar_events").update({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        phase_id: data.phase_id ?? null,
        note: data.note ?? null,
      }).eq("id", data.id);
      if (error) throw error;
    } else {
      let projectId = data.project_id;
      if (!projectId && data.phase_id) {
         const { data: p } = await sb.from("phases").select("project_id").eq("id", data.phase_id).single();
         projectId = p?.project_id;
      }
      const { error } = await sb.from("calendar_events").insert({
        title: data.title,
        start_date: data.start_date,
        end_date: data.end_date,
        type: data.type,
        phase_id: data.phase_id ?? null,
        note: data.note ?? null,
        project_id: projectId,
      });
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "calendar_events", data.id);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    const { error } = await sb.from("calendar_events").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
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
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id, data.project_id || null);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    const { error } = await sb.from("phases").update({ progress: data.progress }).eq("id", data.id);
    if (error) throw error;

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
    return { ok: true };
  });

const updateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  reporter_name: z.string().optional().nullable(),
  phase_id: z.string().uuid().nullable().optional(),
  progress_snapshot: z.number().nullable().optional(),
  image_path: z.string().nullable().optional(),
  image_paths: z.array(z.string()).max(4).optional(),
  thumb_paths: z.array(z.string()).max(4).optional(),
  project_id: z.string().uuid().optional(),
});

const imageUploadSchema = z.object({
  exts: z.array(z.string()).min(1).max(8),
});

export const createUpdateImageUpload = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof imageUploadSchema>) => imageUploadSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    // Image uploads can't easily be verified by project_id before uploading, but it's protected by login
    const sb = await admin();
    const tickets: { path: string; token: string }[] = [];
    for (const raw of data.exts) {
      const ext = (raw || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const safeExt = ext === "png" ? "png" : "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
      const { data: signed, error } = await sb.storage.from("updates").createSignedUploadUrl(path);
      if (error || !signed) throw error ?? new Error("สร้างลิงก์อัปโหลดรูปไม่ได้");
      tickets.push({ path, token: signed.token });
    }
    return { ok: true as const, tickets };
  });

export const postUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof updateSchema>) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, null, null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    let projectId = data.project_id;
    if (!projectId && data.phase_id) {
      const { data: p } = await sb.from("phases").select("project_id").eq("id", data.phase_id).single();
      projectId = p?.project_id;
    }
    const paths = (data.image_paths ?? (data.image_path ? [data.image_path] : [])).slice(0, 4);
    const { error } = await sb.from("updates").insert({
      title: data.title,
      body: data.body,
      reporter_name: data.reporter_name ?? null,
      phase_id: data.phase_id ?? null,
      project_id: projectId,
      progress_snapshot: data.progress_snapshot ?? null,
      image_url: paths[0] ?? null,
      image_urls: paths,
      thumb_urls: (data.thumb_paths ?? []).slice(0, 4),
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteUpdate = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    
    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "updates", data.id);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    const { error } = await sb.from("updates").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
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
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "risks", data.id || null, data.project_id || null, data.phase_id || null);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

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
      if (error) throw error;
    } else {
      const { error } = await sb.from("risks").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteRisk = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "risks", data.id);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    const { error } = await sb.from("risks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Project settings (gated) ----------

const settingsSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  budget_baht: z.number().nullable().optional(),
  org_name: z.string().nullable().optional(),
  org_tagline: z.string().nullable().optional(),
  intro_text: z.string().nullable().optional(),
  prep_heading: z.string().nullable().optional(),
  prep_subtitle: z.string().nullable().optional(),
  cons_heading: z.string().nullable().optional(),
  cons_subtitle: z.string().nullable().optional(),
  calendar_start_month: z.string().nullable().optional(),
  hero_image_path: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof settingsSchema>) => settingsSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "projects", data.id, data.id);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    const { id, ...rest } = data;
    const payload = { ...rest, updated_at: new Date().toISOString() };
    const { error } = await sb.from("projects").update(payload).eq("id", id);
    if (error) throw error;
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
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "unauthorized" as const };
    
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
      if (error) throw error;
    } else {
      const { error } = await sb.from("units").insert(payload);
      if (error) throw error;
    }
    return { ok: true as const };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "unauthorized" as const };
    
    const sb = await admin();
    const { error } = await sb.from("units").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; unitId: string; }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    
    // Only super_admin or unit_admin of that unit can create project
    if (auth.role !== "super_admin" && !auth.unitIds?.includes(data.unitId)) {
      return { ok: false as const, reason: "unauthorized" as const };
    }
    
    const sb = await admin();
    const { error } = await sb.from("projects").insert({
      title: data.title,
      unit_id: data.unitId,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      is_active: true,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    const sb = await admin();
    
    // Check if they are super admin, or they have access to this project's unit
    if (auth.role !== "super_admin") {
      const { data: proj } = await sb.from("projects").select("unit_id").eq("id", data.id).single();
      if (!proj || !auth.unitIds?.includes(proj.unit_id)) {
        return { ok: false as const, reason: "unauthorized" as const };
      }
    }
    const { error } = await sb.from("projects").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const importTemplatePhases = createServerFn({ method: "POST" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    const sb = await admin();

    // Check project permission
    const access = await verifyProjectAccess(auth, sb, "projects", data.projectId);
    if (!access) return { ok: false as const, reason: "unauthorized" as const };

    const defaultPhases = [
      { category: 'preparation', code: '1.1', name: 'เสนอแต่งตั้งคณะกรรมการกำหนดขอบเขตงาน (TOR) และราคากลาง', order: 101, color: '#0ea5e9', duration_label: '5 วัน', start_date: '2026-09-01', end_date: '2026-09-05', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.2', name: 'คณะกรรมการฯ จัดทำแบบรูปรายการและราคากลาง', order: 102, color: '#0ea5e9', duration_label: '20 วัน', start_date: '2026-09-06', end_date: '2026-09-25', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.3', name: 'เสนอรายงานผลราคากลาง และขอความเห็นชอบ', order: 103, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-09-26', end_date: '2026-09-26', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.4', name: 'จัดทำรายงานขอซื้อขอจ้าง พร้อมแต่งตั้งคณะกรรมการพิจารณาผลฯ', order: 104, color: '#0ea5e9', duration_label: '6 วัน', start_date: '2026-09-27', end_date: '2026-10-02', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.5', name: 'เผยแพร่ร่างประกาศเพื่อรับฟังคำวิจารณ์ (7 วันทำการ)', order: 105, color: '#0ea5e9', duration_label: '11 วัน', start_date: '2026-10-03', end_date: '2026-10-13', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.6', name: 'รายงานผลรับฟังความคิดเห็น และผู้บริหารลงนามประกาศเชิญชวน', order: 106, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-10-14', end_date: '2026-10-14', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.7', name: 'เผยแพร่ประกาศประกวดราคา e-bidding (20 วันทำการ)', order: 107, color: '#0ea5e9', duration_label: '28 วัน', start_date: '2026-10-15', end_date: '2026-11-11', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.8', name: 'ผู้เสนอราคายื่นข้อเสนอทางระบบอิเล็กทรอนิกส์', order: 108, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-11-12', end_date: '2026-11-12', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.9', name: 'คณะกรรมการพิจารณาผลการประกวดราคาฯ', order: 109, color: '#0ea5e9', duration_label: '5 วัน', start_date: '2026-11-13', end_date: '2026-11-17', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.10', name: 'รายงานผลการพิจารณาให้ผู้มีอำนาจลงนาม', order: 110, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-11-18', end_date: '2026-11-18', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.11', name: 'ประกาศผู้ชนะการเสนอราคา', order: 111, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-11-19', end_date: '2026-11-19', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.12', name: 'เว้นระยะเวลาอุทธรณ์ (7 วันทำการ)', order: 112, color: '#0ea5e9', duration_label: '11 วัน', start_date: '2026-11-20', end_date: '2026-11-30', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.13', name: 'รายงานผลอุทธรณ์ / เสนอผู้บริหารเรียกทำสัญญา', order: 113, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-12-01', end_date: '2026-12-01', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.14', name: 'ผู้รับจ้างเตรียมหลักประกัน และตรวจสอบเอกสารเพื่อลงนาม', order: 114, color: '#0ea5e9', duration_label: '17 วัน', start_date: '2026-12-02', end_date: '2026-12-18', project_id: data.projectId, progress: 0 },
      { category: 'preparation', code: '1.15', name: 'ผู้มีอำนาจลงนามสัญญาจ้างก่อสร้าง (เริ่มต้นนับเวลาก่อสร้าง)', order: 115, color: '#0ea5e9', duration_label: '1 วัน', start_date: '2026-12-19', end_date: '2026-12-19', project_id: data.projectId, progress: 0 },
      
      { category: 'construction', code: 'งวดที่ 1', name: 'รื้อถอน, ปรับพื้นที่, ปักผัง, เจาะสำรวจดิน, ก่อสร้างเสาเข็มและทดสอบ', order: 201, color: '#f59e0b', duration_label: 'ภายใน 90 วัน', weight: 4.00, start_date: '2026-12-19', end_date: '2027-03-19', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 2', name: 'ก่อสร้างฐานราก, ตอม่อ, ถังเก็บน้ำใต้ดิน, ช่องลิฟต์/ผนัง ค.ส.ล. ชั้น 1, เดินท่อระบบ', order: 202, color: '#f59e0b', duration_label: 'ภายใน 150 วัน', weight: 3.50, start_date: '2027-03-20', end_date: '2027-05-18', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 3', name: 'โครงสร้างพื้น-คาน ชั้น 1, บันได, เสารับชั้น 2, ช่องลิฟต์ชั้น 2, ฝังท่อในคอนกรีต', order: 203, color: '#f59e0b', duration_label: 'ภายใน 180 วัน', weight: 3.00, start_date: '2027-05-19', end_date: '2027-06-17', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 4', name: 'โครงสร้างพื้น-คาน ชั้น 2, บันได, เสารับชั้น 3, ช่องลิฟต์ชั้น 3, ฝังท่อในคอนกรีต', order: 204, color: '#f59e0b', duration_label: 'ภายใน 210 วัน', weight: 2.50, start_date: '2027-06-18', end_date: '2027-07-17', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 5', name: 'โครงสร้างพื้น-คาน ชั้น 3, เสารับชั้น 4, ก่ออิฐชั้น 1, เดินท่อระบบสุขาภิบาล/ไฟฟ้าชั้น 1', order: 205, color: '#f59e0b', duration_label: 'ภายใน 240 วัน', weight: 3.00, start_date: '2027-07-18', end_date: '2027-08-16', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 6', name: 'โครงสร้างพื้น-คาน ชั้น 4, เสารับชั้น 5, ก่ออิฐชั้น 2, เดินท่อระบบชั้น 1-2', order: 206, color: '#f59e0b', duration_label: 'ภายใน 270 วัน', weight: 4.00, start_date: '2027-08-17', end_date: '2027-09-15', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 7', name: 'โครงสร้างพื้น-คาน ชั้น 5, เสารับชั้นดาดฟ้า, ก่ออิฐชั้น 3, ฉาบปูนชั้น 1, เดินท่อระบบชั้น 2-3', order: 207, color: '#f59e0b', duration_label: 'ภายใน 315 วัน', weight: 4.25, start_date: '2027-09-16', end_date: '2027-10-30', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 8', name: 'โครงสร้างพื้นดาดฟ้า, หลังคา, ก่ออิฐชั้น 4, ฉาบปูนชั้น 2, ปูกระเบื้อง/หินขัดชั้น 1', order: 208, color: '#f59e0b', duration_label: 'ภายใน 360 วัน', weight: 5.25, start_date: '2027-10-31', end_date: '2027-12-14', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 9', name: 'ก่ออิฐส่วนที่เหลือ, ฉาบปูนชั้น 3, ปูกระเบื้อง/หินขัดชั้น 2, เดินท่อ/สายไฟชั้น 3-5', order: 209, color: '#f59e0b', duration_label: 'ภายใน 405 วัน', weight: 3.00, start_date: '2027-12-15', end_date: '2028-01-28', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 10', name: 'ฉาบปูนชั้น 4, ปูกระเบื้อง/หินขัดชั้น 3, ติดตั้งถังน้ำสแตนเลส, เดินท่อเมนแนวดิ่งทั้งหมด', order: 210, color: '#f59e0b', duration_label: 'ภายใน 450 วัน', weight: 2.50, start_date: '2028-01-29', end_date: '2028-03-14', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 11', name: 'ติดตั้งฝ้าเพดานชั้น 1-2, ฉาบปูนภายนอก/ภายในที่เหลือ, งานพื้นชั้น 4, บ่อพักน้ำ/ท่อระบาย', order: 211, color: '#f59e0b', duration_label: 'ภายใน 500 วัน', weight: 6.50, start_date: '2028-03-15', end_date: '2028-05-03', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 12', name: 'ติดตั้งฝ้าชั้น 3-4, ปูกระเบื้องที่เหลือ, ติดตั้งผนังห้องผ่าตัด, ประตู-หน้าต่างชั้น 1-2', order: 212, color: '#f59e0b', duration_label: 'ภายใน 545 วัน', weight: 10.00, start_date: '2028-05-04', end_date: '2028-06-17', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 13', name: 'ฝ้าเพดานที่เหลือ, ผิวพื้นภายนอก, ประตู-หน้าต่างชั้น 3-4, สุขภัณฑ์, แอร์ชั้น 4-5, ทาสีรองพื้น', order: 213, color: '#f59e0b', duration_label: 'ภายใน 590 วัน', weight: 9.50, start_date: '2028-06-18', end_date: '2028-08-01', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 14', name: 'ตกแต่งแผ่นคอมโพสิท, กันซึมหลังคา, ติดตั้งเครื่องกำเนิดไฟฟ้า, ระบบกันฟ้าผ่า, ทาสีจริงชั้น 1-2', order: 214, color: '#f59e0b', duration_label: 'ภายใน 640 วัน', weight: 14.00, start_date: '2028-08-02', end_date: '2028-09-20', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 15', name: 'กระเบื้องยาง, หม้อแปลงไฟฟ้า, ลิฟต์, ระบบสื่อสาร (โทรศัพท์, CCTV, เรียกพยาบาล)', order: 215, color: '#f59e0b', duration_label: 'ภายใน 685 วัน', weight: 10.00, start_date: '2028-09-21', end_date: '2028-11-04', project_id: data.projectId, progress: 0 },
      { category: 'construction', code: 'งวดที่ 16', name: 'ทาสีที่เหลือ, ติดตั้งอุปกรณ์จ่ายแก๊ส, ทดสอบระบบ, ส่งคู่มือ/As-Built (BIM), ทำความสะอาด', order: 216, color: '#f59e0b', duration_label: 'ภายใน 730 วัน', weight: 15.00, start_date: '2028-11-05', end_date: '2028-12-19', project_id: data.projectId, progress: 0 }
    ];

    const { error } = await sb.from("phases").insert(defaultPhases);
    if (error) throw error;
    return { ok: true as const };
  });


export const createHeroImageUpload = createServerFn({ method: "POST" })
  .inputValidator((d: { ext: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };
    
    const sb = await admin();
    const clean = (data.ext || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const ext = clean === "png" ? "png" : "jpg";
    const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data: signed, error } = await sb.storage.from("updates").createSignedUploadUrl(path);
    if (error || !signed) throw error ?? new Error("สร้างลิงก์อัปโหลดรูปไม่ได้");
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
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id || null, data.project_id || null);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

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
      if (error) throw error;
    } else {
      const { error } = await sb.from("phases").insert(payload);
      if (error) throw error;
    }
    return { ok: true as const };
  });

export const deletePhase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.id);
    if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };

    await sb.from("calendar_events").update({ phase_id: null }).eq("phase_id", data.id);
    await sb.from("updates").update({ phase_id: null }).eq("phase_id", data.id);
    await sb.from("risks").delete().eq("phase_id", data.id);
    const { error } = await sb.from("phases").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });

export const reorderPhases = createServerFn({ method: "POST" })
  .inputValidator((d: { ids: string[] }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked) return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    if (data.ids.length > 0) {
       const hasAccess = await verifyProjectAccess(auth, sb, "phases", data.ids[0]);
       if (!hasAccess) return { ok: false as const, reason: "unauthorized" as const };
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
  url: z.string().url(),
  icon: z.string().default("link"),
  order: z.number().default(0),
});

export const saveResourceLink = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof resourceSchema>) => resourceSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await getAuth();
    // Only super_admin can modify global resource links
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "unauthorized" as const };

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
      if (error) throw error;
    } else {
      const { error } = await sb.from("resource_links").insert(payload);
      if (error) throw error;
    }
    return { ok: true as const };
  });

export const deleteResourceLink = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await getAuth();
    if (!auth.unlocked || auth.role !== "super_admin") return { ok: false as const, reason: "unauthorized" as const };

    const sb = await admin();
    const { error } = await sb.from("resource_links").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
