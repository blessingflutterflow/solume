// ─── Enums (const objects + union types — compatible with Node strip-only TS) ─

export const Plan = {
  STARTER: "STARTER",
  PRO: "PRO",
  PREMIUM: "PREMIUM",
} as const;
export type Plan = (typeof Plan)[keyof typeof Plan];

export const AccountStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CANCELLED: "CANCELLED",
} as const;
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const InstanceState = {
  PENDING: "PENDING",
  PROVISIONING: "PROVISIONING",
  RUNNING: "RUNNING",
  STOPPED: "STOPPED",
  TERMINATED: "TERMINATED",
  FAILED: "FAILED",
} as const;
export type InstanceState = (typeof InstanceState)[keyof typeof InstanceState];

export const JobStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const BillingStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type BillingStatus = (typeof BillingStatus)[keyof typeof BillingStatus];

// ─── Core entity shapes ───────────────────────────────────────────────────────

export interface Account {
  id: string;
  businessName: string;
  billingEmail: string;
  phone: string | null;
  vatNumber: string | null;
  address: string | null;
  plan: Plan;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Instance {
  id: string;
  accountId: string;
  awsInstanceId: string | null;
  publicIp: string | null;
  region: string;
  subdomain: string | null;
  state: InstanceState;
  lastHealthCheck: string | null;
  provisionedAt: string | null;
}

export interface ProvisioningStepEntry {
  step: number;
  label: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: string;
  detail?: string;
}

export interface ProvisioningJob {
  id: string;
  instanceId: string;
  status: JobStatus;
  currentStep: number;
  stepLog: ProvisioningStepEntry[];
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

export interface BillingRecord {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  paystackReference: string | null;
  status: BillingStatus;
  invoicePdfUrl: string | null;
  billedAt: string;
}

export interface ClientConfig {
  id: string;
  accountId: string;
  systemPrompt: string | null;
  agentTone: string | null;
  businessHours: string | null;
  faq: Array<{ q: string; a: string }>;
  services: string[];
  whatsappEnabled: boolean;
  whatsappNumber: string | null;
  telegramEnabled: boolean;
  webChatEnabled: boolean;
  embedToken: string | null;
  version: number;
}

export interface AuditLog {
  id: string;
  accountId: string | null;
  actorType: "ADMIN" | "SYSTEM" | "CLIENT";
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── API response shapes ───────────────────────────────────────────────────────

export interface AccountSummary {
  id: string;
  businessName: string;
  billingEmail: string;
  plan: Plan;
  status: AccountStatus;
  instanceState: InstanceState | null;
  lastHealthCheck: string | null;
  mrr: number;
  createdAt: string;
}

export interface ClientDashboardSummary {
  conversationsThisWeek: number;
  appointmentsBooked: number;
  escalations: number;
  whatsappConnected: boolean;
  webChatConnected: boolean;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateAccountDto {
  businessName: string;
  billingEmail: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  plan: Plan;
}

export interface UpdateAccountDto {
  businessName?: string;
  billingEmail?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
}

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface MagicLinkRequestDto {
  email: string;
}

export interface UpdateClientConfigDto {
  systemPrompt?: string;
  agentTone?: string;
  businessHours?: string;
  faq?: Array<{ q: string; a: string }>;
  services?: string[];
  whatsappEnabled?: boolean;
  whatsappNumber?: string;
  telegramEnabled?: boolean;
  webChatEnabled?: boolean;
}

// ─── Plan constants ───────────────────────────────────────────────────────────

export const PLAN_PRICES: Record<Plan, number> = {
  STARTER: 120000,
  PRO: 180000,
  PREMIUM: 280000,
};

export const PLAN_INSTANCE_TYPES: Record<Plan, string> = {
  STARTER: "t3.small",
  PRO: "t3.medium",
  PREMIUM: "t3.large",
};
