import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ProgressDonut } from "@/components/progress-donut";
import { PhaseList } from "@/components/phase-list";
import { CalendarGrid, type CalEvent } from "@/components/calendar-grid";
import { EventDialog } from "@/components/event-dialog";
import { UpdatesList, UpdateComposer } from "@/components/updates";
import { TeamResources } from "@/components/team-resources";
import { CategoryProgress } from "@/components/category-progress";
import { SCurve } from "@/components/s-curve";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { projectQuery, type ProjectSettings, type ResourceLink } from "@/lib/project-query";
import { formatThaiDate, toBE } from "@/lib/thai-date";
import { Building2, CalendarDays, ImagePlus, PencilLine, Settings2, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import buildingHero from "@/assets/building-hero.png.asset.json";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80";

export const Route = createFileRoute("/projects/$projectId")({
  loader: async ({ context, params }) => {
    const query = projectQuery(params.projectId);
    await context.queryClient.ensureQueryData(query);
    return { query };
  },
  head: () => ({
    meta: [
      { title: "รายละเอียดโครงการก่อสร้าง" },
      { name: "description", content: "ติดตามความคืบหน้าและปฏิทินงานก่อสร้าง" },
      { property: "og:title", content: "รายละเอียดโครงการก่อสร้าง" },
      { property: "og:description", content: "ติดตามความคืบหน้าและปฏิทินการก่อสร้างแบบ Real-time" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { query } = Route.useLoaderData();
  const { data } = useSuspenseQuery(query);
  const { data: auth } = useAuthStatus();
  const params = Route.useParams();
  const editable = !!auth?.unlocked;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEvent, setDialogEvent] = useState<CalEvent | null>(null);
  const [dialogDate, setDialogDate] = useState<Date | null>(null);
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  const settings = data.settings as ProjectSettings | null;
  const resources = (data.resources ?? []) as ResourceLink[];
  const totalProgress = Number(settings?.total_progress ?? 0);
  const startBE = settings ? toBE(new Date(settings.start_date).getFullYear()) : "";
  const endBE = settings ? toBE(new Date(settings.end_date).getFullYear()) : "";
  const heroUrl = settings?.hero_url ?? FALLBACK_HERO;

  const headings = {
    prepHeading: settings?.prep_heading ?? "ขั้นเตรียมการ",
    prepSubtitle: settings?.prep_subtitle ?? "",
    consHeading: settings?.cons_heading ?? "การก่อสร้าง",
    consSubtitle: settings?.cons_subtitle ?? "",
  };

  const calendarStart = settings?.calendar_start_month
    ? new Date(settings.calendar_start_month + "T00:00:00")
    : undefined;

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border bg-card shadow-lg">
          <div className="relative">
            {heroUrl ? (
              <img
                src={heroUrl}
                alt={settings?.title ?? "ภาพจำลองอาคารโครงการ"}
                className="h-[280px] w-full object-cover sm:h-[420px] md:h-[520px]"
              />
            ) : (
              <div className="grid h-[280px] w-full place-items-center bg-gradient-to-br from-brand/25 via-brand/10 to-background sm:h-[420px] md:h-[520px]">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="size-10" />
                  <p className="text-sm">ยังไม่มีรูปนำโครงการ</p>
                  {editable && (
                    <Link to="/settings" search={{ projectId: params.projectId }}>
                      <Button size="sm" variant="secondary">อัปโหลดรูปโครงการ</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
            {heroUrl && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />}
            <div className="absolute right-4 top-4 flex flex-wrap justify-end gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md">
                <Sparkles className="size-3.5" /> {startBE ? `งบประมาณ ${startBE}–${endBE}` : "กำหนดช่วงเวลาโครงการ"}
              </span>
              {editable && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/90 px-3 py-1 text-xs font-semibold text-brand-foreground backdrop-blur-md">
                  <PencilLine className="size-3.5" /> โหมดแก้ไข
                </span>
              )}
            </div>
            {heroUrl && (
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-10">
                <h1 className="max-w-3xl font-display text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
                  {settings?.title ?? "ยังไม่ได้ตั้งชื่อโครงการ"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                  {settings?.subtitle ?? ""}
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-6 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              {!heroUrl && (
                <h1 className="mb-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {settings?.title ?? "ยังไม่ได้ตั้งชื่อโครงการ"}
                </h1>
              )}
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {settings?.intro_text ?? "เผยแพร่แผนงาน ปฏิทิน และรายงานความคืบหน้าให้ทีมงานและประชาชนติดตามได้"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {startBE && <StatChip icon={<CalendarDays className="size-4" />} label={`${startBE} — ${endBE}`} />}
                {settings?.subtitle && <StatChip icon={<Building2 className="size-4" />} label={settings.subtitle} />}
                <StatChip icon={<Users className="size-4" />} label="ทีมงานอัปเดตร่วมกัน" />
              </div>
              {editable ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-medium text-primary">
                    เข้าสู่ระบบแล้ว — แตะวันที่ในปฏิทินเพื่อเพิ่มรายการ และแก้ไข % ความคืบหน้าได้ทันที
                  </div>
                  <Link to="/settings" search={{ projectId: params.projectId }}>
                    <Button variant="outline">
                      <Settings2 className="mr-1.5 size-4" /> ตั้งค่าโครงการ
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-5">
                  <Link to="/login">
                    <Button className="bg-brand text-brand-foreground hover:bg-brand/90">เข้าสู่ระบบทีมงานเพื่อแก้ไข</Button>
                  </Link>
                </div>
              )}
            </div>
            <div className="justify-self-center md:justify-self-end">
              <ProgressDonut value={totalProgress} size={220} />
            </div>
          </div>
        </section>

        {editable && (
          <div className="mt-6">
            <TeamResources links={resources} />
          </div>
        )}

        <div className="mt-8">
          <CategoryProgress phases={data.phases as any} {...headings} />
        </div>

        <div className="mt-6">
          <SCurve
            phases={data.phases as any}
            events={data.events as any}
            updates={data.updates as any}
            overallCurrent={totalProgress}
          />
        </div>

        {/* Content grid */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <CalendarGrid
              events={data.events as CalEvent[]}
              editable={editable}
              initialMonth={calendarStart}
              onDayClick={(d) => {
                setDialogEvent(null);
                setDialogDate(d);
                setDialogOpen(true);
              }}
              onEventClick={(ev) => {
                setDialogEvent(ev);
                setDialogDate(null);
                setDialogOpen(true);
              }}
            />

            <div className="space-y-6">
              <div className="flex items-baseline justify-between border-b pb-3">
                <h2 className="font-display text-xl font-bold text-neutral-900">รายงานอัปเดตความคืบหน้า</h2>
                {data.updates.length > 3 && (
                  <button 
                    onClick={() => setShowAllUpdates(!showAllUpdates)} 
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {showAllUpdates ? "← ย่อรายการ" : `ดูทั้งหมด (${data.updates.length}) →`}
                  </button>
                )}
              </div>

              {editable && (
                <div className="bg-white p-1 rounded-2xl border border-neutral-100 shadow-sm">
                  <UpdateComposer phases={data.phases} />
                </div>
              )}

              {data.updates.length === 0 ? (
                !editable ? (
                  <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีรายงานความคืบหน้าก่อสร้างสำหรับโครงการนี้
                  </div>
                ) : null
              ) : (
                <UpdatesList 
                  updates={showAllUpdates ? data.updates : data.updates.slice(0, 3)} 
                  phases={data.phases} 
                  editable={editable} 
                />
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div>
              <h2 className="mb-3 font-display text-xl font-semibold">ความคืบหน้ารายเฟส</h2>
              <PhaseList
                phases={data.phases}
                events={data.events as any}
                risks={(data as any).risks ?? []}
                editable={editable}
                {...headings}
              />
            </div>
          </aside>
        </section>

        <footer className="mt-16 border-t pt-8 text-center text-xs text-muted-foreground">
          <div>
            {settings?.org_name ?? ""} · ปรับปรุงล่าสุด {settings?.updated_at ? formatThaiDate(settings.updated_at) : "-"}
          </div>
        </footer>
      </main>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={dialogEvent}
        defaultDate={dialogDate}
        phases={data.phases}
      />
    </div>
  );
}

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs text-foreground/80">
      {icon}{label}
    </span>
  );
}
