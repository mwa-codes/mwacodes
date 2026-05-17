"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SavedLink } from "@/types/link";

export type SavedLinksWidgetProps = {
  refreshTrigger: number;
  className?: string;
};

const PREVIEW_LIMIT = 6;

const TYPE_LABELS: Record<SavedLink["type"], string> = {
  youtube: "YouTube",
  github: "GitHub",
  article: "Article",
  doc: "Doc",
  tweet: "Tweet",
  tool: "Tool",
  other: "Other",
};

function displayTitle(link: SavedLink): string {
  if (link.title?.trim()) {
    return link.title.trim();
  }
  try {
    return new URL(link.url).hostname;
  } catch {
    return link.url;
  }
}

function displayDomain(link: SavedLink): string {
  if (link.domain?.trim()) {
    return link.domain.replace(/^www\./i, "");
  }
  try {
    return new URL(link.url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function SavedLinksSkeleton() {
  return (
    <div className="saved-links-grid" aria-hidden>
      {Array.from({ length: PREVIEW_LIMIT }, (_, index) => (
        <article
          key={index}
          className="saved-link-card saved-link-card--skeleton"
        >
          <div className="skeleton saved-link-skeleton saved-link-skeleton--thumb" />
          <div className="saved-link-card__body">
            <div className="skeleton saved-link-skeleton saved-link-skeleton--title" />
            <div className="skeleton saved-link-skeleton saved-link-skeleton--domain" />
            <div className="saved-link-card__meta">
              <div className="skeleton saved-link-skeleton saved-link-skeleton--badge" />
              <div className="skeleton saved-link-skeleton saved-link-skeleton--tag" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      className="saved-link-card__play-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

type SavedLinkCardProps = {
  link: SavedLink;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

function SavedLinkCard({ link, onDelete, deletingId }: SavedLinkCardProps) {
  const isDeleting = deletingId === link.id;

  return (
    <article
      className={`saved-link-card${isDeleting ? " saved-link-card--deleting" : ""}`}
    >
      <button
        type="button"
        className="saved-link-card__delete"
        aria-label={`Delete ${displayTitle(link)}`}
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
        className="saved-link-card__link"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="saved-link-card__thumb-wrap">
          {link.thumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="saved-link-card__thumb"
                src={link.thumbnail}
                alt=""
                width={80}
                height={60}
              />
              {link.type === "youtube" && (
                <span className="saved-link-card__play" aria-hidden>
                  <PlayIcon />
                </span>
              )}
            </>
          ) : (
            <div
              className={`saved-link-card__thumb saved-link-card__thumb--placeholder saved-link-card__thumb--${link.type}`}
              aria-hidden
            />
          )}
        </div>

        <div className="saved-link-card__body">
          <h3 className="saved-link-card__title">{displayTitle(link)}</h3>
          {displayDomain(link) && (
            <p className="saved-link-card__domain">{displayDomain(link)}</p>
          )}
          <div className="saved-link-card__meta">
            <span
              className={`saved-link-card__type saved-link-card__type--${link.type}`}
            >
              {TYPE_LABELS[link.type]}
            </span>
            {link.tags.length > 0 && (
              <ul className="saved-link-card__tags">
                {link.tags.map((tag) => (
                  <li key={tag} className="saved-link-card__tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}

export function SavedLinksWidget({
  refreshTrigger,
  className,
}: SavedLinksWidgetProps) {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/links");
        if (cancelled) return;

        if (!response.ok) {
          setLinks([]);
          return;
        }

        const data = (await response.json()) as SavedLink[];
        if (!cancelled) {
          setLinks(data.slice(0, PREVIEW_LIMIT));
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
  }, [refreshTrigger]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/links/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLinks((prev) => prev.filter((link) => link.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className={`saved-links-widget${className ? ` ${className}` : ""}`}>
      <div className="saved-links-widget__header">
        <span className="widget-label">Saved links</span>
      </div>

      {loading ? (
        <SavedLinksSkeleton />
      ) : links.length === 0 ? (
        <p className="saved-links-empty widget-empty">
          No saved links yet. Paste a URL above to start.
        </p>
      ) : (
        <div className="saved-links-grid">
          {links.map((link) => (
            <SavedLinkCard
              key={link.id}
              link={link}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      <div className="saved-links-widget__footer">
        <Link className="saved-links-view-all" href="/links">
          View all →
        </Link>
      </div>
    </div>
  );
}
