"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  buildLinksQuery,
  displayDomain,
  displayTitle,
  LINK_TYPE_FILTERS,
  LINK_TYPE_LABELS,
  type LinkTypeFilter,
} from "@/lib/link-display";
import type { SavedLink } from "@/types/link";

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_COUNT = 9;

function PlayIcon() {
  return (
    <svg
      className="library-card__play-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function LibrarySkeleton() {
  return (
    <div className="library-grid" aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <article key={index} className="library-card library-card--skeleton">
          <div className="skeleton library-skeleton library-skeleton--hero" />
          <div className="library-card__content">
            <div className="skeleton library-skeleton library-skeleton--title" />
            <div className="skeleton library-skeleton library-skeleton--desc" />
            <div className="skeleton library-skeleton library-skeleton--desc library-skeleton--desc-short" />
            <div className="library-card__meta">
              <div className="skeleton library-skeleton library-skeleton--badge" />
              <div className="skeleton library-skeleton library-skeleton--tag" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

type LibraryCardProps = {
  link: SavedLink;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

function LibraryCard({ link, onDelete, deletingId }: LibraryCardProps) {
  const isDeleting = deletingId === link.id;
  const title = displayTitle(link);
  const domain = displayDomain(link);

  return (
    <article
      className={`library-card${isDeleting ? " library-card--deleting" : ""}`}
    >
      <button
        type="button"
        className="library-card__delete"
        aria-label={`Delete ${title}`}
        disabled={isDeleting}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(link.id);
        }}
      >
        ×
      </button>

      <a
        className="library-card__link"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="library-card__media">
          {link.thumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="library-card__thumb"
                src={link.thumbnail}
                alt=""
              />
              {link.type === "youtube" && (
                <span className="library-card__play" aria-hidden>
                  <PlayIcon />
                </span>
              )}
            </>
          ) : (
            <div
              className={`library-card__thumb library-card__thumb--placeholder library-card__thumb--${link.type}`}
              aria-hidden
            />
          )}
        </div>

        <div className="library-card__content">
          <span
            className={`library-card__type library-card__type--${link.type}`}
          >
            {LINK_TYPE_LABELS[link.type]}
          </span>
          <h2 className="library-card__title">{title}</h2>
          {link.description?.trim() && (
            <p className="library-card__description">{link.description.trim()}</p>
          )}
          {domain && <p className="library-card__domain">{domain}</p>}
          {link.tags.length > 0 && (
            <ul className="library-card__tags">
              {link.tags.map((tag) => (
                <li key={tag} className="library-card__tag">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </a>
    </article>
  );
}

function formatCount(count: number): string {
  return `${count} saved link${count === 1 ? "" : "s"}`;
}

export default function LinksPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeType, setActiveType] = useState<LinkTypeFilter>("all");
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/links${buildLinksQuery(debouncedSearch, activeType)}`,
        );

        if (cancelled) return;

        if (!response.ok) {
          setLinks([]);
          return;
        }

        const data = (await response.json()) as SavedLink[];
        if (!cancelled) {
          setLinks(data);
        }
      } catch {
        if (!cancelled) {
          setLinks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, activeType]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (response.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  const hasActiveSearch = debouncedSearch.length > 0;
  const showSearchEmpty = !loading && links.length === 0 && hasActiveSearch;
  const showLibraryEmpty =
    !loading && links.length === 0 && !hasActiveSearch;

  return (
    <div className="links-page-shell">
      <main className="links-page">
        <header className="links-page__top">
          <Link className="links-page__back" href="/">
            ← Dashboard
          </Link>
          <div className="links-page__intro">
            <h1 className="links-page__title">Your library</h1>
            <p className="links-page__subtitle">
              Browse everything you&apos;ve saved — articles, videos, repos, and
              more.
            </p>
          </div>
        </header>

        <div className="links-toolbar">
          <label className="links-search">
            <span className="links-search__label">Search</span>
            <input
              className="links-search__input"
              type="search"
              value={search}
              placeholder="Search titles and descriptions…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div
            className="links-filters"
            role="tablist"
            aria-label="Filter by type"
          >
            {LINK_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={activeType === filter.id}
                className={`links-filter${activeType === filter.id ? " links-filter--active" : ""}`}
                onClick={() => setActiveType(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <p className="links-page__count" aria-live="polite">
          {loading ? "Loading…" : formatCount(links.length)}
        </p>

        {loading ? (
          <LibrarySkeleton />
        ) : showSearchEmpty ? (
          <p className="links-empty">
            Nothing found for &lsquo;{debouncedSearch}&rsquo;
          </p>
        ) : showLibraryEmpty ? (
          <p className="links-empty">
            No saved links yet.{" "}
            <Link className="links-empty__link" href="/">
              Save one from the dashboard
            </Link>
            .
          </p>
        ) : (
          <div className="library-grid">
            {links.map((link) => (
              <LibraryCard
                key={link.id}
                link={link}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
