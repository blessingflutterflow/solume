import { IsString, IsNotEmpty } from "class-validator";

export class ChargeDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ManualPaymentDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  note: string;
}
