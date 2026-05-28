import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing seed data…");
  await prisma.auditLog.deleteMany();
  await prisma.billingRecord.deleteMany();
  await prisma.clientConfig.deleteMany();
  await prisma.provisioningJob.deleteMany();
  await prisma.instance.deleteMany();
  await prisma.account.deleteMany();

  console.log("Seeding accounts…");

  // ── 1. Khumalo Funerals — PRO, ACTIVE, RUNNING ───────────────────────────
  const khumalo = await prisma.account.create({
    data: {
      businessName: "Khumalo Funerals",
      billingEmail: "billing@khumalofunerals.co.za",
      phone: "+27 11 234 5678",
      vatNumber: "4123456789",
      plan: "PRO",
      status: "ACTIVE",
      createdAt: new Date("2026-01-15"),
      instance: {
        create: {
          awsInstanceId: "i-0a1b2c3d4e5f67890",
          publicIp: "13.244.12.88",
          region: "af-south-1",
          subdomain: "khumalo.solune.co.za",
          state: "RUNNING",
          provisionedAt: new Date("2026-01-16T09:30:00Z"),
          provisioningJobs: {
            create: {
              status: "COMPLETED",
              currentStep: 7,
              startedAt: new Date("2026-01-16T09:00:00Z"),
              completedAt: new Date("2026-01-16T09:28:00Z"),
              stepLog: [
                { step: 0, status: "DONE", label: "Create instance record", durationMs: 120 },
                { step: 1, status: "DONE", label: "Launch EC2 instance", durationMs: 4200 },
                { step: 2, status: "DONE", label: "Wait for running state", durationMs: 85000 },
                { step: 3, status: "DONE", label: "Configure server", durationMs: 210000 },
                { step: 4, status: "DONE", label: "Create DNS subdomain", durationMs: 3100 },
                { step: 5, status: "DONE", label: "Update instance record", durationMs: 95 },
                { step: 6, status: "DONE", label: "Send notifications", durationMs: 1200 },
              ],
            },
          },
        },
      },
      billingRecords: {
        create: [
          { amount: 180000, status: "PAID", paystackReference: "PSK-001-JAN", billedAt: new Date("2026-01-01") },
          { amount: 180000, status: "PAID", paystackReference: "PSK-001-FEB", billedAt: new Date("2026-02-01") },
          { amount: 180000, status: "PAID", paystackReference: "PSK-001-MAR", billedAt: new Date("2026-03-01") },
          { amount: 180000, status: "PAID", paystackReference: "PSK-001-APR", billedAt: new Date("2026-04-01") },
          { amount: 180000, status: "PAID", paystackReference: "PSK-001-MAY", billedAt: new Date("2026-05-01") },
        ],
      },
    },
  });

  // ── 2. Nkosi Tax Services — PREMIUM, ACTIVE, RUNNING ─────────────────────
  const nkosi = await prisma.account.create({
    data: {
      businessName: "Nkosi Tax Services",
      billingEmail: "admin@nkositax.co.za",
      phone: "+27 21 987 6543",
      vatNumber: "4987654321",
      plan: "PREMIUM",
      status: "ACTIVE",
      createdAt: new Date("2026-02-03"),
      instance: {
        create: {
          awsInstanceId: "i-0f9e8d7c6b5a43210",
          publicIp: "13.244.55.201",
          region: "af-south-1",
          subdomain: "nkosi.solune.co.za",
          state: "RUNNING",
          provisionedAt: new Date("2026-02-04T14:00:00Z"),
          provisioningJobs: {
            create: {
              status: "COMPLETED",
              currentStep: 7,
              startedAt: new Date("2026-02-04T13:30:00Z"),
              completedAt: new Date("2026-02-04T13:58:00Z"),
              stepLog: [
                { step: 0, status: "DONE", label: "Create instance record", durationMs: 98 },
                { step: 1, status: "DONE", label: "Launch EC2 instance", durationMs: 3800 },
                { step: 2, status: "DONE", label: "Wait for running state", durationMs: 91000 },
                { step: 3, status: "DONE", label: "Configure server", durationMs: 198000 },
                { step: 4, status: "DONE", label: "Create DNS subdomain", durationMs: 2900 },
                { step: 5, status: "DONE", label: "Update instance record", durationMs: 88 },
                { step: 6, status: "DONE", label: "Send notifications", durationMs: 940 },
              ],
            },
          },
        },
      },
      billingRecords: {
        create: [
          { amount: 280000, status: "PAID", paystackReference: "PSK-002-FEB", billedAt: new Date("2026-02-01") },
          { amount: 280000, status: "PAID", paystackReference: "PSK-002-MAR", billedAt: new Date("2026-03-01") },
          { amount: 280000, status: "PAID", paystackReference: "PSK-002-APR", billedAt: new Date("2026-04-01") },
          { amount: 280000, status: "PAID", paystackReference: "PSK-002-MAY", billedAt: new Date("2026-05-01") },
        ],
      },
    },
  });

  // ── 3. Dlamini Insurance — STARTER, ACTIVE, STOPPED ──────────────────────
  const dlamini = await prisma.account.create({
    data: {
      businessName: "Dlamini Insurance Brokers",
      billingEmail: "info@dlaminibrokers.co.za",
      phone: "+27 31 555 0099",
      plan: "STARTER",
      status: "ACTIVE",
      createdAt: new Date("2026-03-10"),
      instance: {
        create: {
          awsInstanceId: "i-0c1c2c3c4c5c6c7c8",
          publicIp: "13.244.77.14",
          region: "af-south-1",
          subdomain: "dlamini.solune.co.za",
          state: "STOPPED",
          provisionedAt: new Date("2026-03-11T08:15:00Z"),
          provisioningJobs: {
            create: {
              status: "COMPLETED",
              currentStep: 7,
              startedAt: new Date("2026-03-11T07:50:00Z"),
              completedAt: new Date("2026-03-11T08:14:00Z"),
              stepLog: [
                { step: 0, status: "DONE", label: "Create instance record", durationMs: 105 },
                { step: 1, status: "DONE", label: "Launch EC2 instance", durationMs: 4100 },
                { step: 2, status: "DONE", label: "Wait for running state", durationMs: 88000 },
                { step: 3, status: "DONE", label: "Configure server", durationMs: 195000 },
                { step: 4, status: "DONE", label: "Create DNS subdomain", durationMs: 3200 },
                { step: 5, status: "DONE", label: "Update instance record", durationMs: 77 },
                { step: 6, status: "DONE", label: "Send notifications", durationMs: 1050 },
              ],
            },
          },
        },
      },
      billingRecords: {
        create: [
          { amount: 120000, status: "PAID", paystackReference: "PSK-003-MAR", billedAt: new Date("2026-03-01") },
          { amount: 120000, status: "PAID", paystackReference: "PSK-003-APR", billedAt: new Date("2026-04-01") },
          { amount: 120000, status: "PAID", paystackReference: "PSK-003-MAY", billedAt: new Date("2026-05-01") },
        ],
      },
    },
  });

  // ── 4. Sithole Medical — PRO, SUSPENDED, STOPPED ──────────────────────────
  const sithole = await prisma.account.create({
    data: {
      businessName: "Sithole Medical Centre",
      billingEmail: "accounts@sitholemedical.co.za",
      phone: "+27 12 444 8822",
      plan: "PRO",
      status: "SUSPENDED",
      createdAt: new Date("2025-11-20"),
      instance: {
        create: {
          awsInstanceId: "i-0dead1234beef5678",
          publicIp: "13.244.33.99",
          region: "af-south-1",
          subdomain: "sithole.solune.co.za",
          state: "STOPPED",
          provisionedAt: new Date("2025-11-21T10:00:00Z"),
          provisioningJobs: {
            create: {
              status: "COMPLETED",
              currentStep: 7,
              startedAt: new Date("2025-11-21T09:30:00Z"),
              completedAt: new Date("2025-11-21T09:58:00Z"),
              stepLog: [
                { step: 0, status: "DONE", label: "Create instance record", durationMs: 112 },
                { step: 1, status: "DONE", label: "Launch EC2 instance", durationMs: 4400 },
                { step: 2, status: "DONE", label: "Wait for running state", durationMs: 79000 },
                { step: 3, status: "DONE", label: "Configure server", durationMs: 204000 },
                { step: 4, status: "DONE", label: "Create DNS subdomain", durationMs: 2800 },
                { step: 5, status: "DONE", label: "Update instance record", durationMs: 91 },
                { step: 6, status: "DONE", label: "Send notifications", durationMs: 1100 },
              ],
            },
          },
        },
      },
      billingRecords: {
        create: [
          { amount: 180000, status: "PAID", paystackReference: "PSK-004-DEC", billedAt: new Date("2025-12-01") },
          { amount: 180000, status: "PAID", paystackReference: "PSK-004-JAN", billedAt: new Date("2026-01-01") },
          { amount: 180000, status: "FAILED", billedAt: new Date("2026-02-01") },
          { amount: 180000, status: "FAILED", billedAt: new Date("2026-03-01") },
        ],
      },
    },
  });

  // ── 5. Mahlangu Attorneys — STARTER, PENDING, no instance ────────────────
  const mahlangu = await prisma.account.create({
    data: {
      businessName: "Mahlangu Attorneys",
      billingEmail: "hello@mahlangu.law",
      phone: "+27 11 000 1111",
      plan: "STARTER",
      status: "PENDING",
      createdAt: new Date("2026-05-26"),
    },
  });

  // ── 6. In-flight provisioning — Zondo Logistics ───────────────────────────
  const zondo = await prisma.account.create({
    data: {
      businessName: "Zondo Logistics",
      billingEmail: "tech@zondologistics.co.za",
      plan: "PRO",
      status: "ACTIVE",
      createdAt: new Date("2026-05-28"),
      instance: {
        create: {
          region: "af-south-1",
          state: "PROVISIONING",
          provisioningJobs: {
            create: {
              status: "IN_PROGRESS",
              currentStep: 2,
              startedAt: new Date(),
              stepLog: [
                { step: 0, status: "DONE", label: "Create instance record", durationMs: 88 },
                { step: 1, status: "DONE", label: "Launch EC2 instance", durationMs: 3950 },
                { step: 2, status: "IN_PROGRESS", label: "Wait for running state" },
              ],
            },
          },
        },
      },
    },
  });

  // ── Audit logs ────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { accountId: khumalo.id, actorType: "ADMIN", action: "account.created", metadata: { plan: "PRO" }, createdAt: new Date("2026-01-15T10:00:00Z") },
      { accountId: khumalo.id, actorType: "SYSTEM", action: "instance.provisioned", metadata: { awsInstanceId: "i-0a1b2c3d4e5f67890" }, createdAt: new Date("2026-01-16T09:30:00Z") },
      { accountId: khumalo.id, actorType: "SYSTEM", action: "billing.charged", metadata: { amount: 180000, ref: "PSK-001-JAN" }, createdAt: new Date("2026-01-01T06:00:00Z") },
      { accountId: nkosi.id, actorType: "ADMIN", action: "account.created", metadata: { plan: "PREMIUM" }, createdAt: new Date("2026-02-03T08:00:00Z") },
      { accountId: nkosi.id, actorType: "SYSTEM", action: "instance.provisioned", metadata: { awsInstanceId: "i-0f9e8d7c6b5a43210" }, createdAt: new Date("2026-02-04T14:00:00Z") },
      { accountId: dlamini.id, actorType: "ADMIN", action: "account.created", metadata: { plan: "STARTER" }, createdAt: new Date("2026-03-10T09:00:00Z") },
      { accountId: dlamini.id, actorType: "ADMIN", action: "instance.stopped", metadata: { reason: "manual" }, createdAt: new Date("2026-04-22T14:30:00Z") },
      { accountId: sithole.id, actorType: "SYSTEM", action: "billing.failed", metadata: { amount: 180000, attempt: 1 }, createdAt: new Date("2026-02-01T06:00:00Z") },
      { accountId: sithole.id, actorType: "SYSTEM", action: "billing.failed", metadata: { amount: 180000, attempt: 2 }, createdAt: new Date("2026-03-01T06:00:00Z") },
      { accountId: sithole.id, actorType: "ADMIN", action: "account.suspended", metadata: { reason: "payment_failure" }, createdAt: new Date("2026-03-08T11:00:00Z") },
      { accountId: mahlangu.id, actorType: "ADMIN", action: "account.created", metadata: { plan: "STARTER" }, createdAt: new Date("2026-05-26T16:00:00Z") },
      { accountId: zondo.id, actorType: "ADMIN", action: "account.created", metadata: { plan: "PRO" }, createdAt: new Date("2026-05-28T08:00:00Z") },
      { accountId: zondo.id, actorType: "ADMIN", action: "instance.provision_started", metadata: {}, createdAt: new Date() },
      { actorType: "SYSTEM", action: "health_check.completed", metadata: { running: 2, failed: 0 }, createdAt: new Date() },
    ],
  });

  console.log("✓ Seed complete:");
  console.log(`  Khumalo Funerals  — PRO / ACTIVE / RUNNING   (${khumalo.id})`);
  console.log(`  Nkosi Tax         — PREMIUM / ACTIVE / RUNNING (${nkosi.id})`);
  console.log(`  Dlamini Insurance — STARTER / ACTIVE / STOPPED (${dlamini.id})`);
  console.log(`  Sithole Medical   — PRO / SUSPENDED / STOPPED  (${sithole.id})`);
  console.log(`  Mahlangu Attorneys — STARTER / PENDING / none  (${mahlangu.id})`);
  console.log(`  Zondo Logistics   — PRO / ACTIVE / PROVISIONING (${zondo.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
