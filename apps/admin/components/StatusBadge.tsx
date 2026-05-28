type Status =
  | "RUNNING" | "PENDING" | "PROVISIONING"
  | "STOPPED" | "TERMINATED" | "FAILED"
  | "ACTIVE" | "SUSPENDED" | "CANCELLED"
  | "STARTER" | "PRO" | "PREMIUM"
  | string;

const MAP: Record<string, string> = {
  RUNNING:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  ACTIVE:       "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING:      "bg-[#3a3a1f] text-[#faff69] border-[#faff69]/20",
  PROVISIONING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  STOPPED:      "bg-[#242424] text-[#888888] border-[#3a3a3a]",
  SUSPENDED:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FAILED:       "bg-rose-500/10 text-rose-400 border-rose-500/20",
  TERMINATED:   "bg-[#242424] text-[#5a5a5a] border-[#2a2a2a]",
  CANCELLED:    "bg-[#242424] text-[#5a5a5a] border-[#2a2a2a]",
  STARTER:      "bg-[#1a1a1a] text-[#888888] border-[#2a2a2a]",
  PRO:          "bg-[#3a3a1f] text-[#faff69] border-[#faff69]/20",
  PREMIUM:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export function StatusBadge({ status }: { status: Status }) {
  const cls = MAP[status] ?? "bg-[#1a1a1a] text-[#888888] border-[#2a2a2a]";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-medium border ${cls}`}>
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
