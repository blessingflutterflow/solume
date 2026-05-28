"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { data: me, mutate } = useSWR("/client/me", () => api.get<any>("/client/me"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ businessName: "", phone: "", vatNumber: "", address: "" });

  useEffect(() => {
    if (!me) return;
    setForm({ businessName: me.businessName ?? "", phone: me.phone ?? "", vatNumber: me.vatNumber ?? "", address: me.address ?? "" });
  }, [me]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/client/me", form);
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors";

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-[#888888] text-sm mt-1">Your business details</p>
        </div>
      </div>

      <form onSubmit={save} className="max-w-lg">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6 flex flex-col gap-5">

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Business name</label>
            <input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className={field} />
          </div>

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+27 11 000 0000" className={field} />
          </div>

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">VAT number</label>
            <input value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="4123456789" className={field} />
          </div>

          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Business address</label>
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={3} placeholder="123 Main St, Johannesburg, 2001" className={`${field} resize-none`} />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 h-9 px-4 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="mt-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <p className="text-[#888888] text-xs uppercase tracking-widest mb-3">Account</p>
          <p className="text-[#5a5a5a] text-xs">Billing email: <span className="text-white">{me?.billingEmail}</span></p>
          <p className="text-[#5a5a5a] text-xs mt-1">To change your billing email, contact <a href="/support" className="text-[#faff69] hover:underline">support</a>.</p>
        </div>
      </form>
    </div>
  );
}
