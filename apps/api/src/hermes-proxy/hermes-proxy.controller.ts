import { Controller, Post, Get, Req, Res, Query, Body, UseGuards, HttpCode } from "@nestjs/common";
import type { Request, Response } from "express";
import { ClientGuard } from "../client-auth/client.guard";
import { HermesProxyService } from "./hermes-proxy.service";

@Controller("client/hermes")
@UseGuards(ClientGuard)
export class HermesProxyController {
  constructor(private proxy: HermesProxyService) {}

  // Start a chat turn — returns { stream_id } to open the SSE stream against
  @Post("chat/start")
  @HttpCode(200)
  chatStart(@Req() req: any, @Body() body: unknown) {
    return this.proxy.chatStart(req.user.sub, body);
  }

  // Pushes saved knowledge config to the running Hermes instance via SSM.
  @Post("config/sync")
  @HttpCode(200)
  async syncConfig(@Req() req: any) {
    await this.proxy.syncConfig(req.user.sub);
    return { synced: true };
  }

  // Combined chat — starts a turn AND streams the response in one request.
  // Eliminates the race condition between chatStart + chatStream.
  @Post("chat")
  chat(
    @Req() req: Request & { user: any },
    @Res() res: Response,
    @Body() body: unknown,
  ) {
    return this.proxy.chat((req as any).user.sub, body, res);
  }

  // SSE stream — pipes hermes-webui's event stream to the browser.
  // Uses @Res() to take manual control of the response lifecycle.
  // ClientGuard validates the JWT before this runs; after that the response
  // is handed off to the service which manages the upstream connection.
  @Get("chat/stream")
  chatStream(
    @Req() req: Request & { user: any },
    @Res() res: Response,
    @Query("stream_id") streamId: string,
  ) {
    // Return the promise but don't await — NestJS must not close the response
    return this.proxy.streamChat((req as any).user.sub, streamId, req, res);
  }
}
