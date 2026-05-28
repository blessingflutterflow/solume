# Solune Cloud — Agent Handoff

## What This System Is

**Solune Cloud** is a SaaS platform built for South African SMEs. The operator (Blessing) sells per-client AI agent subscriptions. Each paying client gets:

- Their own isolated EC2 instance running **Hermes Agent** (NousResearch autonomous AI agent)
- Their own subdomain on `solune.co.za`
- A client-facing dashboard to chat with their agent, configure knowledge, manage billing
- The agent handles WhatsApp (via QR/Baileys), Telegram, and web chat

Solune's job is narrow: **provision the instance, expose Hermes to the client, get out of the way.** Hermes handles all AI, WhatsApp, and channel logic independently.

**Design system:** Black canvas `#0a0a0a`, electric yellow `#faff69`, Inter font, no light mode. Tokens live in `apps/admin/app/globals.css` and `apps/client/app/globals.css` under `@theme` directive (Tailwind v4).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS (TypeScript) |
| ORM | Prisma → Neon (serverless PostgreSQL) |
| Admin dashboard | Next.js App Router (port 3000) |
| Client dashboard | Next.js App Router (port 3002) |
| API | NestJS (port 3001) |
| AI agent | Hermes Agent by NousResearch |
| Agent WebUI | nesquena/hermes-webui (MIT, v0.51.150) |
| Payment | Yoco (South African card processor) |
| Email | Resend (not yet wired — see TODO) |
| Infrastructure | AWS EC2 (af-south-1), Route 53, ECR, SSM |
| Auth | JWT — admin (email+password), client (magic link) |

---

## File Tree

```
solune/
├── .env                          ← root env (used by all apps)
├── .env.example
├── package.json                  ← turborepo root
├── turbo.json
├── design.md                     ← design system spec
├── HANDOFF.md                    ← this file
├── hermes-webui/                 ← cloned upstream repo (reference only, not deployed)
│
├── apps/
│   ├── api/                      ← NestJS orchestration backend (port 3001)
│   │   └── src/
│   │       ├── app.module.ts
│   │       ├── main.ts
│   │       ├── accounts/         ← admin CRUD for client accounts
│   │       ├── audit/            ← audit log (GET /api/audit)
│   │       ├── auth/             ← admin JWT login
│   │       ├── billing/          ← Yoco charge, manual payment, invoice
│   │       ├── client-auth/      ← magic link (request + verify)
│   │       ├── client-portal/    ← client-facing endpoints (me, config, billing)
│   │       ├── hermes-proxy/     ← SSE proxy to hermes-webui on client instances
│   │       ├── prisma/           ← PrismaService wrapper
│   │       └── provisioning/     ← EC2 lifecycle, 7-step provisioning
│   │           ├── aws.client.ts
│   │           ├── health-check.job.ts
│   │           ├── lifecycle.service.ts
│   │           ├── provisioning.controller.ts
│   │           ├── provisioning.module.ts
│   │           └── provisioning.service.ts
│   │
│   ├── admin/                    ← Operator dashboard (Next.js, port 3000)
│   │   └── app/
│   │       ├── globals.css       ← Tailwind v4 @theme tokens
│   │       ├── layout.tsx        ← Inter + JetBrains Mono via next/font/google
│   │       ├── login/page.tsx
│   │       └── (dashboard)/
│   │           ├── layout.tsx    ← auth guard + sidebar
│   │           ├── page.tsx      ← revenue overview / MRR
│   │           ├── clients/
│   │           │   ├── page.tsx  ← clients table
│   │           │   ├── new/page.tsx
│   │           │   └── [id]/page.tsx ← per-client detail + Yoco charge
│   │           ├── operations/page.tsx   ← instance health grid
│   │           ├── provisioning/page.tsx ← step-by-step job tracker
│   │           └── audit/page.tsx
│   │
│   ├── client/                   ← Client dashboard (Next.js, port 3002)
│   │   └── app/
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       ├── login/page.tsx    ← magic link request
│   │       ├── auth/verify/page.tsx
│   │       └── (dashboard)/
│   │           ├── layout.tsx    ← auth guard
│   │           ├── page.tsx      ← agent status hero + quick links
│   │           ├── chat/page.tsx ← streaming chat via hermes-proxy
│   │           ├── knowledge/page.tsx ← FAQ, tone, prompt, hours, services
│   │           ├── billing/page.tsx
│   │           ├── settings/page.tsx
│   │           ├── support/page.tsx
│   │           └── about/page.tsx ← MIT attribution (required by license)
│   │
│   └── hermes-runtime/           ← Custom Docker image for per-client instances
│       ├── Dockerfile            ← FROM ghcr.io/nesquena/hermes-webui:v0.51.150
│       └── docker-compose.template.yml ← single-container reference template
│
└── packages/
    ├── db/
    │   ├── prisma/
    │   │   ├── schema.prisma     ← source of truth for DB schema
    │   │   ├── seed.ts           ← 6 demo accounts + billing records
    │   │   └── migrations/       ← applied migrations
    │   └── src/index.ts
    ├── types/src/index.ts        ← shared enums + ProvisioningStepEntry type
    └── ui/src/components/        ← Button, Card (minimal, apps use Tailwind directly)
```

