"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

const ACTOR_COLORS: Record<string, string> = {
  ADMIN: "text-[#faff69]",
  SYSTEM: "text-blue-400",
  CLIENT: "text-emerald-400",
};

export default function AuditPage() {
  const { data: logs = [], isLoading } = useSWR("/audit", () => api.get<any[]>("/audit"), {
    refreshInterval: 15000,
  });
  const [actorFilter, setActorFilter] = useState("ALL");

  const filtered = actorFilter === "ALL" ? logs : logs.filter((l: any) => l.actorType === actorFilter);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        sub={`${logs.length} total entries`}
        action={
          <div className="flex gap-1">
            {["ALL", "ADMIN", "SYSTEM", "CLIENT"].map((f) => (
              <button
                key={f}
                onClick={() => setActorFilter(f)}
                className={`h-8 px-3 text-xs rounded-[6px] transition-colors border ${
                  actorFilter === f
                    ? "bg-[#faff69] text-[#0a0a0a] border-[#faff69] font-semibold"
                    : "bg-[#1a1a1a] text-[#888888] border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">No audit entries found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Actor", "Action", "Account", "Metadata", "Time"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[#888888] text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#242424] transition-colors">
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold ${ACTOR_COLORS[log.actorType] ?? "text-[#888888]"}`}>
                      {log.actorType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white text-xs font-mono">{log.action}</td>
                  <td className="px-6 py-4 text-[#888888] text-xs">
                    {log.account?.businessName ?? <span className="text-[#5a5a5a]">—</span>}
                  </td>
                  <td className="px-6 py-4 text-[#5a5a5a] text-xs font-mono max-w-xs truncate">
                    {Object.keys(log.metadata ?? {}).length > 0
                      ? JSON.stringify(log.metadata)
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-[#888888] text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-ZA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
