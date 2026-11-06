// Province report helpers. No imports, so they can be unit tested directly with Node.

export type ReportProject = {
  id: string;
  title: string;
  unit_name?: string | null;
  district?: string | null;
  budget_baht?: number | null;
  budget_source?: string | null;
  total_progress?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  updated_at?: string | null;
};

export type ProjectStatus = "preparing" | "building" | "done";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  preparing: "เตรียมการ",
  building: "กำลังดำเนินการ",
  done: "แล้วเสร็จ",
};

// Same buckets as the home page charts: 0% = preparing, 100% = done
export function projectStatus(progress: number | null | undefined): ProjectStatus {
  const p = Number(progress ?? 0);
  if (p >= 100) return "done";
  if (p <= 0) return "preparing";
  return "building";
}

export function summarize(projects: ReportProject[]) {
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget_baht ?? 0), 0);
  const avgProgress = projects.length
    ? projects.reduce((s, p) => s + Number(p.total_progress ?? 0), 0) / projects.length
    : 0;
  // Progress weighted by budget: large projects count for more
  const budgeted = projects.filter((p) => Number(p.budget_baht ?? 0) > 0);
  const budgetSum = budgeted.reduce((s, p) => s + Number(p.budget_baht), 0);
  const weightedProgress =
    budgetSum > 0
      ? budgeted.reduce((s, p) => s + Number(p.total_progress ?? 0) * Number(p.budget_baht), 0) /
        budgetSum
      : null;
  const byStatus: Record<ProjectStatus, number> = { preparing: 0, building: 0, done: 0 };
  for (const p of projects) byStatus[projectStatus(p.total_progress)]++;
  return { count: projects.length, totalBudget, avgProgress, weightedProgress, byStatus };
}

// Sort by district, then unit, then project title (Thai collation)
export function sortForReport<T extends ReportProject>(projects: T[]): T[] {
  const c = new Intl.Collator("th");
  return [...projects].sort(
    (a, b) =>
      c.compare(a.district ?? "", b.district ?? "") ||
      c.compare(a.unit_name ?? "", b.unit_name ?? "") ||
      c.compare(a.title, b.title),
  );
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Stop spreadsheet apps from treating text as a formula (CSV injection)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const CSV_HEADERS = [
  "ลำดับ",
  "อำเภอ",
  "หน่วยบริการ",
  "ชื่อโครงการ",
  "งบประมาณ (บาท)",
  "แหล่งงบประมาณ",
  "ความคืบหน้า (%)",
  "สถานะ",
  "วันเริ่ม",
  "วันสิ้นสุด",
  "ปรับปรุงล่าสุด",
];

// CSV with a UTF-8 BOM so Excel shows Thai correctly when the file is opened directly
export function toCsv(projects: ReportProject[]): string {
  const rows = sortForReport(projects).map((p, i) => [
    i + 1,
    p.district ?? "",
    p.unit_name ?? "",
    p.title,
    p.budget_baht ?? "",
    p.budget_source ?? "",
    Math.round(Number(p.total_progress ?? 0) * 10) / 10,
    STATUS_LABEL[projectStatus(p.total_progress)],
    p.start_date ?? "",
    p.end_date ?? "",
    p.updated_at ? p.updated_at.slice(0, 10) : "",
  ]);
  const lines = [CSV_HEADERS, ...rows].map((r) => r.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
