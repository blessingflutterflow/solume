import { Module } from "@nestjs/common";
import { HermesProxyController } from "./hermes-proxy.controller";
import { HermesProxyService } from "./hermes-proxy.service";
import { PrismaModule } from "../prisma/prisma.module";
import { ClientAuthModule } from "../client-auth/client-auth.module";
import { AwsClientService } from "../provisioning/aws.client";

@Module({
  imports: [PrismaModule, ClientAuthModule],
  controllers: [HermesProxyController],
  providers: [HermesProxyService, AwsClientService],
  exports: [HermesProxyService],
})
export class HermesProxyModule {}
