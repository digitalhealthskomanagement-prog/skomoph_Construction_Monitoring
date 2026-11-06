import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { dbError } from "../src/lib/server-errors.ts";
import { mutationErrorMessage } from "../src/lib/mutation-error.ts";

test("dbError hides database details behind a Thai message", () => {
  const log = mock.method(console, "error", () => {});
  const err = dbError({
    code: "23503",
    message: 'insert violates foreign key constraint "user_roles_unit_id_fkey"',
  });
  assert.ok(!err.message.includes("constraint"));
  assert.ok(err.message.includes("ไม่มีอยู่ในระบบ"));
  assert.equal(log.mock.callCount(), 1); // the real error is still logged on the server
  assert.ok(dbError({ code: "22007" }).message.includes("ไม่ถูกต้อง"));
  assert.ok(dbError(new Error("socket hang up")).message.includes("ลองใหม่"));
  log.mock.restore();
});

test("mutation error reasons map to distinct messages", () => {
  const msgs = ["unauthenticated", "forbidden", "invalid", undefined].map(mutationErrorMessage);
  assert.equal(new Set(msgs).size, 4);
  assert.ok(mutationErrorMessage("unauthenticated").includes("เซสชัน"));
  assert.ok(mutationErrorMessage("forbidden").includes("ไม่มีสิทธิ์"));
});
