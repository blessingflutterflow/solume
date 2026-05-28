"use client";

import { use, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { ChevronLeft, Play, Square, RotateCcw, Trash2, Zap, CreditCard, PenLine } from "lucide-react";
import { PLAN_PRICES } from "@solune/types";

declare global {
  interface Window {
    YocoSDK: new (opts: { publicKey: string }) => {
      showPopup: (opts: {
        amountInCents: number;
        currency: string;
        name: string;
        description: string;
        callback: (result: { id?: string; error?: { message: string } }) => void;
      }) => void;
    };
  }
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: account, mutate } = useSWR(`/accounts/${id}`, () => api.get<any>(`/accounts/${id}`));
  const yocoReady = useRef(false);
  const [charging, setCharging] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (yocoReady.current) return;
    const script = document.createElement("script");
    script.src = "https://js.yoco.com/sdk/v1/yoco-sdk-web.js";
    script.onload = () => { yocoReady.current = true; };
    document.head.appendChild(script);
  }, []);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function action(verb: string) {
    if (verb === "terminate" && !confirm(`Terminate ${account?.businessName}? This is irreversible.`)) return;
    await api.post(`/accounts/${id}/${verb}`);
    mutate();
  }

  function openYocoCharge() {
    if (!yocoReady.current || !window.YocoSDK) {
      showToast("Payment SDK not loaded yet, please retry.", false);
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_YOCO_PUBLIC_KEY ?? "";
    const amountInCents = PLAN_PRICES[account.plan as keyof typeof PLAN_PRICES] ?? 0;
    const yoco = new window.YocoSDK({ publicKey });
    yoco.showPopup({
      amountInCents,
      currency: "ZAR",
      name: "Solune Cloud",
      description: `${account.plan} plan — ${account.businessName}`,
      callback: async (result) => {
        if (result.error) {
          showToast(result.error.message, false);
          return;
        }
        setCharging(true);
        try {
          await api.post("/billing/charge", { accountId: id, token: result.id });
          showToast(`R${(amountInCents / 100).toLocaleString("en-ZA")} charged successfully`);
          mutate();
        } catch (e: any) {
          showToast(e?.message ?? "Charge failed", false);
        } finally {
          setCharging(false);
        }
      },
    });
  }

  async function recordManual() {
    setManualLoading(true);
    try {
      await api.post("/billing/manual", { accountId: id, note: manualNote || "Manual payment" });
      showToast("Manual payment recorded");
      setManualOpen(false);
      setManualNote("");
      mutate();
    } catch {
      showToast("Failed to record payment", false);
    } finally {
      setManualLoading(false);
    }
  }

  if (!account) return <div className="text-[#5a5a5a] text-sm">Loading...</div>;

  const inst = account.instance;
  const mrr = PLAN_PRICES[account.plan as keyof typeof PLAN_PRICES] ?? 0;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-[8px] text-sm font-medium shadow-lg transition-all ${
          toast.ok ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <Link href="/clients" className="inline-flex items-center gap-1.5 text-[#888888] text-sm hover:text-white mb-6 transition-colors">
        <ChevronLeft size={14} /> Back to clients
      </Link>

      <PageHeader
        title={account.businessName}
        sub={account.billingEmail}
        action={
          <div className="flex gap-2">
            <StatusBadge status={account.status} />
            {account.status === "ACTIVE"
              ? <button onClick={() => action("suspend")} className="h-9 px-4 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-sm rounded-[8px] hover:text-white hover:border-[#3a3a3a] transition-colors">Suspend</button>
              : <button onClick={() => action("reactivate")} className="h-9 px-4 bg-[#3a3a1f] border border-[#faff69]/20 text-[#faff69] text-sm rounded-[8px] hover:bg-[#faff69] hover:text-[#0a0a0a] transition-colors">Reactivate</button>
            }
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Plan</p>
          <p className="text-white font-semibold">{account.plan}</p>
          <p className="text-[#faff69] text-sm mt-1">R{(mrr / 100).toLocaleString("en-ZA")}/mo</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">Phone</p>
          <p className="text-white font-semibold">{account.phone ?? "—"}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-2">VAT Number</p>
          <p className="text-white font-semibold">{account.vatNumber ?? "—"}</p>
        </div>
      </div>

      {/* Instance */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] mb-6">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Instance</h2>
          {!inst && (
            <button
              onClick={() => action("provision")}
              className="inline-flex items-center gap-2 h-8 px-3 bg-[#faff69] text-[#0a0a0a] text-xs font-semibold rounded-[6px] hover:bg-[#e6eb52] transition-colors"
            >
              <Zap size={12} /> Provision
            </button>
          )}
        </div>
        {inst ? (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
              {[
                ["AWS ID",      inst.awsInstanceId ?? "—"],
                ["Public IP",   inst.publicIp ?? "—"],
                ["Region",      inst.region],
                ["Subdomain",   inst.subdomain ?? "—"],
                ["State",       null],
                ["Provisioned", inst.provisionedAt ? new Date(inst.provisionedAt).toLocaleString("en-ZA") : "—"],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-[#5a5a5a] text-xs mb-1">{label}</p>
                  {label === "State"
                    ? <StatusBadge status={inst.state} />
                    : <p className="text-white text-sm font-mono">{value as string}</p>
                  }
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4 border-t border-[#2a2a2a]">
              {inst.state === "STOPPED" && (
                <button onClick={() => action("start")} className="inline-flex items-center gap-2 h-8 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-[6px] hover:bg-emerald-500/20 transition-colors">
                  <Play size={12} /> Start
                </button>
              )}
              {inst.state === "RUNNING" && (<>
                <button onClick={() => action("stop")} className="inline-flex items-center gap-2 h-8 px-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-xs rounded-[6px] hover:text-white transition-colors">
                  <Square size={12} /> Stop
                </button>
                <button onClick={() => action("reboot")} className="inline-flex items-center gap-2 h-8 px-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-xs rounded-[6px] hover:text-white transition-colors">
                  <RotateCcw size={12} /> Reboot
                </button>
              </>)}
              {["RUNNING","STOPPED","FAILED"].includes(inst.state) && (
                <button onClick={() => action("terminate")} className="inline-flex items-center gap-2 h-8 px-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-[6px] hover:bg-rose-500/20 transition-colors ml-auto">
                  <Trash2 size={12} /> Terminate
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-[#5a5a5a] text-sm">
            No instance provisioned yet.
          </div>
        )}
      </div>

      {/* Billing */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px]">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Billing</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-2 h-8 px-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-xs rounded-[6px] hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              <PenLine size={12} /> Record payment
            </button>
            <button
              onClick={openYocoCharge}
              disabled={charging}
              className="inline-flex items-center gap-2 h-8 px-3 bg-[#faff69] text-[#0a0a0a] text-xs font-semibold rounded-[6px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
            >
              <CreditCard size={12} />
              {charging ? "Processing…" : `Charge R${(mrr / 100).toLocaleString("en-ZA")}`}
            </button>
          </div>
        </div>

        {/* Manual payment dialog */}
        {manualOpen && (
          <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#242424]">
            <p className="text-white text-xs font-semibold mb-3">Record manual / EFT payment</p>
            <div className="flex gap-3">
              <input
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Reference or note (e.g. EFT ref #12345)"
                className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-[6px] px-3 py-2 text-xs text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              />
              <button
                onClick={recordManual}
                disabled={manualLoading}
                className="h-8 px-4 bg-[#faff69] text-[#0a0a0a] text-xs font-semibold rounded-[6px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
              >
                {manualLoading ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setManualOpen(false)}
                className="h-8 px-3 text-[#888888] text-xs hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {account.billingRecords?.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Amount","Status","Reference","Date"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[#888888] text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {account.billingRecords.map((b: any) => (
                <tr key={b.id} className="border-b border-[#2a2a2a] last:border-0">
                  <td className="px-6 py-4 text-white font-medium">R{(b.amount / 100).toFixed(2)}</td>
                  <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-6 py-4 text-[#5a5a5a] text-xs font-mono">{b.paystackReference ?? "—"}</td>
                  <td className="px-6 py-4 text-[#888888] text-xs">{new Date(b.billedAt).toLocaleDateString("en-ZA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center text-[#5a5a5a] text-sm">No billing records yet.</div>
        )}
      </div>
    </div>
  );
}
