import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { getAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "ประวัติการแก้ไขข้อมูล — ระบบติดตามงานก่อสร้าง" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

const PAGE_SIZE = 100;

const ACTION_LABEL: Record<string, { text: string; className: string }> = {
  create: { text: "เพิ่ม", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  update: { text: "แก้ไข", className: "bg-blue-100 text-blue-800 border-blue-200" },
  delete: { text: "ลบ", className: "bg-red-100 text-red-800 border-red-200" },
  progress: { text: "อัปเดต %", className: "bg-sky-100 text-sky-800 border-sky-200" },
  reorder: { text: "จัดลำดับ", className: "bg-slate-100 text-slate-800 border-slate-200" },
  approve: { text: "อนุมัติสิทธิ์", className: "bg-purple-100 text-purple-800 border-purple-200" },
  role_change: { text: "เปลี่ยนสิทธิ์", className: "bg-purple-100 text-purple-800 border-purple-200" },
};

const ENTITY_LABEL: Record<string, string> = {
  project: "โครงการ",
  phase: "เฟสงาน",
  update: "รายงานความคืบหน้า",
  calendar_event: "ปฏิทิน",
  risk: "ความเสี่ยง",
  unit: "หน่วยบริการ",
  resource_link: "ลิงก์ส่วนกลาง",
  user: "ผู้ใช้งาน",
};

type AuditRow = Awaited<ReturnType<typeof getAuditLog>>["rows"][number];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function AuditPage() {
  const { data: auth, isLoading: authLoading } = useAuthStatus();
  const isSuper = auth?.unlocked && auth.role === "super_admin";
  const [entity, setEntity] = useState("all");
  const [search, setSearch] = useState("");

  const query = useInfiniteQuery({
    queryKey: ["audit-log"],
    enabled: !!isSuper,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => getAuditLog({ data: { limit: PAGE_SIZE, before: pageParam } }),
    getNextPageParam: (last) =>
      last.rows.length === PAGE_SIZE ? last.rows[last.rows.length - 1].id : undefined,
  });

  const rows = useMemo(() => {
    const all = query.data?.pages.flatMap((p) => p.rows) ?? [];
    const q = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (entity === "all" || r.entity === entity) &&
        (!q ||
          [r.summary, r.actor_email, r.project_title]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))),
    );
  }, [query.data, entity, search]);

  let body;
  if (authLoading) {
    body = <p className="p-8 text-center text-muted-foreground">กำลังโหลด...</p>;
  } else if (!isSuper) {
    body = (
      <p className="p-8 text-center text-muted-foreground">
        หน้านี้สำหรับผู้ดูแลระบบ (Super Admin) เท่านั้น
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อรายการ ผู้ใช้ หรือโครงการ"
              className="pl-9"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภทข้อมูล</SelectItem>
              {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <p className="p-8 text-center text-muted-foreground">กำลังโหลดประวัติ...</p>
        ) : query.isError ? (
          <p className="p-8 text-center text-destructive">
            โหลดประวัติไม่สำเร็จ: {(query.error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            ยังไม่มีประวัติการแก้ไขที่ตรงกับเงื่อนไข
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <AuditItem key={r.id} row={r} />
            ))}
          </ul>
        )}

        {query.hasNextPage && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? "กำลังโหลด..." : "โหลดรายการก่อนหน้า"}
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <History className="size-7 text-brand" /> ประวัติการแก้ไขข้อมูล
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            บันทึกว่าใครเพิ่ม แก้ไข หรือลบข้อมูลอะไร เมื่อไร (ล่าสุดอยู่บนสุด)
          </p>
        </div>
        {body}
      </main>
    </div>
  );
}

function AuditItem({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const action = ACTION_LABEL[row.action] ?? {
    text: row.action,
    className: "bg-muted text-foreground",
  };
  return (
    <li className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className={action.className}>
          {action.text}
        </Badge>
        <span className="text-muted-foreground">{ENTITY_LABEL[row.entity] ?? row.entity}</span>
        <span className="font-medium">{row.summary ?? "-"}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{formatWhen(row.created_at)}</span>
        <span>โดย {row.actor_email}</span>
        {row.project_id && (
          <Link
            to="/projects/$projectId"
            params={{ projectId: row.project_id }}
            className="text-primary hover:underline"
          >
            {row.project_title ?? "ดูโครงการ"}
          </Link>
        )}
        {row.details && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-primary hover:underline"
          >
            {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
          </button>
        )}
      </div>
      {open && row.details && (
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(JSON.parse(row.details), null, 2)}
        </pre>
      )}
    </li>
  );
}
