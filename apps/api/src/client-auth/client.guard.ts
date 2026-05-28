import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class ClientGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    if (err || !user) throw new UnauthorizedException();
    if (user.role !== "client") throw new UnauthorizedException();
    return user;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
