"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { PLAN_PRICES } from "@solune/types";
import { CreditCard } from "lucide-react";
import { useRef, useEffect, useState } from "react";

declare global {
  interface Window {
    YocoSDK: new (opts: { publicKey: string }) => {
      showPopup: (opts: { amountInCents: number; currency: string; name: string; description: string; callback: (r: any) => void }) => void;
    };
  }
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "text-emerald-400",
  FAILED: "text-rose-400",
  PENDING: "text-amber-400",
  REFUNDED: "text-blue-400",
};

export default function BillingPage() {
  const { data: me } = useSWR("/client/me", () => api.get<any>("/client/me"));
  const { data: records = [], mutate } = useSWR("/client/billing", () => api.get<any[]>("/client/billing"));
  const yocoReady = useRef(false);
  const [charging, setCharging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (yocoReady.current) return;
    const s = document.createElement("script");
    s.src = "https://js.yoco.com/sdk/v1/yoco-sdk-web.js";
    s.onload = () => { yocoReady.current = true; };
    document.head.appendChild(s);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function openYoco() {
    if (!me || !yocoReady.current || !window.YocoSDK) { showToast("Payment SDK not loaded yet.", false); return; }
    const amountInCents = PLAN_PRICES[me.plan as keyof typeof PLAN_PRICES] ?? 0;
    const yoco = new window.YocoSDK({ publicKey: process.env.NEXT_PUBLIC_YOCO_PUBLIC_KEY ?? "" });
    yoco.showPopup({
      amountInCents,
      currency: "ZAR",
      name: "Solune Cloud",
      description: `${me.plan} plan — ${me.businessName}`,
      callback: async (result) => {
        if (result.error) { showToast(result.error.message, false); return; }
        setCharging(true);
        try {
          await api.post("/client/billing/charge", { token: result.id });
          showToast(`R${(amountInCents / 100).toLocaleString("en-ZA")} paid successfully`);
          mutate();
        } catch (e: any) {
          showToast(e?.message ?? "Payment failed", false);
        } finally {
          setCharging(false);
        }
      },
    });
  }

  const mrr = me ? (PLAN_PRICES[me.plan as keyof typeof PLAN_PRICES] ?? 0) : 0;

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[8px] text-sm font-medium shadow-lg ${toast.ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing</h1>
          <p className="text-[#888888] text-sm mt-1">Payment history and account plan</p>
        </div>
        <button
          onClick={openYoco}
          disabled={charging}
          className="inline-flex items-center gap-2 h-9 px-4 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
        >
          <CreditCard size={14} />
          {charging ? "Processing…" : `Pay R${(mrr / 100).toLocaleString("en-ZA")}`}
        </button>
      </div>

      {/* Plan card */}
      {me && (
        <div className="bg-[#1a1a1a] border border-[#faff69]/20 rounded-[12px] p-6 mb-6 flex items-center justify-between">
          <div>
            <p className="text-[#888888] text-xs uppercase tracking-widest mb-1">Current plan</p>
            <p className="text-white font-semibold text-lg">{me.plan}</p>
          </div>
          <p className="text-[#faff69] text-2xl font-bold">R{(mrr / 100).toLocaleString("en-ZA")}<span className="text-[#888888] text-sm font-normal">/mo</span></p>
        </div>
      )}

      {/* History table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold text-sm">Payment history</h2>
        </div>
        {records.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">No payments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Amount", "Status", "Reference", "Date"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[#888888] text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} className="border-b border-[#2a2a2a] last:border-0">
                  <td className="px-6 py-4 text-white font-medium">R{(r.amount / 100).toFixed(2)}</td>
                  <td className={`px-6 py-4 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "text-[#888888]"}`}>{r.status}</td>
                  <td className="px-6 py-4 text-[#5a5a5a] text-xs font-mono">{r.paystackReference ?? "—"}</td>
                  <td className="px-6 py-4 text-[#888888] text-xs">{new Date(r.billedAt).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
