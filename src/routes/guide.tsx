import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  UserPlus,
  LogIn,
  Building2,
  FolderPlus,
  CalendarDays,
  TrendingUp,
  Camera,
  AlertTriangle,
  Printer,
  Search,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Layers,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
  Wallet,
  Clock,
  KeyRound,
  FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "คู่มือการใช้งานระบบ — ระบบติดตามงานก่อสร้าง สสจ.สระแก้ว" },
      { name: "description", content: "คู่มือการใช้งานระบบติดตามงานก่อสร้าง สำหรับ 127 หน่วยงานสาธารณสุขจังหวัดสระแก้ว" },
    ],
  }),
  component: GuidePage,
});

const SECTIONS = [
  { id: "overview", title: "1. ภาพรวมระบบและสิทธิ์การใช้งาน", icon: ShieldCheck },
  { id: "register", title: "2. การลงทะเบียนและขอสิทธิ์ใช้งาน", icon: UserPlus },
  { id: "login", title: "3. การเข้าสู่ระบบและการตั้งค่า", icon: LogIn },
  { id: "create-project", title: "4. การสร้างและตั้งค่าโครงการ", icon: FolderPlus },
  { id: "budget", title: "5. การกำหนดแหล่งงบประมาณ 3 ประเภท", icon: Wallet },
  { id: "phases-scurve", title: "6. การแบ่งงวดงานและกราฟ S-Curve", icon: TrendingUp },
  { id: "calendar", title: "7. การบันทึกปฏิทินงานก่อสร้าง", icon: CalendarDays },
  { id: "updates", title: "8. การรายงานความคืบหน้าและภาพหน้างาน", icon: Camera },
  { id: "risks-resources", title: "9. การบันทึกความเสี่ยงและลิงก์แบบแปลน", icon: AlertTriangle },
  { id: "faq", title: "10. คำถามที่พบบ่อย (FAQ)", icon: HelpCircle },
];

function GuidePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unit" | "admin">("all");

  const filteredSections = SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 print:bg-white print:pb-0">
      <div className="print:hidden">
        <SiteHeader />
      </div>

      {/* Hero Header */}
      <section className="border-b bg-white py-10 shadow-xs print:border-none print:py-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                <BookOpen className="size-3.5" />
                คู่มือการใช้งานระบบอย่างเป็นทางการ
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
                คู่มือการใช้งานระบบติดตามงานก่อสร้าง
              </h1>
              <p className="mt-1 text-base text-neutral-600">
                สำนักงานสาธารณสุขจังหวัดสระแก้ว · ครอบคลุม 127 หน่วยงานสาธารณสุขในจังหวัด
              </p>
            </div>
            <div className="flex items-center gap-2.5 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="size-4" /> พิมพ์คู่มือ / PDF
              </Button>
              <Link to="/">
                <Button size="sm" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
                  กลับสู่หน้าแรก <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Search in Guide */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="ค้นหาหัวข้อในคู่มือ (เช่น ลงทะเบียน, S-Curve, งบประมาณ)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-neutral-50 border-neutral-200"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <span className="font-medium">แสดงตามบทบาท:</span>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${activeTab === "all" ? "bg-neutral-900 text-white font-medium" : "hover:bg-neutral-100"}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setActiveTab("unit")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${activeTab === "unit" ? "bg-neutral-900 text-white font-medium" : "hover:bg-neutral-100"}`}
              >
                ผู้ดูแล รพ./รพ.สต.
              </button>
              <button
                onClick={() => setActiveTab("admin")}
                className={`px-2.5 py-1 rounded-lg transition-colors ${activeTab === "admin" ? "bg-neutral-900 text-white font-medium" : "hover:bg-neutral-100"}`}
              >
                ผู้ดูแล สสจ.
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          
          {/* Sticky Table of Contents (Desktop Sidebar) */}
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border bg-white p-4 shadow-xs">
                <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2 mb-3">
                  <Layers className="size-4 text-brand" /> สารบัญคู่มือ
                </h3>
                <nav className="space-y-1 text-sm">
                  {filteredSections.map((s) => {
                    const Icon = s.icon;
                    return (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                      >
                        <Icon className="size-4 shrink-0 text-neutral-400" />
                        <span className="truncate text-xs font-medium">{s.title}</span>
                      </a>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Contact Box */}
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-xs text-neutral-700 space-y-2">
                <p className="font-bold text-brand flex items-center gap-1.5">
                  <Info className="size-4" /> ติดต่อสอบถามระบบ
                </p>
                <p>กลุ่มงานบริหารทั่วไป / ไอที<br />สำนักงานสาธารณสุขจังหวัดสระแก้ว</p>
                <p className="text-neutral-500">โทร: 037-425-141 ต่อ งานพัสดุ/ไอที</p>
              </div>
            </div>
          </aside>

          {/* Guide Content Sections */}
          <main className="space-y-12 lg:col-span-3">

            {/* Section 1: Overview */}
            <section id="overview" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">1</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">ภาพรวมระบบและสิทธิ์การใช้งาน</h2>
              </div>

              <Card className="p-6 space-y-4 border-neutral-200">
                <p className="text-sm leading-relaxed text-neutral-700">
                  ระบบติดตามงานก่อสร้าง สำนักงานสาธารณสุขจังหวัดสระแก้ว (SKOMOPH Construction Monitoring) เป็นแพลตฟอร์มศูนย์กลางระดับจังหวัดที่พัฒนาขึ้นเพื่อให้ผู้บริหารและเจ้าหน้าที่สามารถกำกับ ติดตาม และประเมินความก้าวหน้าของโครงการก่อสร้าง/ปรับปรุงอาคารสถานที่ของหน่วยงานสาธารณสุขทั้ง <strong>127 แห่ง</strong> ในจังหวัดสระแก้วได้อย่างโปร่งใส เป็นปัจจุบัน (Real-time) และเป็นมาตรฐานเดียวกัน
                </p>

                <h3 className="font-semibold text-neutral-900 text-sm mt-4">บทบาทและสิทธิ์ในระบบแบ่งออกเป็น 3 ระดับ:</h3>
                
                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-2">
                    <span className="inline-block rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-800">
                      1. บุคคลทั่วไป / กรรมการตรวจรับ
                    </span>
                    <h4 className="font-bold text-sm text-neutral-900">Public Guest</h4>
                    <ul className="text-xs text-neutral-600 space-y-1 list-disc pl-4">
                      <li>ดูหน้าแรก สรุปยอดโครงการทั้งจังหวัด</li>
                      <li>ดูกราฟความก้าวหน้ารายอำเภอ/แหล่งงบ</li>
                      <li>คลิกดูรายละเอียด S-Curve และภาพถ่ายของแต่ละโครงการได้</li>
                      <li><strong>ไม่ต้องล็อกอิน</strong></li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                    <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                      2. ผู้รับผิดชอบ รพ. / รพ.สต.
                    </span>
                    <h4 className="font-bold text-sm text-neutral-900">Unit Admin</h4>
                    <ul className="text-xs text-neutral-600 space-y-1 list-disc pl-4">
                      <li>สร้างและแก้ไขโครงการของหน่วยบริการตนเอง</li>
                      <li>ตั้งค่างวดงาน กำหนดน้ำหนัก S-Curve</li>
                      <li>ลงกิจกรรมในปฏิทินงานก่อสร้าง</li>
                      <li>โพสต์รายงานความคืบหน้าและรูปภาพหน้างาน</li>
                      <li><strong>ต้องสมัครสมาชิกและผูกหน่วยบริการ</strong></li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-2">
                    <span className="inline-block rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                      3. แอดมินจังหวัด (สสจ.)
                    </span>
                    <h4 className="font-bold text-sm text-neutral-900">Super Admin</h4>
                    <ul className="text-xs text-neutral-600 space-y-1 list-disc pl-4">
                      <li>เพิ่ม/ลบ/แก้ไข หน่วยบริการทั้ง 127 แห่ง</li>
                      <li>ดูแลและแก้ไขโครงการของทุกหน่วยงานได้</li>
                      <li>อนุมัติสิทธิ์และกำหนดบทบาทผู้ใช้งานระบบ</li>
                      <li>จัดการทรัพยากรส่วนกลางของจังหวัด</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {/* Section 2: Registration */}
            <section id="register" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">2</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การลงทะเบียนและขอสิทธิ์ใช้งาน (สำหรับเจ้าหน้าที่หน่วยบริการ)</h2>
              </div>

              <Card className="p-6 space-y-6 border-neutral-200">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong>ข้อควรทราบ:</strong> เจ้าหน้าที่ผู้รับผิดชอบโครงการของ รพ. หรือ รพ.สต. ต้องลงทะเบียนเพื่อขอสิทธิ์จัดการโครงการของหน่วยงานตนเอง โดยเลือกหน่วยงานให้ตรงกับสังกัดจริง เพื่อให้ สสจ. อนุมัติสิทธิ์ได้ถูกต้อง
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-neutral-900">ขั้นตอนการลงทะเบียน:</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border p-4 bg-white space-y-2">
                      <div className="size-7 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">1</div>
                      <h4 className="font-bold text-sm">เข้าหน้าสมัครสมาชิก</h4>
                      <p className="text-xs text-neutral-600">
                        คลิกปุ่ม <strong>"เข้าสู่ระบบทีมงาน"</strong> แล้วกดเลือกลิงก์ <strong>"สมัครสมาชิกใหม่"</strong> (หรือไปที่ URL: <code>/register</code>)
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-white space-y-2">
                      <div className="size-7 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">2</div>
                      <h4 className="font-bold text-sm">กรอกข้อมูลและเลือกหน่วยงาน</h4>
                      <p className="text-xs text-neutral-600">
                        กรอกอีเมล, รหัสผ่าน (อย่างน้อย 6 ตัวอักษร), และคลิกเลือก <strong>"หน่วยบริการที่สังกัด"</strong> จากรายชื่อ 127 แห่ง
                      </p>
                    </div>

                    <div className="rounded-xl border p-4 bg-white space-y-2">
                      <div className="size-7 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">3</div>
                      <h4 className="font-bold text-sm">รอ สสจ. อนุมัติสิทธิ์</h4>
                      <p className="text-xs text-neutral-600">
                        เมื่อสมัครเสร็จสิ้น ระบบจะแจ้งเตือนให้ติดต่อผู้ดูแลระบบ สสจ.สระแก้ว เพื่ออนุมัติบทบาท <strong>Unit Admin</strong> ให้เริ่มจัดการโครงการได้
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link to="/register">
                    <Button variant="outline" size="sm" className="gap-1.5 text-brand border-brand/30 hover:bg-brand/5">
                      <UserPlus className="size-4" /> ไปยังหน้าสมัครสมาชิกใหม่ &rarr;
                    </Button>
                  </Link>
                </div>
              </Card>
            </section>

            {/* Section 3: Login & Settings */}
            <section id="login" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">3</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การเข้าสู่ระบบและการใช้งานหน้าตั้งค่า (/settings)</h2>
              </div>

              <Card className="p-6 space-y-5 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  เมื่อได้รับการอนุมัติสิทธิ์แล้ว ท่านสามารถเข้าสู่ระบบเพื่อแก้ไขโครงการ บันทึกปฏิทิน และรายงานความคืบหน้าได้ทันที:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl border p-3.5 bg-neutral-50/50 text-xs">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 text-sm block mb-0.5">1. ลงชื่อเข้าใช้ที่หน้า /login</strong>
                      กรอกอีเมลและรหัสผ่านที่ได้สมัครไว้ แล้วกดปุ่ม <strong>"เข้าสู่ระบบ"</strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border p-3.5 bg-neutral-50/50 text-xs">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 text-sm block mb-0.5">2. แถบเมนูด้านบนจะแสดงสถานะ "โหมดแก้ไข"</strong>
                      จะมีปุ่ม <strong>"ตั้งค่า"</strong> ปรากฏขึ้นบนแถบเมนูด้านบน สามารถคลิกเข้าไปเพื่อจัดการโครงการของหน่วยงานตนเองได้ตลอดเวลา
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border p-3.5 bg-neutral-50/50 text-xs">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-neutral-900 text-sm block mb-0.5">3. ออกจากระบบอย่างปลอดภัยเมื่อเสร็จงาน</strong>
                      กดปุ่ม <strong>"ออกจากระบบ"</strong> บริเวณมุมขวาบน เพื่อป้องกันไม่ให้ผู้อื่นแก้ไขข้อมูลโดยไม่ได้รับอนุญาต
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Section 4: Project Setup */}
            <section id="create-project" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">4</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การสร้างและตั้งค่าโครงการก่อสร้าง</h2>
              </div>

              <Card className="p-6 space-y-6 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  ในหน้า <strong>ตั้งค่าระบบ (/settings)</strong> ท่านจะเห็นรายการโครงการของหน่วยงานตนเอง สามารถเพิ่มโครงการใหม่หรือแก้ไขโครงการเดิมได้:
                </p>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-neutral-900">ฟิลด์ข้อมูลที่ต้องระบุในโครงการ:</h3>
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="border rounded-xl p-4 bg-white space-y-1.5">
                      <strong className="text-sm text-neutral-900 block">ชื่อโครงการก่อสร้าง (Title)</strong>
                      <span className="text-neutral-500">เช่น "ก่อสร้างอาคารผู้ป่วยนอก 4 ชั้น", "ปรับปรุงห้องปฏิบัติการทางการแพทย์"</span>
                    </div>
                    <div className="border rounded-xl p-4 bg-white space-y-1.5">
                      <strong className="text-sm text-neutral-900 block">คำอธิบายย่อ / สัญญาจ้าง (Subtitle)</strong>
                      <span className="text-neutral-500">เช่น "สัญญาจ้างเลขที่ 12/2569 ผู้รับจ้าง บจก. สระแก้วการช่าง"</span>
                    </div>
                    <div className="border rounded-xl p-4 bg-white space-y-1.5">
                      <strong className="text-sm text-neutral-900 block">วันเริ่มต้น - วันสิ้นสุดตามสัญญา</strong>
                      <span className="text-neutral-500">ระบุวันที่เริ่มนับสัญญา และวันที่สิ้นสุดสัญญาจ้าง เพื่อใช้คำนวณระยะเวลาใน S-Curve</span>
                    </div>
                    <div className="border rounded-xl p-4 bg-white space-y-1.5">
                      <strong className="text-sm text-neutral-900 block">วงเงินงบประมาณ (บาท)</strong>
                      <span className="text-neutral-500">ระบุยอดเงินตามสัญญาจ้าง เช่น 12,500,000 บาท</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 bg-neutral-50 space-y-2">
                  <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                    <Camera className="size-4 text-brand" /> การเปลี่ยนรูปภาพหน้าปกโครงการ (Hero Image)
                  </h4>
                  <p className="text-xs text-neutral-600">
                    ในหน้าตั้งค่าโครงการ สามารถคลิกเลือกไฟล์รูปภาพ (เช่น ภาพทัศนียภาพจำลอง 3D หรือภาพถ่ายอาคารจริง) เพื่ออัปโหลดเป็นภาพหน้าปกหลักของโครงการได้ทันที (รองรับไฟล์ .JPG, .PNG ขนาดไม่เกิน 5MB)
                  </p>
                </div>
              </Card>
            </section>

            {/* Section 5: Budget Sources */}
            <section id="budget" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">5</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การกำหนดแหล่งงบประมาณ (3 ประเภท)</h2>
              </div>

              <Card className="p-6 space-y-5 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  เพื่อให้ สสจ.สระแก้ว สามารถจัดหมวดหมู่และวิเคราะห์สถานะงบประมาณในระดับจังหวัดได้ ในหน้าตั้งค่าโครงการจะมีดรอปดาวน์ให้เลือก <strong>"แหล่งงบประมาณ"</strong> ซึ่งแบ่งออกเป็น 3 ประเภทหลัก:
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <Wallet className="size-4 text-amber-600" /> เงินบำรุงของหน่วยบริการ
                    </div>
                    <p className="text-xs text-neutral-600">
                      โครงการที่ใช้จ่ายจากเงินรายได้หรือเงินบำรุงของโรงพยาบาล/หน่วยบริการเอง
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                      <Wallet className="size-4 text-blue-600" /> เงินงบประมาณ
                    </div>
                    <p className="text-xs text-neutral-600">
                      โครงการที่ได้รับการจัดสรรจากงบประมาณแผ่นดิน / กระทรวงสาธารณสุข ประจำปี
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <Wallet className="size-4 text-emerald-600" /> งบค่าเสื่อม
                    </div>
                    <p className="text-xs text-neutral-600">
                      โครงการที่ใช้เงินจัดสรรจากงบลงทุนค่าบริการทางการแพทย์ (งบค่าเสื่อม สปสช.)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-100 p-4 text-xs text-neutral-600">
                  💡 <strong>ผลของการเลือกแหล่งงบประมาณ:</strong> ข้อมูลนี้จะไปปรากฏเป็นป้ายกำกับในการ์ดโครงการหน้าแรก และนำไปประมวลผลเป็น <strong>กราฟพายแหล่งงบประมาณรวมทั้งจังหวัด</strong> บนหน้า Dashboard สสจ. โดยอัตโนมัติ
                </div>
              </Card>
            </section>

            {/* Section 6: Phases & S-Curve */}
            <section id="phases-scurve" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">6</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การแบ่งงวดงานและการสร้างกราฟ S-Curve</h2>
              </div>

              <Card className="p-6 space-y-6 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  หัวใจสำคัญในการติดตามงานก่อสร้างคือการเปรียบเทียบ <strong>"แผนงานที่วางไว้ (Plan)"</strong> กับ <strong>"ผลงานจริงที่เกิดขึ้น (Actual)"</strong> ผ่านเส้นกราฟ S-Curve:
                </p>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-neutral-900">การตั้งค่างวดงาน (Phases):</h3>
                  
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="border rounded-xl p-4 bg-white space-y-2">
                      <span className="font-bold text-sm text-blue-700">1. หมวดเตรียมการ (Preparation)</span>
                      <p className="text-neutral-600">
                        เช่น การจัดทำ TOR, ประกาศจัดซื้อจัดจ้าง, ลงนามสัญญาจ้าง, เตรียมพื้นที่ก่อสร้าง
                      </p>
                    </div>

                    <div className="border rounded-xl p-4 bg-white space-y-2">
                      <span className="font-bold text-sm text-emerald-700">2. หมวดก่อสร้าง (Construction)</span>
                      <p className="text-neutral-600">
                        แบ่งตามงวดงานในสัญญาจ้าง เช่น งวดที่ 1 ฐานราก, งวดที่ 2 โครงสร้าง, งวดที่ 3 สถาปัตย์, งวดสุดท้าย
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2.5 text-xs text-neutral-700">
                    <h4 className="font-bold text-neutral-900 flex items-center gap-1.5">
                      <TrendingUp className="size-4 text-brand" /> หลักการกำหนดน้ำหนักงวดงาน (Weight %)
                    </h4>
                    <p>
                      แต่ละงวดงานต้องกำหนดค่าน้ำหนัก (%) ตามมูลค่างานจริง <strong>โดยผลรวมของทุกงวดงานต้องเท่ากับ 100% พอดี</strong>
                    </p>
                    <p>
                      <strong>ตัวอย่าง:</strong> งวดที่ 1 (20%), งวดที่ 2 (30%), งวดที่ 3 (30%), งวดที่ 4 (20%) = รวม 100%
                    </p>
                    <p className="text-neutral-500">
                      เมื่อช่างหรือผู้รับจ้างส่งมอบงาน ให้ท่านกรอก % ความคืบหน้าของงวดนั้นๆ (เช่น 100% เมื่อตรวจรับแล้ว) ระบบจะนำไปคำนวณและวาดเส้นกราฟ S-Curve พร้อมปรับตัวเลข % รวมของโครงการให้อัตโนมัติทันที
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Section 7: Calendar */}
            <section id="calendar" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">7</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การบันทึกปฏิทินงานก่อสร้าง (Construction Calendar)</h2>
              </div>

              <Card className="p-6 space-y-5 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  ในหน้ารายละเอียดโครงการ จะมีตาราง <strong>ปฏิทินงานก่อสร้างรายเดือน</strong> เพื่อใช้บันทึกเหตุการณ์สำคัญและนัดหมายการตรวจงาน:
                </p>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl border p-4 bg-white space-y-2">
                    <span className="size-3 rounded-full bg-emerald-500 inline-block" />
                    <strong className="text-sm block">1. งานตามแผน (On Track)</strong>
                    <p className="text-neutral-600">เช่น วันที่เทคอนกรีตเสร็จตามกำหนด, วันส่งมอบงานงวด</p>
                  </div>

                  <div className="rounded-xl border p-4 bg-white space-y-2">
                    <span className="size-3 rounded-full bg-amber-500 inline-block" />
                    <strong className="text-sm block">2. งานล่าช้า / มีความเสี่ยง (Delayed)</strong>
                    <p className="text-neutral-600">เช่น ฝนตกหนักทำงานไม่ได้, ผู้รับจ้างเข้างานล่าช้ากว่าแผน</p>
                  </div>

                  <div className="rounded-xl border p-4 bg-white space-y-2">
                    <span className="size-3 rounded-full bg-blue-500 inline-block" />
                    <strong className="text-sm block">3. วันนัดตรวจรับพัสดุ (Milestone)</strong>
                    <p className="text-neutral-600">บันทึกวันนัดประชุมคณะกรรมการตรวจรับพัสดุ เพื่อให้กรรมการเข้ามาดูวันนัดหมายได้</p>
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-100 p-3.5 text-xs text-neutral-700">
                  📌 <strong>วิธีเพิ่มกิจกรรมในปฏิทิน:</strong> ล็อกอินเข้าสู่ระบบ &rarr; ไปที่หน้ารายละเอียดโครงการ &rarr; กดปุ่ม <strong>"+ เพิ่มกิจกรรมในปฏิทิน"</strong> &rarr; เลือกวันที่, พิมพ์ชื่อกิจกรรม, และเลือกสถานะงาน
                </div>
              </Card>
            </section>

            {/* Section 8: Progress Updates */}
            <section id="updates" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">8</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การรายงานความคืบหน้าและอัปโหลดภาพถ่ายหน้างาน</h2>
              </div>

              <Card className="p-6 space-y-5 border-neutral-200">
                <p className="text-sm text-neutral-700">
                  การรายงานภาพถ่ายหน้างานจริงเป็นหลักฐานที่สำคัญที่สุดในการเบิกจ่ายและรายงานผู้บริหาร:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border p-4 bg-white space-y-1.5">
                    <strong className="text-sm text-neutral-900 block flex items-center gap-1.5">
                      <Camera className="size-4 text-brand" /> 1. ถ่ายภาพหน้างานจริงอย่างสม่ำเสมอ
                    </strong>
                    <p className="text-neutral-600">
                      ควรถ่ายภาพในมุมเดิมของอาคารอย่างน้อยสัปดาห์ละ 1 ครั้ง หรือทุกครั้งที่มีความคืบหน้าสำคัญ (เช่น งานผูกเหล็ก, งานเทคาน, งานมุงหลังคา)
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 bg-white space-y-1.5">
                    <strong className="text-sm text-neutral-900 block flex items-center gap-1.5">
                      <FileText className="size-4 text-brand" /> 2. โพสต์รายงานผ่านกล่อง "เพิ่มรายงานความคืบหน้า"
                    </strong>
                    <p className="text-neutral-600">
                      กรอกหัวข้อรายงาน, รายละเอียดงานที่ทำได้ในงวดนั้น, และคลิกปุ่ม <strong>"แนบรูปภาพ"</strong> (สามารถเลือกภาพได้หลายภาพพร้อมกัน)
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 bg-white space-y-1.5">
                    <strong className="text-sm text-neutral-900 block flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-amber-600" /> 3. ระบุปัญหา/อุปสรรคเพื่อขอความช่วยเหลือ
                    </strong>
                    <p className="text-neutral-600">
                      หากติดปัญหา เช่น การขออนุญาตก่อสร้าง, ปัญหากระทบกับระบบท่อเดิม สามารถพิมพ์ระบุไว้ในรายงาน เพื่อให้ทีมผู้บริหาร สสจ. เข้ามาช่วยประสานงานแก้ไขได้ทันท่วงที
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Section 9: Risks & Resources */}
            <section id="risks-resources" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">9</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">การบันทึกความเสี่ยงและทรัพยากรโครงการ</h2>
              </div>

              <Card className="p-6 space-y-5 border-neutral-200">
                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border p-4 bg-white space-y-2">
                    <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <AlertTriangle className="size-4 text-amber-600" /> แดชบอร์ดความเสี่ยง (Risk Management)
                    </h4>
                    <p className="text-neutral-600 leading-relaxed">
                      ใช้บันทึกปัจจัยที่อาจทำให้งานล่าช้า เช่น ขาดแคลนแรงงาน, วัสดุขาดตลาด, สภาพอากาศ โดยระบุระดับความเสี่ยง (ต่ำ / ปานกลาง / สูง) พร้อมระบุมาตรการรับมือ เพื่อให้คณะกรรมการตรวจรับพัสดุรับทราบล่วงหน้า
                    </p>
                  </div>

                  <div className="rounded-xl border p-4 bg-white space-y-2">
                    <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="size-4 text-blue-600" /> ลิงก์ทรัพยากรทีมงาน (Team Resources)
                    </h4>
                    <p className="text-neutral-600 leading-relaxed">
                      แปะลิงก์ที่เป็นประโยชน์เพื่อให้คณะกรรมการและช่างเข้าถึงได้ง่าย เช่น:
                    </p>
                    <ul className="list-disc pl-4 text-neutral-500 space-y-1">
                      <li>ลิงก์ Google Drive รวมภาพถ่ายความละเอียดสูง</li>
                      <li>ลิงก์แบบแปลนก่อสร้าง (PDF / CAD)</li>
                      <li>ลิงก์เอกสารสัญญาจ้างและเอกสารตรวจรับ</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </section>

            {/* Section 10: FAQ */}
            <section id="faq" className="scroll-mt-24 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-white font-bold text-sm">10</div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">คำถามที่พบบ่อย (FAQ & Troubleshooting)</h2>
              </div>

              <div className="space-y-3">
                <Card className="p-5 border-neutral-200">
                  <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                    <HelpCircle className="size-4 text-brand shrink-0" />
                    Q1: สมัครสมาชิกแล้ว แต่เข้าสู่ระบบแล้วไม่เห็นปุ่มเพิ่มโครงการ?
                  </h4>
                  <p className="text-xs text-neutral-600 pl-6 leading-relaxed">
                    <strong>ตอบ:</strong> หลังจากสมัครสมาชิกใหม่ สถานะของท่านจะยังเป็นบัญชีรอการอนุมัติ รบกวนแจ้งชื่อ-อีเมลไปยังผู้ดูแลระบบของ สสจ.สระแก้ว เพื่อให้เปิดสิทธิ์ <strong>Unit Admin</strong> ประจำหน่วยบริการของท่าน เมื่อได้รับอนุมัติแล้วจะสามารถเพิ่มและแก้ไขโครงการได้ทันที
                  </p>
                </Card>

                <Card className="p-5 border-neutral-200">
                  <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                    <HelpCircle className="size-4 text-brand shrink-0" />
                    Q2: กราฟ S-Curve คำนวณอย่างไร ทำไมเส้นไม่ขึ้น?
                  </h4>
                  <p className="text-xs text-neutral-600 pl-6 leading-relaxed">
                    <strong>ตอบ:</strong> กราฟ S-Curve ต้องการข้อมูล 2 ส่วน: 1) วันที่เริ่มต้นและสิ้นสุดสัญญาในหน้าตั้งค่าโครงการ และ 2) ค่าน้ำหนักงวดงาน (%) ที่ต้องรวมกันได้ 100% พอดี หากยังไม่ได้กำหนดวันที่ หรือผลรวมน้ำหนักไม่ครบ 100% กราฟอาจจะไม่สามารถประมวลผลได้อย่างสมบูรณ์
                  </p>
                </Card>

                <Card className="p-5 border-neutral-200">
                  <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                    <HelpCircle className="size-4 text-brand shrink-0" />
                    Q3: รูปภาพรายงานหน้างานรองรับไฟล์ขนาดเท่าใด?
                  </h4>
                  <p className="text-xs text-neutral-600 pl-6 leading-relaxed">
                    <strong>ตอบ:</strong> ระบบรองรับไฟล์รูปภาพประเภท JPG, PNG, WEBP ขนาดไม่เกิน 5MB ต่อรูป แนะนำให้ถ่ายภาพแนวนอนที่มีแสงสว่างชัดเจนเพื่อให้เห็นความคืบหน้าของโครงสร้างได้ชัดที่สุด
                  </p>
                </Card>

                <Card className="p-5 border-neutral-200">
                  <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
                    <HelpCircle className="size-4 text-brand shrink-0" />
                    Q4: หน่วยงาน 1 แห่ง สามารถมีมากกว่า 1 โครงการก่อสร้างได้หรือไม่?
                  </h4>
                  <p className="text-xs text-neutral-600 pl-6 leading-relaxed">
                    <strong>ตอบ:</strong> ได้ครับ เช่น โรงพยาบาล A มีทั้งโครงการสร้างตึกใหม่ และโครงการปรับปรุงอาคารเดิม สามารถกดปุ่ม "+ เพิ่มโครงการใหม่" ในหน้าตั้งค่าของหน่วยงานนั้นๆ ได้ไม่จำกัดจำนวนโครงการ
                  </p>
                </Card>
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}
