"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { PLAN_PRICES } from "@solune/types";
import { Wifi, WifiOff, Clock, CreditCard } from "lucide-react";

function StatusDot({ state }: { state: string }) {
  if (state === "RUNNING") return <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-medium"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Online</span>;
  if (state === "STOPPED") return <span className="inline-flex items-center gap-1.5 text-[#888888] text-sm"><span className="w-2 h-2 rounded-full bg-[#888888]" />Offline</span>;
  if (state === "PROVISIONING") return <span className="inline-flex items-center gap-1.5 text-blue-400 text-sm"><span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />Setting up…</span>;
  if (state === "FAILED") return <span className="inline-flex items-center gap-1.5 text-rose-400 text-sm"><span className="w-2 h-2 rounded-full bg-rose-400" />Error</span>;
  return <span className="inline-flex items-center gap-1.5 text-[#888888] text-sm"><span className="w-2 h-2 rounded-full bg-[#5a5a5a]" />Pending</span>;
}

export default function DashboardPage() {
  const { data: account } = useSWR("/client/me", () => api.get<any>("/client/me"), { refreshInterval: 30000 });

  if (!account) return <div className="text-[#5a5a5a] text-sm">Loading…</div>;

  const inst = account.instance;
  const mrr = PLAN_PRICES[account.plan as keyof typeof PLAN_PRICES] ?? 0;
  const lastBilling = account.billingRecords?.[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">{account.businessName}</h1>
        <p className="text-[#888888] text-sm mt-1">{account.billingEmail}</p>
      </div>

      {/* Agent status hero */}
      <div className={`rounded-[12px] border p-6 mb-6 ${
        inst?.state === "RUNNING" ? "bg-emerald-500/5 border-emerald-500/20" :
        inst?.state === "FAILED"  ? "bg-rose-500/5 border-rose-500/20" :
        "bg-[#1a1a1a] border-[#2a2a2a]"
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Hermes Agent</p>
            {inst ? <StatusDot state={inst.state} /> : <span className="text-[#5a5a5a] text-sm">Not provisioned</span>}
            {inst?.subdomain && (
              <p className="text-[#5a5a5a] text-xs font-mono mt-2">{inst.subdomain}</p>
            )}
          </div>
          {inst?.state === "RUNNING" ? <Wifi size={20} className="text-emerald-400" /> : <WifiOff size={20} className="text-[#5a5a5a]" />}
        </div>

        {inst?.state === "PROVISIONING" && (
          <p className="text-blue-400 text-xs mt-4">
            Your agent is being set up. This usually takes 5–10 minutes. This page will update automatically.
          </p>
        )}
        {!inst && (
          <p className="text-[#5a5a5a] text-xs mt-4">
            Your environment is being prepared. Contact support if this persists.
          </p>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Plan</p>
          <p className="text-white font-semibold">{account.plan}</p>
          <p className="text-[#faff69] text-sm mt-1">R{(mrr / 100).toLocaleString("en-ZA")}/mo</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Last payment</p>
          {lastBilling ? (
            <>
              <p className="text-white font-semibold">R{(lastBilling.amount / 100).toFixed(2)}</p>
              <p className={`text-xs mt-1 ${lastBilling.status === "PAID" ? "text-emerald-400" : "text-rose-400"}`}>
                {lastBilling.status}
              </p>
            </>
          ) : (
            <p className="text-[#5a5a5a] text-sm">No payments yet</p>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Member since</p>
          <p className="text-white font-semibold">{new Date(account.createdAt).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <a href="/knowledge" className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5 hover:bg-[#242424] hover:border-[#3a3a3a] transition-colors group">
          <p className="text-white font-semibold text-sm mb-1 group-hover:text-[#faff69] transition-colors">Configure your agent →</p>
          <p className="text-[#5a5a5a] text-xs">Update FAQ, business hours, services and tone</p>
        </a>
        <a href="/billing" className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5 hover:bg-[#242424] hover:border-[#3a3a3a] transition-colors group">
          <p className="text-white font-semibold text-sm mb-1 group-hover:text-[#faff69] transition-colors">View billing history →</p>
          <p className="text-[#5a5a5a] text-xs">Invoices, payment status, make a payment</p>
        </a>
      </div>
    </div>
  );
}
