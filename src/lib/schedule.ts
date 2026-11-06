// Default schedule for a new project. No imports, so it can be unit tested with Node.

// YYYY-MM-DD for "today" in Thailand, regardless of the server's time zone
export function bangkokToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Standard e-bidding preparation steps: [code, name, duration in days]
export const PREP_STEPS: [string, string, number][] = [
  ["1.1", "เสนอแต่งตั้งคณะกรรมการกำหนดขอบเขตงาน (TOR) และราคากลาง", 5],
  ["1.2", "คณะกรรมการฯ จัดทำแบบรูปรายการและราคากลาง", 20],
  ["1.3", "เสนอรายงานผลราคากลาง และขอความเห็นชอบ", 1],
  ["1.4", "จัดทำรายงานขอซื้อขอจ้าง พร้อมแต่งตั้งคณะกรรมการพิจารณาผลฯ", 6],
  ["1.5", "เผยแพร่ร่างประกาศเพื่อรับฟังคำวิจารณ์ (7 วันทำการ)", 11],
  ["1.6", "รายงานผลรับฟังความคิดเห็น และผู้บริหารลงนามประกาศเชิญชวน", 1],
  ["1.7", "เผยแพร่ประกาศประกวดราคา e-bidding (20 วันทำการ)", 28],
  ["1.8", "ผู้เสนอราคายื่นข้อเสนอทางระบบอิเล็กทรอนิกส์", 1],
  ["1.9", "คณะกรรมการพิจารณาผลการประกวดราคาฯ", 5],
  ["1.10", "รายงานผลการพิจารณาให้ผู้มีอำนาจลงนาม", 1],
  ["1.11", "ประกาศผู้ชนะการเสนอราคา", 1],
  ["1.12", "เว้นระยะเวลาอุทธรณ์ (7 วันทำการ)", 11],
  ["1.13", "รายงานผลอุทธรณ์ / เสนอผู้บริหารเรียกทำสัญญา", 1],
  ["1.14", "ผู้รับจ้างเตรียมหลักประกัน และตรวจสอบเอกสารเพื่อลงนาม", 17],
  ["1.15", "ผู้มีอำนาจลงนามสัญญาจ้างก่อสร้าง (เริ่มต้นนับเวลาก่อสร้าง)", 1],
];

// Lay the steps out back to back starting on `startDate` (YYYY-MM-DD)
export function buildPrepPhases(startDate: string) {
  let cursor = startDate;
  return PREP_STEPS.map(([code, name, days], i) => {
    const start = cursor;
    const end = addDays(start, days - 1);
    cursor = addDays(end, 1);
    return {
      category: "preparation",
      code,
      name,
      order: 101 + i,
      color: "#0ea5e9",
      duration_label: `${days} วัน`,
      start_date: start,
      end_date: end,
      progress: 0,
    };
  });
}
