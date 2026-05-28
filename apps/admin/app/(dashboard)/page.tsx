"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PLAN_PRICES } from "@solune/types";
import Link from "next/link";

export default function OverviewPage() {
  const { data: accounts = [] } = useSWR("/accounts", () => api.get<any[]>("/accounts"));

  const active = accounts.filter((a) => a.status === "ACTIVE");
  const running = accounts.filter((a) => a.instance?.state === "RUNNING");
  const mrr = active.reduce((sum: number, a: any) => sum + (PLAN_PRICES[a.plan as keyof typeof PLAN_PRICES] ?? 0), 0);
  const mrrDisplay = `R${(mrr / 100).toLocaleString("en-ZA")}`;

  const recent = [...accounts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div>
      <PageHeader title="Overview" sub="Solune Cloud — operator view" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="MRR" value={mrrDisplay} yellow sub={`${active.length} paying clients`} />
        <StatCard label="Active Clients" value={active.length} sub="on a paid plan" />
        <StatCard label="Instances Running" value={running.length} sub="of all provisioned" />
        <StatCard label="Total Accounts" value={accounts.length} sub="all time" />
      </div>

      {/* Recent accounts */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold text-sm">Recent accounts</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">No accounts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Business", "Plan", "Status", "Instance", "Created"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[#888888] text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((a: any) => (
                <tr key={a.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#242424] transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/clients/${a.id}`} className="text-white font-medium hover:text-[#faff69] transition-colors">
                      {a.businessName}
                    </Link>
                    <p className="text-[#5a5a5a] text-xs mt-0.5">{a.billingEmail}</p>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={a.plan} /></td>
                  <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                  <td className="px-6 py-4">
                    {a.instance ? <StatusBadge status={a.instance.state} /> : <span className="text-[#5a5a5a] text-xs">not provisioned</span>}
                  </td>
                  <td className="px-6 py-4 text-[#888888] text-xs">
                    {new Date(a.createdAt).toLocaleDateString("en-ZA")}
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
