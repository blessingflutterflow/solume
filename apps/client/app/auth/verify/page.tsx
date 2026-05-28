"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Suspense } from "react";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("No token provided."); return; }

    api.post<{ accessToken: string; account: any }>("/client/auth/verify", { token })
      .then((res) => {
        localStorage.setItem("solune_client_token", res.accessToken);
        window.location.href = "/";
      })
      .catch((err) => setError(err?.message ?? "Verification failed."));
  }, [params, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <a href="/login" className="text-[#faff69] text-sm hover:underline">Request a new link</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#faff69] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#888888] text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
