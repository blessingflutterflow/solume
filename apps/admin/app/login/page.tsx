"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string }>("/auth/admin/login", { email, password });
      localStorage.setItem("solune_admin_token", res.accessToken);
      router.replace("/");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-[#faff69] font-bold text-xl tracking-tight">SOLUNE</span>
          <p className="text-[#888888] text-sm mt-1">Operator console</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] p-6 flex flex-col gap-4">
          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              placeholder="blessing@solune.co.za"
            />
          </div>
          <div>
            <label className="text-[#888888] text-xs uppercase tracking-widest block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
