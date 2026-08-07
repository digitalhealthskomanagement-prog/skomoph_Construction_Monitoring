import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setSessionCookie } from "@/lib/auth.functions";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus } from "@/hooks/use-auth-status";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, UserPlus } from "lucide-react";
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
  component: Register,
});

function Register() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useServerFn(setSessionCookie);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);

  // Fetch all projects for selection
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["all-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, unit_name, title")
        .order("unit_name");
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) {
      toast.error("กรุณาเลือกหน่วยบริการ");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    
    setBusy(true);
    try {
      // 1. Sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        toast.error("การสมัครสมาชิกผิดพลาด: " + authError.message);
        return;
      }

      if (authData.user) {
        // 2. Insert into user_roles
        const rolePayload = {
          user_id: authData.user.id,
          project_id: projectId === "admin" ? null : projectId,
          role: projectId === "admin" ? "super_admin" : "unit_admin",
        };
        
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(rolePayload);

        if (roleError) {
          toast.error("เกิดข้อผิดพลาดในการตั้งค่าสิทธิ์หน่วยบริการ");
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
            role: projectId === "admin" ? "super_admin" : "unit_admin",
            projectId: projectId === "admin" ? null : projectId,
          }));
        }
        
        await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        await router.invalidate();
        await router.navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
          <UserPlus className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold">สมัครสมาชิก</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          สำหรับเจ้าหน้าที่พัสดุประจำหน่วยบริการ (รพ./รพ.สต.)
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
          <div className="grid gap-2">
            <Label htmlFor="project">หน่วยบริการที่สังกัด</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={projectsLoading ? "กำลังโหลด..." : "เลือกหน่วยบริการ..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">สำนักงานสาธารณสุขจังหวัดสระแก้ว (สสจ.)</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.unit_name || p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy || !password || !confirmPassword || !email || !projectId} className="w-full mt-2 bg-brand text-brand-foreground hover:bg-brand/90">
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
