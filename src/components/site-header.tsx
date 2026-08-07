import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectQuery, type ProjectSettings } from "@/lib/project-query";
import { KeyRound, LogOut, Settings2 } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus, useAuthStatus } from "@/hooks/use-auth-status";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SiteHeader() {
  const { data } = useAuthStatus();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: project } = useQuery(projectQuery);
  const settings = (project?.settings ?? null) as ProjectSettings | null;
  const unlocked = data?.unlocked;

  async function onLock() {
    await supabase.auth.signOut();
    queryClient.setQueryData<AuthStatus>(AUTH_STATUS_QUERY_KEY, { unlocked: false, user: null, role: null, projectId: null });
    toast.success("ออกจากระบบเรียบร้อย");
    await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
    await router.invalidate();
    router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={hospitalLogo} alt="โลโก้หน่วยงาน" width={48} height={48} className="size-12 rounded-xl bg-white object-contain p-1 shadow-sm ring-1 ring-border" />
          <div className="leading-tight">
            <div className="font-display text-base font-semibold tracking-tight">{settings?.org_name ?? "ชื่อหน่วยงาน"}</div>
            <div className="text-xs text-muted-foreground">{settings?.org_tagline ?? settings?.title ?? "โครงการก่อสร้าง"}</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
            หน้าแรก
          </Link>
          <Link to="/updates" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            รายงานอัปเดต
          </Link>
          {unlocked ? (
            <div className="ml-2 flex items-center gap-2">
              <Link to="/settings" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                <span className="inline-flex items-center gap-1.5"><Settings2 className="size-4" /> ตั้งค่า</span>
              </Link>
              <span className="hidden rounded-full border border-brand/20 bg-brand-soft px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex">
                โหมดแก้ไข
              </span>
              <Button variant="outline" size="sm" onClick={onLock}>
                <LogOut className="mr-1.5 size-4" /> ออกจากระบบ
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="ml-2 bg-brand text-brand-foreground hover:bg-brand/90">
                <KeyRound className="mr-1.5 size-4" /> เข้าสู่ระบบทีมงาน
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
