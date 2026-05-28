"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

const STEP_LABELS = [
  "Create instance record",
  "Launch EC2 instance",
  "Wait for running state",
  "Configure server",
  "Create DNS subdomain",
  "Update instance record",
  "Send notifications",
];

function StepRow({ step, index }: { step: any; index: number }) {
  const label = STEP_LABELS[index] ?? `Step ${index + 1}`;
  if (step.status === "DONE") {
    return (
      <div className="flex items-center gap-3 py-2">
        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
        <span className="text-[#888888] text-xs">{label}</span>
        {step.durationMs && (
          <span className="text-[#5a5a5a] text-xs ml-auto">{step.durationMs}ms</span>
        )}
      </div>
    );
  }
  if (step.status === "FAILED") {
    return (
      <div className="flex items-start gap-3 py-2">
        <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-rose-400 text-xs">{label}</span>
          {step.error && <p className="text-[#5a5a5a] text-xs mt-0.5 font-mono">{step.error}</p>}
        </div>
      </div>
    );
  }
  if (step.status === "IN_PROGRESS") {
    return (
      <div className="flex items-center gap-3 py-2">
        <Loader2 size={14} className="text-[#faff69] shrink-0 animate-spin" />
        <span className="text-white text-xs">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2 opacity-40">
      <Circle size={14} className="text-[#5a5a5a] shrink-0" />
      <span className="text-[#5a5a5a] text-xs">{label}</span>
    </div>
  );
}

export default function ProvisioningPage() {
  const { data: accounts = [], isLoading } = useSWR("/accounts", () => api.get<any[]>("/accounts"), {
    refreshInterval: 5000,
  });

  const jobs: any[] = [];
  for (const a of accounts) {
    if (a.instance?.provisioningJobs?.length) {
      for (const j of a.instance.provisioningJobs) {
        jobs.push({ ...j, account: a });
      }
    }
  }

  jobs.sort((a, b) => new Date(b.startedAt ?? b.id).getTime() - new Date(a.startedAt ?? a.id).getTime());

  const inFlight = jobs.filter((j) => j.status === "IN_PROGRESS" || j.status === "PENDING");
  const finished = jobs.filter((j) => j.status === "COMPLETED" || j.status === "FAILED");

  return (
    <div>
      <PageHeader
        title="Provisioning"
        sub={inFlight.length > 0 ? `${inFlight.length} job${inFlight.length !== 1 ? "s" : ""} in progress` : "No active jobs"}
      />

      {isLoading ? (
        <div className="text-[#5a5a5a] text-sm">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] px-6 py-12 text-center text-[#5a5a5a] text-sm">
          No provisioning jobs yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...inFlight, ...finished].map((job) => {
            const steps: any[] = Array.isArray(job.stepLog) ? job.stepLog : [];
            return (
              <div key={job.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[12px] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
                  <div>
                    <Link href={`/clients/${job.account.id}`} className="text-white font-semibold text-sm hover:text-[#faff69] transition-colors">
                      {job.account.businessName}
                    </Link>
                    <p className="text-[#5a5a5a] text-xs mt-0.5 font-mono">{job.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.startedAt && (
                      <span className="text-[#5a5a5a] text-xs">
                        {new Date(job.startedAt).toLocaleString("en-ZA")}
                      </span>
                    )}
                    <StatusBadge status={job.status} />
                  </div>
                </div>
                <div className="px-6 py-4 divide-y divide-[#1e1e1e]">
                  {STEP_LABELS.map((_, i) => {
                    const s = steps[i] ?? { status: "PENDING" };
                    return <StepRow key={i} step={s} index={i} />;
                  })}
                </div>
                {job.failureReason && (
                  <div className="px-6 pb-4">
                    <p className="text-rose-400 text-xs font-mono bg-rose-500/5 border border-rose-500/10 rounded-[6px] px-3 py-2">
                      {job.failureReason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
