import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { Plan } from "@solune/types";

export class CreateAccountDto {
  @IsString()
  @MinLength(2)
  businessName: string;

  @IsEmail()
  billingEmail: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsIn(Object.values(Plan))
  plan: Plan;
}
