import { test } from "node:test";
import assert from "node:assert/strict";
import { PREP_STEPS, addDays, bangkokToday, buildPrepPhases } from "../src/lib/schedule.ts";

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // leap year
  assert.equal(addDays("2026-11-06", 0), "2026-11-06");
});

test("bangkokToday uses Thai time, not the server's", () => {
  // 18:00 UTC on 6 Nov is already 01:00 on 7 Nov in Bangkok
  assert.equal(bangkokToday(new Date("2026-11-06T18:00:00Z")), "2026-11-07");
  assert.equal(bangkokToday(new Date("2026-11-06T10:00:00Z")), "2026-11-06");
});

test("preparation phases start on the given day and run back to back", () => {
  const phases = buildPrepPhases("2026-11-06");
  assert.equal(phases.length, PREP_STEPS.length);
  assert.equal(phases[0].start_date, "2026-11-06");
  for (let i = 1; i < phases.length; i++) {
    assert.equal(
      phases[i].start_date,
      addDays(phases[i - 1].end_date, 1),
      `gap before ${phases[i].code}`,
    );
  }
  const totalDays = PREP_STEPS.reduce((s, [, , d]) => s + d, 0);
  assert.equal(phases.at(-1)!.end_date, addDays("2026-11-06", totalDays - 1));
});

test("each phase lasts its stated duration", () => {
  for (const p of buildPrepPhases("2027-01-15")) {
    const days =
      (Date.parse(`${p.end_date}T00:00:00Z`) - Date.parse(`${p.start_date}T00:00:00Z`)) /
        86_400_000 +
      1;
    assert.equal(`${days} วัน`, p.duration_label, p.code);
  }
});
