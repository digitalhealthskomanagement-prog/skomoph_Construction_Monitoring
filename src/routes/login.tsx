import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setSessionCookie } from "@/lib/auth.functions";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus } from "@/hooks/use-auth-status";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — ระบบติดตามงานก่อสร้าง" },
      { name: "description", content: "เข้าสู่ระบบเพื่อแก้ไขปฏิทินและรายงานความคืบหน้าโครงการก่อสร้าง" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useServerFn(setSessionCookie);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      if (data.session) {
        // Set secure cookie
        await setSession({ data: { access_token: data.session.access_token } });

        // Let the useAuthStatus hook fetch the updated status
        await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        toast.success("เข้าสู่ระบบสำเร็จ");
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
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          สำหรับเจ้าหน้าที่พัสดุและแอดมินระบบ
        </p>
        <form onSubmit={submit} className="mt-8 w-full space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              autoFocus
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={busy || !password || !email} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            <KeyRound className="mr-1.5 size-4" /> {busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
          </Button>
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground pt-4">
            <Link to="/register" className="hover:text-brand font-medium">สมัครสมาชิกใหม่</Link>
            <Link to="/" className="hover:text-foreground">← กลับหน้าแรก</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
