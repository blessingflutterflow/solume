import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { PrismaService } from "../prisma/prisma.service";

@Controller("audit")
@UseGuards(AdminGuard)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query("actorType") actorType?: string, @Query("accountId") accountId?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(actorType ? { actorType } : {}),
        ...(accountId ? { accountId } : {}),
      },
      include: { account: { select: { id: true, businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
}