---

## Database Schema (Prisma)

Key models — see `packages/db/prisma/schema.prisma` for full definitions.

**Account** — one per client: `businessName`, `billingEmail`, `plan` (STARTER/PRO/PREMIUM), `status` (PENDING/ACTIVE/SUSPENDED/CANCELLED)

**Instance** — one per account: `awsInstanceId`, `publicIp`, `privateIp`, `hermesWebUiPassword`, `subdomain`, `state` (PENDING/PROVISIONING/RUNNING/STOPPED/TERMINATED/FAILED)

**ProvisioningJob** — tracks step-by-step progress: `currentStep`, `stepLog` (JSON array), `status`

**ClientConfig** — knowledge editor state: `systemPrompt`, `agentTone`, `businessHours`, `faq` (JSON), `services` (JSON), `whatsappEnabled`, `telegramEnabled`, `webChatEnabled`, `version`

**BillingRecord**, **AuditLog** — standard

---

## Environment Variables

Root `.env` (already has real values for dev):

```env
# Database (Neon — already connected)
DATABASE_URL=postgresql://neondb_owner:npg_6GQmK5clMuqZ@ep-sparkling-cherry-apfmo5sh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require

# Auth
ADMIN_EMAIL=blessing@solune.co.za
ADMIN_PASSWORD=Solune@Admin2026
JWT_SECRET=s0lune_jwt_s3cret_k3y_replace_in_production_with_64_char_random_string

# Payment (Yoco test keys)
YOCO_SECRET_KEY=sk_test_e445efc9aZvPJOPc31744e4b83ea
NEXT_PUBLIC_YOCO_PUBLIC_KEY=pk_test_cb2360c4lWVZ46Z0a994

# Email (Resend — not yet wired in code, key needed)
RESEND_API_KEY=re_replace_me
FROM_EMAIL=hello@solune.co.za

# AWS (placeholder — real keys needed for provisioning)
AWS_ACCESS_KEY_ID=AKIA_replace_me
AWS_SECRET_ACCESS_KEY=replace_me
AWS_REGION=af-south-1

# Platform
PLATFORM_DOMAIN=solune.co.za
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Missing env vars that must be added for production:**
```env
# AWS infrastructure (create these in AWS console first)
AWS_AMI_ID=ami-xxxxxxxxx              ← Ubuntu 22.04 LTS in af-south-1
AWS_SECURITY_GROUP_ID=sg-xxxxxxxxx    ← see AWS setup section below
AWS_IAM_INSTANCE_PROFILE=solune-hermes-instance-profile ← see AWS setup
AWS_HOSTED_ZONE_ID=Z0000000XXXXXXXX   ← Route 53 hosted zone for solune.co.za
ECR_REGISTRY=123456789.dkr.ecr.af-south-1.amazonaws.com ← ECR registry URL

