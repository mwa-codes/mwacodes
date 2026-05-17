"use client";

import { useCallback, useLayoutEffect, useState } from "react";

export type HNWidgetProps = {
  className?: string;
};

const STORY_COUNT = 4;
const STORAGE_KEY = `hn_stories_${STORY_COUNT}`;
const CACHE_TTL_MS = 30 * 60 * 1000;

type HNApiItem = {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  by?: string;
  descendants?: number;
};

export type HNStory = {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  descendants: number;
  domain: string;
};

type CachedHN = {
  stories: HNStory[];
  fetchedAt: number;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; stories: HNStory[]; fetchedAt: number }
  | { status: "error" };

function readCache(): CachedHN | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedHN;
    if (
      !Array.isArray(parsed.stories) ||
      typeof parsed.fetchedAt !== "number" ||
      parsed.stories.length !== STORY_COUNT
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(stories: HNStory[]): number {
  const fetchedAt = Date.now();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ stories, fetchedAt } satisfies CachedHN),
  );
  return fetchedAt;
}

function clearCache(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("hn_stories");
}

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

function extractDomain(url: string | undefined): string {
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, "");
    } catch {
      /* fall through */
    }
  }
  return "news.ycombinator.com";
}

function storyHref(story: HNStory): string {
  if (story.url && !story.url.includes("news.ycombinator.com/item")) {
    return story.url;
  }
  return `https://news.ycombinator.com/item?id=${story.id}`;
}

async function fetchHNStories(): Promise<HNStory[]> {
  const idsResponse = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
  );
  if (!idsResponse.ok) {
    throw new Error("Failed to load story IDs");
  }

  const ids = (await idsResponse.json()) as number[];
  const topIds = ids.slice(0, STORY_COUNT);

  const items = await Promise.all(
    topIds.map(async (id) => {
      const itemResponse = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
      );
      if (!itemResponse.ok) {
        throw new Error(`Failed to load story ${id}`);
      }

      const item = (await itemResponse.json()) as HNApiItem;
      const externalUrl = item.url;

      return {
        id: item.id,
        title: item.title ?? "Untitled",
        url: externalUrl ?? `https://news.ycombinator.com/item?id=${item.id}`,
        score: item.score ?? 0,
        by: item.by ?? "unknown",
        descendants: item.descendants ?? 0,
        domain: extractDomain(externalUrl),
      };
    }),
  );

  return items;
}

function formatUpdatedAgo(fetchedAt: number): string {
  const mins = Math.floor((Date.now() - fetchedAt) / 60_000);
  if (mins < 1) return "Updated just now";
  if (mins === 1) return "Updated 1 min ago";
  return `Updated ${mins} mins ago`;
}

function HNSkeleton() {
  return (
    <div className="ai-brief-skeleton hn-skeleton" aria-hidden>
      {Array.from({ length: STORY_COUNT }, (_, index) => (
        <div key={index} className="skeleton hn-skeleton__row" />
      ))}
    </div>
  );
}

export function HNWidget({ className }: HNWidgetProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [updatedLabel, setUpdatedLabel] = useState("");

  const loadStories = useCallback(async (force: boolean) => {
    if (!force) {
      const cached = readCache();
      if (cached && isCacheFresh(cached.fetchedAt)) {
        return { stories: cached.stories, fetchedAt: cached.fetchedAt };
      }
    }

    const stories = await fetchHNStories();
    const fetchedAt = writeCache(stories);
    return { stories, fetchedAt };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;

    loadStories(false)
      .then(({ stories, fetchedAt }) => {
        if (!cancelled) {
          setState({ status: "success", stories, fetchedAt });
          setUpdatedLabel(formatUpdatedAgo(fetchedAt));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadStories]);

  const handleRefresh = useCallback(() => {
    setState({ status: "loading" });
    clearCache();

    loadStories(true)
      .then(({ stories, fetchedAt }) => {
        setState({ status: "success", stories, fetchedAt });
        setUpdatedLabel(formatUpdatedAgo(fetchedAt));
      })
      .catch(() => {
        setState({ status: "error" });
      });
  }, [loadStories]);

  const isLoading = state.status === "loading";

  return (
    <div
      className={`ai-brief-widget hn-widget h-full min-h-full ${className ?? ""}`}
    >
      <button
        type="button"
        className="ai-brief-refresh"
        onClick={handleRefresh}
        disabled={isLoading}
        aria-label="Refresh stories"
        title="Refresh stories"
      >
        ↺
      </button>

      <div className="hn-widget__header">
        <span className="hn-widget__icon" aria-hidden>
          ▲
        </span>
        <p className="ai-brief-heading hn-widget__heading">Hacker News</p>
      </div>

      {state.status === "success" && updatedLabel && (
        <p className="hn-widget__updated">{updatedLabel}</p>
      )}

      <div className="hn-widget__content">
        {isLoading && <HNSkeleton />}

        {state.status === "error" && (
          <p className="widget-error hn-widget__error">
            Couldn&apos;t load stories. Click ↺ to retry.
          </p>
        )}

        {state.status === "success" && (
          <ol className="hn-widget__list min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
            {state.stories.map((story, index) => (
              <li key={story.id} className="hn-widget__row">
                <span className="hn-widget__rank">{index + 1}</span>
                <div className="hn-widget__main">
                  <a
                    className="hn-widget__title"
                    href={storyHref(story)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.title}
                  </a>
                  <span className="hn-widget__domain">{story.domain}</span>
                </div>
                <span className="hn-widget__meta">
                  <span className="hn-widget__score">▲ {story.score}</span>
                  <span className="hn-widget__comments">
                    {story.descendants} comments
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
