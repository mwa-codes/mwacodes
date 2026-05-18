"use client";

import { useCallback, useEffect, useState } from "react";

export type ClockWidgetProps = {
  className?: string;
  timezone?: string;
};

export type ClockDisplay = {
  time: string;
  date: string;
  timezone: string;
};

const QUOTES = [
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
  },
  {
    text: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
  },
  {
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
  },
  {
    text: "We suffer more often in imagination than in reality.",
    author: "Seneca",
  },
  {
    text: "Make it work, make it right, make it fast.",
    author: "Kent Beck",
  },
] as const;

const QUOTE_API_URL =
  "https://api.quotable.io/quotes/random?tags=technology,wisdom,inspirational&maxLength=120";
const QUOTE_STORAGE_KEY = "daily_quote";

type Quote = { text: string; author: string };
type CachedQuote = Quote & { date: string };

function ClockSkeleton() {
  return (
    <div className="clock-widget clock-widget--loading" aria-hidden>
      <div className="skeleton clock-skeleton clock-skeleton--time" />
      <div className="skeleton clock-skeleton clock-skeleton--date" />
      <div className="skeleton clock-skeleton clock-skeleton--greeting" />
      <div className="skeleton clock-skeleton clock-skeleton--quote" />
    </div>
  );
}

function getHour(date: Date, tz?: string): number {
  if (!tz) return date.getHours();
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: tz,
  }).format(date);
  return Number(hour);
}

function getGreeting(date: Date, tz?: string): string {
  const hour = getHour(date, tz);
  if (hour < 12) return "Good morning, MWA";
  if (hour < 17) return "Good afternoon, MWA";
  return "Good evening, MWA";
}

function getQuoteIndex(date: Date, tz?: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const index = days.indexOf(weekday as (typeof days)[number]);
  return (index >= 0 ? index : date.getDay()) % QUOTES.length;
}

function getFallbackQuote(date: Date, tz?: string): Quote {
  return QUOTES[getQuoteIndex(date, tz)];
}

function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readCachedQuote(): CachedQuote | null {
  try {
    const raw = localStorage.getItem(QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "text" in parsed &&
      "author" in parsed &&
      "date" in parsed &&
      typeof parsed.text === "string" &&
      typeof parsed.author === "string" &&
      typeof parsed.date === "string"
    ) {
      return {
        text: parsed.text,
        author: parsed.author,
        date: parsed.date,
      };
    }
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

function writeCachedQuote(quote: Quote, date: string): void {
  try {
    localStorage.setItem(
      QUOTE_STORAGE_KEY,
      JSON.stringify({ text: quote.text, author: quote.author, date }),
    );
  } catch {
    /* storage unavailable */
  }
}

async function fetchQuoteFromApi(): Promise<Quote | null> {
  try {
    const res = await fetch(QUOTE_API_URL);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "content" in data &&
      "author" in data &&
      typeof data.content === "string" &&
      typeof data.author === "string"
    ) {
      return { text: data.content, author: data.author };
    }
  } catch {
    /* silent fallback */
  }
  return null;
}

function formatDate(date: Date, tz?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
}

function getTimeParts(date: Date, tz?: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...(tz ? { timeZone: tz } : {}),
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    hours: pick("hour"),
    minutes: pick("minute"),
    seconds: pick("second"),
  };
}

export function ClockWidget({ className, timezone }: ClockWidgetProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [quote, setQuote] = useState<Quote>(() =>
    getFallbackQuote(new Date(), timezone),
  );

  useEffect(() => {
    let cancelled = false;

    const mountId = requestAnimationFrame(() => {
      const today = todayDateString();
      const cached = readCachedQuote();

      if (cached?.date === today) {
        setQuote({ text: cached.text, author: cached.author });
      } else {
        setQuote(getFallbackQuote(new Date(), timezone));
        void fetchQuoteFromApi().then((fetched) => {
          if (cancelled || !fetched) return;
          setQuote(fetched);
          writeCachedQuote(fetched, today);
        });
      }

      setMounted(true);
    });

    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(mountId);
      clearInterval(id);
    };
  }, [timezone]);

  const refreshQuote = useCallback(async () => {
    const today = todayDateString();
    const fetched = await fetchQuoteFromApi();
    const next = fetched ?? getFallbackQuote(new Date(), timezone);
    setQuote(next);
    writeCachedQuote(next, today);
  }, [timezone]);

  if (!mounted) {
    return <ClockSkeleton />;
  }

  const greeting = getGreeting(now, timezone);
  const dateLabel = formatDate(now, timezone);
  const timeParts = getTimeParts(now, timezone);

  return (
    <div className={`clock-widget ${className ?? ""}`}>
      <time
        className="clock-time"
        dateTime={now.toISOString()}
        suppressHydrationWarning
        aria-live="polite"
        aria-label={`Current time ${timeParts.hours}:${timeParts.minutes}:${timeParts.seconds}`}
      >
        <span className="clock-time__digits">{timeParts.hours}</span>
        <span className="clock-time__sep" aria-hidden>
          :
        </span>
        <span className="clock-time__digits">{timeParts.minutes}</span>
        <span className="clock-time__seconds">
          <span className="clock-time__sep" aria-hidden>
            :
          </span>
          {timeParts.seconds}
        </span>
      </time>

      <p className="clock-date" suppressHydrationWarning>
        {dateLabel}
      </p>

      <p className="clock-greeting" suppressHydrationWarning>
        {greeting}
      </p>

      <blockquote className="clock-quote">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.35rem",
          }}
        >
          <p className="clock-quote__text" style={{ flex: 1, margin: 0 }}>
            &ldquo;{quote.text}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => void refreshQuote()}
            aria-label="Fetch another quote"
            style={{
              flexShrink: 0,
              margin: 0,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "0.65rem",
              lineHeight: 1,
              color: "var(--fg-dim)",
              opacity: 0.55,
            }}
          >
            ↺
          </button>
        </div>
        <cite className="clock-quote__author">— {quote.author}</cite>
      </blockquote>
    </div>
  );
}
