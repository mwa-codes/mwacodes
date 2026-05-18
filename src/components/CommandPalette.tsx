"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { Note } from "@/app/api/notes/route";
import { BOOKMARKS } from "@/lib/bookmarks";
import type { SavedLink } from "@/types/link";

export type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
};

type LinkResult = {
  kind: "link";
  id: string;
  title: string;
  domain: string;
  url: string;
};

type NoteResult = {
  kind: "note";
  id: string;
  preview: string;
  date: string;
  content: string;
};

type BookmarkResult = {
  kind: "bookmark";
  title: string;
  url: string;
};

type PaletteItem = LinkResult | NoteResult | BookmarkResult;

type ResultSection = {
  title: string;
  items: PaletteItem[];
};

const DEBOUNCE_MS = 300;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function notePreview(note: Note): string {
  const text = note.preview ?? note.content.trim().split("\n")[0];
  if (text.length <= 80) return text;
  return `${text.slice(0, 80)}…`;
}

function filterBookmarks(query: string): BookmarkResult[] {
  const q = query.toLowerCase();
  return BOOKMARKS.filter((b) => b.title.toLowerCase().includes(q)).map(
    (b) => ({
      kind: "bookmark" as const,
      title: b.title,
      url: b.url,
    }),
  );
}

async function fetchLinks(query: string): Promise<LinkResult[]> {
  const response = await fetch(
    `/api/links?search=${encodeURIComponent(query)}`,
  );
  const body = (await response.json()) as SavedLink[] | { error: string };
  if (!response.ok || !Array.isArray(body)) return [];

  return body.map((link) => ({
    kind: "link" as const,
    id: link.id,
    title: link.title?.trim() || link.domain || getDomain(link.url),
    domain: link.domain ?? getDomain(link.url),
    url: link.url,
  }));
}

async function fetchNotes(query: string): Promise<NoteResult[]> {
  const response = await fetch(
    `/api/notes?search=${encodeURIComponent(query)}`,
  );
  const body = (await response.json()) as Note[] | { error: string };
  if (!response.ok || !Array.isArray(body)) return [];

  return body.map((note) => ({
    kind: "note" as const,
    id: note.id,
    preview: notePreview(note),
    date: formatNoteDate(note.created_at),
    content: note.content,
  }));
}

function itemKey(item: PaletteItem): string {
  if (item.kind === "link") return `link-${item.id}`;
  if (item.kind === "note") return `note-${item.id}`;
  return `bookmark-${item.url}`;
}

function rowIcon(item: PaletteItem): string {
  if (item.kind === "link") return "🔗";
  if (item.kind === "note") return "📝";
  return "🔖";
}

type PaletteRowProps = {
  item: PaletteItem;
  index: number;
  isActive: boolean;
  expandedNoteId: string | null;
  onHover: () => void;
  onSelect: (item: PaletteItem) => void;
};

