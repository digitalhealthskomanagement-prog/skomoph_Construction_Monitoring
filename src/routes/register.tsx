import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setSessionCookie, assignRegisteredUserRole } from "@/lib/auth.functions";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus } from "@/hooks/use-auth-status";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, UserPlus, Search, Check, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "สมัครสมาชิก — ระบบติดตามงานก่อสร้าง" },
      { name: "description", content: "สมัครสมาชิกสำหรับเจ้าหน้าที่หน่วยบริการ" },
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

function Register() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useServerFn(setSessionCookie);
  const assignRole = useServerFn(assignRegisteredUserRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unitId, setUnitId] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [unitSearch, setUnitSearch] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch all units reliably via server function
  const { data: units = [], isLoading: unitsLoading } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    },
  });

  // Extract unique sorted districts
  const districts = Array.from(
    new Set((units as any[]).map((u) => u.district).filter(Boolean))
  ).sort() as string[];

  // Filter units by district and search term
  const filteredUnits = (units as any[]).filter((u) => {
    const matchesDistrict = districtFilter === "all" || u.district === districtFilter;
    const matchesSearch =
      !unitSearch ||
      u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(unitSearch.toLowerCase()));
    return matchesDistrict && matchesSearch;
  });

  const selectedUnit = (units as any[]).find((u) => u.id === unitId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      toast.error("กรุณาเลือกหน่วยบริการ");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    
    setBusy(true);
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        toast.error("การสมัครสมาชิกผิดพลาด: " + authError.message);
        return;
      }

      if (authData.user) {
        // 2. Safely assign user role via server function
        const roleRes = await assignRole({
          data: {
            userId: authData.user.id,
            unitId: unitId,
          },
        });

        if (!roleRes.ok) {
          toast.error("เกิดข้อผิดพลาดในการตั้งค่าสิทธิ์หน่วยบริการ: " + (roleRes.error || ""));
          return;
        }

        toast.success("สมัครสมาชิกสำเร็จ เข้าสู่ระบบเรียบร้อย");
        
        if (authData.session) {
          // Set secure cookie
          await setSession({ data: { access_token: authData.session.access_token } });

          queryClient.setQueryData<AuthStatus>(AUTH_STATUS_QUERY_KEY, (old) => ({
            ...old,
            unlocked: true,
            userId: authData.user?.id,
            role: roleRes.role,
            unitId: unitId,
          }));
        }
        
        await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        await router.invalidate();
        await router.navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message || "ไม่สามารถลงทะเบียนได้"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
          <UserPlus className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold">สมัครสมาชิก</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          สำหรับเจ้าหน้าที่พัสดุและผู้รับผิดชอบ 127 หน่วยบริการ จ.สระแก้ว
        </p>
        <form onSubmit={submit} className="mt-8 w-full space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
            />
          </div>

          {/* Unit Selector */}
          <div className="grid gap-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="unit" className="font-medium">หน่วยบริการที่สังกัด <span className="text-destructive">*</span></Label>
              <span className="text-xs text-muted-foreground font-mono">
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder={unitsLoading ? "กำลังโหลดรายชื่อหน่วยบริการ..." : "คลิกเพื่อเลือกหน่วยบริการ..."} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredUnits.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    ไม่พบหน่วยบริการตามที่ค้นหา
                  </div>
                ) : (
                  filteredUnits.map((u: any) => (
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
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-2">
                <Check className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900">{selectedUnit.name}</div>
                  <div className="text-emerald-700 text-[11px]">
                    {selectedUnit.district ? `อำเภอ${selectedUnit.district}` : ""} • จ.สระแก้ว
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={busy || !password || !confirmPassword || !email || !unitId} className="w-full mt-2 bg-brand text-brand-foreground hover:bg-brand/90">
            <KeyRound className="mr-1.5 size-4" /> {busy ? "กำลังดำเนินการ…" : "สร้างบัญชีผู้ใช้"}
          </Button>
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground pt-4">
            <Link to="/login" className="hover:text-brand font-medium">มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Link>
            <Link to="/" className="hover:text-foreground">← กลับหน้าแรก</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
