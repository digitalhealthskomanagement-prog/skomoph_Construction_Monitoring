import { Building2, MapPin, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface UnitCardGridProps {
  activeProjects: any[];
  activeUnits: any[];
  filteredUnits: any[];
  filteredProjects: any[];
  selectedUnitId: string | null;
  searchTerm: string;
  onSelectUnit: (id: string | null) => void;
  onSearchChange: (value: string) => void;
}

export function UnitCardGrid({
  activeProjects,
  activeUnits,
  filteredUnits,
  filteredProjects,
  selectedUnitId,
  searchTerm,
  onSelectUnit,
  onSearchChange,
}: UnitCardGridProps) {
  const selectedUnit = selectedUnitId ? activeUnits.find((u) => u.id === selectedUnitId) : null;

  return (
    <section>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {selectedUnitId ? (
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => onSelectUnit(null)}
                className="text-brand hover:underline text-sm font-medium"
              >
                &larr; กลับไปดูหน่วยบริการทั้งหมด
              </button>
            </div>
          ) : null}
          <h2 className="text-2xl font-bold text-neutral-900">
            {selectedUnit ? selectedUnit.name : "หน่วยบริการที่มีโครงการก่อสร้าง"}
          </h2>
          <p className="text-neutral-500">
            {selectedUnit ? "โครงการก่อสร้างภายในหน่วยบริการนี้" : "เลือกหน่วยบริการเพื่อดูโครงการก่อสร้าง"}
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={selectedUnitId ? "ค้นหาโครงการ..." : "ค้นหาหน่วยบริการ..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
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
              const unitProjects = activeProjects.filter((p) => p.unit_id === u.id);
              const unitBudget = unitProjects.reduce((sum, p) => sum + (p.budget_baht || 0), 0);
              const unitProgress =
                unitProjects.length > 0
                  ? unitProjects.reduce((sum, p) => sum + p.total_progress, 0) / unitProjects.length
                  : 0;

              return (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUnit(u.id);
                    onSearchChange("");
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
                        <span>{u.district ? `อ.${u.district}` : "สระแก้ว"}</span>
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
                      <p className="font-semibold text-neutral-900">
                        {new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(unitBudget / 1_000_000)} ลบ.
                      </p>
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
      ) : filteredProjects.length === 0 ? (
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
                  src={
                    project.hero_url ||
                    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1600&q=80"
                  }
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
                  <span>{project.district ? `อ.${project.district}` : "สระแก้ว"}</span>
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
  );
}
