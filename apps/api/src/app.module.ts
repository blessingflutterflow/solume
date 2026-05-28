import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AccountsModule } from "./accounts/accounts.module";
import { ProvisioningModule } from "./provisioning/provisioning.module";
import { AuditModule } from "./audit/audit.module";
import { BillingModule } from "./billing/billing.module";
import { ClientAuthModule } from "./client-auth/client-auth.module";
import { ClientPortalModule } from "./client-portal/client-portal.module";
import { HermesProxyModule } from "./hermes-proxy/hermes-proxy.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    ProvisioningModule,
    AuditModule,
    BillingModule,
    ClientAuthModule,
    ClientPortalModule,
    HermesProxyModule,
  ],
})
export class AppModule {}