# For production admin/client dashboards
NEXT_PUBLIC_API_URL=https://api.solune.co.za
```

---

## What's Built and Working

### API (apps/api) — all modules wired in app.module.ts

| Module | Routes | Status |
|---|---|---|
| AuthModule | `POST /api/auth/admin/login` | ✅ Working |
| AccountsModule | `GET/POST/PATCH /api/accounts`, `GET /api/accounts/:id` | ✅ Working |
| ProvisioningModule | `POST /api/provisioning/:id/start`, lifecycle endpoints | ✅ Working (AWS stubbed) |
| AuditModule | `GET /api/audit` | ✅ Working |
| BillingModule | `POST /api/billing/charge`, `POST /api/billing/manual`, etc. | ✅ Working |
| ClientAuthModule | `POST /api/client/auth/request`, `POST /api/client/auth/verify` | ✅ Working |
| ClientPortalModule | `GET /api/client/me`, `PATCH /api/client/config`, etc. | ✅ Working |
| HermesProxyModule | `POST /api/client/hermes/chat/start`, `GET /api/client/hermes/chat/stream` | ✅ Built, needs live instance |

### Admin Dashboard (apps/admin)
- `/login` — admin email+password → JWT stored as `solune_admin_token`
- `/` — MRR overview, active clients, recent activity
- `/clients` — table with plan/status/instance state
- `/clients/new` — create client account form
- `/clients/[id]` — full detail: instance info, Yoco charge button, billing history, manual lifecycle controls
- `/operations` — all instances colour-coded by health, auto-refreshes 30s
- `/provisioning` — step-by-step job tracker, auto-refreshes 5s
- `/audit` — audit log with actor filter

### Client Dashboard (apps/client)
- `/login` — magic link request (dev: verify URL shown inline; prod: needs Resend)
- `/auth/verify` — token exchange → session JWT
- `/` — agent status hero card (RUNNING/PROVISIONING/FAILED), plan summary
- `/chat` — streaming chat via hermes-proxy (fetch-based SSE, JWT in header)
- `/knowledge` — tone, system prompt, business hours, FAQ, services editor
- `/billing` — plan info, Yoco self-payment, invoice history
- `/settings` — business details (name, phone, VAT, address)
- `/support` — contact form stub
- `/about` — MIT attribution for Hermes Agent + hermes-webui (required by license)

### Hermes Integration
- `apps/hermes-runtime/Dockerfile` — custom image based on `ghcr.io/nesquena/hermes-webui:v0.51.150`
- Single-container (avoids tool-execution boundary issues from upstream issue #681)
- `apps/hermes-runtime/docker-compose.template.yml` — reference for what provisioning writes to each EC2 instance
- Per-instance `hermesWebUiPassword` (32-byte random, stored in DB) — mandatory even with loopback binding
- HermesProxyService:
  - Logs in to hermes-webui cookie auth once, caches session 29 days (just under hermes-webui's 30-day TTL)
  - No `Origin`/`Referer` headers sent → hermes-webui CSRF check bypassed (server-to-server is the intended contract)
  - `req.on("close")` cancels upstream fetch via AbortController
  - Fires `GET /api/chat/cancel?stream_id=X` on hermes-webui to stop in-flight runs
  - Forwards `Last-Event-ID` for reconnect support
  - Pipes SSE chunks to browser with immediate flush

---

## What's Left To Do (Prioritised)

### 1. Wire Resend email for magic links — 30 min
**File:** `apps/api/src/client-auth/client-auth.service.ts`

Currently `requestMagicLink()` returns `{ message, verifyUrl, token }` — the verify URL is shown in the UI (dev mode). For production:
- Call `POST https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`
- Email body: a clean "Sign in to Solune" email with the verify link
- Return only `{ message: "Check your inbox." }` — remove `verifyUrl` and `token` from response
- The login page (`apps/client/app/login/page.tsx`) currently shows the verify URL in a yellow box — remove that UI once Resend is live

### 2. EC2 security group + IAM instance profile — 1 hour (AWS console + code)

**AWS console setup (Blessing does this once):**
```
Security Group: solune-hermes-instance
  Inbound:
    SSH (22)    from: Solune API server security group only
    TCP 8787    from: Solune API server security group only
  Outbound: All traffic (for ECR pull, SSM, package installs)

IAM Role: solune-hermes-instance-role
  Policies:
    - AmazonEC2ContainerRegistryReadOnly (ECR pull)
    - AmazonSSMManagedInstanceCore (SSM for config sync)

