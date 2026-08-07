import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveRisk, deleteRisk } from "@/lib/data.functions";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Plus, Pencil } from "lucide-react";

export type Risk = {
  id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high";
  mitigation: string | null;
  status: "open" | "monitoring" | "closed";
};

const SEV_LABEL: Record<string, string> = { low: "ต่ำ", medium: "กลาง", high: "สูง" };
const STATUS_LABEL: Record<string, string> = { open: "เปิด", monitoring: "เฝ้าระวัง", closed: "ปิด" };
const SEV_STYLE: Record<string, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function RiskDialog({
  open,
  onOpenChange,
  phaseId,
  phaseName,
  risks,
  editable,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phaseId: string;
  phaseName: string;
  risks: Risk[];
  editable: boolean;
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveRisk);
  const del = useServerFn(deleteRisk);
  const [editing, setEditing] = useState<Risk | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function submit(form: Partial<Risk>) {
    const res = await save({
      data: {
        id: editing?.id,
        phase_id: phaseId,
        title: String(form.title ?? "").trim(),
        description: form.description ?? null,
        severity: (form.severity as any) ?? "medium",
        mitigation: form.mitigation ?? null,
        status: (form.status as any) ?? "open",
      },
    });
    if (!res.ok) {
      toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    toast.success(editing ? "แก้ไขความเสี่ยงแล้ว" : "เพิ่มความเสี่ยงแล้ว");
    setEditing(null);
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["project-data"] });
  }

  async function remove(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    const res = await del({ data: { id } });
    if (!res.ok) {
      toast.error("เซสชันหมดอายุ");
      return;
    }
    toast.success("ลบแล้ว");
    qc.invalidateQueries({ queryKey: ["project-data"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            ความเสี่ยง — {phaseName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {risks.length === 0 && !showForm && (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการความเสี่ยง
            </p>
          )}
          {risks.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${SEV_STYLE[r.severity]}`}>
                      {SEV_LABEL[r.severity]}
                    </span>
                    <span className="rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {STATUS_LABEL[r.status]}
                    </span>
                    <span className="text-sm font-medium">{r.title}</span>
                  </div>
                  {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                  {r.mitigation && (
                    <p className="mt-1 text-xs">
                      <span className="font-medium text-foreground/80">แนวทาง: </span>
                      <span className="text-muted-foreground">{r.mitigation}</span>
                    </p>
                  )}
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setShowForm(true); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {editable && showForm && (
          <RiskForm
            key={editing?.id ?? "new"}
            initial={editing}
            onCancel={() => { setEditing(null); setShowForm(false); }}
            onSubmit={submit}
          />
        )}

        {editable && !showForm && (
          <DialogFooter>
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Plus className="size-4" /> เพิ่มความเสี่ยง
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RiskForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Risk | null;
  onCancel: () => void;
  onSubmit: (r: Partial<Risk>) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [severity, setSeverity] = useState<string>(initial?.severity ?? "medium");
  const [status, setStatus] = useState<string>(initial?.status ?? "open");
  const [mitigation, setMitigation] = useState(initial?.mitigation ?? "");

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <Input placeholder="หัวข้อความเสี่ยง" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="รายละเอียด (ไม่บังคับ)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Textarea placeholder="แนวทางบรรเทา (ไม่บังคับ)" rows={2} value={mitigation} onChange={(e) => setMitigation(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger><SelectValue placeholder="ระดับ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">ต่ำ</SelectItem>
            <SelectItem value="medium">กลาง</SelectItem>
            <SelectItem value="high">สูง</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="สถานะ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">เปิด</SelectItem>
            <SelectItem value="monitoring">เฝ้าระวัง</SelectItem>
            <SelectItem value="closed">ปิด</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>ยกเลิก</Button>
        <Button size="sm" disabled={!title.trim()} onClick={() => onSubmit({ title, description, mitigation, severity: severity as Risk["severity"], status: status as Risk["status"] })} className="bg-brand text-brand-foreground hover:bg-brand/90">
          บันทึก
        </Button>
      </div>
    </div>
  );
}
