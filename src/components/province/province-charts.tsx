import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PieChart as PieChartIcon, Wallet } from "lucide-react";

interface ProvinceChartsProps {
  barChartData: { name: string; count: number }[];
  pieChartData: { name: string; value: number; color: string }[];
  budgetPieData: { name: string; value: number; color: string }[];
  budgetFilter: string;
  onBudgetFilterChange: (value: string) => void;
}

export function ProvinceCharts({
  barChartData,
  pieChartData,
  budgetPieData,
  budgetFilter,
  onBudgetFilterChange,
}: ProvinceChartsProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Projects by District */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">จำนวนโครงการแบ่งตามอำเภอ</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="จำนวนโครงการ" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Project Status */}
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
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Budget Source */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-neutral-500" />
            แหล่งงบประมาณ
          </h3>
          <select
            value={budgetFilter}
            onChange={(e) => onBudgetFilterChange(e.target.value)}
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
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
