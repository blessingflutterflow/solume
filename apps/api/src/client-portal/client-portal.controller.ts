import { Body, Controller, Get, Logger, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ClientGuard } from "../client-auth/client.guard";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "../billing/billing.service";
import { HermesProxyService } from "../hermes-proxy/hermes-proxy.service";
import { IsOptional, IsString, IsBoolean } from "class-validator";

class UpdateConfigDto {
  @IsOptional() @IsString() systemPrompt?: string;
  @IsOptional() @IsString() agentTone?: string;
  @IsOptional() @IsString() businessHours?: string;
  @IsOptional() faq?: any[];
  @IsOptional() services?: any[];
  @IsOptional() @IsBoolean() whatsappEnabled?: boolean;
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsBoolean() telegramEnabled?: boolean;
  @IsOptional() @IsBoolean() webChatEnabled?: boolean;
}

class ClientChargeDto {
  @IsString() token: string;
}

@Controller("client")
@UseGuards(ClientGuard)
export class ClientPortalController {
  private readonly logger = new Logger(ClientPortalController.name);

  constructor(
    private prisma: PrismaService,
    private billingSvc: BillingService,
    private hermesProxy: HermesProxyService,
  ) {}

  @Get("me")
  async me(@Req() req: any) {
    return this.prisma.account.findUnique({
      where: { id: req.user.sub },
      include: {
        instance: { select: { state: true, publicIp: true, subdomain: true, provisionedAt: true, region: true } },
        config: true,
        billingRecords: { orderBy: { billedAt: "desc" }, take: 5 },
      },
    });
  }

  @Get("billing")
  async billing(@Req() req: any) {
    return this.prisma.billingRecord.findMany({
      where: { accountId: req.user.sub },
      orderBy: { billedAt: "desc" },
    });
  }

  @Get("config")
  async config(@Req() req: any) {
    return this.prisma.clientConfig.findUnique({ where: { accountId: req.user.sub } });
  }

  @Patch("config")
  async updateConfig(@Req() req: any, @Body() dto: UpdateConfigDto) {
    const existing = await this.prisma.clientConfig.findUnique({ where: { accountId: req.user.sub } });
    let result;
    if (existing) {
      result = await this.prisma.clientConfig.update({
        where: { accountId: req.user.sub },
        data: { ...dto, version: { increment: 1 } },
      });
    } else {
      result = await this.prisma.clientConfig.create({
        data: { accountId: req.user.sub, ...dto },
      });
    }

    // Fire-and-forget — sync config to the running Hermes instance via SSM
    this.hermesProxy.syncConfig(req.user.sub).catch((err: Error) => {
      this.logger.warn(`Config sync skipped for account ${req.user.sub}: ${err.message}`);
    });

    return result;
  }

  @Patch("me")
  async updateMe(@Req() req: any, @Body() dto: { businessName?: string; phone?: string; vatNumber?: string; address?: string }) {
    return this.prisma.account.update({
      where: { id: req.user.sub },
      data: {
        ...(dto.businessName ? { businessName: dto.businessName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address || null } : {}),
      },
    });
  }

  @Post("billing/charge")
  async charge(@Req() req: any, @Body() dto: ClientChargeDto) {
    return this.billingSvc.chargeAccount(req.user.sub, dto.token);
  }
}
