"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { Search } from "lucide-react";

export default function ClientsPage() {
  const { data: accounts = [], isLoading } = useSWR("/accounts", () => api.get<any[]>("/accounts"));
  const [query, setQuery] = useState("");

  const filtered = accounts.filter((a: any) =>
    a.businessName.toLowerCase().includes(query.toLowerCase()) ||
    a.billingEmail.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Clients"
        sub={`${accounts.length} total accounts`}
        action={
          <Link
            href="/clients/new"
            className="inline-flex items-center h-9 px-4 bg-[#faff69] text-[#0a0a0a] text-sm font-semibold rounded-[8px] hover:bg-[#e6eb52] transition-colors"
          >
            + New client
          </Link>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a5a5a]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-[8px] pl-9 pr-4 py-2 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#faff69] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#5a5a5a] text-sm">No clients found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Business", "Plan", "Account", "Instance", "IP", "Created"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[#888888] text-xs font-medium uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: any) => (
                <tr key={a.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#242424] transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/clients/${a.id}`} className="text-white font-medium hover:text-[#faff69] transition-colors">
                      {a.businessName}
                    </Link>
                    <p className="text-[#5a5a5a] text-xs mt-0.5">{a.billingEmail}</p>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={a.plan} /></td>
                  <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                  <td className="px-6 py-4">
                    {a.instance ? <StatusBadge status={a.instance.state} /> : <span className="text-[#5a5a5a] text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4 text-[#888888] font-mono text-xs">
                    {a.instance?.publicIp ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-[#888888] text-xs">
                    {new Date(a.createdAt).toLocaleDateString("en-ZA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
