import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth.functions";
import { AUTH_STATUS_QUERY_KEY } from "@/hooks/use-auth-status";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, Clock, LogOut, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบด้วย Google — ระบบติดตามงานก่อสร้าง สสจ.สระแก้ว" },
      {
        name: "description",
        content: "เข้าสู่ระบบด้วย Google Account สำหรับเจ้าหน้าที่และผู้ดูแลระบบ",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
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

interface PendingUser {
  id?: string;
  email?: string;
  fullName?: string;
}

function Login() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useServerFn(setSessionCookie);
  const clearSession = useServerFn(clearSessionCookie);

  const [busy, setBusy] = useState(false);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);

  // Check auth status on load / after redirect
  useEffect(() => {
    let active = true;

    async function syncAuth(accessToken: string) {
      setBusy(true);
      try {
        const res = await setSession({ data: { access_token: accessToken } });
        if (!active) return;

        if (res.ok) {
          await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
          toast.success("เข้าสู่ระบบสำเร็จ");
          await router.invalidate();
          await router.navigate({ to: "/" });
        } else {
          if (res.needsProfile) {
            toast.info("เข้าสู่ระบบด้วย Google สำเร็จ กรุณากรอกข้อมูลเพื่อลงทะเบียนใช้งาน");
            await router.navigate({ to: "/register" });
          } else if (res.pendingApproval) {
            setPendingUser(res.user ?? null);
          } else {
            toast.error(res.error || "ไม่สามารถเข้าสู่ระบบได้");
          }
        }
      } catch (err: unknown) {
        console.error("Auth sync error:", err);
      } finally {
        if (active) setBusy(false);
      }
    }

    // Check existing session
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) {
        syncAuth(data.session.access_token);
      }
    });

    // Listen for auth state change from redirect
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        syncAuth(session.access_token);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleSignIn() {
    setBusy(true);
    try {
      const redirectUrl = `${window.location.origin}/login`;
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
      const msg = err instanceof Error ? err.message : "ไม่สามารถเริ่มการเชื่อมต่อได้";
      toast.error("เกิดข้อผิดพลาด: " + msg);
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await supabase.auth.signOut();
      await clearSession();
      setPendingUser(null);
      await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
      toast.info("ออกจากระบบเรียบร้อย");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-brand text-brand-foreground shadow-sm ring-4 ring-brand/10">
          <ShieldCheck className="size-8" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-center">
          เข้าสู่ระบบด้วย Google
        </h1>
        <p className="mt-1.5 text-center text-sm text-muted-foreground leading-relaxed">
          ระบบศูนย์กลางกำกับติดตามงานก่อสร้าง 127 หน่วยงาน
          <br />
          สำนักงานสาธารณสุขจังหวัดสระแก้ว
        </p>

        {pendingUser ? (
          // Pending Approval State
          <div className="mt-8 w-full rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900 dark:text-amber-200">
              <Clock className="size-5 shrink-0 text-amber-600 mt-0.5 animate-pulse" />
              <div className="text-sm">
                <p className="font-semibold text-base mb-1">อยู่ระหว่างรอการอนุมัติสิทธิ์</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  บัญชี Google <strong className="text-foreground">{pendingUser.email}</strong>{" "}
                  ได้ส่งคำขอลงทะเบียนแล้ว และกำลังรอผู้ดูแลระบบ (สสจ.สระแก้ว)
                  ตรวจสอบและอนุมัติสิทธิ์เข้าใช้งาน
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link to="/register">
                <Button variant="outline" className="w-full justify-between text-xs h-9">
                  <span>แก้ไขข้อมูลลงทะเบียนหรือเปลี่ยนหน่วยบริการ</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                disabled={busy}
                className="w-full text-xs text-muted-foreground hover:text-destructive h-9"
              >
                <LogOut className="size-3.5 mr-1.5" /> สลับบัญชี Google หรือออกจากระบบ
              </Button>
            </div>
          </div>
        ) : (
          // Main Google Sign-In Card
          <div className="mt-8 w-full rounded-2xl border bg-card p-6 shadow-sm space-y-5">
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3.5 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-brand" />
                <span>การเข้าสู่ระบบแบบใหม่</span>
              </div>
              <p className="leading-relaxed">
                เข้าสู่ระบบด้วย Google Account โดยไม่ต้องใช้รหัสผ่าน หากยังไม่เคยลงทะเบียน
                ระบบจะนำท่านไปบันทึกข้อมูลหน่วยบริการเพื่อขออนุมัติสิทธิ์
              </p>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={busy}
              variant="outline"
              size="lg"
              className="w-full h-12 text-sm font-medium border-border shadow-xs hover:bg-accent/80 transition-all flex items-center justify-center gap-3"
            >
              <GoogleIcon />
              <span>{busy ? "กำลังเชื่อมต่อกับ Google…" : "เข้าสู่ระบบด้วย Google Account"}</span>
            </Button>

            <div className="pt-2 border-t flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <Link to="/register" className="hover:text-brand font-medium">
                ลงทะเบียนผู้ใช้งานใหม่ด้วย Google
              </Link>
              <Link to="/" className="hover:text-foreground">
                ← กลับหน้าหลักภาพรวมจังหวัด
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
