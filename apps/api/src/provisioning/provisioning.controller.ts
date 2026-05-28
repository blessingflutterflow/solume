import { Controller, Param, Post, Get, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { ProvisioningService } from "./provisioning.service";
import { LifecycleService } from "./lifecycle.service";

@Controller("accounts/:accountId")
@UseGuards(AdminGuard)
export class ProvisioningController {
  constructor(
    private provisioning: ProvisioningService,
    private lifecycle: LifecycleService,
  ) {}

  @Post("provision")
  @HttpCode(HttpStatus.ACCEPTED)
  async provision(@Param("accountId") accountId: string) {
    await this.provisioning.provisionClientInstance(accountId);
    return { message: "Provisioning started", accountId };
  }

  @Get("provision/status")
  status(@Param("accountId") accountId: string) {
    return this.provisioning.getProvisioningStatus(accountId);
  }

  @Post("start")
  @HttpCode(HttpStatus.OK)
  start(@Param("accountId") accountId: string) {
    return this.lifecycle.start(accountId);
  }

  @Post("stop")
  @HttpCode(HttpStatus.OK)
  stop(@Param("accountId") accountId: string) {
    return this.lifecycle.stop(accountId);
  }

  @Post("reboot")
  @HttpCode(HttpStatus.OK)
  reboot(@Param("accountId") accountId: string) {
    return this.lifecycle.reboot(accountId);
  }

  @Post("terminate")
  @HttpCode(HttpStatus.OK)
  terminate(@Param("accountId") accountId: string) {
    return this.lifecycle.terminate(accountId);
  }
}