function PaletteRow({
  item,
  index,
  isActive,
  expandedNoteId,
  onHover,
  onSelect,
}: PaletteRowProps) {
  return (
    <li>
      <button
        type="button"
        className={`command-palette__row${isActive ? " command-palette__row--active" : ""}`}
        data-palette-index={index}
        onMouseEnter={onHover}
        onClick={() => onSelect(item)}
      >
        <span className="command-palette__row-icon" aria-hidden>
          {rowIcon(item)}
        </span>
        <span className="command-palette__row-body">
          {item.kind === "link" && (
            <>
              <span className="command-palette__row-title">{item.title}</span>
              <span className="command-palette__row-meta">{item.domain}</span>
            </>
          )}
          {item.kind === "note" && (
            <>
              <span className="command-palette__row-title">{item.preview}</span>
              <span className="command-palette__row-meta">{item.date}</span>
            </>
          )}
          {item.kind === "bookmark" && (
            <span className="command-palette__row-title">{item.title}</span>
          )}
        </span>
        <span className="command-palette__row-arrow" aria-hidden>
          →
        </span>
      </button>
      {item.kind === "note" && expandedNoteId === item.id && (
        <div className="command-palette__note-expanded">
          <p>{item.content}</p>
        </div>
      )}
    </li>
  );
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [resultsFor, setResultsFor] = useState("");
  const [links, setLinks] = useState<LinkResult[]>([]);
  const [notes, setNotes] = useState<NoteResult[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const searching = debouncedQuery.length > 0;
  const loading = searching && resultsFor !== debouncedQuery;

  const flatItems = useMemo<PaletteItem[]>(() => {
    if (!searching) return [];
    return [...links, ...notes, ...bookmarks];
  }, [searching, links, notes, bookmarks]);

  const highlightedIndex =
    flatItems.length > 0 ? Math.min(activeIndex, flatItems.length - 1) : 0;

  const sections = useMemo<ResultSection[]>(() => {
    if (!searching) return [];
    return [
      { title: "Links", items: links },
      { title: "Notes", items: notes },
      { title: "Bookmarks", items: bookmarks },
    ].filter((section) => section.items.length > 0);
  }, [searching, links, notes, bookmarks]);

  const closePalette = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setResultsFor("");
    setLinks([]);
    setNotes([]);
    setBookmarks([]);
    setActiveIndex(0);
    setExpandedNoteId(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen || !debouncedQuery) return;

    let cancelled = false;
    const queryAtFetch = debouncedQuery;

    void Promise.all([
      fetchLinks(queryAtFetch),
      fetchNotes(queryAtFetch),
      Promise.resolve(filterBookmarks(queryAtFetch)),
    ])
      .then(([linkResults, noteResults, bookmarkResults]) => {
        if (cancelled) return;
        setExpandedNoteId(null);
        setLinks(linkResults);
        setNotes(noteResults);
        setBookmarks(bookmarkResults);
        setActiveIndex(0);
        setResultsFor(queryAtFetch);
      })
      .catch(() => {
        if (cancelled) return;
        setExpandedNoteId(null);
        setLinks([]);
        setNotes([]);
        setBookmarks([]);
        setActiveIndex(0);
        setResultsFor(queryAtFetch);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const activeEl = listRef.current?.querySelector(
      `[data-palette-index="${highlightedIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen]);

  const selectItem = useCallback(
    (item: PaletteItem) => {
      if (item.kind === "note") {
        setExpandedNoteId((prev) => (prev === item.id ? null : item.id));
        return;
      }
      window.open(item.url, "_blank", "noopener,noreferrer");
      closePalette();
    },
    [closePalette],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (expandedNoteId) {
          setExpandedNoteId(null);
          return;
        }
        if (query.length > 0) {
          setQuery("");
          setDebouncedQuery("");
          return;
        }
        closePalette();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (flatItems.length === 0) return;
        setActiveIndex((i) => (i + 1) % flatItems.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (flatItems.length === 0) return;
        setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const item = flatItems[highlightedIndex];
        if (item) selectItem(item);
      }
    },
    [
      closePalette,
      expandedNoteId,
      flatItems,
      highlightedIndex,
      query.length,
      selectItem,
    ],
  );

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) closePalette();
    },
    [closePalette],
  );

  if (!isOpen) return null;

  let flatOffset = 0;

  return (
    <div
      className="command-palette-overlay"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="command-palette-modal dashboard-card"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette__input-wrap">
          <input
            ref={inputRef}
            type="search"
            className="command-palette__input"
            placeholder="Search links, notes, bookmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-autocomplete="list"
            aria-controls="command-palette-results"
          />
          {loading && (
            <span className="command-palette__spinner" aria-hidden />
          )}
        </div>

        <div
          ref={listRef}
          id="command-palette-results"
          className="command-palette__results"
          role="listbox"
        >
          {searching && !loading && flatItems.length === 0 && (
            <p className="command-palette__empty">
              No results for &lsquo;{debouncedQuery}&rsquo;
            </p>
          )}

          {sections.map((section) => (
            <section key={section.title} className="command-palette__section">
              <h3 className="command-palette__section-title">{section.title}</h3>
              <ul>
                {section.items.map((item) => {
                  const index = flatOffset++;
                  return (
                    <PaletteRow
                      key={itemKey(item)}
                      item={item}
                      index={index}
                      isActive={index === highlightedIndex}
                      expandedNoteId={expandedNoteId}
                      onHover={() => setActiveIndex(index)}
                      onSelect={selectItem}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
