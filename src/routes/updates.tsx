import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getProjectData } from "@/lib/data.functions";
import { SiteHeader } from "@/components/site-header";
import { UpdateComposer, UpdatesList } from "@/components/updates";
import { useAuthStatus } from "@/hooks/use-auth-status";

const projectQuery = queryOptions({
  queryKey: ["project-data"],
  queryFn: () => getProjectData(),
});

export const Route = createFileRoute("/updates")({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectQuery),
  head: () => ({
    meta: [
      { title: "รายงานความคืบหน้า — โครงการก่อสร้าง รพ.สรรคบุรี" },
      { name: "description", content: "รายงานความคืบหน้า ปัญหา และเหตุการณ์สำคัญของโครงการก่อสร้างอาคารผู้ป่วย 5 ชั้น จากทีมงาน" },
      { property: "og:title", content: "รายงานความคืบหน้าโครงการก่อสร้าง — รพ.สรรคบุรี" },
      { property: "og:description", content: "รายงานจากทีมงานภาคสนามและผู้บริหารโครงการ" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: UpdatesPage,
});

function UpdatesPage() {
  const { data } = useSuspenseQuery(projectQuery);
  const { data: auth } = useAuthStatus();
  const editable = !!auth?.unlocked;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">รายงานความคืบหน้า</h1>
          <p className="mt-1 text-sm text-muted-foreground">อัปเดตจากทีมงานภาคสนามและผู้บริหารโครงการ</p>
        </div>
        {editable && (
          <div className="mb-6">
            <UpdateComposer phases={data.phases} />
          </div>
        )}
        <UpdatesList updates={data.updates} phases={data.phases} editable={editable} />
      </main>
    </div>
  );
}