IAM Instance Profile: solune-hermes-instance-profile
  Attach the role above
```

**Code change** — `apps/api/src/provisioning/provisioning.service.ts`, `step2_launchEc2()`, add to `RunInstancesCommand`:
```typescript
SecurityGroupIds: [this.config.get("AWS_SECURITY_GROUP_ID", "")].filter(Boolean),
IamInstanceProfile: this.config.get("AWS_IAM_INSTANCE_PROFILE")
  ? { Name: this.config.get("AWS_IAM_INSTANCE_PROFILE") }
  : undefined,
```

Also add to UserData script (inside `buildUserDataScript()`): install SSM agent
```bash
# Install SSM agent (needed for config sync)
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
```

### 3. Config sync — knowledge editor → running Hermes instance — 2 hours

When a client saves their knowledge config, it needs to reach the running Hermes instance. Approach: **AWS SSM RunCommand** (no SSH keys needed; IAM role from step 2 enables this).

**New file:** `apps/api/src/provisioning/aws.client.ts` — add SSM client:
```typescript
import { SSMClient } from "@aws-sdk/client-ssm";
// Add to AwsClientService constructor:
this.ssm = new SSMClient({ region, credentials });
```
(`@aws-sdk/client-ssm` was already installed — `pnpm add` ran at end of last session)

**New method in HermesProxyService** — `syncConfig(accountId)`:
1. Load `ClientConfig` from DB
2. Generate `config.yaml` content (system_prompt, agent_tone, business_hours, faq, services)
3. Use SSM `SendCommandCommand` targeting the instance's `awsInstanceId`
4. SSM command: write file to `/opt/solune/hermes/config.yaml` + `docker compose -f /opt/solune/docker-compose.yml restart`

**New route:** `POST /api/client/hermes/config/sync` in `hermes-proxy.controller.ts`

**Update:** `apps/api/src/client-portal/client-portal.controller.ts` — after `PATCH /client/config` succeeds, fire-and-forget `hermesProxy.syncConfig(accountId)` (don't block the response)

**Update:** `apps/client/app/(dashboard)/knowledge/page.tsx` — after save succeeds, show "Syncing to agent..." indicator

### 4. Build + push Docker image — 30 min

```bash
# On a Linux machine or CI:
cd apps/hermes-runtime
docker build --build-arg HERMES_WEBUI_VERSION=v0.51.150 -t solune/hermes-runtime:v0.51.150 .

# Create ECR repo in AWS console: solune/hermes-runtime
aws ecr get-login-password --region af-south-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}
docker tag solune/hermes-runtime:v0.51.150 ${ECR_REGISTRY}/solune/hermes-runtime:v0.51.150
docker push ${ECR_REGISTRY}/solune/hermes-runtime:v0.51.150
```

### 5. Deploy — 1–2 hours

**API → Railway**
1. Push repo to GitHub
2. Create new Railway project → deploy from GitHub → select `apps/api`
3. Set build command: `pnpm build` / start: `pnpm start:prod`
4. Add all env vars from the list above (real AWS keys, Resend key, etc.)
5. Railway gives you a URL like `https://solune-api-production.up.railway.app`

**Admin dashboard → Vercel**
1. Import repo → set root directory to `apps/admin`
2. `NEXT_PUBLIC_API_URL=https://solune-api-production.up.railway.app`

**Client dashboard → Vercel**
1. Import repo → set root directory to `apps/client`
2. `NEXT_PUBLIC_API_URL=https://solune-api-production.up.railway.app`
3. `NEXT_PUBLIC_YOCO_PUBLIC_KEY=pk_live_xxxx` (swap for live key)

**CORS update** — `apps/api/src/main.ts` — add production origins to `enableCors`:
```typescript
origin: [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://admin.solune.co.za",   // or Vercel URL
  "https://app.solune.co.za",     // or Vercel URL
],
```

### 6. Deferred (not needed for first client)
- WhatsApp QR pairing — needs separate UX design
- Onboarding wizard (`/onboarding`) — admin currently triggers provisioning manually from `/clients/[id]`
- Resend invoice emails on successful Yoco charge

