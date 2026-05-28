import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtPayload } from "../strategies/jwt.strategy";

@Injectable()
export class AdminGuard extends AuthGuard("jwt") implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (user.role !== "admin") throw new ForbiddenException("Admin access required");
    return true;
  }
}
