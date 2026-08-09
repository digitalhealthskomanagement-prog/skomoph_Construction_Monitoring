import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { UpdateComposer, UpdatesList } from "@/components/updates";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { projectQuery } from "@/lib/project-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Megaphone } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/updates")({
  loader: async ({ context, params }: any) => {
    const query = projectQuery(params.projectId);
    await context.queryClient.ensureQueryData(query);
    return { query };
  },
  head: () => ({
    meta: [
      { title: "รายงานความคืบหน้าโครงการ" },
      { name: "description", content: "รายงานการปฏิบัติงานและรูปถ่ายหน้างานความคืบหน้าล่าสุด" },
    ],
  }),
  component: ProjectUpdatesPage,
});

function ProjectUpdatesPage() {
  const { query } = Route.useLoaderData() as any;
  const { data } = useSuspenseQuery(query);
  const { data: auth } = useAuthStatus();
  const params = Route.useParams() as any;
  const editable = !!auth?.unlocked;

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <Link to={`/projects/${params.projectId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" /> กลับสู่หน้าหลักโครงการ
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Megaphone className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
              รายงานความคืบหน้าหน้างาน
            </h1>
            <p className="text-sm text-neutral-500">
              {data.settings?.title || "โครงการก่อสร้าง"}
            </p>
          </div>
        </div>

        <div className="grid gap-8">
          {editable && (
            <section className="space-y-3">
              <UpdateComposer phases={data.phases} />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-neutral-900">ประวัติรายงานทั้งหมด ({data.updates?.length || 0})</h2>
            <UpdatesList updates={data.updates} phases={data.phases} editable={editable} />
          </section>
        </div>
      </main>
    </div>
  );
}