---

## Critical Technical Gotchas

**Tailwind v4 — no JS config file.** Design tokens live in `@theme { }` inside `globals.css`. Do not create a `tailwind.config.ts` — it will conflict.

**Fonts — use next/font/google, never CSS @import.** Tailwind v4's `@import "tailwindcss"` expands to thousands of rules before PostCSS sees the file, making any `@import url(...)` after it illegal. Both `apps/admin/app/layout.tsx` and `apps/client/app/layout.tsx` use `Inter` and `JetBrains_Mono` from `next/font/google` with CSS variable injection.

**No Redis needed at runtime.** `bullmq` is in package.json but is not used. The health check job uses `setInterval` directly.

**Prisma client regeneration on Windows.** The Prisma DLL gets locked by the running API process. Stop the API (`Stop-Process -Id <PID> -Force`) before running `prisma generate`.

**Admin auth token:** `solune_admin_token` in localStorage. Client auth token: `solune_client_token`.

**API routes all prefixed `/api`.** So the full path for `POST /client/auth/request` is `POST http://localhost:3001/api/client/auth/request`.

**Turborepo filter uses package name, not folder name.** Use `--filter=@solune/admin`, not `--filter=admin`.

**hermes-webui auth is cookie-based, not Bearer.** The proxy service (`hermes-proxy.service.ts`) logs in via `POST /api/auth/login` and caches the `hermes_session` cookie per instance. CSRF check only triggers for browser requests (those sending `Origin`/`Referer` headers) — our server-to-server proxy sends neither.

**hermes-webui version pinned at v0.51.150** (latest stable as of 2026-05-28 per CHANGELOG.md in the cloned repo at `hermes-webui/`).

**Port layout (dev):**
- `http://localhost:3000` — admin dashboard
- `http://localhost:3001` — API
- `http://localhost:3002` — client dashboard

---

## Dev Commands

```bash
# From repo root
pnpm install                          # install all deps

# Run everything in parallel
npx turbo dev

# Or run individually (from each app folder)
cd apps/api    && npx nest start --watch      # API on :3001
cd apps/admin  && npx next dev -p 3000        # Admin on :3000
cd apps/client && npx next dev -p 3002        # Client on :3002

# Database
cd packages/db
npx prisma migrate dev --name "description"  # new migration (stop API first on Windows)
npx prisma generate                          # regenerate client (stop API first on Windows)
npx prisma studio                            # DB browser UI
node --env-file=.env --experimental-strip-types prisma/seed.ts  # seed demo data

# Kill a port on Windows (PowerShell)
$p = (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Select-Object -First 1
Stop-Process -Id $p -Force
```

---

## Seed Data

Running the seed script creates 6 accounts with billing records and audit logs. All accounts have `billingEmail` in the pattern `contact@{company}.co.za`. Login with any of them via the magic link flow at `http://localhost:3002/login`.

---

## hermes-webui Reference Repo

Cloned at `c:\Users\My Pc\Desktop\solune\hermes-webui\` — for reference only, not deployed. Key files consulted:
- `api/auth.py` — cookie auth + CSRF logic
- `api/routes.py` — all HTTP routes including `/api/chat/start`, `/api/chat/stream`, `/api/chat/cancel`
- `Dockerfile` — upstream image definition (our image extends this)
- `docker-compose.yml` — single-container reference

---

## Where The Session Ended

Last action: ran `pnpm add @aws-sdk/client-ssm --filter @solune/api` — package installed successfully. The following were planned but not yet implemented when the session ended:

1. Add `SSMClient` to `apps/api/src/provisioning/aws.client.ts`
2. Add `SecurityGroupIds` + `IamInstanceProfile` to `RunInstancesCommand` in `provisioning.service.ts`
3. Add SSM agent install to the `buildUserDataScript()` method
4. Wire Resend in `client-auth.service.ts`
5. Build `syncConfig()` in `hermes-proxy.service.ts` using SSM `SendCommandCommand`
6. Add `POST /client/hermes/config/sync` route
7. Fire sync after `PATCH /client/config`
8. Update knowledge page to show sync status

**Pick up from item 1 — `aws.client.ts`.**
