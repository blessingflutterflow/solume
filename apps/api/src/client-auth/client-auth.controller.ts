import { Body, Controller, Headers, Post } from "@nestjs/common";
import { ClientAuthService } from "./client-auth.service";
import { IsEmail, IsString, IsNotEmpty } from "class-validator";

class MagicLinkDto {
  @IsEmail()
  email: string;
}

class VerifyDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@Controller("client/auth")
export class ClientAuthController {
  constructor(private clientAuth: ClientAuthService) {}

  @Post("request")
  request(@Body() dto: MagicLinkDto, @Headers("origin") origin: string) {
    const baseUrl = origin ?? "http://localhost:3002";
    return this.clientAuth.requestMagicLink(dto.email, baseUrl);
  }

  @Post("verify")
  verify(@Body() dto: VerifyDto) {
    return this.clientAuth.verifyMagicLink(dto.token);
  }
}
