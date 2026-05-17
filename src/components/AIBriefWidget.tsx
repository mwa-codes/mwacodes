"use client";

import { useCallback, useEffect, useState } from "react";
import type { AIBriefApiSuccess } from "../app/api/ai-brief/route";

export type AIBriefWidgetProps = {
  className?: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: AIBriefApiSuccess }
  | { status: "error"; message: string };

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

  useEffect(() => {
    let cancelled = false;

    fetchBriefData()
      .then((data) => {
        if (!cancelled) {
          setState({ status: "success", data });
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
  }, []);

  const handleRefresh = useCallback(() => {
    setState({ status: "loading" });

    fetchBriefData()
      .then((data) => {
        setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        setState({
          status: "error",
          message:
            err instanceof Error ? err.message : "Unable to reach AI service",
        });
      });
  }, []);

  const isLoading = state.status === "loading";

  return (
    <div className={`ai-brief-widget ${className ?? ""}`}>
      <span className="ai-brief-badge">AI</span>
      <button
        type="button"
        className="ai-brief-refresh"
        onClick={handleRefresh}
        disabled={isLoading}
        aria-label="Regenerate brief"
        title="Regenerate brief"
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
        <div className="ai-brief-content">
          {parseBriefLines(state.data.brief).map((line, index) => (
            <p key={index} className="ai-brief-line">
              <span className="ai-brief-line__num">{index + 1}</span>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
