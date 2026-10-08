import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { requestRegistrationApproval } from "@/lib/auth.functions";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Check,
  Building2,
  User,
  Phone,
  Briefcase,
  Mail,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface UnitItem {
  id: string;
  name: string;
  district?: string | null;
  type?: string | null;
}

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "ลงทะเบียนผู้ใช้งาน — ระบบติดตามงานก่อสร้าง สสจ.สระแก้ว" },
      {
        name: "description",
        content: "ลงทะเบียนสำหรับเจ้าหน้าที่ 127 หน่วยบริการ จ.สระแก้ว ด้วย Google Account",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["units"],
      queryFn: async () => {
        const { getAllUnitsData } = await import("@/lib/data.functions");
        return getAllUnitsData();
      },
    });
  },
  component: Register,
});

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function Register() {
  const router = useRouter();
  const requestApproval = useServerFn(requestRegistrationApproval);

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [unitSearch, setUnitSearch] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch all units
  const { data: units = [], isLoading: unitsLoading } = useQuery<UnitItem[]>({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return (await getAllUnitsData()) as UnitItem[];
    },
  });

  // Check Supabase Google auth session
  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        if (data?.user) {
          setAuthUser(data.user);
          const meta = data.user.user_metadata || {};
          if (meta.full_name || meta.name) {
            setFullName(meta.full_name || meta.name);
          }
          if (meta.position) setPosition(meta.position);
          if (meta.phone) setPhone(meta.phone);
          if (meta.unit_id) setUnitId(meta.unit_id);
        }
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        const meta = session.user.user_metadata || {};
        if (meta.full_name || meta.name) {
          setFullName(meta.full_name || meta.name);
        }
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleGoogleSignInForRegistration() {
    setBusy(true);
    try {
      const redirectUrl = `${window.location.origin}/register`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ: " + error.message);
        setBusy(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อ Google ได้";
      toast.error("เกิดข้อผิดพลาด: " + msg);
      setBusy(false);
    }
  }

  // Extract unique sorted districts
  const districts = Array.from(
    new Set(units.map((u) => u.district).filter(Boolean)),
  ).sort() as string[];

  // Filter units by district and search term
  const filteredUnits = units.filter((u) => {
    const matchesDistrict = districtFilter === "all" || u.district === districtFilter;
    const matchesSearch =
      !unitSearch ||
      u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(unitSearch.toLowerCase()));
    return matchesDistrict && matchesSearch;
  });

  const selectedUnit = units.find((u) => u.id === unitId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authUser) {
      toast.error("กรุณาเข้าสู่ระบบด้วย Google ก่อน");
      return;
    }
    if (!fullName.trim()) {
      toast.error("กรุณาระบุชื่อ-นามสกุล");
      return;
    }
    if (!position.trim()) {
      toast.error("กรุณาระบุตำแหน่งงาน");
      return;
    }
    if (!phone.trim()) {
      toast.error("กรุณาระบุเบอร์โทรศัพท์ติดต่อ");
      return;
    }
    if (!unitId) {
      toast.error("กรุณาเลือกหน่วยบริการ");
      return;
    }

    setBusy(true);
    try {
      await requestApproval({
        data: {
          userId: authUser.id,
          unitId: unitId,
          fullName: fullName.trim(),
          position: position.trim(),
          phone: phone.trim(),
        },
      });

      toast.success(
        "บันทึกข้อมูลลงทะเบียนเรียบร้อยแล้ว! บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (สสจ.สระแก้ว) อนุมัติสิทธิ์การใช้งาน",
        { duration: 8000 },
      );

      await router.navigate({ to: "/login" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถลงทะเบียนได้";
      toast.error("เกิดข้อผิดพลาด: " + msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthUser(null);
    toast.info("ออกจากระบบเรียบร้อย");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-12">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-sm ring-4 ring-brand/10">
          <UserPlus className="size-8" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-center">
          ลงทะเบียนผู้ใช้งานระบบ
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground leading-relaxed">
          สำหรับเจ้าหน้าที่พัสดุและผู้รับผิดชอบ 127 หน่วยบริการ จ.สระแก้ว
        </p>

        {checkingAuth ? (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            กำลังตรวจสอบข้อมูล...
          </div>
        ) : !authUser ? (
          // Step 1: Must Sign in with Google first
          <div className="mt-8 w-full rounded-2xl border bg-card p-6 shadow-sm space-y-5 text-center">
            <div className="space-y-1">
              <h2 className="font-semibold text-base">ขั้นตอนที่ 1: ยืนยันตัวตนด้วย Google</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                กรุณาเข้าสู่ระบบด้วย Google Account ของท่าน เพื่อใช้เป็นบัญชีประจำตัวในระบบ
              </p>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignInForRegistration}
              disabled={busy}
              variant="outline"
              size="lg"
              className="w-full h-12 text-sm font-medium border-border shadow-xs hover:bg-accent/80 transition-all flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              <span>
                {busy ? "กำลังเชื่อมต่อกับ Google…" : "เข้าสู่ระบบด้วย Google เพื่อลงทะเบียน"}
              </span>
            </Button>

            <div className="pt-2 border-t flex justify-center text-xs text-muted-foreground">
              <Link to="/login" className="hover:text-brand font-medium">
                ← มีสิทธิ์อยู่แล้ว? เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        ) : (
          // Step 2: Fill in user profile details
          <form
            onSubmit={submit}
            className="mt-8 w-full space-y-4 rounded-2xl border bg-card p-6 shadow-sm"
          >
            {/* Authenticated Google Account Badge */}
            <div className="rounded-xl border bg-muted/40 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <GoogleIcon className="shrink-0 size-5" />
                <div className="truncate">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    เข้าสู่ระบบด้วย Google แล้ว:
                  </div>
                  <div className="text-xs font-semibold text-foreground truncate">
                    {authUser.email}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-[11px] text-muted-foreground hover:text-destructive h-7 px-2 shrink-0"
              >
                <LogOut className="size-3 mr-1" /> เปลี่ยนบัญชี
              </Button>
            </div>

            {/* Full Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="fullName" className="flex items-center gap-1.5 text-xs font-medium">
                <User className="size-3.5 text-muted-foreground" />
                <span>
                  ชื่อ - นามสกุล <span className="text-destructive">*</span>
                </span>
              </Label>
              <Input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น นายสมชาย ใจดี"
                className="h-9 text-sm"
              />
            </div>

            {/* Position */}
            <div className="grid gap-1.5">
              <Label htmlFor="position" className="flex items-center gap-1.5 text-xs font-medium">
                <Briefcase className="size-3.5 text-muted-foreground" />
                <span>
                  ตำแหน่งงาน / ฝ่ายงาน <span className="text-destructive">*</span>
                </span>
              </Label>
              <Input
                id="position"
                type="text"
                required
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="เช่น เจ้าหน้าที่พัสดุ, นายช่างโยธา, หัวหน้ากลุ่มงานบริหาร"
                className="h-9 text-sm"
              />
            </div>

            {/* Phone */}
            <div className="grid gap-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium">
                <Phone className="size-3.5 text-muted-foreground" />
                <span>
                  เบอร์โทรศัพท์ติดต่อ <span className="text-destructive">*</span>
                </span>
              </Label>
              <Input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="h-9 text-sm"
              />
            </div>

            {/* Unit Selector */}
            <div className="grid gap-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="unit" className="font-medium text-xs flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>
                    หน่วยบริการที่สังกัด <span className="text-destructive">*</span>
                  </span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {unitsLoading ? "กำลังโหลด..." : `พบ ${filteredUnits.length} แห่ง`}
                </span>
              </div>

              {/* Quick District Filter & Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="พิมพ์ค้นหาชื่อหน่วย..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select value={districtFilter} onValueChange={setDistrictFilter}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="ทุกอำเภอ" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[260px]">
                    <SelectItem value="all">ทุกอำเภอ ({units.length})</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        อ.{d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Main Unit Dropdown */}
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue
                    placeholder={
                      unitsLoading
                        ? "กำลังโหลดรายชื่อหน่วยบริการ..."
                        : "คลิกเพื่อเลือกหน่วยบริการ..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredUnits.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      ไม่พบหน่วยบริการตามที่ค้นหา
                    </div>
                  ) : (
                    filteredUnits.map((u: UnitItem) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="truncate">{u.name}</span>
                          {u.district && (
                            <span className="text-[11px] text-muted-foreground shrink-0 font-normal">
                              (อ.{u.district})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedUnit && (
                <div className="text-xs text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-2.5 flex items-start gap-2">
                  <Check className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                      {selectedUnit.name}
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                      {selectedUnit.district ? `อำเภอ${selectedUnit.district}` : ""} • จ.สระแก้ว
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={busy || !fullName || !position || !phone || !unitId}
              className="w-full mt-2 bg-brand text-brand-foreground hover:bg-brand/90 h-10 text-sm font-medium"
            >
              <UserPlus className="mr-1.5 size-4" />
              {busy ? "กำลังบันทึกข้อมูล…" : "ส่งคำขอลงทะเบียนและขออนุมัติสิทธิ์"}
            </Button>

            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground pt-3 border-t">
              <Link to="/login" className="hover:text-brand font-medium">
                เข้าสู่ระบบด้วย Google
              </Link>
              <Link to="/" className="hover:text-foreground">
                ← กลับหน้าหลักภาพรวมจังหวัด
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
