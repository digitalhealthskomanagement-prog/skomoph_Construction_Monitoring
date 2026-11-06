import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyProjectAccess } from "../src/lib/access.ts";

// Tiny fake of the Supabase query builder covering what verifyProjectAccess uses:
// from(t).select(..).eq(col, v).maybeSingle()  and  from(t).select(..).in(col, values)
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      return {
        select() {
          return {
            eq(col: string, v: unknown) {
              return {
                maybeSingle: async () => ({ data: rows.find((r) => r[col] === v) ?? null }),
              };
            },
            in: async (col: string, values: unknown[]) => ({
              data: rows.filter((r) => values.includes(r[col])),
            }),
          };
        },
      };
    },
  };
}

const db = fakeDb({
  projects: [
    { id: "projA", unit_id: "unitA" },
    { id: "projB", unit_id: "unitB" },
    { id: "projNoUnit", unit_id: null },
  ],
  phases: [
    { id: "phaseA", project_id: "projA" },
    { id: "phaseB", project_id: "projB" },
  ],
  updates: [
    { id: "updA", project_id: "projA" },
    { id: "updB", project_id: "projB" },
  ],
});

const unitAdminA = { role: "unit_admin", unitIds: ["unitA"] };

test("super admin can access anything", async () => {
  assert.equal(await verifyProjectAccess({ role: "super_admin" }, db, "updates", "updB"), true);
});

test("unit admin can edit records in their own unit", async () => {
  assert.equal(await verifyProjectAccess(unitAdminA, db, "updates", "updA"), true);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null, "projA", "phaseA"), true);
  assert.equal(await verifyProjectAccess(unitAdminA, db, "projects", "projA", "projA"), true);
});

test("unit admin cannot touch another unit's records", async () => {
  assert.equal(await verifyProjectAccess(unitAdminA, db, "updates", "updB"), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null, "projB"), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, "projects", "projB", "projB"), false);
});

test("own project in the payload does not unlock another unit's record (IDOR)", async () => {
  // Editing record updB (unit B) while claiming project_id projA (unit A)
  assert.equal(await verifyProjectAccess(unitAdminA, db, "updates", "updB", "projA"), false);
  // Own record, but moving it under a phase of another unit
  assert.equal(
    await verifyProjectAccess(unitAdminA, db, "updates", "updA", "projA", "phaseB"),
    false,
  );
});

test("missing or unresolvable records are refused", async () => {
  assert.equal(await verifyProjectAccess(unitAdminA, db, "updates", "nope"), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null, null, "nope"), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null, "projDoesNotExist"), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null), false);
  assert.equal(await verifyProjectAccess(unitAdminA, db, null, null, "projNoUnit"), false);
});

test("users without a usable role are refused", async () => {
  assert.equal(
    await verifyProjectAccess({ role: "unit_admin", unitIds: [] }, db, null, null, "projA"),
    false,
  );
  assert.equal(await verifyProjectAccess({ role: null }, db, null, null, "projA"), false);
  assert.equal(
    await verifyProjectAccess({ role: "viewer", unitIds: ["unitA"] }, db, null, null, "projA"),
    false,
  );
});
