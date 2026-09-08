import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function ProgressDonut({ value, size = 220 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const data = [
    { name: "done", value: v },
    { name: "left", value: 100 - v },
  ];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill="var(--color-brand)" />
            <Cell fill="var(--color-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-4xl font-semibold text-foreground tabular-nums">{v.toFixed(1)}%</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">ความคืบหน้ารวม</div>
        </div>
      </div>
    </div>
  );
}
