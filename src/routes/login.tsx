import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { unlockSite } from "@/lib/gate.functions";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus } from "@/hooks/use-auth-status";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบทีมงาน — รพ.สรรคบุรี" },
      { name: "description", content: "เข้าสู่ระบบทีมงานเพื่อแก้ไขปฏิทินและรายงานความคืบหน้าโครงการก่อสร้าง" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { ok } = await unlock({ data: { password } });
      if (ok) {
        queryClient.setQueryData<AuthStatus>(AUTH_STATUS_QUERY_KEY, { unlocked: true });
        toast.success("เข้าสู่ระบบสำเร็จ");
        await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
        await router.invalidate();
        await router.navigate({ to: "/" });
      } else {
        toast.error("รหัสผ่านไม่ถูกต้อง");
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
        <h1 className="font-display text-2xl font-semibold">เข้าสู่ระบบทีมงาน</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          ใส่รหัสผ่านร่วมของทีมเพื่อแก้ไขปฏิทินและรายงานความคืบหน้า
        </p>
        <form onSubmit={submit} className="mt-8 w-full space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>
          <Button type="submit" disabled={busy || !password} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            <KeyRound className="mr-1.5 size-4" /> {busy ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← กลับหน้าแรก</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
