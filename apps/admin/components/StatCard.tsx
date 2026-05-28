interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  yellow?: boolean;
}

export function StatCard({ label, value, sub, yellow = false }: StatCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
      <p className="text-[#888888] text-xs font-medium uppercase tracking-widest mb-3">{label}</p>
      <p className={`text-4xl font-bold tracking-tight ${yellow ? "text-[#faff69]" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[#888888] text-sm mt-2">{sub}</p>}
    </div>
  );
}
