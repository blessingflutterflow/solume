"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const PLANS = ["STARTER", "PRO", "PREMIUM"] as const;

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    businessName: "",
    billingEmail: "",
    phone: "",
    vatNumber: "",
    plan: "STARTER" as (typeof PLANS)[number],
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const account = await api.post<any>("/accounts", {
        businessName: form.businessName,
        billingEmail: form.billingEmail,
        phone: form.phone || undefined,
        vatNumber: form.vatNumber || undefined,
        plan: form.plan,
      });
      router.push(`/clients/${account.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create client.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-[#888888] text-sm hover:text-white mb-6 transition-colors">
        <ChevronLeft size={14} /> Back to clients
      </Link>

      <PageHeader title="New client" sub="Create a new Solune account" />

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6 flex flex-col gap-5">

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Business name *</label>
            <input
              value={form.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              required
              placeholder="Acme Funerals"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
            />
          </div>

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Billing email *</label>
            <input
              type="email"
              value={form.billingEmail}
              onChange={(e) => set("billingEmail", e.target.value)}
              required
              placeholder="billing@acme.co.za"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+27 11 000 0000"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">VAT number</label>
              <input
                value={form.vatNumber}
                onChange={(e) => set("vatNumber", e.target.value)}
                placeholder="4123456789"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Plan *</label>
            <div className="flex gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("plan", p)}
                  className={`flex-1 h-10 text-sm rounded-[8px] border transition-colors font-medium ${
                    form.plan === p
                      ? "bg-[#faff69] text-[#0a0a0a] border-[#faff69]"
                      : "bg-[#0a0a0a] text-[#888888] border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[#5a5a5a] text-xs mt-2">
              {form.plan === "STARTER" && "R1,200/mo — t3.small"}
              {form.plan === "PRO" && "R1,800/mo — t3.medium"}
              {form.plan === "PREMIUM" && "R2,800/mo — t3.large"}
            </p>
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create client"}
            </button>
            <Link
              href="/clients"
              className="h-10 px-5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-sm rounded-[8px] hover:text-white hover:border-[#3a3a3a] transition-colors inline-flex items-center"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
