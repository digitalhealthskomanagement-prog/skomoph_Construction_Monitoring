import { Building2, Wallet, Activity } from "lucide-react";

interface ProvinceStatsProps {
  totalProjects: number;
  totalBudget: number;
  avgProgress: number;
}

export function ProvinceStats({ totalProjects, totalBudget, avgProgress }: ProvinceStatsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
        <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">โครงการทั้งหมด</p>
          <h3 className="text-2xl font-bold text-neutral-900">
            {totalProjects} <span className="text-base font-normal text-neutral-500">โครงการ</span>
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
        <div className="p-4 bg-green-50 text-green-600 rounded-full">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-500">งบประมาณรวม</p>
          <h3 className="text-2xl font-bold text-neutral-900">
            {new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(totalBudget / 1_000_000)}{" "}
            <span className="text-base font-normal text-neutral-500">ลบ.</span>
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
  );
}
