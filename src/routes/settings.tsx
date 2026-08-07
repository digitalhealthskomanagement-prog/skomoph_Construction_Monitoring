import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { projectQuery, type ProjectSettings, type ResourceLink } from "@/lib/project-query";
import {
  saveSettings,
  createHeroImageUpload,
  savePhase,
  deletePhase,
  saveResourceLink,
  deleteResourceLink,
} from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOURCE_ICON_OPTIONS } from "@/components/team-resources";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectQuery),
  head: () => ({
    meta: [
      { title: "ตั้งค่าโครงการ — ระบบติดตามงานก่อสร้าง" },
      { name: "description", content: "ตั้งค่าชื่อโครงการ หน่วยงาน รูปนำ ช่วงเวลา เฟสงาน และลิงก์ทรัพยากรของระบบติดตามความคืบหน้างานก่อสร้าง" },
      { property: "og:title", content: "ตั้งค่าโครงการ — ระบบติดตามงานก่อสร้าง" },
      { property: "og:description", content: "จัดการข้อมูลโครงการ เฟสงาน และทรัพยากรทีมงาน" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type Phase = {
  id: string;
  name: string;
  category?: string | null;
  code?: string | null;
  weight?: number | null;
  duration_label?: string | null;
  progress: number;
  order?: number;
};

function SettingsPage() {
  const { data } = useSuspenseQuery(projectQuery);
  const { data: auth } = useAuthStatus();

  if (!auth?.unlocked) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl font-semibold">ต้องเข้าสู่ระบบทีมงาน</h1>
          <p className="mt-2 text-sm text-muted-foreground">หน้าตั้งค่าโครงการสำหรับผู้ที่เข้าสู่ระบบเท่านั้น</p>
          <Link to="/login" className="mt-5 inline-block">
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90">เข้าสู่ระบบ</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">ตั้งค่าโครงการ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            กรอกข้อมูลโครงการ รูปนำ เฟสงาน และลิงก์ทรัพยากร — ใช้ซ้ำได้กับทุกโครงการก่อสร้าง
          </p>
        </div>
        <ProjectForm settings={(data.settings ?? null) as ProjectSettings | null} />
        <PhasesEditor phases={(data.phases ?? []) as Phase[]} />
        <ResourcesEditor links={(data.resources ?? []) as ResourceLink[]} />
      </main>
    </div>
  );
}

/* ---------- Project info ---------- */

function ProjectForm({ settings }: { settings: ProjectSettings | null }) {
  const qc = useQueryClient();
  const save = useServerFn(saveSettings);
  const createUpload = useServerFn(createHeroImageUpload);
  const [f, setF] = useState({
    title: settings?.title ?? "",
    subtitle: settings?.subtitle ?? "",
    org_name: settings?.org_name ?? "",
    org_tagline: settings?.org_tagline ?? "",
    intro_text: settings?.intro_text ?? "",
    start_date: settings?.start_date ?? "",
    end_date: settings?.end_date ?? "",
    budget_baht: settings?.budget_baht != null ? String(settings.budget_baht) : "",
    calendar_start_month: settings?.calendar_start_month ?? "",
    prep_heading: settings?.prep_heading ?? "ขั้นเตรียมการ",
    prep_subtitle: settings?.prep_subtitle ?? "",
    cons_heading: settings?.cons_heading ?? "การก่อสร้าง",
    cons_subtitle: settings?.cons_subtitle ?? "",
  });
  const [heroPath, setHeroPath] = useState<string | null>(settings?.hero_image_path ?? null);
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof f, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function onHeroPick(file: File) {
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const t = await createUpload({ data: { ext } });
      if (!t.ok) throw new Error("เซสชันหมดอายุ");
      const { error } = await supabase.storage
        .from("updates")
        .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type || "image/jpeg" });
      if (error) throw error;
      setHeroPath(t.path);
      toast.success("อัปโหลดรูปแล้ว — กดบันทึกเพื่อยืนยัน");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!f.title.trim()) return toast.error("กรุณากรอกชื่อโครงการ");
    if (!f.start_date || !f.end_date) return toast.error("กรุณากรอกวันเริ่มและวันสิ้นสุดโครงการ");
    setBusy(true);
    try {
      const r = await save({
        data: {
          title: f.title.trim(),
          subtitle: f.subtitle || null,
          org_name: f.org_name || null,
          org_tagline: f.org_tagline || null,
          intro_text: f.intro_text || null,
          start_date: f.start_date,
          end_date: f.end_date,
          budget_baht: f.budget_baht ? Number(f.budget_baht) : null,
          calendar_start_month: f.calendar_start_month || null,
          prep_heading: f.prep_heading || null,
          prep_subtitle: f.prep_subtitle || null,
          cons_heading: f.cons_heading || null,
          cons_subtitle: f.cons_subtitle || null,
          hero_image_path: heroPath,
        },
      });
      if (!r.ok) return toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
      toast.success("บันทึกข้อมูลโครงการแล้ว");
      qc.invalidateQueries({ queryKey: ["project-data"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">ข้อมูลโครงการ</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ชื่อโครงการ" className="sm:col-span-2">
          <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="เช่น อาคารผู้ป่วยใน 5 ชั้น" />
        </Field>
        <Field label="คำบรรยายย่อย">
          <Input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="เช่น โรงพยาบาล..." />
        </Field>
        <Field label="ชื่อหน่วยงาน (หัวเว็บ)">
          <Input value={f.org_name} onChange={(e) => set("org_name", e.target.value)} placeholder="เช่น โรงพยาบาล..." />
        </Field>
        <Field label="ข้อความใต้ชื่อหน่วยงาน">
          <Input value={f.org_tagline} onChange={(e) => set("org_tagline", e.target.value)} placeholder="เช่น โครงการก่อสร้างอาคาร 5 ชั้น" />
        </Field>
        <Field label="งบประมาณ (บาท)">
          <Input type="number" value={f.budget_baht} onChange={(e) => set("budget_baht", e.target.value)} placeholder="เช่น 250000000" />
        </Field>
        <Field label="คำอธิบายหน้าแรก" className="sm:col-span-2">
          <Textarea value={f.intro_text} onChange={(e) => set("intro_text", e.target.value)} rows={2} />
        </Field>
        <Field label="วันเริ่มโครงการ">
          <Input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} />
        </Field>
        <Field label="วันสิ้นสุดโครงการ">
          <Input type="date" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} />
        </Field>
        <Field label="เดือนเริ่มต้นของปฏิทิน">
          <Input type="date" value={f.calendar_start_month} onChange={(e) => set("calendar_start_month", e.target.value)} />
        </Field>
        <Field label="หัวข้อกลุ่มที่ 1">
          <Input value={f.prep_heading} onChange={(e) => set("prep_heading", e.target.value)} />
        </Field>
        <Field label="คำบรรยายกลุ่มที่ 1">
          <Input value={f.prep_subtitle} onChange={(e) => set("prep_subtitle", e.target.value)} />
        </Field>
        <Field label="หัวข้อกลุ่มที่ 2">
          <Input value={f.cons_heading} onChange={(e) => set("cons_heading", e.target.value)} />
        </Field>
        <Field label="คำบรรยายกลุ่มที่ 2">
          <Input value={f.cons_subtitle} onChange={(e) => set("cons_subtitle", e.target.value)} />
        </Field>
      </div>

      <div className="rounded-xl border border-dashed p-4">
        <Label className="text-sm font-medium">รูปนำโครงการ</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          {heroPath ? "มีรูปแล้ว — เลือกไฟล์ใหม่เพื่อแทนที่" : "ยังไม่มีรูป — เลือกไฟล์เพื่ออัปโหลด"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" /> เลือกรูป
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onHeroPick(file);
                e.target.value = "";
              }}
            />
          </label>
          {heroPath && (
            <Button variant="ghost" size="sm" onClick={() => setHeroPath(null)}>
              ลบรูป
            </Button>
          )}
        </div>
      </div>

      <Button onClick={submit} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">
        <Save className="mr-1.5 size-4" /> บันทึกข้อมูลโครงการ
      </Button>
    </Card>
  );
}

/* ---------- Phases ---------- */

function PhasesEditor({ phases }: { phases: Phase[] }) {
  const qc = useQueryClient();
  const save = useServerFn(savePhase);
  const remove = useServerFn(deletePhase);
  const [draft, setDraft] = useState({
    name: "",
    category: "preparation" as "preparation" | "construction",
    code: "",
    weight: "",
    duration_label: "",
  });
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["project-data"] });

  async function add() {
    if (!draft.name.trim()) return toast.error("กรุณากรอกชื่อเฟสงาน");
    setBusy(true);
    try {
      const r = await save({
        data: {
          name: draft.name.trim(),
          category: draft.category,
          code: draft.code || null,
          weight: draft.weight ? Number(draft.weight) : null,
          duration_label: draft.duration_label || null,
          color: "#0ea5e9",
          order: phases.length,
          progress: 0,
        },
      });
      if (!r.ok) return toast.error("เซสชันหมดอายุ");
      toast.success("เพิ่มเฟสงานแล้ว");
      setDraft({ name: "", category: draft.category, code: "", weight: "", duration_label: "" });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    const r = await remove({ data: { id } });
    if (!r.ok) return toast.error("เซสชันหมดอายุ");
    toast.success("ลบเฟสงานแล้ว");
    refresh();
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">เฟสงาน / งวดงาน</h2>

      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <Field label="ชื่อเฟสงาน" className="sm:col-span-2">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="เช่น งวดที่ 1 งานฐานราก" />
        </Field>
        <Field label="กลุ่ม">
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as typeof draft.category })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="preparation">กลุ่มที่ 1 (เตรียมการ)</SelectItem>
              <SelectItem value="construction">กลุ่มที่ 2 (ก่อสร้าง)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="รหัส/ลำดับ">
          <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="เช่น 1.1 หรือ งวด 1" />
        </Field>
        <Field label="น้ำหนักงาน (%)">
          <Input type="number" step="0.01" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
        </Field>
        <Field label="ระยะเวลา">
          <Input value={draft.duration_label} onChange={(e) => setDraft({ ...draft, duration_label: e.target.value })} placeholder="เช่น 45 วัน" />
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={add} disabled={busy} variant="secondary">
            <Plus className="mr-1.5 size-4" /> เพิ่มเฟสงาน
          </Button>
        </div>
      </div>

      {phases.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีเฟสงาน</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {phases.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {p.code ? <span className="mr-1.5 font-mono text-xs text-muted-foreground">{p.code}</span> : null}
                  {p.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.category === "preparation" ? "เตรียมการ" : "ก่อสร้าง"}
                  {p.weight != null && ` · น้ำหนัก ${Number(p.weight).toFixed(2)}%`}
                  {p.duration_label && ` · ${p.duration_label}`}
                  {` · ${Number(p.progress).toFixed(0)}%`}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(p.id)} aria-label="ลบเฟสงาน">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Resource links ---------- */

function ResourcesEditor({ links }: { links: ResourceLink[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveResourceLink);
  const remove = useServerFn(deleteResourceLink);
  const [draft, setDraft] = useState({ label: "", description: "", url: "", icon: "link" });
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["project-data"] });

  async function add() {
    if (!draft.label.trim() || !draft.url.trim()) return toast.error("กรุณากรอกชื่อและลิงก์");
    setBusy(true);
    try {
      const r = await save({
        data: {
          label: draft.label.trim(),
          description: draft.description || null,
          url: draft.url.trim(),
          icon: draft.icon,
          order: links.length,
        },
      });
      if (!r.ok) return toast.error("เซสชันหมดอายุ");
      toast.success("เพิ่มลิงก์แล้ว");
      setDraft({ label: "", description: "", url: "", icon: "link" });
      refresh();
    } catch {
      toast.error("ลิงก์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    const r = await remove({ data: { id } });
    if (!r.ok) return toast.error("เซสชันหมดอายุ");
    toast.success("ลบลิงก์แล้ว");
    refresh();
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">ลิงก์ทรัพยากรทีมงาน</h2>
      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <Field label="ชื่อลิงก์">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="เช่น Google Drive เอกสาร" />
        </Field>
        <Field label="ไอคอน">
          <Select value={draft.icon} onValueChange={(v) => setDraft({ ...draft, icon: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOURCE_ICON_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="URL" className="sm:col-span-2">
          <Input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." />
        </Field>
        <Field label="คำอธิบาย" className="sm:col-span-2">
          <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Button onClick={add} disabled={busy} variant="secondary">
            <Plus className="mr-1.5 size-4" /> เพิ่มลิงก์
          </Button>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {links.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.label}</div>
                <div className="truncate text-xs text-muted-foreground">{r.url}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(r.id)} aria-label="ลบลิงก์">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
