import { createFileRoute, Link } from "@tanstack/react-router";
import { allProjectsQuery } from "@/lib/project-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search, Activity, Wallet, PieChart as PieChartIcon } from "lucide-react";
import { ProjectMap } from "@/components/ProjectMap";
import { SiteHeader } from "@/components/site-header";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import buildingHero from "@/assets/building-hero.png.asset.json";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allProjectsQuery);
  },
  component: DashboardComponent,
});

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function DashboardComponent() {
  const { data: allProjects } = useSuspenseQuery(allProjectsQuery);
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { getAllUnitsData } = await import("@/lib/data.functions");
      return getAllUnitsData();
    }
  });

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  
  // Filter active projects only (is_active = true)
  const activeProjects = allProjects.filter((p) => p.is_active && (budgetFilter === "all" || p.budget_source === budgetFilter));

  // --- Calculate Dashboard Stats ---
  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget_baht || 0), 0);
  const avgProgress = activeProjects.length > 0 
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
  let prep = 0, inProg = 0, done = 0;
  activeProjects.forEach(p => {
    if (p.total_progress === 0) prep++;
    else if (p.total_progress === 100) done++;
    else inProg++;
  });
  const pieChartData = [
    { name: "เตรียมการ", value: prep, color: "#94a3b8" },
    { name: "กำลังก่อสร้าง", value: inProg, color: "#3b82f6" },
    { name: "แล้วเสร็จ", value: done, color: "#22c55e" },
  ].filter(d => d.value > 0);

  // 3. Project Budget Source
  const budgetSourceCounts = activeProjects.reduce((acc, p) => {
    const s = p.budget_source || "ไม่ระบุ";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const budgetPieData = Object.entries(budgetSourceCounts)
    .map(([name, value], i) => ({ 
      name, 
      value, 
      color: ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"][i % 4] 
    }));

  // Filter logic for units or projects depending on state
  const displayedProjects = selectedUnitId ? activeProjects.filter(p => p.unit_id === selectedUnitId) : activeProjects;
  
  // Get units that have active projects
  const activeUnitIds = new Set(activeProjects.map(p => p.unit_id));
  const activeUnits = units?.filter(u => activeUnitIds.has(u.id)) || [];

  const filteredUnits = activeUnits.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.district && u.district.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProjects = displayedProjects.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.district && p.district.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <SiteHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Dashboard Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">โครงการทั้งหมด</p>
              <h3 className="text-2xl font-bold text-neutral-900">{activeProjects.length} <span className="text-base font-normal text-neutral-500">โครงการ</span></h3>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-full">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">งบประมาณรวม</p>
              <h3 className="text-2xl font-bold text-neutral-900">
                {new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(totalBudget / 1000000)} <span className="text-base font-normal text-neutral-500">ลบ.</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">ความคืบหน้าเฉลี่ย</p>
              <h3 className="text-2xl font-bold text-neutral-900">{avgProgress.toFixed(1)}%</h3>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        {allProjects.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-6">จำนวนโครงการแบ่งตามอำเภอ</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="จำนวนโครงการ" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-neutral-500" />
                สถานะการดำเนินการ
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-neutral-500" />
                  แหล่งงบประมาณ
                </h3>
                <select
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  className="text-sm border border-neutral-200 rounded-md p-1 focus:ring-brand focus:border-brand"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="ไม่ระบุ">ไม่ระบุ</option>
                  <option value="เงินบำรุงของหน่วยบริการ">เงินบำรุงของหน่วยบริการ</option>
                  <option value="เงินงบประมาณ">เงินงบประมาณ</option>
                  <option value="งบค่าเสื่อม">งบค่าเสื่อม</option>
                </select>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {budgetPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
        {/* Map Section */}
        <section>
          <ProjectMap projects={activeProjects} />
        </section>

        <section>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">

            <div>
              {selectedUnitId ? (
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSelectedUnitId(null)} className="text-brand hover:underline text-sm font-medium">
                    &larr; กลับไปดูหน่วยบริการทั้งหมด
                  </button>
                </div>
              ) : null}
              <h2 className="text-2xl font-bold text-neutral-900">
                {selectedUnitId ? activeUnits.find(u => u.id === selectedUnitId)?.name : "หน่วยบริการที่มีโครงการก่อสร้าง"}
              </h2>
              <p className="text-neutral-500">
                {selectedUnitId ? "โครงการก่อสร้างภายในหน่วยบริการนี้" : "เลือกหน่วยบริการเพื่อดูโครงการก่อสร้าง"}
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder={selectedUnitId ? "ค้นหาโครงการ..." : "ค้นหาหน่วยบริการ..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-full text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {!selectedUnitId ? (
            activeUnits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center text-neutral-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p>ยังไม่มีโครงการก่อสร้างที่กำลังดำเนินการ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUnits.map((u) => {
                  const unitProjects = activeProjects.filter(p => p.unit_id === u.id);
                  const unitBudget = unitProjects.reduce((sum, p) => sum + (p.budget_baht || 0), 0);
                  const unitProgress = unitProjects.length > 0 
                    ? unitProjects.reduce((sum, p) => sum + p.total_progress, 0) / unitProjects.length 
                    : 0;

                  return (
                    <div 
                      key={u.id}
                      onClick={() => {
                        setSelectedUnitId(u.id);
                        setSearchTerm("");
                      }}
                      className="group bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer p-6"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-4 bg-brand/10 text-brand rounded-full">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900 group-hover:text-primary transition-colors line-clamp-2">
                            {u.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{u.district ? `อ.${u.district}` : 'สระแก้ว'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                        <div>
                          <p className="text-xs font-medium text-neutral-500 mb-1">โครงการ</p>
                          <p className="font-semibold text-neutral-900">{unitProjects.length} โครงการ</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-500 mb-1">งบประมาณรวม</p>
                          <p className="font-semibold text-neutral-900">{new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(unitBudget / 1000000)} ลบ.</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-end justify-between mb-2">
                          <span className="text-xs font-medium text-neutral-500">ความคืบหน้าเฉลี่ย</span>
                          <span className="text-sm font-bold text-neutral-900">{unitProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${unitProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            filteredProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center text-neutral-500">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                <p>ไม่พบโครงการจากการค้นหา</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="group bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                  >
                    <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                      <img 
                        src={project.hero_url || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80"} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-primary rounded-full shadow-sm">
                          {project.unit_type || "สสจ."}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-neutral-900 group-hover:text-primary transition-colors line-clamp-2 mb-1">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{project.district ? `อ.${project.district}` : 'สระแก้ว'}</span>
                      </div>
                      
                      <div className="mt-auto">
                        <div className="flex items-end justify-between mb-2">
                          <span className="text-xs font-medium text-neutral-500">ความคืบหน้า</span>
                          <span className="text-sm font-bold text-neutral-900">{project.total_progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${project.total_progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </section>
      </main>
    </div>
  );
}
