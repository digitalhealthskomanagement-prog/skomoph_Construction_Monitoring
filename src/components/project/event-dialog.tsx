import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveEvent, deleteEvent } from "@/lib/data.functions";
import { toast } from "sonner";
import { ymd } from "@/lib/thai-date";
import type { CalEvent } from "./calendar-grid";

const TYPES = [
  { v: "task", l: "งาน" },
  { v: "milestone", l: "เหตุการณ์สำคัญ" },
  { v: "meeting", l: "ประชุม" },
  { v: "inspection", l: "ตรวจงาน" },
];

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  phases,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalEvent | null;
  defaultDate: Date | null;
  phases: { id: string; name: string }[];
}) {
  const qc = useQueryClient();
  const save = useServerFn(saveEvent);
  const del = useServerFn(deleteEvent);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [type, setType] = useState("task");
  const [phaseId, setPhaseId] = useState<string>("none");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStart(event.start_date);
      setEnd(event.end_date);
      setType(event.type);
      setPhaseId(event.phase_id ?? "none");
      setNote(event.note ?? "");
    } else if (defaultDate) {
      const s = ymd(defaultDate);
      setTitle(""); setStart(s); setEnd(s); setType("task"); setPhaseId("none"); setNote("");
    }
  }, [event, defaultDate, open]);

  async function onSave() {
    if (!title.trim() || !start || !end) {
      toast.error("กรุณากรอกหัวข้อและวันที่");
      return;
    }
    try {
      const result = await save({ data: {
        id: event?.id,
        title: title.trim(),
        start_date: start,
        end_date: end,
        type: type as "task" | "milestone" | "meeting" | "inspection",
        phase_id: phaseId === "none" ? null : phaseId,
        note: note.trim() || null,
      } });
      if (!result.ok) {
        toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        return;
      }
      toast.success(event ? "แก้ไขแล้ว" : "เพิ่มรายการแล้ว");
      qc.invalidateQueries({ queryKey: ["project-data"] });
      onOpenChange(false);
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ");
    }
  }

  async function onDelete() {
    if (!event) return;
    if (!confirm("ลบรายการนี้?")) return;
    const result = await del({ data: { id: event.id } });
    if (!result.ok) {
      toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    toast.success("ลบแล้ว");
    qc.invalidateQueries({ queryKey: ["project-data"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{event ? "แก้ไขรายการ" : "เพิ่มรายการในปฏิทิน"}</DialogTitle>
          <DialogDescription className="sr-only">
            ฟอร์มสำหรับเพิ่มหรือแก้ไขรายการในปฏิทินก่อสร้าง
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>หัวข้อ</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น เทคอนกรีตฐานรากโซน A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>วันเริ่ม</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>วันสิ้นสุด</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>ประเภท</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>เฟสงาน</Label>
              <Select value={phaseId} onValueChange={setPhaseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                  {[...phases]
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="max-w-[200px] sm:max-w-[300px] truncate" title={p.name}>
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>หมายเหตุ</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {event ? (
            <Button variant="destructive" onClick={onDelete}>ลบ</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={onSave}>บันทึก</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
