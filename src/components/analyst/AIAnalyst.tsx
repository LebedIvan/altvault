"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { usePortfolio } from "@/store/portfolioStore";
import type { HealthScoreResult } from "@/lib/calculations/healthScore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ─── Markdown-ish renderer ────────────────────────────────────────────────────
// Handles ** bold **, # headers, bullet lists, numbered lists, horizontal rules

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  const renderInline = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        return <strong key={i} className="font-bold text-[#E8F0FF]">{p.slice(2, -2)}</strong>;
      }
      return p;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    if (line.startsWith("### ")) {
      elements.push(<h4 key={key++} className="mt-3 mb-1 text-sm font-bold text-[#F59E0B]">{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={key++} className="mt-4 mb-1 text-sm font-bold text-[#E8F0FF]">{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith("# ")) {
      elements.push(<h2 key={key++} className="mt-4 mb-1 text-base font-bold text-[#E8F0FF]">{renderInline(line.slice(2))}</h2>);
    } else if (line.match(/^[-•*] /)) {
      elements.push(
        <div key={key++} className="flex items-start gap-1.5 my-0.5">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#3E5070]" />
          <span className="text-[#B0C4DE] leading-relaxed">{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-0.5">
          <span className="mt-0.5 w-4 shrink-0 text-right text-xs font-bold text-[#4E6080]">{num}.</span>
          <span className="text-[#B0C4DE] leading-relaxed">{renderInline(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
    } else if (line.match(/^---+$/) || line.match(/^===+$/)) {
      elements.push(<hr key={key++} className="my-2 border-[#1C2640]" />);
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="leading-relaxed text-[#B0C4DE]">{renderInline(line)}</p>
      );
    }
  }

  return elements;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "What's my portfolio health score and how to improve it?",
  "Which positions should I consider selling now?",
  "What are my biggest risks right now?",
  "Where should I invest my next €1,000?",
  "Tax optimization opportunities in my portfolio?",
  "Compare my performance to the market benchmark",
  "Which position has the best risk/reward going forward?",
  "What happens to my portfolio if Pokemon drops 30%?",
];

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  health: HealthScoreResult;
}

export function AIAnalyst({ health }: Props) {
  const { assets } = usePortfolio();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setApiError(null);

    // Build history (last 10 turns to stay within context)
    const history = [...messages, userMsg]
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    // Last item is the current user message — don't double-send
    const historyForApi = history.slice(0, -1);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), assets, history: historyForApi }),
      });
      const data = (await res.json()) as { response?: string; error?: string };

      if (!res.ok || data.error) {
        const errMsg: Message = {
          role: "assistant",
          content: data.error ?? "Failed to get response.",
          timestamp: new Date(),
          isError: true,
        };
        setMessages(prev => [...prev, errMsg]);
        if (data.error?.includes("ANTHROPIC_API_KEY")) {
          setApiError(data.error);
        }
      } else {
        const aiMsg: Message = {
          role: "assistant",
          content: data.response!,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Network error — could not reach the AI service.",
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [assets, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const timeStr = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex h-full flex-col">
      {/* API key warning */}
      {apiError && (
        <div className="mb-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3 text-xs text-[#FCD34D]">
          <p className="font-bold mb-1">⚠️ AI not configured</p>
          <p>Add <code className="fm bg-[#080F1C] px-1 rounded">ANTHROPIC_API_KEY=sk-ant-...</code> to your <code className="fm bg-[#080F1C] px-1 rounded">.env.local</code> and rebuild.</p>
          <p className="mt-1 text-[#F59E0B]/60">Get a key at console.anthropic.com</p>
        </div>
      )}

      {/* Health summary bar */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#1C2640] bg-[#080F1C] px-4 py-2.5">
        <div className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ring-1",
          health.gradeColor === "emerald" ? "bg-[#4ADE80]/10 ring-[#4ADE80]/30 text-[#4ADE80]" :
          health.gradeColor === "yellow"  ? "bg-[#FCD34D]/10 ring-[#FCD34D]/30 text-[#FCD34D]" :
          health.gradeColor === "orange"  ? "bg-[#F59E0B]/10 ring-[#F59E0B]/30 text-[#F59E0B]" :
                                            "bg-[#F87171]/10 ring-[#F87171]/30 text-[#F87171]",
        )}>
          {health.overall}
        </div>
        <div className="min-w-0 flex-1">
          <p className="fm text-xs font-semibold text-[#B0C4DE]">
            Portfolio Health: <span className="font-black">{health.grade}</span>
            {health.issues.length > 0 && (
              <span className="ml-2 text-[#4E6080]">· {health.issues.length} issue{health.issues.length > 1 ? "s" : ""} detected</span>
            )}
          </p>
          {health.issues[0] && (
            <p className="fm text-[10px] text-[#4E6080] truncate">
              {health.issues[0].severity === "critical" ? "🔴" : "🟡"} {health.issues[0].message}
            </p>
          )}
        </div>
        <div className="fm text-[10px] text-[#2A3A50] shrink-0">
          AI Analyst v1
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-700">

        {/* Welcome + suggestions */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#1C2640] bg-[#080F1C] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30">
                  <span className="fm text-xs font-black text-[#F59E0B]">AI</span>
                </div>
                <span className="fb text-sm font-semibold text-[#E8F0FF]">AI Portfolio Analyst</span>
              </div>
              <p className="text-sm text-[#4E6080] leading-relaxed">
                I have full visibility into your portfolio — {assets.length} positions, health score {health.overall}/100.
                Ask me anything about your investments, risks, opportunities, or specific positions.
              </p>
            </div>

            <div>
              <p className="fm text-[10px] text-[#2A3A50] uppercase tracking-wider mb-2">Suggested questions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => void sendMessage(p)}
                    className="text-left rounded-lg border border-[#1C2640] bg-[#080F1C] px-3 py-2 text-xs text-[#4E6080] hover:border-[#F59E0B]/30 hover:text-[#B0C4DE] hover:bg-[#0E1830] transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 mt-0.5 mr-2">
                <span className="fm text-xs font-black text-[#F59E0B]">AI</span>
              </div>
            )}
            <div className={clsx(
              "max-w-[85%] rounded-xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "bg-[#F59E0B]/10 border border-[#F59E0B]/25 text-[#E8F0FF] rounded-br-sm"
                : msg.isError
                  ? "border border-[#F87171]/30 bg-[#F87171]/10 text-[#F87171] rounded-bl-sm"
                  : "border border-[#1C2640] bg-[#080F1C] rounded-bl-sm",
            )}>
              {msg.role === "user" ? (
                <p className="leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
              )}
              <p className={clsx(
                "fm mt-2 text-[10px]",
                msg.role === "user" ? "text-[#F59E0B]/40 text-right" : "text-[#2A3A50]",
              )}>
                {timeStr(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 mt-0.5 mr-2">
              <span className="fm text-xs font-black text-[#F59E0B]">AI</span>
            </div>
            <div className="rounded-xl rounded-bl-sm border border-[#1C2640] bg-[#080F1C] px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
          placeholder="Ask anything about your portfolio... (Enter to send, Shift+Enter for newline)"
          className="flex-1 resize-none rounded-xl border border-[#1C2640] bg-[#080F1C] px-4 py-3 text-sm text-[#E8F0FF] placeholder:text-[#2A3A50] focus:border-[#F59E0B]/50 focus:outline-none disabled:opacity-50"
          style={{ maxHeight: "120px" }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={() => void sendMessage(input)}
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B] text-[#0B1120] transition-colors hover:bg-[#FCD34D] disabled:opacity-40"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <span className="text-sm">↑</span>
          )}
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="fm mt-2 text-center text-[10px] text-[#2A3A50] hover:text-[#4E6080] transition-colors"
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}
