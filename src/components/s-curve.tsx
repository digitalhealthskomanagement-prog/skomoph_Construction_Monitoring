import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { buildSCurve, type Phase, type CalEvent, type UpdateSnap } from "@/lib/s-curve";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toBE } from "@/lib/thai-date";

const THAI_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function SCurve({
  phases,
  events,
  updates,
  overallCurrent,
}: {
  phases: Phase[];
  events: CalEvent[];
  updates: UpdateSnap[];
  overallCurrent: number;
}) {
  const { points, today } = useMemo(
    () => buildSCurve(phases, events, updates, overallCurrent),
    [phases, events, updates, overallCurrent],
  );

  const nowTs = Date.now();

  const deltaColor =
    today.delta >= 0
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : today.delta >= -10
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  const DeltaIcon = today.delta > 0.5 ? TrendingUp : today.delta < -0.5 ? TrendingDown : Minus;

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        ยังไม่มีข้อมูลปฏิทินสำหรับสร้างเส้นแผน (S-Curve)
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold sm:text-xl">S-Curve · แผน vs ผลจริง (รายสัปดาห์)</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            คำนวณจากปฏิทินและน้ำหนักงวดงาน (เตรียมการ 50% · ก่อสร้าง 50%)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/40 px-2 py-1">
            แผน <b className="font-display tabular-nums">{today.plan.toFixed(1)}%</b>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2 py-1 text-brand">
            จริง <b className="font-display tabular-nums">{today.actual.toFixed(1)}%</b>
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium ${deltaColor}`}>
            <DeltaIcon className="size-3.5" />
            {today.delta >= 0 ? "+" : ""}
            {today.delta.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="weekTs"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickFormatter={(v: number) => {
                const d = new Date(v);
                return `${THAI_MON[d.getUTCMonth()]} ${String(toBE(d.getUTCFullYear())).slice(-2)}`;
              }}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              minTickGap={40}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={44}
            />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v: number) => {
                const d = new Date(v);
                return `สัปดาห์ ${d.getUTCDate()} ${THAI_MON[d.getUTCMonth()]} ${toBE(d.getUTCFullYear())}`;
              }}
              formatter={(val: any, name: string) => [val == null ? "—" : `${Number(val).toFixed(1)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={nowTs} stroke="hsl(var(--brand))" strokeDasharray="4 4" label={{ value: "วันนี้", position: "top", fill: "hsl(var(--brand))", fontSize: 11 }} />
            <Line type="monotone" dataKey="plan" name="แผน" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="actual" name="ผลจริง" stroke="hsl(var(--brand))" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
