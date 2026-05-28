import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ChargeDto, ManualPaymentDto } from "./dto/charge.dto";
import { PLAN_PRICES } from "@solune/types";
import { PrismaService } from "../prisma/prisma.service";

@Controller("billing")
@UseGuards(AdminGuard)
export class BillingController {
  constructor(
    private billing: BillingService,
    private prisma: PrismaService,
  ) {}

  @Post("charge")
  charge(@Body() dto: ChargeDto) {
    return this.billing.chargeAccount(dto.accountId, dto.token);
  }

  @Post("manual")
  manualPayment(@Body() dto: ManualPaymentDto) {
    return this.billing.recordManualPayment(dto.accountId, 0, dto.note);
  }

  @Get("history/:accountId")
  history(@Param("accountId") accountId: string) {
    return this.billing.getBillingHistory(accountId);
  }

  @Get("plan-prices")
  planPrices() {
    return PLAN_PRICES;
  }
}
