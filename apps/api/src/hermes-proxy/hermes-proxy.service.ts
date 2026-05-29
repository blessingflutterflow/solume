import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { SendCommandCommand } from "@aws-sdk/client-ssm";
import { PrismaService } from "../prisma/prisma.service";
import { AwsClientService } from "../provisioning/aws.client";
import type { Request, Response } from "express";

interface CachedSession {
  cookie: string;
  expiresAt: number;
}

@Injectable()
export class HermesProxyService {
  private readonly logger = new Logger(HermesProxyService.name);
  // Per-instance session cache — hermes-webui sessions last 30 days; we refresh at 29
  private readonly sessions = new Map<string, CachedSession>();
  private readonly SESSION_TTL_MS = 29 * 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private aws: AwsClientService,
  ) {}

  // ─── Instance resolution ────────────────────────────────────────────────────

  async resolveInstance(accountId: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { accountId },
      select: { id: true, state: true, publicIp: true, hermesWebUiPassword: true },
    });

    if (!instance) throw new NotFoundException("No instance found for this account");

    if (instance.state !== "RUNNING") {
      throw new ServiceUnavailableException(`Agent is not running (state: ${instance.state})`);
    }

    if (!instance.publicIp || !instance.hermesWebUiPassword) {
      throw new ServiceUnavailableException("Instance is not fully provisioned yet");
    }

    return instance as { id: string; state: string; publicIp: string; hermesWebUiPassword: string };
  }

  // ─── hermes-webui session management ────────────────────────────────────────

  // hermes-webui uses cookie-based sessions. We maintain one server-side session
  // per instance (TTL: 29 days, just under hermes-webui's 30-day default).
  // POST requests from our server don't carry Origin/Referer headers, so
  // hermes-webui's _is_browser_unsafe_request() returns False and CSRF is not checked.
  private async acquireSession(instanceId: string, publicIp: string, password: string): Promise<string> {
    const cached = this.sessions.get(instanceId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.cookie;
    }

    this.logger.log(`[proxy] Acquiring session for instance ${instanceId}`);

    const res = await fetch(`http://${publicIp}:8787/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`hermes-webui login failed (${res.status}) for instance ${instanceId}`);
    }

    const setCookie = res.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/hermes_session=([^;]+)/);
    if (!match) throw new Error("hermes_session cookie missing from login response");

    const cookie = `hermes_session=${match[1]}`;
    this.sessions.set(instanceId, { cookie, expiresAt: Date.now() + this.SESSION_TTL_MS });

    return cookie;
  }

  private invalidateSession(instanceId: string) {
    this.sessions.delete(instanceId);
  }

  // ─── Chat start ─────────────────────────────────────────────────────────────

  async chatStart(accountId: string, body: unknown): Promise<{ stream_id: string }> {
    const instance = await this.resolveInstance(accountId);
    const cookie = await this.acquireSession(instance.id, instance.publicIp, instance.hermesWebUiPassword);

    const res = await fetch(`http://${instance.publicIp}:8787/api/chat/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
        // No Origin/Referer — keeps CSRF check from triggering for server-to-server calls
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 401) {
      // Session expired mid-lifetime — invalidate cache and retry once
      this.invalidateSession(instance.id);
      return this.chatStart(accountId, body);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`chat/start failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<{ stream_id: string }>;
  }

  // ─── SSE stream proxy ───────────────────────────────────────────────────────

  async streamChat(accountId: string, streamId: string, req: Request, res: Response): Promise<void> {
    const instance = await this.resolveInstance(accountId);
    const cookie = await this.acquireSession(instance.id, instance.publicIp, instance.hermesWebUiPassword);

    // AbortController lets us cancel the upstream fetch when the browser disconnects
    const controller = new AbortController();

    const cleanup = () => {
      if (!controller.signal.aborted) {
        this.logger.debug(`[proxy] Browser disconnected — cancelling stream ${streamId}`);
        controller.abort();
        // Best-effort: tell hermes-webui to cancel the in-flight run
        this.cancelUpstreamStream(instance.publicIp, cookie, streamId).catch(() => {});
      }
    };

    req.on("close", cleanup);
    req.on("aborted", cleanup);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering if in front
    res.flushHeaders();

    try {
      const upstreamHeaders: Record<string, string> = {
        "Cookie": cookie,
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
      };

      // Forward Last-Event-ID so hermes-webui can replay missed events on reconnect
      const lastEventId = req.headers["last-event-id"];
      if (lastEventId) upstreamHeaders["Last-Event-ID"] = String(lastEventId);

      const upstream = await fetch(
        `http://${instance.publicIp}:8787/api/chat/stream?stream_id=${encodeURIComponent(streamId)}`,
        { headers: upstreamHeaders, signal: controller.signal },
      );

      if (upstream.status === 401) {
        this.invalidateSession(instance.id);
        res.write(`event: error\ndata: ${JSON.stringify({ message: "Session expired — please retry" })}\n\n`);
        res.end();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: `Upstream error: ${upstream.status}` })}\n\n`);
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      // Pipe chunks directly — preserves SSE framing (event/data/id lines) as-is
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        // Flush to browser after each chunk so tokens appear immediately
        if (typeof (res as any).flush === "function") (res as any).flush();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        this.logger.error(`[proxy] SSE pipe error for stream ${streamId}: ${err.message}`);
        try {
          res.write(`event: error\ndata: ${JSON.stringify({ message: "Proxy connection lost" })}\n\n`);
        } catch { /* browser already gone */ }
      }
    } finally {
      req.off("close", cleanup);
      req.off("aborted", cleanup);
      try { res.end(); } catch { /* ignore */ }
    }
  }

  // ─── Stream cancellation ────────────────────────────────────────────────────

  private async cancelUpstreamStream(publicIp: string, cookie: string, streamId: string): Promise<void> {
    await fetch(
      `http://${publicIp}:8787/api/chat/cancel?stream_id=${encodeURIComponent(streamId)}`,
      {
        headers: { "Cookie": cookie },
        signal: AbortSignal.timeout(5_000),
      },
    );
  }

  // ─── Config sync ─────────────────────────────────────────────────────────────

  // Pushes the client's knowledge config to their running Hermes instance via
  // AWS SSM RunCommand (no SSH keys needed — IAM instance profile grants access).
  async syncConfig(accountId: string): Promise<void> {
    const instance = await this.prisma.instance.findUnique({
      where: { accountId },
      select: { awsInstanceId: true, state: true },
    });

    if (!instance) throw new NotFoundException("No instance found for this account");
    if (instance.state !== "RUNNING") {
      throw new ServiceUnavailableException(`Agent is not running (state: ${instance.state})`);
    }
    if (!instance.awsInstanceId) {
      throw new ServiceUnavailableException("Instance has no AWS ID — provisioning incomplete");
    }

    const config = await this.prisma.clientConfig.findUnique({ where: { accountId } });
    const encoded = Buffer.from(this.buildConfigJson(config)).toString("base64");

    await this.aws.ssm.send(
      new SendCommandCommand({
        DocumentName: "AWS-RunShellScript",
        InstanceIds: [instance.awsInstanceId],
        Parameters: {
          commands: [
            `mkdir -p /opt/solune/hermes`,
            `echo "${encoded}" | base64 -d > /opt/solune/hermes/config.yaml`,
            `cd /opt/solune && docker-compose restart hermes`,
          ],
        },
      }),
    );

    this.logger.log(`[sync] Config sync dispatched for account ${accountId}`);
  }

  private buildConfigJson(config: any | null): string {
    return JSON.stringify(
      {
        system_prompt: config?.systemPrompt ?? null,
        agent_tone: config?.agentTone ?? "professional",
        business_hours: config?.businessHours ?? null,
        services: config?.services ?? [],
        faq: config?.faq ?? [],
      },
      null,
      2,
    );
  }
}
