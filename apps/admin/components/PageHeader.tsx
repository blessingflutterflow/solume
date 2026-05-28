interface PageHeaderProps {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, sub, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {sub && <p className="text-[#888888] text-sm mt-1">{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
