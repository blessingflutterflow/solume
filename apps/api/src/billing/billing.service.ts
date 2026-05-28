import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { PLAN_PRICES } from "@solune/types";

interface YocoChargeResponse {
  id: string;
  status: "successful" | "failed";
  amount: number;
  currency: string;
  message?: string;
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async chargeAccount(accountId: string, token: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, businessName: true, billingEmail: true, plan: true, status: true },
    });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    const amountInCents = PLAN_PRICES[account.plan as keyof typeof PLAN_PRICES];
    if (!amountInCents) throw new BadRequestException(`No price configured for plan ${account.plan}`);

    const secretKey = this.config.get<string>("YOCO_SECRET_KEY");
    const response = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "X-Auth-Secret-Key": secretKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: "ZAR",
        metadata: {
          accountId,
          businessName: account.businessName,
          plan: account.plan,
        },
      }),
    });

    const charge = (await response.json()) as YocoChargeResponse;

    if (!response.ok || charge.status !== "successful") {
      await this.prisma.billingRecord.create({
        data: {
          accountId,
          amount: amountInCents,
          currency: "ZAR",
          status: "FAILED",
        },
      });
      await this.prisma.auditLog.create({
        data: {
          accountId,
          actorType: "SYSTEM",
          action: "billing.charge_failed",
          metadata: { reason: charge.message ?? "Yoco charge declined" },
        },
      });
      throw new BadRequestException(charge.message ?? "Payment failed");
    }

    const record = await this.prisma.billingRecord.create({
      data: {
        accountId,
        amount: amountInCents,
        currency: "ZAR",
        paystackReference: charge.id,
        status: "PAID",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        accountId,
        actorType: "ADMIN",
        action: "billing.charged",
        metadata: { amount: amountInCents, yocoChargeId: charge.id },
      },
    });

    return record;
  }

  async recordManualPayment(accountId: string, amountInCents: number, note: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException(`Account ${accountId} not found`);

    const record = await this.prisma.billingRecord.create({
      data: {
        accountId,
        amount: amountInCents,
        currency: "ZAR",
        paystackReference: `MANUAL-${Date.now()}`,
        status: "PAID",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        accountId,
        actorType: "ADMIN",
        action: "billing.manual_payment",
        metadata: { amount: amountInCents, note },
      },
    });

    return record;
  }

  async getBillingHistory(accountId: string) {
    return this.prisma.billingRecord.findMany({
      where: { accountId },
      orderBy: { billedAt: "desc" },
    });
  }
}
