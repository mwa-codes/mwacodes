"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { WeeklySummaryApiSuccess } from "@/app/api/weekly-summary/route";

const STORAGE_KEY = "weekly_summary";

type CachedSummary = {
  summary: string;
  date: string;
  linkCount: number;
  noteCount: number;
  generatedAt?: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: WeeklySummaryApiSuccess }
  | { status: "error" };

const WIDGET_STYLES = `
.weekly-summary-widget {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-height: 0;
}

.weekly-summary-widget__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.weekly-summary-widget__title {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.weekly-summary-widget__icon {
  font-size: 0.7rem;
  line-height: 1;
}

.weekly-summary-widget__range {
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-muted);
}

.weekly-summary-widget__stats {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-dim);
}

.weekly-summary-widget__body {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.55;
  letter-spacing: 0.02em;
  color: var(--fg);
}

.weekly-summary-widget__footer {
  margin: 0;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: var(--fg-dim);
}

.weekly-summary-widget__loading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--fg-muted);
}

.weekly-summary-widget__spinner {
  width: 0.75rem;
  height: 0.75rem;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: weekly-summary-spin 0.7s linear infinite;
}

@keyframes weekly-summary-spin {
  to {
    transform: rotate(360deg);
  }
}

.weekly-summary-widget__error {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--fg-muted);
}
`;

function subscribeNoop(): () => void {
  return () => {};
}

function getMondaySnapshot(): boolean {
  return new Date().getDay() === 1;
}

function useIsMonday(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getMondaySnapshot,
    () => false,
  );
}

function getThisMondayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDateRangeLabel(): string {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function readCachedSummary(): CachedSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedSummary;
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.date !== "string" ||
      typeof parsed.linkCount !== "number" ||
      typeof parsed.noteCount !== "number"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSummary(data: WeeklySummaryApiSuccess): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      summary: data.summary,
      date: getThisMondayKey(),
      linkCount: data.linkCount,
      noteCount: data.noteCount,
      generatedAt: data.generatedAt,
    } satisfies CachedSummary),
  );
}

function cachedToSuccess(cached: CachedSummary): WeeklySummaryApiSuccess {
  return {
    summary: cached.summary,
    generatedAt: cached.generatedAt ?? new Date().toISOString(),
    linkCount: cached.linkCount,
    noteCount: cached.noteCount,
  };
}

async function fetchWeeklySummary(): Promise<WeeklySummaryApiSuccess> {
  const response = await fetch("/api/weekly-summary", { method: "POST" });
  const body = (await response.json()) as
    | WeeklySummaryApiSuccess
    | { error: string };

  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : "Failed to generate summary",
    );
  }

  return body;
}

export function WeeklySummaryWidget() {
  const isMondayToday = useIsMonday();
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    if (!isMondayToday) return;

    let cancelled = false;

    (async () => {
      const cached = readCachedSummary();
      if (cached?.date === getThisMondayKey()) {
        if (!cancelled) {
          setState({ status: "success", data: cachedToSuccess(cached) });
        }
        return;
      }

      if (!cancelled) {
        setState({ status: "loading" });
      }

      try {
        const data = await fetchWeeklySummary();
        writeCachedSummary(data);
        if (!cancelled) {
          setState({ status: "success", data });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMondayToday]);

  if (!isMondayToday) {
    return null;
  }

  return (
    <>
      <style>{WIDGET_STYLES}</style>
      <div className="weekly-summary-widget">
        <header className="weekly-summary-widget__header">
          <h2 className="weekly-summary-widget__title">
            <span className="weekly-summary-widget__icon" aria-hidden>
              📊
            </span>
            Weekly Summary
          </h2>
          <span className="weekly-summary-widget__range">
            {getWeekDateRangeLabel()}
          </span>
        </header>

        {state.status === "loading" && (
          <p className="weekly-summary-widget__loading">
            <span className="weekly-summary-widget__spinner" aria-hidden />
            Generating your weekly summary...
          </p>
        )}

        {state.status === "error" && (
          <p className="weekly-summary-widget__error">
            Summary unavailable this week
          </p>
        )}

        {state.status === "success" && (
          <>
            <p className="weekly-summary-widget__stats">
              {state.data.linkCount} links saved · {state.data.noteCount} notes
              written
            </p>
            <p className="weekly-summary-widget__body">{state.data.summary}</p>
            <p className="weekly-summary-widget__footer">
              Generated every Monday
            </p>
          </>
        )}
      </div>
    </>
  );
}
