import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THAI_MONTHS, THAI_DAYS, toBE, ymd, parseYmd, sameDay } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

export type CalEvent = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  type: string;
  phase_id: string | null;
  note: string | null;
};

const TYPE_STYLE: Record<string, string> = {
  milestone: "bg-gold/20 text-amber-900 border-gold/40",
  task: "bg-brand-soft text-primary border-brand/30",
  meeting: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  inspection: "bg-chart-4/15 text-chart-4 border-chart-4/30",
};

export function CalendarGrid({
  events,
  editable,
  onDayClick,
  onEventClick,
  initialMonth,
}: {
  events: CalEvent[];
  editable: boolean;
  onDayClick?: (date: Date) => void;
  onEventClick?: (ev: CalEvent) => void;
  initialMonth?: Date;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(initialMonth ?? new Date(today.getFullYear(), today.getMonth(), 1));

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  function eventsForDay(day: Date) {
    return events.filter((e) => {
      const s = parseYmd(e.start_date);
      const en = parseYmd(e.end_date);
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
      return t >= new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime()
        && t <= new Date(en.getFullYear(), en.getMonth(), en.getDate()).getTime();
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-xl font-semibold sm:text-2xl">
            {THAI_MONTHS[cursor.getMonth()]} {toBE(cursor.getFullYear())}
          </div>
          <div className="text-xs text-muted-foreground">ปฏิทินก่อสร้าง</div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
            วันนี้
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
        {THAI_DAYS.map((d, i) => (
          <div key={d} className={cn("bg-muted/60 py-2 text-center text-xs font-medium text-muted-foreground", (i === 0 || i === 6) && "text-brand")}>{d}</div>
        ))}
        {grid.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[92px] bg-background/60" />;
          const evs = eventsForDay(day);
          const isToday = sameDay(day, today);
          return (
            <button
              key={i}
              type="button"
              onClick={() => editable && onDayClick?.(day)}
              className={cn(
                "group relative min-h-[92px] bg-card p-1.5 text-left transition-colors",
                editable && "cursor-pointer hover:bg-brand-soft/40",
              )}
            >
              <div className={cn(
                "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                isToday ? "bg-brand text-brand-foreground" : "text-muted-foreground",
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {evs.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onEventClick?.(e); }}
                    className={cn(
                      "truncate rounded border px-1.5 py-0.5 text-[11px] leading-tight",
                      TYPE_STYLE[e.type] ?? TYPE_STYLE.task,
                      editable && "cursor-pointer",
                    )}
                    title={e.title}
                  >
                    {e.title}
                  </div>
                ))}
                {evs.length > 3 && (
                  <div className="pl-1 text-[10px] text-muted-foreground">+{evs.length - 3} รายการ</div>
                )}
              </div>
              {editable && evs.length === 0 && (
                <Plus className="absolute right-1.5 top-1.5 size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-gold/60" />เหตุการณ์สำคัญ</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand/60" />งาน</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-5/60" />ประชุม</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-4/60" />ตรวจงาน</span>
      </div>
    </div>
  );
}

export { ymd };
