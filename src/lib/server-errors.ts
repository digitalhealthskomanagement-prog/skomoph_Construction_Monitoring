// Database and auth-admin errors carry table, column and constraint names. Log the
// real error on the server and give the browser a short message the user can act on.
export function dbError(err: unknown, context = "database"): Error {
  console.error(`[${context}]`, err);
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case "23503":
      return new Error(
        "ข้อมูลที่อ้างถึงไม่มีอยู่ในระบบ (อาจถูกลบไปแล้ว) กรุณารีเฟรชหน้าแล้วลองใหม่",
      );
    case "23505":
      return new Error("มีข้อมูลนี้อยู่ในระบบแล้ว");
    case "23502":
    case "23514":
    case "22P02":
    case "22007":
    case "22008":
      return new Error("ข้อมูลบางช่องไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่");
    default:
      return new Error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
}
