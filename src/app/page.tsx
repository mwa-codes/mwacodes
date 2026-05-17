"use client";

import Link from "next/link";
import { useState } from "react";
import { HNWidget } from "../components/HNWidget";
import { AddLinkInput } from "../components/AddLinkInput";
import { ClockWidget } from "../components/ClockWidget";
import { GitHubWidget } from "../components/GitHubWidget";
import { SavedLinksWidget } from "../components/SavedLinksWidget";
import { ScratchpadWidget } from "../components/ScratchpadWidget";
import { WeatherWidget } from "../components/WeatherWidget";

const STAGGER_MS = [0, 80, 160, 240, 320, 400] as const;

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

  return (
    <div className="dashboard-shell">
      <main className="dashboard">
        <header className="dashboard-header">
          <span className="dashboard-header__mark">Start</span>
          <div className="dashboard-header__end">
            <Link className="dashboard-header__nav" href="/links">
              My Links →
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

        <section className="dashboard-slot--weather" aria-label="Weather">
          <DashboardCard delayIndex={2}>
            <WeatherWidget />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--github" aria-label="GitHub activity">
          <DashboardCard delayIndex={3}>
            <GitHubWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--saved-links"
          aria-label="Saved links preview"
        >
          <DashboardCard delayIndex={4}>
            <SavedLinksWidget refreshTrigger={refreshTrigger} />
          </DashboardCard>
        </section>

        <section className="dashboard-slot--scratchpad" aria-label="Scratchpad">
          <DashboardCard delayIndex={5}>
            <ScratchpadWidget />
          </DashboardCard>
        </section>
      </main>
    </div>
  );
}
