import { createFileRoute, Link } from "@tanstack/react-router";
import { allProjectsQuery } from "@/lib/project-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search } from "lucide-react";
import { ProjectMap } from "@/components/ProjectMap";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(allProjectsQuery);
  },
  component: DashboardComponent,
});

function DashboardComponent() {
  const { data: allProjects } = useSuspenseQuery(allProjectsQuery);
  // Only show active projects (units that have ongoing construction)
  const activeProjects = allProjects.filter((p) => p.is_active);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-neutral-900">
                ระบบติดตามงานก่อสร้าง
              </h1>
              <p className="text-xs text-neutral-500">สำนักงานสาธารณสุขจังหวัดสระแก้ว</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
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
