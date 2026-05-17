import { AIBriefWidget } from "../components/AIBriefWidget";
import { BookmarksWidget } from "../components/BookmarksWidget";
import { ClockWidget } from "../components/ClockWidget";
import { GitHubWidget } from "../components/GitHubWidget";
import { WeatherWidget } from "../components/WeatherWidget";

const STAGGER_MS = [0, 80, 160, 240, 320] as const;

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
  return (
    <div className="dashboard-shell">
      <main className="dashboard">
        <header className="dashboard-header">
          <span className="dashboard-header__mark">Start</span>
          <span className="dashboard-header__date" suppressHydrationWarning>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </header>

        <section
          className="dashboard-slot--clock"
          aria-label="Clock"
        >
          <DashboardCard className="dashboard-card--clock" delayIndex={0}>
            <ClockWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--brief"
          aria-label="AI morning brief"
        >
          <DashboardCard className="dashboard-card--brief" delayIndex={1}>
            <AIBriefWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--weather"
          aria-label="Weather"
        >
          <DashboardCard delayIndex={2}>
            <WeatherWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--github"
          aria-label="GitHub activity"
        >
          <DashboardCard delayIndex={3}>
            <GitHubWidget />
          </DashboardCard>
        </section>

        <section
          className="dashboard-slot--bookmarks"
          aria-label="Bookmarks and reading list"
        >
          <DashboardCard delayIndex={4}>
            <BookmarksWidget />
          </DashboardCard>
        </section>
      </main>
    </div>
  );
}
