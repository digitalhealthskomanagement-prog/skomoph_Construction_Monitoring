import { createFileRoute, Link } from "@tanstack/react-router";
import { allProjectsQuery } from "@/lib/project-query";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { ProvinceStats, ProvinceCharts, UnitCardGrid } from "@/components/province";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allProjectsQuery);
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  const { data: allProjects } = useSuspenseQuery(allProjectsQuery);
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    },
  });

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");

  // Filter active projects only (is_active = true)
  const activeProjects = allProjects.filter(
    (p) => p.is_active && (budgetFilter === "all" || p.budget_source === budgetFilter)
  );

  // --- Calculate Dashboard Stats ---
  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget_baht || 0), 0);
  const avgProgress =
    activeProjects.length > 0
      ? activeProjects.reduce((sum, p) => sum + p.total_progress, 0) / activeProjects.length
      : 0;

  // --- Prepare Chart Data ---
  // 1. Projects by District
  const districtCounts = activeProjects.reduce((acc, p) => {
    const d = p.district || "ไม่ระบุ";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const barChartData = Object.entries(districtCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 2. Project Status
  let prep = 0,
    inProg = 0,
    done = 0;
  activeProjects.forEach((p) => {
    if (p.total_progress === 0) prep++;
    else if (p.total_progress === 100) done++;
    else inProg++;
  });
  const pieChartData = [
    { name: "เตรียมการ", value: prep, color: "#94a3b8" },
    { name: "กำลังก่อสร้าง", value: inProg, color: "#3b82f6" },
    { name: "แล้วเสร็จ", value: done, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  // 3. Project Budget Source
  const budgetSourceCounts = activeProjects.reduce((acc, p) => {
    const s = p.budget_source || "ไม่ระบุ";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const budgetPieData = Object.entries(budgetSourceCounts).map(([name, value], i) => ({
    name,
    value,
    color: ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"][i % 4],
  }));

  // Filter logic for units or projects depending on state
  const displayedProjects = selectedUnitId
    ? activeProjects.filter((p) => p.unit_id === selectedUnitId)
    : activeProjects;

  // Get units that have active projects
  const activeUnitIds = new Set(activeProjects.map((p) => p.unit_id));
  const activeUnits = units?.filter((u) => activeUnitIds.has(u.id)) || [];

  const filteredUnits = activeUnits.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.district && u.district.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProjects = displayedProjects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.district && p.district.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {activeProjects.length === 0 && (!units || units.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3.5 rounded-xl flex items-start gap-3 text-sm shadow-sm">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-base">ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้</p>
              <p className="text-sm text-amber-800 mt-1">
                ระบบไม่สามารถเชื่อมต่อไปยัง Supabase ได้ (หากเป็นโปรเจกต์ Free Tier อาจถูก Pause ชั่วคราวเนื่องจากไม่ได้ใช้งานเกิน 7 วัน กรุณาเข้าไปที่ Supabase Dashboard แล้วกด <strong>Restore Project</strong>)
              </p>
            </div>
          </div>
        )}

        {/* Welcome & Manual Banner */}
        <div className="rounded-2xl border border-brand/20 bg-linear-to-r from-brand/10 via-brand/5 to-transparent p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
              <BookOpen className="size-3.5" /> ระบบติดตามงานก่อสร้าง 127 หน่วยงาน จ.สระแก้ว
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              คู่มือการใช้งานระบบและการบันทึกข้อมูล
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-xl">
              ขั้นตอนการลงทะเบียนสำหรับหน่วยงาน, การแบ่งงวดงาน S-Curve, การลงปฏิทินงานก่อสร้าง และการอัปโหลดภาพรายงานหน้างาน
            </p>
          </div>
          <Link to="/guide" className="shrink-0">
            <Button className="bg-brand text-brand-foreground hover:bg-brand/90 gap-2 shadow-sm">
              <BookOpen className="size-4" /> ดูคู่มือการใช้งาน &rarr;
            </Button>
          </Link>
        </div>

        {/* 1. Dashboard Summary Cards */}
        <ProvinceStats
          totalProjects={activeProjects.length}
          totalBudget={totalBudget}
          avgProgress={avgProgress}
        />

        {/* 2. Charts Section */}
        {allProjects.length > 0 && (
          <ProvinceCharts
            barChartData={barChartData}
            pieChartData={pieChartData}
            budgetPieData={budgetPieData}
            budgetFilter={budgetFilter}
            onBudgetFilterChange={setBudgetFilter}
          />
        )}

        {/* 3. Units & Projects Grid */}
        <UnitCardGrid
          activeProjects={activeProjects}
          activeUnits={activeUnits}
          filteredUnits={filteredUnits}
          filteredProjects={filteredProjects}
          selectedUnitId={selectedUnitId}
          searchTerm={searchTerm}
          onSelectUnit={setSelectedUnitId}
          onSearchChange={setSearchTerm}
        />
      </main>
    </div>
  );
}
