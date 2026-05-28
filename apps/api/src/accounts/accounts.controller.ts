import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { AdminGuard } from "../auth/guards/admin.guard";
import { AccountStatus } from "@solune/types";

@Controller("accounts")
@UseGuards(AdminGuard)
export class AccountsController {
  constructor(private accounts: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Get()
  findAll(@Query("status") status?: AccountStatus) {
    return this.accounts.findAll(status);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.accounts.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(id, dto);
  }

  @Post(":id/suspend")
  @HttpCode(HttpStatus.OK)
  suspend(@Param("id") id: string) {
    return this.accounts.suspend(id);
  }

  @Post(":id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivate(@Param("id") id: string) {
    return this.accounts.reactivate(id);
  }
}
