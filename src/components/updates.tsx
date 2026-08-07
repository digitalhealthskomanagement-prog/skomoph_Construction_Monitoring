import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { createUpdateImageUpload, postUpdate, deleteUpdate } from "@/lib/data.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePlus, Send, Trash2, X } from "lucide-react";
import { formatThaiDate } from "@/lib/thai-date";

const MAX_IMAGES = 4;

type Update = {
  id: string;
  title: string;
  body: string;
  reporter_name: string | null;
  phase_id: string | null;
  progress_snapshot: number | null;
  image_url: string | null;
  image_urls?: string[] | null;
  thumb_urls?: string[] | null;
  created_at: string;
};

type Phase = { id: string; name: string };

async function bufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("โหลดรูปไม่ได้"));
    img.src = url;
  });
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return img;
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("แปลงรูปไม่ได้"))), "image/jpeg", quality);
  });
}

const MAX_UPLOAD_BYTES = 1_500_000;

async function resizeToBlob(img: HTMLImageElement, maxDim: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas ไม่พร้อมใช้งาน");
  ctx.drawImage(img, 0, 0, w, h);
  return canvasToBlob(canvas, quality);
}

async function makeThumbnail(file: File): Promise<Blob> {
  const img = await loadImage(file);
  return resizeToBlob(img, 480, 0.62);
}

async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const isJpgPng = /image\/(jpeg|png)/i.test(file.type);
  if (file.size < MAX_UPLOAD_BYTES && isJpgPng) {
    return { blob: file, ext: file.type === "image/png" ? "png" : "jpg" };
  }
  const img = await loadImage(file);
  let maxDim = 1400;
  let quality = 0.78;
  for (let attempt = 0; attempt < 7; attempt++) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas ไม่พร้อมใช้งาน");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size < MAX_UPLOAD_BYTES) return { blob, ext: "jpg" };
    if (quality > 0.5) {
      quality -= 0.12;
    } else {
      maxDim = Math.round(maxDim * 0.75);
    }
  }
  throw new Error("รูปใหญ่เกินไป กรุณาเลือกรูปที่เล็กลง");
}

