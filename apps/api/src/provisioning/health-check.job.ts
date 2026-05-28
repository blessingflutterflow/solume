import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisioningService } from "./provisioning.service";

@Injectable()
export class HealthCheckJob implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckJob.name);
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private provisioning: ProvisioningService,
  ) {}

  onModuleInit() {
    // Run every 60 seconds
    this.interval = setInterval(() => this.run(), 60_000);
    this.logger.log("Health check job started (60s interval)");
  }

  async run() {
    const instances = await this.prisma.instance.findMany({
      where: { state: "RUNNING", awsInstanceId: { not: null } },
      select: { id: true },
    });

    if (instances.length === 0) return;

    this.logger.log(`Health check: pinging ${instances.length} instance(s)`);

    await Promise.allSettled(
      instances.map((i) => this.provisioning.checkInstanceHealth(i.id)),
    );
  }
}
