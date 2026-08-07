import { createFileRoute, Link } from "@tanstack/react-router";
import { allProjectsQuery } from "@/lib/project-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search, Activity, Wallet, PieChart as PieChartIcon } from "lucide-react";
import { ProjectMap } from "@/components/ProjectMap";
import { SiteHeader } from "@/components/site-header";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allProjectsQuery);
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  const { data: allProjects } = useSuspenseQuery(allProjectsQuery);
  
  // Filter active projects only (is_active = true)
  const activeProjects = allProjects.filter((p) => p.is_active);

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
        {activeProjects.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          </section>
        )}
        {/* Map Section */}
        <section>
          <ProjectMap projects={activeProjects} />
        </section>

        <section>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">

            <div>
              <h2 className="text-2xl font-bold text-neutral-900">โครงการก่อสร้างที่กำลังดำเนินการ</h2>
              <p className="text-neutral-500">ติดตามความคืบหน้าโครงการก่อสร้างของหน่วยบริการในจังหวัดสระแก้ว</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="ค้นหาหน่วยบริการ หรือ โครงการ..." 
                className="pl-9 pr-4 py-2 border rounded-full text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {activeProjects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center text-neutral-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>ยังไม่มีโครงการก่อสร้างที่กำลังดำเนินการ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProjects.map((project) => (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`}
                  className="group bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                  <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                    {project.hero_image_path ? (
                      <img 
                        src={`https://your-supabase-url/storage/v1/object/public/settings/${project.hero_image_path}`} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('bg-neutral-200');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-neutral-50">
                        <Building2 className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs font-medium px-4 text-center">{project.unit_name}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-primary rounded-full shadow-sm">
                        {project.unit_type}
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
          )}
        </section>
      </main>
    </div>
  );
}
