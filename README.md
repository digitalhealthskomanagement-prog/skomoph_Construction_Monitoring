# ระบบติดตามความคืบหน้างานก่อสร้าง สสจ.สระแก้ว

เว็บติดตามโครงการก่อสร้างของหน่วยบริการทั้งจังหวัดสระแก้ว: ภาพรวมจังหวัด, รายละเอียดแต่ละโครงการ
(เฟสงาน, S-Curve, ปฏิทิน, รายงานพร้อมรูป, ความเสี่ยง), รายงานสรุปพิมพ์/Excel และประวัติการแก้ไขข้อมูล

- **โค้ด:** GitHub `digitalhealthskomanagement-prog/skomoph_Construction_Monitoring` (branch `main`)
- **Hosting:** Vercel — push/merge เข้า `main` จะ deploy ขึ้น production อัตโนมัติ
- **ฐานข้อมูล / Auth / ไฟล์:** Supabase project `fkfusxleqsupnlcxrcnr` (เข้าสู่ระบบด้วย Google)
- **Stack:** TanStack Start (React 19 + server functions), Tailwind CSS 4, Supabase

รายละเอียดโครงสร้างระบบดูที่ [ARCHITECTURE.md](ARCHITECTURE.md) และกฎสำหรับผู้พัฒนา/AI ที่ [AGENTS.md](AGENTS.md)

## พัฒนาในเครื่อง

```bash
npm ci
cp .env.example .env   # ถ้ายังไม่มี แล้วใส่ค่าจาก Vercel/Supabase
npm run dev
```

ตัวแปรที่ต้องมี: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server เท่านั้น), `SESSION_SECRET` (32 ตัวอักษรขึ้นไป)

> แนะนำให้เก็บโฟลเดอร์โปรเจกต์ไว้นอกโฟลเดอร์ที่ sync กับ iCloud (เช่น Documents) เพราะทำให้ dev server ค้างได้

## ตรวจสอบก่อนส่งงาน

```bash
npm run typecheck   # TypeScript
npm test            # unit tests (Node test runner, ไฟล์ใน tests/)
npm run build
```

ทุก Pull Request จะรันทั้ง 3 ขั้นตอนนี้อัตโนมัติผ่าน GitHub Actions (`.github/workflows/ci.yml`)

## การเปลี่ยนแปลงฐานข้อมูล

เพิ่มไฟล์ SQL ใน `supabase/migrations/` แล้ว **ต้องรันเองใน Supabase SQL Editor** (Vercel ไม่รันให้)
ไฟล์ migration ทั้งหมดรันต่อกันบนฐานข้อมูลว่างได้ จึงใช้ `supabase start` ทดสอบในเครื่องด้วย Docker ได้
หลังเปลี่ยนสคีมาให้สร้าง type ใหม่:

```bash
supabase gen types typescript --local --schema public > src/integrations/supabase/types.ts
```
