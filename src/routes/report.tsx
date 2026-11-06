import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allProjectsQuery } from "@/lib/project-query";
import { formatThaiDate } from "@/lib/thai-date";
import {
  STATUS_LABEL,
  projectStatus,
  sortForReport,
  summarize,
  toCsv,
  type ProjectStatus,
} from "@/lib/report";

export const Route = createFileRoute("/report")({
  loader: ({ context }) => context.queryClient.ensureQueryData(allProjectsQuery),
  head: () => ({
    meta: [
      { title: "รายงานสรุปโครงการก่อสร้าง — สสจ.สระแก้ว" },
      {
        name: "description",
        content: "รายงานสรุปความคืบหน้าโครงการก่อสร้างทั้งจังหวัด พิมพ์หรือดาวน์โหลดเป็น Excel ได้",
      },
    ],
  }),
  component: ReportPage,
});

const ALL = "__all";
const baht = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function ReportPage() {
  const { data: allProjects = [] } = useSuspenseQuery(allProjectsQuery);
  const [district, setDistrict] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [status, setStatus] = useState<ProjectStatus | typeof ALL>(ALL);

  const active = useMemo(() => allProjects.filter((p) => p.is_active), [allProjects]);
  const districts = useMemo(
    () =>
      [...new Set(active.map((p) => p.district).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "th"),
      ),
    [active],
  );
  const sources = useMemo(
    () => [...new Set(active.map((p) => p.budget_source).filter(Boolean) as string[])],
    [active],
  );

  const rows = useMemo(
    () =>
      sortForReport(
        active.filter(
          (p) =>
            (district === ALL || p.district === district) &&
            (source === ALL || p.budget_source === source) &&
            (status === ALL || projectStatus(p.total_progress) === status),
        ),
      ),
    [active, district, source, status],
  );
  const sum = summarize(rows);
  const today = formatThaiDate(new Date());
  const filterText = [
    district !== ALL && `อำเภอ${district}`,
    source !== ALL && source,
    status !== ALL && STATUS_LABEL[status],
  ]
    .filter(Boolean)
    .join(" · ");

  function downloadCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงานโครงการก่อสร้าง-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 print:max-w-none print:p-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              รายงานสรุปโครงการก่อสร้าง
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              สำนักงานสาธารณสุขจังหวัดสระแก้ว · ข้อมูล ณ วันที่ {today}
              {filterText && ` · ${filterText}`}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
              <FileSpreadsheet className="mr-1.5 size-4" /> ดาวน์โหลด Excel
            </Button>
            <Button
              onClick={() => window.print()}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Printer className="mr-1.5 size-4" /> พิมพ์ / PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 print:hidden">
          <FilterSelect
            label="อำเภอ"
            value={district}
            onChange={setDistrict}
            allLabel="ทุกอำเภอ"
            options={districts.map((d) => [d, d])}
          />
          <FilterSelect
            label="แหล่งงบประมาณ"
            value={source}
            onChange={setSource}
            allLabel="ทุกแหล่งงบ"
            options={sources.map((s) => [s, s])}
          />
          <FilterSelect
            label="สถานะ"
            value={status}
            onChange={(v) => setStatus(v as ProjectStatus | typeof ALL)}
            allLabel="ทุกสถานะ"
            options={(Object.keys(STATUS_LABEL) as ProjectStatus[]).map((k) => [
              k,
              STATUS_LABEL[k],
            ])}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
          <Stat label="จำนวนโครงการ" value={`${sum.count} โครงการ`} />
          <Stat label="งบประมาณรวม" value={`${baht.format(sum.totalBudget)} บาท`} />
          <Stat
            label="ความคืบหน้าเฉลี่ย"
            value={`${sum.avgProgress.toFixed(1)}%`}
            hint={
              sum.weightedProgress != null
                ? `ถ่วงตามงบประมาณ ${sum.weightedProgress.toFixed(1)}%`
                : undefined
            }
          />
          <Stat
            label="สถานะ"
            value={`${sum.byStatus.done} เสร็จ`}
            hint={`ดำเนินการ ${sum.byStatus.building} · เตรียมการ ${sum.byStatus.preparing}`}
          />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            ไม่มีโครงการที่ตรงกับเงื่อนไข
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border print:overflow-visible print:rounded-none print:border-0">
            <table className="w-full min-w-[760px] border-collapse text-sm print:min-w-0 print:text-[10pt]">
              <thead className="bg-muted/60 text-left print:bg-transparent">
                <tr className="[&>th]:border-b [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                  <th className="w-10 text-right">#</th>
                  <th>อำเภอ</th>
                  <th>หน่วยบริการ</th>
                  <th>โครงการ</th>
                  <th className="text-right">งบประมาณ (บาท)</th>
                  <th>แหล่งงบ</th>
                  <th className="text-right">ความคืบหน้า</th>
                  <th>สถานะ</th>
                  <th>ปรับปรุงล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr
                    key={p.id}
                    className="break-inside-avoid [&>td]:border-b [&>td]:px-3 [&>td]:py-2 [&>td]:align-top print:[&>td]:px-2 print:[&>td]:py-1"
                  >
                    <td className="text-right tabular-nums text-muted-foreground">{i + 1}</td>
                    <td>{p.district ?? "-"}</td>
                    <td>{p.unit_name ?? "-"}</td>
                    <td>
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="hover:text-primary hover:underline print:no-underline"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">
                      {p.budget_baht ? baht.format(p.budget_baht) : "-"}
                    </td>
                    <td>{p.budget_source ?? "-"}</td>
                    <td className="text-right tabular-nums">
                      {Number(p.total_progress ?? 0).toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap">
                      {STATUS_LABEL[projectStatus(p.total_progress)]}
                    </td>
                    <td className="whitespace-nowrap">
                      {p.updated_at ? formatThaiDate(p.updated_at, { short: true }) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="hidden text-xs text-muted-foreground print:block">
          พิมพ์จากระบบติดตามความคืบหน้างานก่อสร้าง สสจ.สระแก้ว เมื่อ {today}
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 print:p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: [string, string][];
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