export function UpdateComposer({ phases }: { phases: Phase[] }) {
  const qc = useQueryClient();
  const post = useServerFn(postUpdate);
  const createUpload = useServerFn(createUpdateImageUpload);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [phaseId, setPhaseId] = useState("none");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setFiles((prev) => {
      const room = MAX_IMAGES - prev.length;
      if (room <= 0) {
        toast.error(`แนบรูปได้สูงสุด ${MAX_IMAGES} รูป`);
        return prev;
      }
      if (incoming.length > room) toast.error(`แนบรูปได้สูงสุด ${MAX_IMAGES} รูป`);
      return [...prev, ...incoming.slice(0, room)];
    });
  }

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error("กรอกหัวข้อและรายละเอียด");
      return;
    }
    setBusy(true);
    try {
      const image_paths: string[] = [];
      const thumb_paths: string[] = [];
      if (files.length > 0) {
        const compressed = await Promise.all(files.map((f) => compressImage(f)));
        const thumbs = await Promise.all(files.map((f) => makeThumbnail(f)));
        const exts = [...compressed.map((c) => c.ext), ...thumbs.map(() => "jpg")];
        const uploadTicket = await createUpload({ data: { exts } });
        if (!uploadTicket.ok) {
          toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
          return;
        }
        const n = compressed.length;
        for (let i = 0; i < n; i++) {
          const t = uploadTicket.tickets[i];
          const r = compressed[i];
          const { error: uploadError } = await supabase.storage
            .from("updates")
            .uploadToSignedUrl(t.path, t.token, r.blob, {
              contentType: r.ext === "png" ? "image/png" : "image/jpeg",
            });
          if (uploadError) throw uploadError;
          image_paths.push(t.path);

          const tt = uploadTicket.tickets[n + i];
          const { error: thumbError } = await supabase.storage
            .from("updates")
            .uploadToSignedUrl(tt.path, tt.token, thumbs[i], { contentType: "image/jpeg" });
          if (!thumbError) thumb_paths.push(tt.path);
        }
      }
      const result = await post({ data: {
        title: title.trim(),
        body: body.trim(),
        reporter_name: name.trim() || null,
        phase_id: phaseId === "none" ? null : phaseId,
        image_paths,
        thumb_paths,
      } });
      if (!result.ok) {
        toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
      }
      toast.success("โพสต์อัปเดตแล้ว");
      setTitle(""); setBody(""); setFiles([]);
      qc.invalidateQueries({ queryKey: ["project-data"] });
    } catch (e) {
      console.error("postUpdate failed", e);
      toast.error(`โพสต์ไม่สำเร็จ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 font-display text-lg font-semibold">โพสต์รายงานความคืบหน้าใหม่</div>
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>ชื่อผู้รายงาน</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น วิศวกรสมชาย" />
          </div>
          <div className="grid gap-1.5">
            <Label>เฟสงาน</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>หัวข้อ</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="สรุปสั้นๆ" />
        </div>
        <div className="grid gap-1.5">
          <Label>รายละเอียด</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="รายละเอียดงาน ปัญหา หรือหมายเหตุ" />
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative">
                <img src={URL.createObjectURL(f)} alt={f.name} className="size-20 rounded-md border object-cover" />
                <button
                  type="button"
                  aria-label="ลบรูป"
                  onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm hover:bg-accent">
            <ImagePlus className="size-4" />
            <span>{files.length > 0 ? `แนบแล้ว ${files.length}/${MAX_IMAGES} รูป` : `แนบรูป (สูงสุด ${MAX_IMAGES} รูป)`}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
            />
          </label>
          {files.length > 0 && <Button variant="ghost" size="sm" onClick={() => setFiles([])}>ลบรูปทั้งหมด</Button>}
          <div className="ml-auto">
            <Button onClick={submit} disabled={busy} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Send className="mr-1.5 size-4" /> {busy ? "กำลังโพสต์…" : "โพสต์"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function imagesOf(u: Update): string[] {
  const list = u.image_urls && u.image_urls.length > 0 ? u.image_urls : u.image_url ? [u.image_url] : [];
  return list.filter(Boolean).slice(0, MAX_IMAGES);
}

function previewsOf(u: Update): { thumb: string; full: string }[] {
  const full = imagesOf(u);
  const thumbs = (u.thumb_urls ?? []).filter(Boolean);
  return full.map((src, i) => ({ thumb: thumbs[i] ?? src, full: src }));
}

export function UpdatesList({ updates, phases, editable }: { updates: Update[]; phases: Phase[]; editable: boolean }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteUpdate);
  const [zoom, setZoom] = useState<string | null>(null);
  const phaseName = (id: string | null) => phases.find((p) => p.id === id)?.name;


  async function onDelete(id: string) {
    if (!confirm("ลบโพสต์นี้?")) return;
    const result = await del({ data: { id } });
    if (!result.ok) {
      toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    toast.success("ลบแล้ว");
    qc.invalidateQueries({ queryKey: ["project-data"] });
  }

  if (updates.length === 0) {
    return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">ยังไม่มีรายงานอัปเดต</div>;
  }
  return (
    <div className="space-y-4">
      {updates.map((u) => (
        <Card key={u.id} className="overflow-hidden p-0">
          <div className="flex flex-col gap-0 md:flex-row">
            {previewsOf(u).length > 0 && (
              <div className="md:w-64 md:shrink-0">
                {previewsOf(u).length === 1 ? (
                  <button type="button" onClick={() => setZoom(previewsOf(u)[0].full)} className="block h-56 w-full md:h-full">
                    <img
                      src={previewsOf(u)[0].thumb}
                      alt={u.title}
                      loading="lazy"
                      decoding="async"
                      className="h-56 w-full object-cover md:h-full"
                    />
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-0.5">
                    {previewsOf(u).map((img, i) => (
                      <button key={img.full + i} type="button" onClick={() => setZoom(img.full)} className="block">
                        <img
                          src={img.thumb}
                          alt={`${u.title} ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-28 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatThaiDate(u.created_at, { short: true })}</span>
                {u.reporter_name && <span>· {u.reporter_name}</span>}
                {phaseName(u.phase_id) && (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-primary">{phaseName(u.phase_id)}</span>
                )}
              </div>
              <div className="mt-1 font-display text-lg font-semibold">{u.title}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{u.body}</p>
              {editable && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => onDelete(u.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 size-4" /> ลบ
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl p-2">
          {zoom && <img src={zoom} alt="รูปรายงาน" className="h-auto max-h-[80vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
