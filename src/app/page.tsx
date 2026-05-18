"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CommandPalette } from "../components/CommandPalette";
import { HNWidget } from "../components/HNWidget";
import { AddLinkInput } from "../components/AddLinkInput";
import { ClockWidget } from "../components/ClockWidget";
import { GoalsWidget } from "../components/GoalsWidget";
import { GitHubWidget } from "../components/GitHubWidget";
import { SavedLinksWidget } from "../components/SavedLinksWidget";
import { ScratchpadWidget } from "../components/ScratchpadWidget";
import { SnippetsWidget } from "../components/SnippetsWidget";
import { PomodoroWidget } from "../components/PomodoroWidget";
import { CurrencyWidget } from "../components/CurrencyWidget";
import { WeatherWidget } from "../components/WeatherWidget";
import { WeeklySummaryWidget } from "../components/WeeklySummaryWidget";
import { BookmarksWidget } from "../components/BookmarksWidget";

const STAGGER_MS = [
  0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880,
] as const;

function subscribeNoop(): () => void {
  return () => {};
}

function useIsMonday(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => new Date().getDay() === 1,
    () => false,
  );
}

function DashboardCard({
  children,
  className = "",
  delayIndex,
}: {
  children: React.ReactNode;
  className?: string;
  delayIndex: number;
}) {
  return (
    <div
      className={`dashboard-card ${className}`}
      style={{ animationDelay: `${STAGGER_MS[delayIndex]}ms` }}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const isMonday = useIsMonday();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="dashboard-shell">
      <main className="dashboard">
        <header className="dashboard-header">
          <span className="dashboard-header__mark">Start</span>
          <div className="dashboard-header__end">
            <button
              type="button"
              className="dashboard-header__nav command-palette-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
            >
              ⌘K
            </button>
            <Link className="dashboard-header__nav" href="/links">
              My Links →
            </Link>
            <Link className="dashboard-header__nav" href="/notes">
              Notes →
            </Link>
            <a
              className="dashboard-header__nav"
              href="https://mwadev.me"
              target="_blank"
              rel="noopener noreferrer"
            >
              Portfolio →
            </a>
            <span className="dashboard-header__date" suppressHydrationWarning>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        <section className="dashboard-slot--clock" aria-label="Clock">
          <DashboardCard className="dashboard-card--clock" delayIndex={0}>
            <ClockWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--brief" aria-label="Hacker News">
          <DashboardCard className="dashboard-card--brief" delayIndex={1}>
            <HNWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--add-link" aria-label="Save a link">
          <AddLinkInput
            onLinkSaved={() => setRefreshTrigger((t) => t + 1)}
          />
        </section>

        {isMonday && (
          <section
            className="dashboard-slot--weekly-summary"
            aria-label="Weekly summary"
          >
            <DashboardCard delayIndex={10}>
              <WeeklySummaryWidget />
            </DashboardCard>
          </section>
        )}

        <section className="dashboard-slot--weather" aria-label="Weather">
          <DashboardCard delayIndex={2}>
            <WeatherWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--pomodoro" aria-label="Pomodoro timer">
          <DashboardCard delayIndex={8}>
            <PomodoroWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--currency" aria-label="Exchange rates">
          <DashboardCard delayIndex={9}>
            <CurrencyWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--bookmarks" aria-label="Quick links">
          <DashboardCard delayIndex={11}>
            <BookmarksWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--goals" aria-label="Today's goals">
          <DashboardCard delayIndex={3}>
            <GoalsWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--github" aria-label="GitHub activity">
          <DashboardCard delayIndex={4}>
            <GitHubWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--saved-links"
          aria-label="Saved links preview"
        >
          <DashboardCard delayIndex={5}>
            <SavedLinksWidget refreshTrigger={refreshTrigger} />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--scratchpad" aria-label="Scratchpad">
          <DashboardCard delayIndex={6}>
            <ScratchpadWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--snippets" aria-label="Code snippets">
          <DashboardCard delayIndex={7}>
            <SnippetsWidget />
          </DashboardCard>
        </section>
      </main>

      <CommandPalette
        key={paletteOpen ? "open" : "closed"}
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
