// Turn the `reason` a gated server function returns into a message the user can act on.
export function mutationErrorMessage(reason?: string): string {
  switch (reason) {
    case "unauthenticated":
      return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";
    case "forbidden":
      return "คุณไม่มีสิทธิ์แก้ไขข้อมูลของโครงการ/หน่วยบริการนี้";
    case "invalid":
      return "ข้อมูลไม่ครบถ้วน กรุณาลองใหม่";
    default:
      return "บันทึกไม่สำเร็จ กรุณาลองใหม่";
  }
}
