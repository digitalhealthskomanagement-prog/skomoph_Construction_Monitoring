import { ClipboardList, HardHat, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Phase = {
  id: string;
  progress: number;
  category?: string | null;
  weight?: number | null;
};

export function CategoryProgress({
  phases,
  prepHeading = "ขั้นเตรียมการ",
  prepSubtitle = "",
  consHeading = "การก่อสร้าง",
  consSubtitle = "",
}: {
  phases: Phase[];
  prepHeading?: string;
  prepSubtitle?: string;
  consHeading?: string;
  consSubtitle?: string;
}) {
  const prep = phases.filter((p) => p.category === "preparation");
  const cons = phases.filter((p) => p.category !== "preparation");

  const prepAvg = prep.length
    ? prep.reduce((s, p) => s + Number(p.progress ?? 0), 0) / prep.length
    : 0;
  const prepDone = prep.filter((p) => Number(p.progress) >= 100).length;

  const consWeight = cons.reduce((s, p) => s + Number(p.weight ?? 0), 0);
  const consAvg = consWeight > 0
    ? cons.reduce((s, p) => s + Number(p.progress ?? 0) * Number(p.weight ?? 0), 0) / consWeight
    : 0;
  const consDone = cons.filter((p) => Number(p.progress) >= 100).length;

  if (phases.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        ยังไม่มีเฟสงาน — ไปที่หน้า “ตั้งค่าโครงการ” เพื่อเพิ่มขั้นเตรียมการและงวดงานก่อสร้าง
      </section>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Card
        title={prepHeading}
        subtitle={prepSubtitle}
        icon={<ClipboardList className="size-5" />}
        percent={prepAvg}
        done={prepDone}
        total={prep.length}
        tone="sky"
      />
      <Card
        title={consHeading}
        subtitle={consSubtitle}
        icon={<HardHat className="size-5" />}
        percent={consAvg}
        done={consDone}
        total={cons.length}
        tone="amber"
        weighted
      />
    </section>
  );
}


function Card({
  title,
  subtitle,
  icon,
  percent,
  done,
  total,
  tone,
  weighted,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  percent: number;
  done: number;
  total: number;
  tone: "sky" | "amber";
  weighted?: boolean;
}) {
  const toneClasses =
    tone === "sky"
      ? "from-sky-500/10 to-sky-500/0 text-sky-700 dark:text-sky-300 ring-sky-500/20"
      : "from-amber-500/15 to-amber-500/0 text-amber-800 dark:text-amber-300 ring-amber-500/20";
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${toneClasses} p-5 ring-1 shadow-sm`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background/80 shadow-sm">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="truncate font-display text-base font-semibold text-foreground">{title}</div>
              <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold tabular-nums text-foreground">
            {percent.toFixed(1)}
            <span className="text-lg text-muted-foreground">%</span>
          </div>
          {weighted && <div className="text-[10px] text-muted-foreground">ถ่วงน้ำหนักตามสัดส่วนเงิน</div>}
        </div>
      </div>
      <Progress value={percent} className="mt-4 h-2" />
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5" />
        เสร็จแล้ว {done} / {total} รายการ
      </div>
    </div>
  );
}
