import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  RunInstancesCommand,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  TerminateInstancesCommand,
} from "@aws-sdk/client-ec2";
import { ChangeResourceRecordSetsCommand } from "@aws-sdk/client-route-53";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AwsClientService } from "./aws.client";
import { PLAN_INSTANCE_TYPES } from "@solune/types";
import type { ProvisioningStepEntry } from "@solune/types";

const STEP_LABELS = [
  "Initialising job",
  "Launching EC2 instance",
  "Waiting for instance to be running",
  "Waiting for Hermes to be ready",
  "Setting up subdomain",
  "Marking instance ready",
  "Sending notifications",
];

const HERMES_IMAGE_TAG = "0.51.150";

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private prisma: PrismaService,
    private aws: AwsClientService,
    private config: ConfigService,
  ) {}

  // ─── Main entry point ──────────────────────────────────────────────────────

  async provisionClientInstance(accountId: string): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { instance: { include: { provisioningJobs: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    });

    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    let instance = account.instance;
    let job = instance?.provisioningJobs[0];

    const resumeFromStep = job?.status === "FAILED" ? job.currentStep : 0;

    if (!instance) {
      instance = await this.prisma.instance.create({
        data: { accountId, state: "PROVISIONING", region: this.config.get("AWS_REGION", "af-south-1") },
        include: { provisioningJobs: true },
      });
    }

    if (!job || job.status === "FAILED") {
      job = await this.prisma.provisioningJob.create({
        data: { instanceId: instance.id, status: "IN_PROGRESS", currentStep: resumeFromStep, startedAt: new Date() },
      });
    }

    this.runSteps(instance.id, job.id, resumeFromStep, account.plan).catch((err) => {
      this.logger.error(`Provisioning failed for account ${accountId}: ${err.message}`);
    });
  }

  // ─── Step runner ───────────────────────────────────────────────────────────

  private async runSteps(instanceId: string, jobId: string, fromStep: number, plan: string) {
    const steps = [
      () => this.step1_initJob(instanceId, jobId),
      () => this.step2_launchEc2(instanceId, jobId, plan),
      () => this.step3_waitForRunning(instanceId, jobId),
      () => this.step4_waitForHermes(instanceId, jobId),
      () => this.step5_setupSubdomain(instanceId, jobId),
      () => this.step6_markReady(instanceId, jobId),
      () => this.step7_notify(instanceId, jobId),
    ];

    for (let i = fromStep; i < steps.length; i++) {
      await this.writeStepLog(jobId, i, "in_progress");
      try {
        await steps[i]();
        await this.writeStepLog(jobId, i, "completed");
        await this.prisma.provisioningJob.update({ where: { id: jobId }, data: { currentStep: i + 1 } });
      } catch (err) {
        await this.writeStepLog(jobId, i, "failed", (err as Error).message);
        await this.prisma.provisioningJob.update({
          where: { id: jobId },
          data: { status: "FAILED", failedAt: new Date(), failureReason: (err as Error).message },
        });
        await this.prisma.instance.update({ where: { id: instanceId }, data: { state: "FAILED" } });
        throw err;
      }
    }

    await this.prisma.provisioningJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  // ─── Individual steps ──────────────────────────────────────────────────────

  private async step1_initJob(instanceId: string, _jobId: string) {
    // Generate a per-instance password for hermes-webui auth.
    // Stored in our DB; used by the Solune API proxy when talking to this instance.
    const hermesWebUiPassword = randomBytes(24).toString("base64url");

    await this.prisma.instance.update({
      where: { id: instanceId },
      data: { state: "PROVISIONING", hermesWebUiPassword },
    });
    this.logger.log(`[Step 1] Job initialised for instance ${instanceId}`);
  }

  private async step2_launchEc2(instanceId: string, _jobId: string, plan: string) {
    const instance = await this.prisma.instance.findUniqueOrThrow({ where: { id: instanceId } });

    if (instance.awsInstanceId) {
      this.logger.log(`[Step 2] EC2 already launched: ${instance.awsInstanceId}`);
      return;
    }

    const instanceType = PLAN_INSTANCE_TYPES[plan as keyof typeof PLAN_INSTANCE_TYPES] ?? "t3.small";
    const amiId = this.config.get("AWS_AMI_ID", "ami-0c55b159cbfafe1f0");
    const ecrRegistry = this.config.get("ECR_REGISTRY", "");
    const password = instance.hermesWebUiPassword ?? "";

    const userDataScript = this.buildUserDataScript({
      instanceId,
      ecrRegistry,
      imageTag: HERMES_IMAGE_TAG,
      hermesWebUiPassword: password,
      region: instance.region,
      openRouterApiKey: this.config.get("OPENROUTER_API_KEY", ""),
    });

    const command = new RunInstancesCommand({
      ImageId: amiId,
      InstanceType: instanceType as any,
      MinCount: 1,
      MaxCount: 1,
      UserData: Buffer.from(userDataScript).toString("base64"),
      SecurityGroupIds: [this.config.get("AWS_SECURITY_GROUP_ID", "")].filter(Boolean),
      IamInstanceProfile: this.config.get("AWS_IAM_INSTANCE_PROFILE")
        ? { Name: this.config.get("AWS_IAM_INSTANCE_PROFILE") }
        : undefined,
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            { Key: "solune:instance-id", Value: instanceId },
            { Key: "solune:platform", Value: "true" },
            { Key: "Name", Value: `solune-client-${instanceId}` },
          ],
        },
      ],
    });

    const result = await this.aws.ec2.send(command);
    const awsInstanceId = result.Instances?.[0]?.InstanceId;
    if (!awsInstanceId) throw new Error("EC2 launch returned no instance ID");

    await this.prisma.instance.update({ where: { id: instanceId }, data: { awsInstanceId } });
    this.logger.log(`[Step 2] EC2 launched: ${awsInstanceId}`);
  }

  private async step3_waitForRunning(instanceId: string, _jobId: string) {
    const instance = await this.prisma.instance.findUniqueOrThrow({ where: { id: instanceId } });
    if (!instance.awsInstanceId) throw new Error("No AWS instance ID found");

    if (instance.publicIp && instance.privateIp) {
      this.logger.log(`[Step 3] Instance already running at ${instance.publicIp}`);
      return;
    }

    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));

      const result = await this.aws.ec2.send(
        new DescribeInstancesCommand({ InstanceIds: [instance.awsInstanceId] }),
      );

      const ec2 = result.Reservations?.[0]?.Instances?.[0];
      if (ec2?.State?.Name === "running" && ec2.PublicIpAddress && ec2.PrivateIpAddress) {
        await this.prisma.instance.update({
          where: { id: instanceId },
          data: {
            publicIp: ec2.PublicIpAddress,
            privateIp: ec2.PrivateIpAddress,
          },
        });
        this.logger.log(`[Step 3] Instance running — public: ${ec2.PublicIpAddress}, private: ${ec2.PrivateIpAddress}`);
        return;
      }

      this.logger.log(`[Step 3] Waiting... attempt ${attempt + 1}/${maxAttempts}`);
    }

    throw new Error("Timed out waiting for EC2 to enter running state");
  }

  // Step 4: poll hermes-webui /health on the private IP until it responds.
  // UserData installs Docker + pulls the image on first boot — this takes
  // 2–4 minutes on a fresh instance. We give it 10 minutes max.
  private async step4_waitForHermes(instanceId: string, _jobId: string) {
    const instance = await this.prisma.instance.findUniqueOrThrow({ where: { id: instanceId } });
    if (!instance.publicIp) throw new Error("No public IP — step 3 did not complete");
    if (!instance.hermesWebUiPassword) throw new Error("hermesWebUiPassword not set — step 1 did not complete");

    const url = `http://${instance.publicIp}:8787/health`;
    const maxAttempts = 120; // 10 min at 5s intervals

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          this.logger.log(`[Step 4] hermes-webui is healthy at ${url}`);
          return;
        }
      } catch {
        // Not ready yet — keep polling
      }

      this.logger.log(`[Step 4] Waiting for hermes-webui... attempt ${attempt + 1}/${maxAttempts}`);
    }

    throw new Error("Timed out waiting for hermes-webui to become healthy");
  }

  private async step5_setupSubdomain(instanceId: string, _jobId: string) {
    const instance = await this.prisma.instance.findUniqueOrThrow({ where: { id: instanceId } });
    const hostedZoneId = this.config.get<string>("AWS_HOSTED_ZONE_ID");

    if (!instance.publicIp) throw new Error("No public IP available for subdomain setup");

    const subdomain = `${instanceId}.${this.config.get("PLATFORM_DOMAIN", "solune.co.za")}`;

    if (!hostedZoneId) {
      this.logger.log(`[Step 5] STUB: subdomain would be ${subdomain}`);
      await this.prisma.instance.update({ where: { id: instanceId }, data: { subdomain } });
      return;
    }

    await this.aws.route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [{
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: subdomain,
              Type: "A",
              TTL: 300,
              ResourceRecords: [{ Value: instance.publicIp }],
            },
          }],
        },
      }),
    );

    await this.prisma.instance.update({ where: { id: instanceId }, data: { subdomain } });
    this.logger.log(`[Step 5] Subdomain created: ${subdomain}`);
  }

  private async step6_markReady(instanceId: string, _jobId: string) {
    await this.prisma.instance.update({
      where: { id: instanceId },
      data: { state: "RUNNING", provisionedAt: new Date() },
    });
    this.logger.log(`[Step 6] Instance ${instanceId} marked RUNNING`);
  }

  private async step7_notify(_instanceId: string, _jobId: string) {
    this.logger.log(`[Step 7] STUB: notifications skipped`);
  }

  // ─── Health check ──────────────────────────────────────────────────────────

  async checkInstanceHealth(instanceId: string): Promise<boolean> {
    const instance = await this.prisma.instance.findUnique({ where: { id: instanceId } });
    if (!instance?.awsInstanceId) return false;

    try {
      const result = await this.aws.ec2.send(
        new DescribeInstancesCommand({ InstanceIds: [instance.awsInstanceId] }),
      );
      const state = result.Reservations?.[0]?.Instances?.[0]?.State?.Name;
      const isRunning = state === "running";

      await this.prisma.instance.update({
        where: { id: instanceId },
        data: {
          state: isRunning ? "RUNNING" : "STOPPED",
          lastHealthCheck: new Date(),
        },
      });

      return isRunning;
    } catch {
      return false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  async getProvisioningStatus(accountId: string) {
    return this.prisma.instance.findUnique({
      where: { accountId },
      include: { provisioningJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  private buildUserDataScript(opts: {
    instanceId: string;
    ecrRegistry: string;
    imageTag: string;
    hermesWebUiPassword: string;
    region: string;
    openRouterApiKey: string;
  }): string {
    const { instanceId, ecrRegistry, imageTag, hermesWebUiPassword, region, openRouterApiKey } = opts;
    const image = ecrRegistry ? `${ecrRegistry}/solune/hermes-runtime:${imageTag}` : `solune/hermes-runtime:${imageTag}`;

    return `#!/bin/bash
set -euo pipefail

# --- Solune Hermes Runtime Bootstrap ---
# Instance: ${instanceId}
# Runs on first boot via EC2 UserData

apt-get update -y
apt-get install -y --no-install-recommends docker.io docker-compose curl awscli snapd

systemctl enable docker
systemctl start docker

# Install SSM agent (needed for config sync via Solune API)
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service

# Hermes home — mounted at /home/hermeswebui/.hermes inside the container
# Must be owned by UID/GID 1000 (hermeswebui user)
HERMES_HOST_DIR=/opt/solune/hermes
mkdir -p "$HERMES_HOST_DIR/webui"

# Install Hermes Agent into the host mount dir so the container finds it
export HOME=/root
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | HERMES_HOME="$HERMES_HOST_DIR" bash

# Write Hermes LLM config
cat > "$HERMES_HOST_DIR/.env" << 'ENV_EOF'
OPENROUTER_API_KEY=${openRouterApiKey}
ENV_EOF

cat > "$HERMES_HOST_DIR/config.yaml" << 'CFG_EOF'
model:
  default: anthropic/claude-sonnet-4-6
  provider: openrouter
  base_url: https://openrouter.ai/api/v1
CFG_EOF

chown -R 1000:1000 "$HERMES_HOST_DIR"

# Write docker-compose
mkdir -p /opt/solune
cat > /opt/solune/docker-compose.yml << 'COMPOSE_EOF'
services:
  hermes:
    image: ${image}
    ports:
      - "8787:8787"
    environment:
      - HERMES_WEBUI_HOST=0.0.0.0
      - HERMES_WEBUI_PORT=8787
      - HERMES_WEBUI_PASSWORD=${hermesWebUiPassword}
      - HERMES_HOME=/home/hermeswebui/.hermes
      - HERMES_WEBUI_STATE_DIR=/home/hermeswebui/.hermes/webui
      - HERMES_WEBUI_AGENT_DIR=/home/hermeswebui/.hermes/hermes-agent
      - HERMES_WEBUI_SKIP_ONBOARDING=1
      - WANTED_UID=1000
      - WANTED_GID=1000
    volumes:
      - /opt/solune/hermes:/home/hermeswebui/.hermes
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/health"]
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3
COMPOSE_EOF

${ecrRegistry ? `# Login to ECR
aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${ecrRegistry}
` : ""}
# Pull and start
cd /opt/solune
docker-compose pull
docker-compose up -d

echo "Solune Hermes Runtime started" >> /var/log/solune-bootstrap.log
`;
  }

  private async writeStepLog(jobId: string, step: number, status: ProvisioningStepEntry["status"], detail?: string) {
    const job = await this.prisma.provisioningJob.findUniqueOrThrow({ where: { id: jobId } });
    const log = (job.stepLog as unknown as ProvisioningStepEntry[]) ?? [];

    const existing = log.findIndex((e) => e.step === step);
    const entry: ProvisioningStepEntry = {
      step,
      label: STEP_LABELS[step] ?? `Step ${step}`,
      status,
      timestamp: new Date().toISOString(),
      detail,
    };

    if (existing >= 0) log[existing] = entry;
    else log.push(entry);

    await this.prisma.provisioningJob.update({ where: { id: jobId }, data: { stepLog: log as any } });
  }
}
