"use client";

import { useState } from "react";

export type BookmarksWidgetProps = {
  className?: string;
};

export type BookmarkCategory = "tool" | "read" | "ref" | "social";

export type Bookmark = {
  title: string;
  url: string;
  category: BookmarkCategory;
};

// Edit this array to customize your quick links — no UI needed.
const BOOKMARKS: Bookmark[] = [
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    category: "ref",
  },
  {
    title: "GitHub",
    url: "https://github.com",
    category: "tool",
  },
  {
    title: "OpenAI Platform",
    url: "https://platform.openai.com/docs",
    category: "ref",
  },
  {
    title: "Next.js Docs",
    url: "https://nextjs.org/docs",
    category: "ref",
  },
  {
    title: "Stack Overflow",
    url: "https://stackoverflow.com",
    category: "tool",
  },
  {
    title: "Hacker News",
    url: "https://news.ycombinator.com",
    category: "read",
  },
  {
    title: "Vercel",
    url: "https://vercel.com",
    category: "tool",
  },
  {
    title: "npm",
    url: "https://www.npmjs.com",
    category: "tool",
  },
  {
    title: "CSS-Tricks",
    url: "https://css-tricks.com",
    category: "read",
  },
  {
    title: "X (Twitter)",
    url: "https://x.com",
    category: "social",
  },
];

type FilterTab = "all" | BookmarkCategory;

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tool", label: "Tool" },
  { id: "read", label: "Read" },
  { id: "ref", label: "Ref" },
  { id: "social", label: "Social" },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getDomain(url))}&sz=32`;
}

export function BookmarksWidget({ className }: BookmarksWidgetProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    activeTab === "all"
      ? BOOKMARKS
      : BOOKMARKS.filter((b) => b.category === activeTab);

  return (
    <div className={`bookmarks-widget ${className ?? ""}`}>
      <div className="bookmarks-tabs" role="tablist" aria-label="Bookmark categories">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`bookmarks-tab${activeTab === tab.id ? " bookmarks-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ul className="bookmarks-grid">
        {filtered.map((bookmark) => (
          <li key={bookmark.url}>
            <a
              className="bookmark-link"
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="bookmark-link__icon"
                src={faviconUrl(bookmark.url)}
                alt=""
                width={16}
                height={16}
              />
              <span className="bookmark-link__title">{bookmark.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
