import { Module } from "@nestjs/common";
import { ClientPortalController } from "./client-portal.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingModule } from "../billing/billing.module";
import { HermesProxyModule } from "../hermes-proxy/hermes-proxy.module";

@Module({
  imports: [PrismaModule, BillingModule, HermesProxyModule],
  controllers: [ClientPortalController],
})
export class ClientPortalModule {}
