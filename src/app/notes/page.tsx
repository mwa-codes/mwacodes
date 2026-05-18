"use client";

import type { Note } from "@/app/api/notes/route";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;
const SCRATCHPAD_KEY = "mwa_scratchpad";
const SKELETON_COUNT = 4;

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNoteCount(count: number): string {
  return `${count} note${count === 1 ? "" : "s"}`;
}

function buildNotesQuery(search: string): string {
  if (!search) return "/api/notes";
  return `/api/notes?search=${encodeURIComponent(search)}`;
}

function downloadNotesJson(notes: Note[]): void {
  const exportedAt = new Date();
  const day = exportedAt.toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(notes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mwa-notes-${day}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}


function NotesSkeleton() {
  return (
    <div className="notes-grid" aria-hidden>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <article key={index} className="notes-card notes-card--skeleton">
          <div className="skeleton notes-skeleton notes-skeleton--date" />
          <div className="notes-card__body-skeleton">
            <div className="skeleton notes-skeleton notes-skeleton--line" />
            <div className="skeleton notes-skeleton notes-skeleton--line" />
            <div className="skeleton notes-skeleton notes-skeleton--line notes-skeleton--line-short" />
          </div>
          <div className="skeleton notes-skeleton notes-skeleton--actions" />
        </article>
      ))}
    </div>
  );
}


type NoteCardProps = {
  note: Note;
  onDelete: (id: string) => void;
  onRestore: (content: string) => void;
  deletingId: string | null;
};


function NoteCard({ note, onDelete, onRestore, deletingId }: NoteCardProps) {
  const [copyLabel, setCopyLabel] = useState("Copy");
  const isDeleting = deletingId === note.id;

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(note.content).then(() => {
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy"), 1500);
    });
  }, [note.content]);

  return (
    <article
      className={`notes-card${isDeleting ? " notes-card--deleting" : ""}`}
    >
      <div className="notes-card__head">
        <time className="notes-card__date" dateTime={note.created_at}>
          {formatNoteDate(note.created_at)}
        </time>
      </div>
      <div className="notes-card__content-wrap">
        <p className="notes-card__content">{note.content}</p>
      </div>
      <div className="notes-card__actions">
        <button
          type="button"
          className="notes-card__btn"
          onClick={handleCopy}
          disabled={isDeleting}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          className="notes-card__btn notes-card__btn--delete"
          onClick={() => onDelete(note.id)}
          disabled={isDeleting}
        >
          Delete
        </button>
      </div>
      <button
        type="button"
        className="notes-card__restore"
        onClick={() => onRestore(note.content)}
        disabled={isDeleting}
      >
        ↑ Restore to scratchpad
      </button>
    </article>
  );
}


export default function NotesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/notes");
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as Note[];
        if (!cancelled) setTotalCount(data.length);
      } catch {
        if (!cancelled) setTotalCount(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        const response = await fetch(buildNotesQuery(debouncedSearch));
        if (cancelled) return;

        if (!response.ok) {
          setNotes([]);
          return;
        }

        const data = (await response.json()) as Note[];
        if (!cancelled) setNotes(data);
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) return;
      const data = (await response.json()) as Note[];
      downloadNotesJson(data);
    } catch {
      // ignore export errors
    } finally {
      setExporting(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this note?")) return;

    setDeletingId(id);

    try {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (response.ok) {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        setTotalCount((count) =>
          count === null ? count : Math.max(0, count - 1),
        );
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleRestore = useCallback(
    (content: string) => {
      try {
        localStorage.setItem(SCRATCHPAD_KEY, content);
      } catch {
        // ignore write errors
      }
      router.push("/");
    },
    [router],
  );

  const hasActiveSearch = debouncedSearch.length > 0;
  const showSearchEmpty = !loading && notes.length === 0 && hasActiveSearch;
  const showVaultEmpty = !loading && notes.length === 0 && !hasActiveSearch;

  return (
    <div className="links-page-shell notes-page-shell">
      <main className="links-page notes-page">
        <header className="notes-page__header">
          <Link className="links-page__back" href="/">
            ← Dashboard
          </Link>

          <div className="notes-page__title-row">
            <div className="notes-page__intro">
              <h1 className="notes-page__title">
                <span aria-hidden>🔒</span> Notes Vault
              </h1>
              <p className="notes-page__count" aria-live="polite">
                {totalCount === null ? "…" : formatNoteCount(totalCount)}
              </p>
            </div>

            <button
              type="button"
              className="links-filter"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export JSON"}
            </button>
          </div>
        </header>

        <label className="links-search notes-page__search">
          <span className="links-search__label">Search</span>
          <input
            className="links-search__input"
            type="search"
            value={search}
            placeholder="Search your notes..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {loading ? (
          <NotesSkeleton />
        ) : showSearchEmpty ? (
          <p className="links-empty">
            Nothing found for &lsquo;{debouncedSearch}&rsquo;
          </p>
        ) : showVaultEmpty ? (
          <p className="links-empty">
            No notes saved. Use the scratchpad on your dashboard to save notes.
          </p>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={(id) => void handleDelete(id)}
                onRestore={handleRestore}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
