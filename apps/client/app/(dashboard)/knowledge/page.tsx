"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { Plus, Trash2, Save } from "lucide-react";

export default function KnowledgePage() {
  const { data: config, mutate } = useSWR("/client/config", () => api.get<any>("/client/config"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  const [systemPrompt, setSystemPrompt] = useState("");
  const [agentTone, setAgentTone] = useState("professional");
  const [businessHours, setBusinessHours] = useState("");
  const [faq, setFaq] = useState<{ q: string; a: string }[]>([]);
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    if (!config) return;
    setSystemPrompt(config.systemPrompt ?? "");
    setAgentTone(config.agentTone ?? "professional");
    setBusinessHours(config.businessHours ?? "");
    setFaq(config.faq ?? []);
    setServices(config.services ?? []);
  }, [config]);

  async function save() {
    setSaving(true);
    setSyncStatus("idle");
    try {
      await api.patch("/client/config", { systemPrompt, agentTone, businessHours, faq, services });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);

      setSyncStatus("syncing");
      api.post("/client/hermes/config/sync")
        .then(() => {
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus("idle"), 3000);
        })
        .catch(() => {
          setSyncStatus("error");
          setTimeout(() => setSyncStatus("idle"), 4000);
        });
    } finally {
      setSaving(false);
    }
  }

  function addFaq() { setFaq((f) => [...f, { q: "", a: "" }]); }
  function removeFaq(i: number) { setFaq((f) => f.filter((_, idx) => idx !== i)); }
  function updateFaq(i: number, field: "q" | "a", val: string) {
    setFaq((f) => f.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }
  function addService() { setServices((s) => [...s, ""]); }
  function removeService(i: number) { setServices((s) => s.filter((_, idx) => idx !== i)); }
  function updateService(i: number, val: string) { setServices((s) => s.map((v, idx) => idx === i ? val : v)); }

  const field = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors";

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Knowledge</h1>
          <p className="text-[#888888] text-sm mt-1">
            Configure what your agent knows and how it behaves
            {config?.version ? <span className="ml-2 text-[#5a5a5a]">v{config.version}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus === "syncing" && <span className="text-xs text-[#888888]">Syncing to agent…</span>}
          {syncStatus === "synced" && <span className="text-xs text-emerald-500">Agent updated ✓</span>}
          {syncStatus === "error" && <span className="text-xs text-rose-400">Sync failed — changes saved</span>}
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Tone */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Agent tone</h2>
          <div className="flex gap-2">
            {["professional", "friendly", "formal", "casual"].map((tone) => (
              <button
                key={tone}
                onClick={() => setAgentTone(tone)}
                className={`px-4 py-2 text-sm rounded-[8px] border capitalize transition-colors ${
                  agentTone === tone
                    ? "bg-[#faff69] text-[#0a0a0a] border-[#faff69] font-semibold"
                    : "bg-[#0a0a0a] text-[#888888] border-[#2a2a2a] hover:text-white"
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* System prompt */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <h2 className="text-white font-semibold text-sm mb-1">System prompt</h2>
          <p className="text-[#5a5a5a] text-xs mb-4">Custom instructions your agent always follows. Leave blank to use defaults.</p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant for [Business Name]. You help customers with..."
            rows={5}
            className={`${field} resize-none`}
          />
        </div>

        {/* Business hours */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <h2 className="text-white font-semibold text-sm mb-1">Business hours</h2>
          <p className="text-[#5a5a5a] text-xs mb-4">Your agent will inform customers of these hours.</p>
          <input
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            placeholder="Mon–Fri 8am–5pm, Sat 9am–1pm, Closed Sundays"
            className={field}
          />
        </div>

        {/* Services */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Services</h2>
              <p className="text-[#5a5a5a] text-xs mt-0.5">What does your business offer?</p>
            </div>
            <button onClick={addService} className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#242424] border border-[#2a2a2a] text-[#888888] text-xs rounded-[6px] hover:text-white transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {services.length === 0 && <p className="text-[#5a5a5a] text-xs">No services added yet.</p>}
            {services.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input value={s} onChange={(e) => updateService(i, e.target.value)} placeholder="e.g. Pre-need funeral planning" className={`${field} flex-1`} />
                <button onClick={() => removeService(i)} className="h-10 w-10 flex items-center justify-center text-[#5a5a5a] hover:text-rose-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">FAQ</h2>
              <p className="text-[#5a5a5a] text-xs mt-0.5">Common questions your agent should answer automatically.</p>
            </div>
            <button onClick={addFaq} className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#242424] border border-[#2a2a2a] text-[#888888] text-xs rounded-[6px] hover:text-white transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {faq.length === 0 && <p className="text-[#5a5a5a] text-xs">No FAQ entries yet.</p>}
            {faq.map((item, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#5a5a5a] text-xs">Q&A #{i + 1}</span>
                  <button onClick={() => removeFaq(i)} className="text-[#5a5a5a] hover:text-rose-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <input value={item.q} onChange={(e) => updateFaq(i, "q", e.target.value)} placeholder="Question" className={`${field} mb-2`} />
                <textarea value={item.a} onChange={(e) => updateFaq(i, "a", e.target.value)} placeholder="Answer" rows={2} className={`${field} resize-none`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
