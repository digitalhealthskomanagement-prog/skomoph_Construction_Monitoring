import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { projectQuery, allProjectsQuery, type ProjectSettings, type ResourceLink } from "@/lib/project-query";
import {
  saveSettings,
  createHeroImageUpload,
  savePhase,
  deletePhase,
  saveResourceLink,
  deleteResourceLink,
  createProject,
  deleteProject,
  saveUnit,
  deleteUnit,
} from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOURCE_ICON_OPTIONS } from "@/components/team-resources";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Plus, Save, Trash2, ShieldCheck, Building2, Eye, EyeOff, X, Sparkles } from "lucide-react";

import { z } from "zod";

const settingsSearchSchema = z.object({
  projectId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: (search) => settingsSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "ตั้งค่าระบบ — ระบบติดตามงานก่อสร้าง" },
      { name: "description", content: "จัดการหน่วยบริการและตั้งค่าโครงการ" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsRouter,
});

function SettingsRouter() {
  const { projectId } = Route.useSearch();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectId || null);
  const { data: auth, isLoading: authLoading } = useAuthStatus();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  let content;

  if (!auth?.unlocked) {
    content = (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-semibold">ต้องเข้าสู่ระบบทีมงาน</h1>
        <p className="mt-2 text-sm text-muted-foreground">หน้าตั้งค่าโครงการสำหรับผู้ที่เข้าสู่ระบบเท่านั้น</p>
        <Link to="/login" className="mt-5 inline-block">
          <Button className="bg-brand text-brand-foreground hover:bg-brand/90">เข้าสู่ระบบ</Button>
        </Link>
      </main>
    );
  } else if (selectedProjectId) {
    content = (
      <>
        <div className="bg-muted/50 p-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedProjectId(null)}>
            &larr; ย้อนกลับ
          </Button>
        </div>
        <UnitSettingsPage projectId={selectedProjectId} />
      </>
    );
  } else if (auth.role === "super_admin") {
    content = <SuperAdminDashboard />;
  } else if (auth.role === "unit_admin" && auth.unitIds && auth.unitIds.length > 0) {
    if (auth.unitIds.length === 1) {
      content = <UnitDashboard unitId={auth.unitIds[0]} />;
    } else {
      content = <UnitSelector unitIds={auth.unitIds} />;
    }
  } else {
    content = <div className="p-8 text-center">คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือไม่ได้ผูกกับหน่วยบริการใด</div>;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {content}
    </div>
  );
}

