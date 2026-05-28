import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";
import { AccountStatus } from "@solune/types";

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(Object.values(AccountStatus))
  status?: AccountStatus;
}
