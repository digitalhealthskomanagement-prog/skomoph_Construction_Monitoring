import { FolderOpen, NotebookPen, ExternalLink, Link2, FileText, Table2, Image as ImageIcon } from "lucide-react";
import type { ResourceLink } from "@/lib/project-query";

const ICONS = {
  folder: FolderOpen,
  notebook: NotebookPen,
  doc: FileText,
  sheet: Table2,
  image: ImageIcon,
  link: Link2,
} as const;

export const RESOURCE_ICON_OPTIONS = [
  { value: "folder", label: "โฟลเดอร์ / ไดรฟ์" },
  { value: "notebook", label: "สมุดบันทึก / AI" },
  { value: "doc", label: "เอกสาร" },
  { value: "sheet", label: "ตาราง" },
  { value: "image", label: "รูปภาพ / แบบแปลน" },
  { value: "link", label: "ลิงก์ทั่วไป" },
] as const;

const ACCENTS = [
  "from-brand/15 to-brand/5 text-primary",
  "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400",
  "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  "from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400",
];

export function TeamResources({ links }: { links: ResourceLink[] }) {
  return (
    <section className="rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">ทรัพยากรทีมงาน</h2>
        <span className="text-xs text-muted-foreground">เฉพาะผู้เข้าสู่ระบบ</span>
      </div>
      {links.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          ยังไม่มีลิงก์ทรัพยากร — เพิ่มได้ที่หน้า “ตั้งค่าโครงการ”
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((r, i) => {
            const Icon = ICONS[(r.icon as keyof typeof ICONS) in ICONS ? (r.icon as keyof typeof ICONS) : "link"];
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${ACCENTS[i % ACCENTS.length]} p-4 transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-background/80 shadow-sm">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      {r.label}
                      <ExternalLink className="size-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
                    </div>
                    {r.description && <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