function UnitSelector({ unitIds }: { unitIds: string[] }) {
  const { data: units, isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    }
  });
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  if (selectedUnitId) {
    return (
      <div>
        <div className="bg-muted/50 p-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedUnitId(null)}>
            &larr; กลับไปเลือกหน่วยบริการอื่น
          </Button>
        </div>
        <UnitDashboard unitId={selectedUnitId} />
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">เลือกหน่วยบริการที่ต้องการจัดการ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            บัญชีของคุณได้รับสิทธิ์ดูแลหลายหน่วยบริการ กรุณาเลือกหน่วยบริการที่ต้องการตั้งค่า
          </p>
        </div>
        
        <Card className="p-5">
          {isLoading ? (
            <p>กำลังโหลด...</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {units?.filter((u: any) => unitIds.includes(u.id)).map((u: any) => (
                <div key={u.id} className="rounded-xl border p-5 flex flex-col gap-4 hover:border-brand transition-colors cursor-pointer" onClick={() => setSelectedUnitId(u.id)}>
                  <div>
                    <h3 className="font-medium text-lg">{u.name}</h3>
                    <p className="text-sm text-muted-foreground">{u.district}</p>
                  </div>
                  <Button className="w-full mt-auto" variant="outline">จัดการหน่วยบริการนี้</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}

function UnitDashboard({ unitId }: { unitId: string }) {
  const { data: projects, isLoading } = useQuery(allProjectsQuery);
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    }
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const unit = units?.find((u: any) => u.id === unitId);
  const unitProjects = projects?.filter(p => p.unit_id === unitId) || [];

  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | false>(false);

  const handleCreateProject = async () => {
    try {
      setBusy("creating");
      await create({ data: { title: "โครงการใหม่", unitId } });
      toast.success("สร้างโครงการสำเร็จ!");
      qc.invalidateQueries({ queryKey: ["all-projects"] });
    } catch (e: any) {
      toast.error("สร้างไม่สำเร็จ: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`ยืนยันการลบโครงการ "${title}"?`)) return;
    setBusy(projectId);
    try {
      const r = await remove({ data: { id: projectId } });
      if (r.ok) {
        toast.success("ลบโครงการแล้ว");
        qc.invalidateQueries({ queryKey: ["all-projects"] });
      } else {
        toast.error("ไม่มีสิทธิ์ลบ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  };

  if (selectedProjectId) {
    return (
      <div>
        <div className="bg-muted/50 p-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedProjectId(null)}>
            &larr; กลับไปหน้าหน่วยบริการ
          </Button>
        </div>
        <UnitSettingsPage projectId={selectedProjectId} />
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">หน่วยบริการ: {unit?.name || "กำลังโหลด..."}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              คลิกที่โครงการเพื่อจัดการรายละเอียด ปฏิทิน และรายงาน
            </p>
          </div>
          <Button onClick={handleCreateProject} disabled={busy === "creating"}>
            <Plus className="mr-2 h-4 w-4" /> เพิ่มโครงการใหม่
          </Button>
        </div>
        
        <Card className="p-5">
          {isLoading ? (
            <p>กำลังโหลดโครงการ...</p>
          ) : unitProjects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">ยังไม่มีโครงการในหน่วยบริการนี้</p>
              <Button onClick={handleCreateProject} variant="outline" disabled={!!busy}>
                สร้างโครงการแรก
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {unitProjects.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl border p-5 flex flex-col gap-3 hover:border-brand hover:shadow-md transition-all relative"
                >
                  {/* Delete button */}
                  <button
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={(e) => handleDeleteProject(e, p.id, p.title || "โครงการนี้")}
                    disabled={busy === p.id}
                    title="ลบโครงการ"
                  >
                    <Trash2 className="size-4" />
                  </button>

                  <div className="pr-8">
                    <h3 className="font-semibold text-base leading-tight">{p.title || "โครงการไม่มีชื่อ"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.subtitle || "ยังไม่มีคำอธิบาย"}</p>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">ความคืบหน้า</span>
                      <span className="text-xs font-bold text-brand">{p.total_progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${p.total_progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="flex-1 text-center text-xs font-medium py-1.5 px-3 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 transition-colors"
                    >
                      📊 ดูหน้าโครงการ
                    </Link>
                    <button
                      onClick={() => setSelectedProjectId(p.id)}
                      className="flex-1 text-center text-xs font-medium py-1.5 px-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      ⚙️ ตั้งค่า / รายงาน
                    </button>
                  </div>
                </div>
              ))}

            </div>
          )}
        </Card>
      </main>
    </>
  );
}

/* ---------- Super Admin Dashboard ---------- */

function SuperAdminDashboard() {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // If a unit is selected, show UnitDashboard for that unit
  if (selectedUnitId) {
    return (
      <div>
        <div className="bg-muted/50 p-3 flex items-center">
          <Button variant="ghost" onClick={() => setSelectedUnitId(null)}>
            &larr; กลับไปหน้าจัดการระดับจังหวัด
          </Button>
        </div>
        <UnitDashboard unitId={selectedUnitId} />
      </div>
    );
  }

  return <SuperAdminUnitList onSelectUnit={setSelectedUnitId} />;
}

function SuperAdminUnitList({ onSelectUnit }: { onSelectUnit: (id: string) => void }) {
  const { data: units, isLoading } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    }
  });

  const saveUnitFn = useServerFn(saveUnit);
  const deleteUnitFn = useServerFn(deleteUnit);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({ name: "", type: "รพ.", district: "", province: "สระแก้ว" });
  const [isAdding, setIsAdding] = useState(false);

  async function handleAddUnit() {
    if (!newUnit.name.trim()) return toast.error("กรุณากรอกชื่อหน่วยบริการ");
    setIsAdding(true);
    try {
      const r = await saveUnitFn({ data: newUnit });
      if (r.ok) {
        toast.success("เพิ่มหน่วยบริการใหม่แล้ว");
        setNewUnit({ name: "", type: "รพ.", district: "", province: "สระแก้ว" });
        qc.invalidateQueries({ queryKey: ["units"] });
      } else {
        toast.error("ไม่มีสิทธิ์");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเพิ่ม");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`ยืนยันการลบหน่วยบริการ: "${name}" ? โครงการทั้งหมดภายในหน่วยบริการนี้จะถูกลบไปด้วย!`)) return;
    setBusy(id);
    try {
      const r = await deleteUnitFn({ data: { id } });
      if (r.ok) {
        toast.success("ลบหน่วยบริการแล้ว");
        qc.invalidateQueries({ queryKey: ["units"] });
      } else {
        toast.error("ไม่มีสิทธิ์");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการลบ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-brand" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">การจัดการระดับจังหวัด (สสจ.)</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          เพิ่ม / ลบ หน่วยบริการ · คลิกที่หน่วยบริการเพื่อจัดการโครงการ
        </p>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-4">เพิ่มหน่วยบริการใหม่</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ชื่อหน่วยบริการ">
            <Input value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} placeholder="เช่น รพ.เขาฉกรรจ์" />
          </Field>
          <Field label="ประเภทหน่วยบริการ">
            <Select value={newUnit.type} onValueChange={(v) => setNewUnit({ ...newUnit, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="รพ.">รพ.</SelectItem>
                <SelectItem value="รพ.สต.">รพ.สต.</SelectItem>
                <SelectItem value="สสจ.">สสจ.</SelectItem>
                <SelectItem value="สสอ.">สสอ.</SelectItem>
                <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="อำเภอ">
            <Input value={newUnit.district} onChange={(e) => setNewUnit({ ...newUnit, district: e.target.value })} placeholder="เช่น เขาฉกรรจ์" />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button onClick={handleAddUnit} disabled={isAdding} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="mr-1.5 size-4" /> เพิ่มหน่วยบริการ
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold mb-4">รายชื่อหน่วยบริการทั้งหมด</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {(units as any[])?.map((u: any) => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                <button
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  onClick={() => onSelectUnit(u.id)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.type} · อ.{u.district}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectUnit(u.id)}
                    className="text-brand border-brand/30 hover:bg-brand/5"
                  >
                    จัดการโครงการ →
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.name)} aria-label="ลบหน่วยบริการ" disabled={busy === u.id}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
            {(!units || (units as any[]).length === 0) && (
              <li className="p-4 text-sm text-center text-muted-foreground">ไม่พบหน่วยบริการ</li>
            )}
          </ul>
        )}
      </Card>

      <GlobalResourcesEditor />
    </main>
  );
}


function GlobalResourcesEditor() {
  const { data: projects } = useQuery(allProjectsQuery);
  // Resource links don't have project_id in schema currently, they are global.
  // We can fetch them by getting project data for any project, or just a custom query.
  // Wait, let's just use the first project to load resources if needed, or create a specific query.
  // For simplicity, skip editing global resources here, or do a direct supabase query.
  const { data: links, refetch } = useQuery({
    queryKey: ["global-resources"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_links").select("*").order("order");
      return data || [];
    }
  });

  const save = useServerFn(saveResourceLink);
  const remove = useServerFn(deleteResourceLink);
  const [draft, setDraft] = useState({ label: "", description: "", url: "", icon: "link" });
  const [busy, setBusy] = useState(false);

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
          order: links?.length || 0,
        },
      });
      if (!r.ok) return toast.error("ไม่มีสิทธิ์");
      toast.success("เพิ่มลิงก์แล้ว");
      setDraft({ label: "", description: "", url: "", icon: "link" });
      refetch();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    const r = await remove({ data: { id } });
    if (!r.ok) return toast.error("ไม่มีสิทธิ์");
    toast.success("ลบลิงก์แล้ว");
    refetch();
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">ลิงก์ส่วนกลาง (แสดงทุก รพ.)</h2>
      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <Field label="ชื่อลิงก์">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="เช่น คู่มือการใช้งาน" />
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
            <Plus className="mr-1.5 size-4" /> เพิ่มลิงก์ส่วนกลาง
          </Button>
        </div>
      </div>

      <ul className="divide-y rounded-xl border">
        {links?.map((r) => (
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
    </Card>
  );
}


/* ---------- Unit Settings ---------- */

function UnitSettingsPage({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery(projectQuery(projectId));

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  }

  if (!data) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">ตั้งค่าโครงการ ({data.settings?.name})</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            กรอกรายละเอียดโครงการและแบ่งงวดงาน
          </p>
        </div>
        <ProjectForm settings={(data.settings ?? null) as ProjectSettings | null} projectId={projectId} />
        <PhasesEditor phases={(data.phases ?? []) as any[]} projectId={projectId} />
      </main>
    </div>
  );
}

function ProjectForm({ settings, projectId }: { settings: ProjectSettings | null, projectId: string }) {
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
    budget_source: settings?.budget_source ?? "",
    calendar_start_month: settings?.calendar_start_month ?? "",
    prep_heading: settings?.prep_heading ?? "ขั้นเตรียมการ",
    prep_subtitle: settings?.prep_subtitle ?? "",
    cons_heading: settings?.cons_heading ?? "การก่อสร้าง",
    cons_subtitle: settings?.cons_subtitle ?? "",
  });
  const [heroPath, setHeroPath] = useState<string | null>(settings?.hero_image_path ?? null);
  const [isActive, setIsActive] = useState<boolean>(settings?.is_active ?? true);
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
          id: projectId,
          title: f.title.trim(),
          subtitle: f.subtitle || null,
          org_name: f.org_name || null,
          org_tagline: f.org_tagline || null,
          intro_text: f.intro_text || null,
          start_date: f.start_date,
          end_date: f.end_date,
          budget_baht: f.budget_baht ? Number(f.budget_baht) : null,
          budget_source: f.budget_source && f.budget_source !== "none" ? f.budget_source : null,
          calendar_start_month: f.calendar_start_month || null,
          prep_heading: f.prep_heading || null,
          prep_subtitle: f.prep_subtitle || null,
          cons_heading: f.cons_heading || null,
          cons_subtitle: f.cons_subtitle || null,
          hero_image_path: heroPath,
          is_active: isActive,
        },
      });
      if (!r.ok) return toast.error("ไม่มีสิทธิ์บันทึกข้อมูล");
      toast.success("บันทึกข้อมูลโครงการแล้ว");
      qc.invalidateQueries({ queryKey: ["project-data", projectId] });
      qc.invalidateQueries({ queryKey: ["all-projects"] });
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
        <Field label="แหล่งงบประมาณ">
          <Select value={f.budget_source} onValueChange={(v) => set("budget_source", v)}>
            <SelectTrigger><SelectValue placeholder="เลือกแหล่งงบประมาณ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
              <SelectItem value="เงินบำรุงของหน่วยบริการ">เงินบำรุงของหน่วยบริการ</SelectItem>
              <SelectItem value="เงินงบประมาณ">เงินงบประมาณ</SelectItem>
              <SelectItem value="งบค่าเสื่อม">งบค่าเสื่อม</SelectItem>
            </SelectContent>
          </Select>
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
        <Field label="รูปภาพหน้าปก / รูปจำลองอาคาร" className="sm:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {heroPath ? (
              <div className="relative h-20 w-36 overflow-hidden rounded-lg border bg-muted">
                <img
                  src={supabase.storage.from("updates").getPublicUrl(heroPath).data.publicUrl}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setHeroPath(null)}
                  className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-black"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-36 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
                <ImagePlus className="size-5" />
              </div>
            )}
            <div className="space-y-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onHeroPick(file);
                }}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                (แนะนำ) หากไม่ได้อัปโหลดรูป ระบบจะนำภาพล่าสุดจากรายงานความคืบหน้ามาแสดงเป็นหน้าปกโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </Field>
        <Field label="สถานะโครงการ" className="sm:col-span-2">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">เปิดใช้งาน (แสดงโครงการนี้บนหน้าแรกและแผนที่สาธารณะ)</Label>
          </div>
        </Field>
      </div>
      <Button onClick={submit} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">
        <Save className="mr-1.5 size-4" /> บันทึกข้อมูลโครงการ
      </Button>
    </Card>
  );
}

