"use client";

import { useState } from "react";
import { MessageSquare, Mail, Clock } from "lucide-react";

export default function SupportPage() {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // In production: POST to API which emails Blessing
    setSent(true);
  }

  const field = "w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Support</h1>
        <p className="text-[#888888] text-sm mt-1">We typically respond within a few hours</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5 flex gap-3">
          <Mail size={16} className="text-[#faff69] shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">Email</p>
            <p className="text-[#5a5a5a] text-xs mt-0.5">support@solune.co.za</p>
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5 flex gap-3">
          <MessageSquare size={16} className="text-[#faff69] shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">WhatsApp</p>
            <p className="text-[#5a5a5a] text-xs mt-0.5">+27 00 000 0000</p>
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-5 flex gap-3">
          <Clock size={16} className="text-[#faff69] shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-semibold">Hours</p>
            <p className="text-[#5a5a5a] text-xs mt-0.5">Mon–Fri 8am–6pm</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Send a message</h2>
          {sent ? (
            <div className="text-center py-6">
              <p className="text-emerald-400 font-semibold text-sm mb-1">Message sent</p>
              <p className="text-[#5a5a5a] text-xs">We'll get back to you shortly.</p>
              <button onClick={() => { setSent(false); setForm({ subject: "", message: "" }); }} className="mt-4 text-[#888888] text-xs hover:text-white transition-colors">Send another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <div>
                <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Subject</label>
                <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required placeholder="e.g. Agent not responding" className={field} />
              </div>
              <div>
                <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Message</label>
                <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required rows={5} placeholder="Describe your issue or question…" className={`${field} resize-none`} />
              </div>
              <button type="submit" className="h-10 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
