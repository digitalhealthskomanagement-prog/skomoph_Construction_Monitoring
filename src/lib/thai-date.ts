export const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
export const THAI_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function toBE(year: number): number {
  return year + 543;
}

export function formatThaiDate(input: string | Date, opts: { withYear?: boolean; short?: boolean } = {}): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const day = d.getDate();
  const months = opts.short ? THAI_MONTHS_SHORT : THAI_MONTHS;
  const m = months[d.getMonth()];
  const y = opts.withYear === false ? "" : ` ${toBE(d.getFullYear())}`;
  return `${day} ${m}${y}`;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWithin(day: Date, startISO: string, endISO: string): boolean {
  const s = parseYmd(startISO);
  const e = parseYmd(endISO);
  const t = day.getTime();
  return t >= s.setHours(0, 0, 0, 0) && t <= e.setHours(23, 59, 59, 999);
}
