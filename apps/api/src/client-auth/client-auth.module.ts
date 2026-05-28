import { Module } from "@nestjs/common";
import { ClientAuthController } from "./client-auth.controller";
import { ClientAuthService } from "./client-auth.service";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ClientAuthController],
  providers: [ClientAuthService],
  exports: [ClientAuthService],
})
export class ClientAuthModule {}
