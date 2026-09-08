# สถาปัตยกรรมระบบติดตามงานก่อสร้าง สำนักงานสาธารณสุขจังหวัดสระแก้ว
(SKOMOPH Construction Monitoring Hub)

## 1. ที่มาของโครงการ (Origin & Background)
- โปรเจกต์นี้เริ่มต้นพัฒนาต่อยอดมาจาก **"San Project Hub" (ระบบติดตามโครงการก่อสร้างเดิมของโรงพยาบาลสรรคบุรี จ.ชัยนาท)** ซึ่งเดิมถูกออกแบบมาเพื่อติดตาม *โครงการก่อสร้างเดี่ยวของโรงพยาบาลเพียงแห่งเดียว* (มี S-Curve, ปฏิทินงวดงาน, Donut %, และรายงานความคืบหน้าของช่าง)
- ต่อมาได้รับการขยายสเกล (Scaled Up) ให้เป็น **"ระบบศูนย์กลางกำกับติดตามงานก่อสร้าง 127 หน่วยงานสาธารณสุขของจังหวัดสระแก้ว"** (สสจ., รพ., รพ.สต., สสอ.) เพื่อให้ สสจ.สระแก้ว สามารถเห็นภาพรวมงบประมาณและติดตามความคืบหน้าของทุกหน่วยงานในจังหวัดได้พร้อมกันในที่เดียว

---

## 2. โครงสร้างเทคโนโลยี (Tech Stack)
* **Frontend:** React 19 + TanStack Router (File-based Routing) + TanStack Query + Tailwind CSS + shadcn/ui + Recharts
* **Backend / SSR:** TanStack Start (Nitro server runtime)
* **Database & Auth:** Supabase (PostgreSQL + Supabase Auth + Supabase Storage)
* **Deployment:** Vercel (CI/CD auto-deploy via GitHub branch `main`)
* **Repository:** GitHub (`digitalhealthskomanagement-prog/skomoph_Construction_Monitoring`)

---

## 3. โครงสร้างโฟลเดอร์และการแบ่งแยกโมดูล (Directory Architecture)

โค้ดในโปรเจกต์ถูกจัดหมวดหมู่อย่างเป็นระบบ ไม่ให้โค้ดของโรงพยาบาลเดิมทับซ้อนกับโค้ดของจังหวัดสระแก้ว:

```text
src/
├── components/
│   │
│   ├── province/              🏛️ [โมดูลระบบจังหวัดสระแก้ว]
│   │   ├── province-stats.tsx # การ์ดสถิติ 3 ใบ (โครงการทั้งหมด, งบรวม, % เฉลี่ย)
│   │   ├── province-charts.tsx# กราฟสรุปอำเภอ, กราฟสถานะ, กราฟแหล่งงบประมาณ
│   │   ├── unit-card-grid.tsx # การ์ดหน่วยบริการและรายการโครงการในจังหวัด
│   │   └── index.ts           # Barrel export ของคอมโพเนนต์ระดับจังหวัด
│   │
│   ├── project/               🏥 [โมดูลระบบรายโครงการ (นำมาจาก รพ.สรรคบุรี เดิม)]
│   │   ├── s-curve.tsx        # กราฟ S-Curve ติดตามรายโครงการ
│   │   ├── phase-list.tsx     # งวดงานและขั้นตอนการก่อสร้าง
│   │   ├── calendar-grid.tsx  # ปฏิทินงานก่อสร้าง
│   │   ├── progress-donut.tsx # กราฟโดนัท % ความคืบหน้ารวม
│   │   ├── category-progress.tsx # ความคืบหน้ารายหมวด
│   │   ├── updates.tsx        # บันทึกภาพและรายงานความคืบหน้า
│   │   ├── event-dialog.tsx   # ป๊อปอัปเพิ่มงานในปฏิทิน
│   │   ├── risk-dialog.tsx    # ป๊อปอัปความเสี่ยง
│   │   ├── team-resources.tsx # แหล่งข้อมูลและลิงก์ของทีมงาน
│   │   └── index.ts           # Barrel export ของคอมโพเนนต์รายโครงการ
│   │
│   ├── site-header.tsx        🧩 [ส่วนกลาง] แถบเมนูด้านบนของระบบ
│   └── ui/                    🎨 [UI Library] shadcn/ui primitives (Button, Dialog, Card ฯลฯ)
│
├── routes/                    🧭 [เส้นทางหน้าจอผู้ใช้งาน (TanStack Router)]
│   ├── index.tsx              # หน้าแรก: Dashboard ภาพรวมจังหวัดสระแก้ว
│   ├── projects/$projectId.tsx# หน้ารายละเอียดโครงการ (เรียกใช้ src/components/project/)
│   ├── settings.tsx           # หน้าจัดการหน่วยงานและโครงการ (SuperAdmin & UnitAdmin)
│   ├── login.tsx              # หน้าเข้าสู่ระบบ
│   ├── register.tsx           # หน้าลงทะเบียนผู้ดูแลหน่วยบริการ
│   └── admin/users.tsx        # จัดการสิทธิ์ผู้ใช้งาน
│
└── supabase/
    ├── migrations/            # ไฟล์ Migration ปรับปรุงโครงสร้างฐานข้อมูล
    └── seeds/                 📦 [ข้อมูลตัวอย่าง/แม่แบบโครงการเดิม]
        └── sample-hospital-project.sql # ข้อมูลตัวอย่างโครงการ รพ. เดิม
```

---

## 4. กฎและข้อควรระวังสำคัญ (Guidelines for Future Maintenance)
1. **การปรับแต่งหน้าภาพรวมจังหวัดสระแก้ว:** ให้แก้ไขใน `src/components/province/` และ `src/routes/index.tsx`
2. **การปรับแต่งหน้ารายละเอียดของแต่ละโครงการ:** ให้แก้ไขใน `src/components/project/` และ `src/routes/projects/$projectId.tsx`
3. **การ Deploy:** ทำผ่านคำสั่ง `git push` ขึ้น GitHub `main` ซึ่งจะทำการ Deploy ไปยัง Vercel อัตโนมัติ (ห้ามใช้ force push เนื่องจากเชื่อมต่อกับ Lovable)
