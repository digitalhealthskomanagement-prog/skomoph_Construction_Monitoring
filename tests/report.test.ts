import { test } from "node:test";
import assert from "node:assert/strict";
import {
  projectStatus,
  sortForReport,
  summarize,
  toCsv,
  type ReportProject,
} from "../src/lib/report.ts";

const p = (over: Partial<ReportProject>): ReportProject => ({ id: "x", title: "โครงการ", ...over });

test("status buckets match the home page", () => {
  assert.equal(projectStatus(0), "preparing");
  assert.equal(projectStatus(null), "preparing");
  assert.equal(projectStatus(0.1), "building");
  assert.equal(projectStatus(99.9), "building");
  assert.equal(projectStatus(100), "done");
});

test("summary totals, plain and budget-weighted progress", () => {
  const s = summarize([
    p({ budget_baht: 1_000_000, total_progress: 100 }),
    p({ budget_baht: 3_000_000, total_progress: 0 }),
    p({ budget_baht: null, total_progress: 50 }),
  ]);
  assert.equal(s.count, 3);
  assert.equal(s.totalBudget, 4_000_000);
  assert.equal(s.avgProgress, 50);
  assert.equal(s.weightedProgress, 25); // (100*1M + 0*3M) / 4M
  assert.deepEqual(s.byStatus, { preparing: 1, building: 1, done: 1 });
  assert.equal(summarize([]).weightedProgress, null);
});

test("report rows sort by district, then unit, then title", () => {
  const sorted = sortForReport([
    p({ id: "3", district: "เมืองสระแก้ว", unit_name: "รพ.ข", title: "ก" }),
    p({ id: "1", district: "คลองหาด", unit_name: "รพ.ก", title: "ข" }),
    p({ id: "2", district: "เมืองสระแก้ว", unit_name: "รพ.ก", title: "ก" }),
  ]);
  assert.deepEqual(
    sorted.map((r) => r.id),
    ["1", "2", "3"],
  );
});

test("CSV starts with a BOM and has a header row", () => {
  const csv = toCsv([
    p({
      district: "คลองหาด",
      unit_name: "รพ.คลองหาด",
      budget_baht: 1500000,
      total_progress: 33.333,
    }),
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("ลำดับ,อำเภอ,หน่วยบริการ,ชื่อโครงการ"));
  assert.ok(lines[1].includes(",1500000,"));
  assert.ok(lines[1].includes(",33.3,"));
});

test("CSV quotes commas, quotes and newlines, and neutralises formulas", () => {
  const csv = toCsv([
    p({ title: 'อาคาร "A", ชั้น 2\nส่วนต่อเติม', unit_name: '=HYPERLINK("http://x")' }),
  ]);
  assert.ok(csv.includes('"อาคาร ""A"", ชั้น 2\nส่วนต่อเติม"'));
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`));
});
