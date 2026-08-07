import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { updatePhaseProgress } from "@/lib/data.functions";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/thai-date";
import { CalendarDays, ClipboardList, HardHat, AlertTriangle } from "lucide-react";
import { RiskDialog, type Risk } from "@/components/risk-dialog";
import { planPctForPhaseNow } from "@/lib/s-curve";

type Phase = {
  id: string;
  name: string;
  progress: number;
  color: string;
  start_date: string | null;
  end_date: string | null;
  category?: string | null;
  code?: string | null;
  weight?: number | null;
  duration_label?: string | null;
};

type CalEvent = {
  id: string;
  phase_id: string | null;
  start_date: string;
  end_date: string;
};

export function PhaseList({
  phases,
  events,
  risks,
  editable,
  prepHeading = "ขั้นเตรียมการ",
  prepSubtitle = "",
  consHeading = "การก่อสร้าง",
  consSubtitle = "",
}: {
  phases: Phase[];
  events: CalEvent[];
  risks: Risk[];
  editable: boolean;
  prepHeading?: string;
  prepSubtitle?: string;
  consHeading?: string;
  consSubtitle?: string;
}) {
  const eventsByPhase = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      if (!e.phase_id) continue;
      const arr = map.get(e.phase_id) ?? [];
      arr.push(e);
      map.set(e.phase_id, arr);
    }
    return map;
  }, [events]);

  const risksByPhase = useMemo(() => {
    const map = new Map<string, Risk[]>();
    for (const r of risks) {
      if (!r.phase_id) continue;
      const arr = map.get(r.phase_id) ?? [];
      arr.push(r);
      map.set(r.phase_id, arr);
    }
    return map;
  }, [risks]);

  const prep = phases.filter((p) => p.category === "preparation");
  const cons = phases.filter((p) => p.category !== "preparation");

  if (phases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-5 text-sm text-muted-foreground">
        ยังไม่มีเฟสงาน — เข้าสู่ระบบแล้วไปที่ “ตั้งค่าโครงการ” เพื่อเพิ่มรายการ
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CategorySection
        title={prepHeading}
        subtitle={prepSubtitle}
        icon={<ClipboardList className="size-4" />}
        accent="text-sky-700 dark:text-sky-300"
        phases={prep}
        eventsByPhase={eventsByPhase}
        risksByPhase={risksByPhase}
        editable={editable}
      />
      <CategorySection
        title={consHeading}
        subtitle={consSubtitle}
        icon={<HardHat className="size-4" />}
        accent="text-amber-700 dark:text-amber-300"
        phases={cons}
        eventsByPhase={eventsByPhase}
        risksByPhase={risksByPhase}
        editable={editable}
        showWeight
      />
    </div>
  );
}


function CategorySection({
  title,
  subtitle,
  icon,
  accent,
  phases,
  eventsByPhase,
  risksByPhase,
  editable,
  showWeight,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  phases: Phase[];
  eventsByPhase: Map<string, CalEvent[]>;
  risksByPhase: Map<string, Risk[]>;
  editable: boolean;
  showWeight?: boolean;
}) {
  if (phases.length === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 ${accent}`}>
          {icon}
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide">{title}</h3>
        </span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="space-y-2">
        {phases.map((p) => (
          <PhaseRow
            key={p.id}
            phase={p}
            events={eventsByPhase.get(p.id) ?? []}
            risks={risksByPhase.get(p.id) ?? []}
            editable={editable}
            showWeight={showWeight}
          />
        ))}
      </div>
    </div>
  );
}

const SEV_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };
const SEV_DOT: Record<string, string> = {
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

function PhaseRow({
  phase: p,
  events,
  risks,
  editable,
  showWeight,
}: {
  phase: Phase;
  events: CalEvent[];
  risks: Risk[];
  editable: boolean;
  showWeight?: boolean;
}) {
  const qc = useQueryClient();
  const update = useServerFn(updatePhaseProgress);
  const [val, setVal] = useState<string>("");
  const [riskOpen, setRiskOpen] = useState(false);

  const range = useMemo(() => {
    if (events.length === 0) return null;
    const starts = events.map((e) => e.start_date).sort();
    const ends = events.map((e) => e.end_date).sort();
    return { start: starts[0], end: ends[ends.length - 1], count: events.length };
  }, [events]);

  const openRisks = risks.filter((r) => r.status !== "closed");
  const maxSev = openRisks.reduce((m, r) => (SEV_RANK[r.severity] > SEV_RANK[m] ? r.severity : m), "low" as Risk["severity"]);

  // Status vs plan
  const planPct = useMemo(() => planPctForPhaseNow(p.id, events.map((e) => ({ ...e, phase_id: p.id }))), [p.id, events]);
  let statusDot: string | null = null;
  let statusLabel = "";
  if (planPct != null) {
    const diff = Number(p.progress) - planPct;
    if (diff >= 0) { statusDot = "bg-emerald-500"; statusLabel = "ตามแผน"; }
    else if (diff >= -10) { statusDot = "bg-amber-500"; statusLabel = "เริ่มช้า"; }
    else { statusDot = "bg-red-500"; statusLabel = "ล่าช้า"; }
  }

  async function save() {
    const v = Number(val);
    if (isNaN(v) || v < 0 || v > 100) {
      toast.error("กรอกเลข 0–100");
      return;
    }
    const result = await update({ data: { id: p.id, progress: v } });
    if (!result.ok) {
      toast.error("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
      return;
    }
    toast.success("บันทึกความคืบหน้าแล้ว");
    setVal("");
    qc.invalidateQueries({ queryKey: ["project-data"] });
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {p.code && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/70">
                {p.code}
              </span>
            )}
            {statusDot && (
              <span title={statusLabel} className={`inline-block size-2 rounded-full ${statusDot}`} />
            )}
            <span className="text-sm font-medium leading-tight">{p.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {p.duration_label && (
              <span className="rounded-full border px-1.5 py-0.5">{p.duration_label}</span>
            )}
            {showWeight && p.weight != null && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                {Number(p.weight).toFixed(2)}%
              </span>
            )}
            {range ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-1.5 py-0.5 font-medium text-brand">
                <CalendarDays className="size-3" />
                {formatThaiDate(range.start, { short: true })}
                {range.end !== range.start && <> – {formatThaiDate(range.end, { short: true })}</>}
                <span className="text-muted-foreground">· {range.count} กิจกรรม</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-1.5 py-0.5 text-muted-foreground/70">
                <CalendarDays className="size-3" />
                ยังไม่มีในปฏิทิน
              </span>
            )}
            <button
              type="button"
              onClick={() => setRiskOpen(true)}
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-medium transition hover:opacity-80 ${
                openRisks.length > 0 ? SEV_DOT[maxSev] : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
              }`}
            >
              <AlertTriangle className="size-3" />
              {openRisks.length > 0 ? `${openRisks.length} เสี่ยง` : "ความเสี่ยง"}
            </button>
          </div>
        </div>
        <div className="text-right font-display tabular-nums text-sm font-semibold">
          {Number(p.progress).toFixed(0)}%
        </div>
      </div>
      <Progress value={Number(p.progress)} className="mt-2 h-1.5" />
      {editable && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="ตั้ง %"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="h-8 w-24"
          />
          <Button size="sm" variant="secondary" onClick={save} disabled={val === ""}>
            บันทึก
          </Button>
        </div>
      )}
      <RiskDialog
        open={riskOpen}
        onOpenChange={setRiskOpen}
        phaseId={p.id}
        phaseName={p.name}
        risks={risks}
        editable={editable}
      />
    </div>
  );
}
