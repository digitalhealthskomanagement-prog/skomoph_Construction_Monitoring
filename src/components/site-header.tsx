import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, History, Home, KeyRound, LogOut, Menu, Settings2, Users } from "lucide-react";
import hospitalLogo from "@/assets/hospital-logo.png";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AUTH_STATUS_QUERY_KEY, type AuthStatus, useAuthStatus } from "@/hooks/use-auth-status";
import { supabase } from "@/integrations/supabase/client";
import { clearSessionCookie } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

const desktopLink =
  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground";
const mobileLink =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium text-foreground/80 hover:bg-muted";

export function SiteHeader() {
  const { data } = useAuthStatus();
  const router = useRouter();
  const queryClient = useQueryClient();
  const unlocked = data?.unlocked;
  const isSuperAdmin = data?.role === "super_admin";
  const clearSession = useServerFn(clearSessionCookie);
  const [menuOpen, setMenuOpen] = useState(false);

  async function onLock() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    await clearSession();
    queryClient.setQueryData<AuthStatus>(AUTH_STATUS_QUERY_KEY, { unlocked: false, role: null });
    await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
    toast.success("ออกจากระบบเรียบร้อย");
    router.navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src={hospitalLogo}
            alt="โลโก้หน่วยงาน"
            width={48}
            height={48}
            className="size-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm ring-1 ring-border sm:size-12"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-sm font-semibold tracking-tight sm:text-base">
              <span className="lg:hidden">สสจ.สระแก้ว</span>
              <span className="hidden lg:inline">สำนักงานสาธารณสุขจังหวัดสระแก้ว</span>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              ระบบติดตามความคืบหน้างานก่อสร้าง
            </div>
          </div>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex lg:gap-2">
          <Link
            to="/"
            className={desktopLink}
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-foreground" }}
          >
            หน้าแรก
          </Link>
          <Link
            to="/guide"
            className={`${desktopLink} inline-flex items-center gap-1.5`}
            activeProps={{ className: "text-foreground font-semibold" }}
          >
            <BookOpen className="size-4" /> คู่มือการใช้งาน
          </Link>
          {unlocked ? (
            <div className="ml-2 flex items-center gap-2">
              <Link
                to="/settings"
                className={desktopLink}
                activeProps={{ className: "text-foreground" }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Settings2 className="size-4" /> ตั้งค่า
                </span>
              </Link>
              {isSuperAdmin && (
                <>
                  <Link
                    to="/admin/users"
                    className={desktopLink}
                    activeProps={{ className: "text-foreground" }}
                  >
                    จัดการผู้ใช้
                  </Link>
                  <Link
                    to="/admin/audit"
                    className={desktopLink}
                    activeProps={{ className: "text-foreground" }}
                  >
                    ประวัติ
                  </Link>
                </>
              )}
              <span className="hidden rounded-full border border-brand/20 bg-brand-soft px-2.5 py-1 text-xs font-medium text-primary lg:inline-flex">
                โหมดแก้ไข
              </span>
              <Button variant="outline" size="sm" onClick={onLock}>
                <LogOut className="mr-1.5 size-4" /> ออกจากระบบ
              </Button>
            </div>
          ) : (
            <Button
              asChild
              size="sm"
              className="ml-2 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Link to="/login">
                <KeyRound className="mr-1.5 size-4" /> เข้าสู่ระบบทีมงาน
              </Link>
            </Button>
          )}
        </nav>

        {/* Mobile navigation */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 md:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-xs">
            <SheetHeader className="text-left">
              <SheetTitle>เมนู</SheetTitle>
              <SheetDescription>
                {unlocked
                  ? isSuperAdmin
                    ? "เข้าสู่ระบบแล้ว (Super Admin)"
                    : "เข้าสู่ระบบแล้ว (เจ้าหน้าที่หน่วยบริการ)"
                  : "ระบบติดตามความคืบหน้างานก่อสร้าง"}
              </SheetDescription>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              <SheetClose asChild>
                <Link to="/" className={mobileLink} activeOptions={{ exact: true }}>
                  <Home className="size-5" /> หน้าแรก
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/guide" className={mobileLink}>
                  <BookOpen className="size-5" /> คู่มือการใช้งาน
                </Link>
              </SheetClose>
              {unlocked && (
                <SheetClose asChild>
                  <Link to="/settings" className={mobileLink}>
                    <Settings2 className="size-5" /> ตั้งค่า
                  </Link>
                </SheetClose>
              )}
              {unlocked && isSuperAdmin && (
                <SheetClose asChild>
                  <Link to="/admin/users" className={mobileLink}>
                    <Users className="size-5" /> จัดการผู้ใช้
                  </Link>
                </SheetClose>
              )}
              {unlocked && isSuperAdmin && (
                <SheetClose asChild>
                  <Link to="/admin/audit" className={mobileLink}>
                    <History className="size-5" /> ประวัติการแก้ไขข้อมูล
                  </Link>
                </SheetClose>
              )}
            </nav>
            <div className="mt-6 border-t pt-6">
              {unlocked ? (
                <Button variant="outline" className="h-11 w-full" onClick={onLock}>
                  <LogOut className="mr-2 size-4" /> ออกจากระบบ
                </Button>
              ) : (
                <SheetClose asChild>
                  <Button
                    asChild
                    className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    <Link to="/login">
                      <KeyRound className="mr-2 size-4" /> เข้าสู่ระบบทีมงาน
                    </Link>
                  </Button>
                </SheetClose>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
