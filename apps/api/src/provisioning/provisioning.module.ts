import { Module } from "@nestjs/common";
import { ProvisioningService } from "./provisioning.service";
import { LifecycleService } from "./lifecycle.service";
import { ProvisioningController } from "./provisioning.controller";
import { HealthCheckJob } from "./health-check.job";
import { AwsClientService } from "./aws.client";

@Module({
  providers: [AwsClientService, ProvisioningService, LifecycleService, HealthCheckJob],
  controllers: [ProvisioningController],
  exports: [ProvisioningService, LifecycleService],
})
export class ProvisioningModule {}
