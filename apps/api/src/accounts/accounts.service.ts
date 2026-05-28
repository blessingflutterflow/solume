import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { AccountStatus } from "@solune/types";

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        businessName: dto.businessName,
        billingEmail: dto.billingEmail,
        phone: dto.phone,
        vatNumber: dto.vatNumber,
        address: dto.address,
        plan: dto.plan,
      },
    });
  }

  async findAll(status?: AccountStatus) {
    return this.prisma.account.findMany({
      where: status ? { status } : undefined,
      include: {
        instance: {
          select: { state: true, lastHealthCheck: true, publicIp: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        instance: {
          include: { provisioningJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
        billingRecords: { orderBy: { billedAt: "desc" }, take: 10 },
        config: true,
      },
    });

    if (!account) throw new NotFoundException(`Account ${id} not found`);
    return account;
  }

  async update(id: string, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
  }

  async reactivate(id: string) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  }
}
