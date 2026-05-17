"use client";

import { useEffect, useState } from "react";

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
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  useEffect(() => {
    const mountId = requestAnimationFrame(() => setMounted(true));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(mountId);
      clearInterval(id);
    };
  }, []);

  if (!mounted) {
    return <ClockSkeleton />;
  }

  const greeting = getGreeting(now, timezone);
  const quote = QUOTES[getQuoteIndex(now, timezone)];
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
        <p className="clock-quote__text">&ldquo;{quote.text}&rdquo;</p>
        <cite className="clock-quote__author">{quote.author}</cite>
      </blockquote>
    </div>
  );
}
