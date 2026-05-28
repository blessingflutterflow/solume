import { Injectable, UnauthorizedException, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClientAuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async requestMagicLink(email: string, baseUrl: string) {
    const account = await this.prisma.account.findFirst({
      where: { billingEmail: email },
      select: { id: true, businessName: true, status: true },
    });

    if (!account) throw new NotFoundException("No account found with that email address.");
    if (account.status === "SUSPENDED") throw new UnauthorizedException("This account has been suspended.");

    // Short-lived token — 15 minutes
    const token = this.jwt.sign(
      { email, type: "magic_link", accountId: account.id },
      { expiresIn: "15m" },
    );

    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

    await this.prisma.auditLog.create({
      data: {
        accountId: account.id,
        actorType: "CLIENT",
        action: "auth.magic_link_requested",
        metadata: { email },
      },
    });

    const resendKey = this.config.get<string>("RESEND_API_KEY");
    const fromEmail = this.config.get<string>("FROM_EMAIL", "hello@solune.co.za");

    if (resendKey && resendKey !== "re_replace_me") {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Solune <${fromEmail}>`,
          to: [email],
          subject: "Sign in to Solune",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;">
              <p style="font-size:20px;font-weight:700;margin-bottom:8px;">Sign in to Solune</p>
              <p style="color:#888;margin-bottom:24px;font-size:14px;">Click the button below to sign in to your dashboard. This link expires in 15 minutes.</p>
              <a href="${verifyUrl}" style="display:inline-block;background:#faff69;color:#0a0a0a;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Sign in to dashboard</a>
              <p style="color:#555;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return { message: "Check your inbox." };
    }

    // Dev fallback — RESEND_API_KEY not configured
    return { message: "Magic link generated.", verifyUrl, token };
  }

  async verifyMagicLink(token: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired link.");
    }

    if (payload.type !== "magic_link") throw new UnauthorizedException("Invalid token type.");

    const account = await this.prisma.account.findUnique({
      where: { id: payload.accountId },
      select: { id: true, businessName: true, billingEmail: true, status: true, plan: true },
    });

    if (!account) throw new UnauthorizedException("Account not found.");
    if (account.status === "SUSPENDED") throw new UnauthorizedException("This account has been suspended.");

    const sessionToken = this.jwt.sign(
      { sub: account.id, role: "client", email: account.billingEmail },
      { expiresIn: "7d" },
    );

    await this.prisma.auditLog.create({
      data: {
        accountId: account.id,
        actorType: "CLIENT",
        action: "auth.login",
        metadata: { email: account.billingEmail },
      },
    });

    return { accessToken: sessionToken, account };
  }
}