function PhasesEditor({ phases, projectId }: { phases: any[], projectId: string }) {
  const qc = useQueryClient();
  const save = useServerFn(savePhase);
  const remove = useServerFn(deletePhase);

  const [draft, setDraft] = useState({
    id: undefined as string | undefined,
    name: "",
    category: "preparation" as "preparation" | "construction",
    code: "",
    weight: "",
    duration_label: "",
  });
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["project-data", projectId] });
    qc.invalidateQueries({ queryKey: ["all-projects"] });
  };

  async function add() {
    if (!draft.name.trim()) return toast.error("กรุณากรอกชื่อเฟสงาน");
    setBusy(true);
    try {
      const r = await save({
        data: {
          id: draft.id,
          project_id: projectId,
          name: draft.name.trim(),
          category: draft.category,
          code: draft.code || null,
          weight: draft.weight ? Number(draft.weight) : null,
          duration_label: draft.duration_label || null,
          color: "#0ea5e9",
          order: draft.id ? phases.find(p => p.id === draft.id)?.order ?? phases.length : phases.length,
          progress: draft.id ? phases.find(p => p.id === draft.id)?.progress ?? 0 : 0,
        },
      });
      if (!r.ok) return toast.error("ไม่มีสิทธิ์");
      toast.success(draft.id ? "แก้ไขเฟสงานแล้ว" : "เพิ่มเฟสงานแล้ว");
      setDraft({ id: undefined, name: "", category: draft.category, code: "", weight: "", duration_label: "" });
      refresh();
    } finally {
      setBusy(false);
    }
  }

  function edit(p: any) {
    setDraft({
      id: p.id,
      name: p.name,
      category: p.category,
      code: p.code || "",
      weight: p.weight != null ? String(p.weight) : "",
      duration_label: p.duration_label || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function del(id: string) {
    const r = await remove({ data: { id } });
    if (!r.ok) return toast.error("ไม่มีสิทธิ์");
    toast.success("ลบเฟสงานแล้ว");
    refresh();
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">เฟสงาน / งวดงาน</h2>
        <Button disabled variant="outline" size="sm" className="text-muted-foreground" title="Coming soon">
          <Sparkles className="mr-1.5 size-4" /> นำเข้าจาก PDF (AI)
        </Button>
      </div>

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
        <div className="sm:col-span-2 flex gap-2">
          <Button onClick={add} disabled={busy} variant="secondary">
            <Plus className="mr-1.5 size-4" /> {draft.id ? "บันทึกการแก้ไข" : "เพิ่มเฟสงาน"}
          </Button>
          {draft.id && (
            <Button onClick={() => setDraft({ id: undefined, name: "", category: "preparation", code: "", weight: "", duration_label: "" })} variant="ghost">
              ยกเลิก
            </Button>
          )}
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
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => edit(p)} aria-label="แก้ไขเฟสงาน">
                  <Plus className="size-4 rotate-45 text-muted-foreground" style={{ transform: "rotate(0deg)" }} /> {/* TODO: maybe change icon, use some generic or just Edit text, let's use some other icon from lucide, but since I don't want to import, I will use a simple Edit text or another existing icon */}
                  <span className="text-xs">แก้ไข</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(p.id)} aria-label="ลบเฟสงาน">
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
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
