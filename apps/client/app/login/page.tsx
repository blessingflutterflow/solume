"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ verifyUrl?: string; message?: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ verifyUrl?: string; message?: string }>("/client/auth/request", { email });
      setResult(res);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-[#faff69] font-bold text-xl tracking-tight">SOLUNE</span>
          <p className="text-[#888888] text-sm mt-1">Sign in to your dashboard</p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6 flex flex-col gap-4">
            <div>
              <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Your email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="billing@yourbusiness.co.za"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              />
            </div>

            {error && <p className="text-rose-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6">
            <p className="text-white font-semibold text-sm mb-1">Check your email</p>
            <p className="text-[#888888] text-xs mb-4">
              A sign-in link has been sent to <span className="text-white">{email}</span>.
            </p>

            {/* Dev mode — shown only when RESEND_API_KEY is not configured */}
            {result.verifyUrl && (
              <div className="bg-[#0a0a0a] border border-[#faff69]/20 rounded-[8px] p-4">
                <p className="text-[#faff69] text-xs font-semibold mb-2 uppercase tracking-widest">Dev mode — click to sign in</p>
                <a
                  href={result.verifyUrl}
                  className="text-[#888888] text-xs break-all hover:text-white transition-colors underline underline-offset-2"
                >
                  {result.verifyUrl}
                </a>
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              className="mt-4 text-[#5a5a5a] text-xs hover:text-white transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
