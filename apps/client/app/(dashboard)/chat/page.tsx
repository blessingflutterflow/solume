"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Send, Bot, User, Loader2, AlertCircle, MessageSquare } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// Parse a single SSE block ("event: token\ndata: {...}" etc.) into { type, data }
function parseSseBlock(block: string): { type: string; data: string } | null {
  let type = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) type = line.slice(7).trim();
    else if (line.startsWith("data: ")) data = line.slice(6).trim();
  }
  return data ? { type, data } : null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendAssistantToken = useCallback((text: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, content: last.content + text };
      }
      return updated;
    });
  }, []);

  const finaliseAssistant = useCallback(() => {
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, streaming: false };
      }
      return updated;
    });
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);

    // Auto-grow textarea reset
    if (textareaRef.current) textareaRef.current.style.height = "42px";

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { stream_id } = await api.post<{ stream_id: string }>("/client/hermes/chat/start", {
        message: text,
        session_id: "solune-default",
      });

      const token = typeof window !== "undefined" ? localStorage.getItem("solune_client_token") : null;

      const res = await fetch(
        `${BASE}/api/client/hermes/chat/stream?stream_id=${encodeURIComponent(stream_id)}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        },
      );

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("solune_client_token");
          window.location.href = "/login";
        }
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error(`Stream connection failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newline
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const event = parseSseBlock(block.trim());
          if (!event) continue;

          if (event.type === "token") {
            try {
              const { text: tok } = JSON.parse(event.data);
              if (tok) appendAssistantToken(tok);
            } catch { /* malformed chunk — skip */ }
          } else if (event.type === "done") {
            finaliseAssistant();
            setStreaming(false);
            abortRef.current = null;
          } else if (event.type === "error") {
            let msg = "Agent error";
            try { msg = JSON.parse(event.data).message ?? msg; } catch { /* ignore */ }
            setError(msg);
            finaliseAssistant();
            setStreaming(false);
            abortRef.current = null;
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User cancelled — clean up the in-progress bubble
        finaliseAssistant();
      } else {
        setError(err?.message ?? "Could not reach your agent. Check that it is running.");
        setMessages((prev) => prev.filter((m) => !(m.role === "assistant" && m.streaming)));
      }
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, appendAssistantToken, finaliseAssistant]);

  // Cleanup on unmount
  useEffect(() => () => cancelStream(), [cancelStream]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = "42px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#2a2a2a] shrink-0">
        <h1 className="text-white text-lg font-semibold">Chat with Hermes</h1>
        <p className="text-[#888888] text-sm mt-0.5">
          Talk directly to your AI agent
        </p>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <MessageSquare size={32} className="text-[#2a2a2a] mb-3" />
            <p className="text-[#888888] text-sm">Send a message to start talking to Hermes.</p>
            <p className="text-[#555555] text-xs mt-1">
              Hermes handles your WhatsApp, calendar, and customer conversations.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-[#faff69] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-[#0a0a0a]" />
                </div>
              )}

              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-[12px] text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-[#1a1a1a] text-white rounded-tr-[4px]"
                    : "bg-[#1a1a1a] text-[#cccccc] rounded-tl-[4px]"
                }`}
              >
                {msg.content || (msg.streaming && <span className="text-[#555555] italic">Thinking…</span>)}
                {msg.streaming && msg.content && (
                  <span className="inline-block w-[2px] h-[14px] bg-[#faff69] ml-0.5 align-middle animate-pulse" />
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-[#888888]" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-[8px] px-3 py-2">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <p className="text-rose-400 text-xs flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-rose-400/60 hover:text-rose-400 text-xs ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="px-6 py-4 border-t border-[#2a2a2a] shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Hermes… (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-sm text-white placeholder-[#444444] resize-none focus:outline-none focus:border-[#faff69] transition-colors"
            style={{ minHeight: "42px", maxHeight: "160px" }}
            rows={1}
          />

          {streaming ? (
            <button
              onClick={cancelStream}
              className="w-10 h-10 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] rounded-[8px] flex items-center justify-center shrink-0 hover:border-rose-500 hover:text-rose-400 transition-colors"
              title="Stop"
            >
              <span className="w-3 h-3 bg-current rounded-sm" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#faff69] text-[#0a0a0a] rounded-[8px] flex items-center justify-center shrink-0 hover:bg-[#e6eb52] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <p className="text-[#444444] text-[11px] mt-1.5">
          Hermes Agent · Powered by{" "}
          <a href="/about" className="hover:text-[#888888] transition-colors underline underline-offset-2">
            open-source software
          </a>
        </p>
      </div>
    </div>
  );
}
