import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AdminLoginDto } from "./dto/admin-login.dto";

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async adminLogin(dto: AdminLoginDto): Promise<{ accessToken: string }> {
    const adminEmail = this.config.getOrThrow<string>("ADMIN_EMAIL");
    const adminPassword = this.config.getOrThrow<string>("ADMIN_PASSWORD");

    if (dto.email !== adminEmail || dto.password !== adminPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.jwt.sign({
      sub: "admin",
      role: "admin",
      email: adminEmail,
    });

    return { accessToken };
  }
}
