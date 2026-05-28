"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import Link from "next/link";

export default function OperationsPage() {
  const { data: accounts = [], isLoading } = useSWR("/accounts", () => api.get<any[]>("/accounts"), {
    refreshInterval: 30000,
  });

  const provisioned = accounts.filter((a: any) => a.instance);
  const running = provisioned.filter((a: any) => a.instance?.state === "RUNNING");
  const stopped = provisioned.filter((a: any) => a.instance?.state === "STOPPED");
  const failed = provisioned.filter((a: any) => a.instance?.state === "FAILED");

  return (
    <div>
      <PageHeader
        title="Operations"
        sub="Live instance health across all clients"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Provisioned" value={provisioned.length} sub="total instances" />
        <StatCard label="Running" value={running.length} yellow sub="currently active" />
        <StatCard label="Stopped" value={stopped.length} sub="not consuming compute" />
        <StatCard label="Failed" value={failed.length} sub="needs attention" />
      </div>

      {isLoading ? (
        <div className="text-[#5a5a5a] text-sm">Loading instances…</div>
      ) : provisioned.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] px-6 py-12 text-center text-[#5a5a5a] text-sm">
          No instances provisioned yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {provisioned.map((a: any) => {
            const inst = a.instance;
            const isRunning = inst.state === "RUNNING";
            const isFailed = inst.state === "FAILED";
            return (
              <Link
                key={a.id}
                href={`/clients/${a.id}`}
                className={`bg-[#1a1a1a] border rounded-[12px] p-5 hover:bg-[#242424] transition-colors ${
                  isFailed ? "border-rose-500/40" : isRunning ? "border-emerald-500/20" : "border-[#2a2a2a]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-semibold text-sm">{a.businessName}</p>
                    <p className="text-[#5a5a5a] text-xs mt-0.5">{a.billingEmail}</p>
                  </div>
                  <StatusBadge status={inst.state} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                  <div>
                    <p className="text-[#5a5a5a] text-xs">IP</p>
                    <p className="text-white text-xs font-mono mt-0.5">{inst.publicIp ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#5a5a5a] text-xs">Region</p>
                    <p className="text-white text-xs font-mono mt-0.5">{inst.region}</p>
                  </div>
                  <div>
                    <p className="text-[#5a5a5a] text-xs">Subdomain</p>
                    <p className="text-white text-xs font-mono mt-0.5">{inst.subdomain ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[#5a5a5a] text-xs">Plan</p>
                    <p className="text-white text-xs mt-0.5">{a.plan}</p>
                  </div>
                </div>

                {inst.awsInstanceId && (
                  <p className="text-[#5a5a5a] text-xs font-mono mt-3 truncate">{inst.awsInstanceId}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
