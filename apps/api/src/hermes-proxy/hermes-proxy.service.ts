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
  // Per-instance cookie cache — hermes-webui auth sessions last 30 days; we refresh at 29
  private readonly sessions = new Map<string, CachedSession>();
  private readonly SESSION_TTL_MS = 29 * 24 * 60 * 60 * 1000;
  // Per-account hermes conversation session IDs (persistent chat context)
  private readonly hermesSessionIds = new Map<string, string>();

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

  // ─── Hermes conversation session ─────────────────────────────────────────────

  // Hermes-webui requires a conversation session to exist before chat/start.
  // We create one per account on first use and cache it in memory.
  // Sessions persist on disk inside the container so they survive restarts.
  private async acquireHermesSession(accountId: string, publicIp: string, cookie: string): Promise<string> {
    const cached = this.hermesSessionIds.get(accountId);
    if (cached) return cached;

    this.logger.log(`[proxy] Creating Hermes session for account ${accountId}`);

    const res = await fetch(`http://${publicIp}:8787/api/session/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": cookie },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`session/new failed (${res.status}) for account ${accountId}`);
    }

    const data = await res.json() as { session: { session_id: string } };
    const sessionId = data.session.session_id;
    this.hermesSessionIds.set(accountId, sessionId);
    this.logger.log(`[proxy] Hermes session created: ${sessionId}`);
    return sessionId;
  }

  // ─── Chat start ─────────────────────────────────────────────────────────────

  async chatStart(accountId: string, body: unknown): Promise<{ stream_id: string }> {
    const instance = await this.resolveInstance(accountId);
    const cookie = await this.acquireSession(instance.id, instance.publicIp, instance.hermesWebUiPassword);
    const sessionId = await this.acquireHermesSession(accountId, instance.publicIp, cookie);

    const payload = { ...(body as object), session_id: sessionId };

    const res = await fetch(`http://${instance.publicIp}:8787/api/chat/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
        // No Origin/Referer — keeps CSRF check from triggering for server-to-server calls
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (res.status === 401) {
      // Session expired mid-lifetime — invalidate cache and retry once
      this.invalidateSession(instance.id);
      return this.chatStart(accountId, body);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // If the session was not found (e.g. container restarted), clear cached session and retry
      if (text.includes("Session not found")) {
        this.hermesSessionIds.delete(accountId);
        return this.chatStart(accountId, body);
      }
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
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();

    try {
      const upstreamHeaders: Record<string, string> = {
        "Cookie": cookie,
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
      };

      // Start from the beginning so we never miss events even if stream opens slightly late
      upstreamHeaders["Last-Event-ID"] = "0";
      // Also honour browser reconnect replays
      const lastEventId = req.headers["last-event-id"];
      if (lastEventId && lastEventId !== "0") upstreamHeaders["Last-Event-ID"] = String(lastEventId);

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

      // Parse SSE stream and forward only relevant events to the browser.
      // Hermes emits: token (response text), reasoning (internal thinking),
      // metering (stats), context_status, done, error.
      // We forward: token, done, error — drop everything else.
      const FORWARD_EVENTS = new Set(["token", "done", "error"]);
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE blocks are separated by double newline
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventType = "message";
          let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
          }
          if (!FORWARD_EVENTS.has(eventType)) continue;
          const out = `event: ${eventType}\ndata: ${dataLine}\n\n`;
          res.write(out);
          if (typeof (res as any).flush === "function") (res as any).flush();
        }
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
