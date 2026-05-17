"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import type { AIBriefApiSuccess } from "../app/api/ai-brief/route";

export type AIBriefWidgetProps = {
  className?: string;
};

const STORAGE_KEY = "ai_brief";

type CachedBrief = {
  text: string;
  date: string;
  generatedAt: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: AIBriefApiSuccess; fromCache: boolean }
  | { status: "error"; message: string };

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readCachedBrief(): CachedBrief | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBrief;
    if (
      typeof parsed.text !== "string" ||
      typeof parsed.date !== "string" ||
      typeof parsed.generatedAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedBrief(text: string, generatedAt: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      text,
      date: getTodayKey(),
      generatedAt,
    } satisfies CachedBrief),
  );
}

function cachedToSuccess(text: string, generatedAt: string): AIBriefApiSuccess {
  return { brief: text, generatedAt };
}

function formatGeneratedTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function fetchBriefData(): Promise<AIBriefApiSuccess> {
  const response = await fetch("/api/ai-brief", { method: "POST" });
  const body = (await response.json()) as AIBriefApiSuccess | { error: string };

  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : "Failed to generate brief",
    );
  }

  return body;
}

function parseBriefLines(brief: string): string[] {
  const strip = (line: string) => line.replace(/^\d+\)\s*/, "").trim();

  const byNewline = brief
    .split(/\n+/)
    .map(strip)
    .filter(Boolean);

  if (byNewline.length > 1) return byNewline;

  const byNumber = brief
    .split(/(?=\d+\)\s)/)
    .map(strip)
    .filter(Boolean);

  if (byNumber.length > 1) return byNumber;

  return [brief.trim()];
}

function AIBriefSkeleton() {
  return (
    <div className="ai-brief-skeleton" aria-hidden>
      <div className="skeleton ai-brief-skeleton__line ai-brief-skeleton__line--heading" />
      <div className="skeleton ai-brief-skeleton__line" />
      <div className="skeleton ai-brief-skeleton__line" />
      <div className="skeleton ai-brief-skeleton__line ai-brief-skeleton__line--short" />
    </div>
  );
}

export function AIBriefWidget({ className }: AIBriefWidgetProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const loadBrief = useCallback(
    async (
      force: boolean,
    ): Promise<{ data: AIBriefApiSuccess; fromCache: boolean }> => {
      if (!force) {
        const cached = readCachedBrief();
        if (cached?.date === getTodayKey()) {
          return {
            data: cachedToSuccess(cached.text, cached.generatedAt),
            fromCache: true,
          };
        }
      }

      const data = await fetchBriefData();
      writeCachedBrief(data.brief, data.generatedAt);
      return { data, fromCache: false };
    },
    [],
  );

  useLayoutEffect(() => {
    let cancelled = false;

    loadBrief(false)
      .then(({ data, fromCache }) => {
        if (!cancelled) {
          setState({ status: "success", data, fromCache });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Unable to reach AI service",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadBrief]);

  const handleRefresh = useCallback(() => {
    setState({ status: "loading" });

    loadBrief(true)
      .then(({ data, fromCache }) => {
        setState({ status: "success", data, fromCache });
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Unable to reach AI service",
        });
      });
  }, [loadBrief]);

  const isLoading = state.status === "loading";

  return (
    <div className={`ai-brief-widget ${className ?? ""}`}>
      <span className="ai-brief-badge">AI</span>
      <button
        type="button"
        className="ai-brief-refresh"
        onClick={handleRefresh}
        disabled={isLoading}
        aria-label="Force regenerate"
        title="Force regenerate"
      >
        ↺
      </button>

      <p className="ai-brief-heading">Morning brief</p>

      {isLoading && <AIBriefSkeleton />}

      {state.status === "error" && (
        <div className="ai-brief-error-wrap">
          <p className="widget-error">{state.message}</p>
          <button
            type="button"
            className="widget-retry"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      )}

      {state.status === "success" && (
        <>
          <div className="ai-brief-content">
            {parseBriefLines(state.data.brief).map((line, index) => (
              <p key={index} className="ai-brief-line">
                <span className="ai-brief-line__num">{index + 1}</span>
                {line}
              </p>
            ))}
          </div>
          {state.fromCache && (
            <p className="ai-brief-meta">
              Generated today at{" "}
              {formatGeneratedTime(state.data.generatedAt)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
