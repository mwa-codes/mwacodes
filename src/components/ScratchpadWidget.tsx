"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import type { Note } from "@/app/api/notes/route";

const STORAGE_KEY = "mwa_scratchpad";
const DEBOUNCE_MS = 500;
const PREVIEW_LEN = 80;
const FLASH_MS = 1800;

const WIDGET_STYLES = `
.scratchpad-widget {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: calc(-1 * clamp(1rem, 2vw, 1.5rem));
  margin-bottom: 0;
}

.scratchpad-widget__scratchpad {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: clamp(1rem, 2vw, 1.5rem);
  padding-bottom: 0.85rem;
}

.scratchpad-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.scratchpad-widget__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.scratchpad-widget__icon {
  font-size: 0.7rem;
  line-height: 1;
}

.scratchpad-widget__clear {
  padding: 0.35rem 0.65rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.scratchpad-widget__clear:hover:not(:disabled) {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.scratchpad-widget__clear:disabled {
  cursor: default;
  opacity: 0.45;
}

.scratchpad-widget__textarea-wrap {
  display: flex;
  flex-direction: column;
}

.scratchpad-widget__textarea {
  width: 100%;
  min-height: calc(1.55em * 5);
  padding: 0;
  margin: 0;
  font-family: inherit;
  font-size: 0.8rem;
  line-height: 1.55;
  letter-spacing: 0.02em;
  color: var(--fg);
  background: transparent;
  border: none;
  border-radius: 0;
  outline: none;
  resize: none;
}

.scratchpad-widget__textarea::placeholder {
  color: var(--fg-dim);
}

.scratchpad-widget__textarea:focus {
  outline: none;
}

.scratchpad-widget__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.35rem;
}

.scratchpad-widget__autosave,
.scratchpad-widget__count {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  color: var(--fg-dim);
}

.scratchpad-widget__save {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.scratchpad-widget__save:hover:not(:disabled) {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.scratchpad-widget__save:disabled {
  cursor: default;
  opacity: 0.7;
}

.scratchpad-widget__save--flash-error {
  color: #f87171 !important;
  border-color: rgba(248, 113, 113, 0.45) !important;
  background: rgba(248, 113, 113, 0.08) !important;
}

.scratchpad-widget__save--flash-success {
  color: #4ade80 !important;
  border-color: rgba(74, 222, 128, 0.4) !important;
  background: rgba(74, 222, 128, 0.08) !important;
}

.scratchpad-widget__divider {
  height: 1px;
  margin: 0;
  background: var(--card-border);
  border: none;
}

.scratchpad-widget__vault {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.75rem clamp(1rem, 2vw, 1.5rem) clamp(1rem, 2vw, 1.5rem);
  background: rgba(255, 255, 255, 0.038);
}

.scratchpad-widget__vault-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0 0.65rem;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.scratchpad-widget__vault-empty {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: var(--fg-dim);
}

.scratchpad-widget__vault-list {
  display: flex;
  flex-direction: column;
}

.scratchpad-widget__skeleton {
  height: 44px;
  border-radius: 0;
}

.scratchpad-widget__skeleton + .scratchpad-widget__skeleton {
  border-top: 1px solid var(--card-border);
}

.scratchpad-widget__accordion {
  border-bottom: 1px solid var(--card-border);
}

.scratchpad-widget__accordion:last-child {
  border-bottom: none;
}

.scratchpad-widget__accordion-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 44px;
  padding: 0 0.15rem;
  font-family: inherit;
  text-align: left;
  color: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.scratchpad-widget__accordion-bar:hover {
  background: rgba(255, 255, 255, 0.04);
}

.scratchpad-widget__accordion-date {
  flex-shrink: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-dim);
  white-space: nowrap;
}

.scratchpad-widget__accordion-preview {
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scratchpad-widget__accordion-chevron {
  flex-shrink: 0;
  font-size: 0.7rem;
  line-height: 1;
  color: var(--fg-dim);
  transition: transform 0.25s ease;
}

.scratchpad-widget__accordion-chevron--open {
  transform: rotate(180deg);
}

.scratchpad-widget__accordion-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.scratchpad-widget__accordion-panel--open {
  max-height: 1200px;
}

.scratchpad-widget__accordion-body {
  margin: 0 0.15rem 0.65rem;
  padding: 0.75rem 0.85rem;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 2px;
}

.scratchpad-widget__accordion-content {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.55;
  letter-spacing: 0.02em;
  color: var(--fg);
  white-space: pre-wrap;
  word-break: break-word;
}

.scratchpad-widget__accordion-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.scratchpad-widget__accordion-btn {
  padding: 0.35rem 0.65rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.scratchpad-widget__accordion-btn:hover {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.scratchpad-widget__accordion-btn--delete:hover {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.4);
}

.scratchpad-widget__restore {
  margin-left: auto;
  padding: 0;
  font-family: var(--font-mono), monospace;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: var(--fg-dim);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.scratchpad-widget__restore:hover {
  color: var(--fg-muted);
}
`;

const scratchpadListeners = new Set<() => void>();
let scratchpadSnapshot: string | null = null;

function readScratchpadFromStorage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getScratchpadSnapshot(): string {
  if (typeof window === "undefined") return "";
  if (scratchpadSnapshot === null) {
    scratchpadSnapshot = readScratchpadFromStorage();
  }
  return scratchpadSnapshot;
}

function getScratchpadServerSnapshot(): string {
  return "";
}

function subscribeScratchpad(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    scratchpadSnapshot = event.newValue ?? "";
    onStoreChange();
  };

  scratchpadListeners.add(onStoreChange);
  window.addEventListener("storage", onStorage);

  return () => {
    scratchpadListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function updateScratchpadSnapshot(value: string) {
  scratchpadSnapshot = value;
  for (const listener of scratchpadListeners) {
    listener();
  }
}

function persistScratchpad(value: string) {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore write errors
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
  const text = note.preview ?? note.content;
  if (text.length <= PREVIEW_LEN) return text;
  return `${text.slice(0, PREVIEW_LEN)}…`;
}

async function fetchNotesFromApi(): Promise<Note[]> {
  const response = await fetch("/api/notes");
  const body = (await response.json()) as Note[] | { error: string };
  if (!response.ok || !Array.isArray(body)) return [];
  return body;
}

type SaveButtonState =
  | "idle"
  | "saving"
  | "flash-error"
  | "flash-success"
  | "flash-failed";

export type ScratchpadWidgetProps = {
  className?: string;
};

function VaultSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="skeleton scratchpad-widget__skeleton"
          aria-hidden
        />
      ))}
    </>
  );
}

function VaultAccordion({
  note,
  expanded,
  onToggle,
  onDelete,
  onRestore,
}: {
  note: Note;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [copyLabel, setCopyLabel] = useState("Copy");

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(note.content).then(() => {
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy"), 1500);
    });
  }, [note.content]);

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete],
  );

  const handleRestore = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onRestore();
    },
    [onRestore],
  );

  return (
    <article className="scratchpad-widget__accordion">
      <button
        type="button"
        className="scratchpad-widget__accordion-bar"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="scratchpad-widget__accordion-date">
          {formatNoteDate(note.created_at)}
        </span>
        <span className="scratchpad-widget__accordion-preview">
          {notePreview(note)}
        </span>
        <span
          className={`scratchpad-widget__accordion-chevron${expanded ? " scratchpad-widget__accordion-chevron--open" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        className={`scratchpad-widget__accordion-panel${expanded ? " scratchpad-widget__accordion-panel--open" : ""}`}
      >
        <div className="scratchpad-widget__accordion-body">
          <p className="scratchpad-widget__accordion-content">{note.content}</p>
          <div className="scratchpad-widget__accordion-actions">
            <button
              type="button"
              className="scratchpad-widget__accordion-btn"
              onClick={handleCopy}
            >
              {copyLabel}
            </button>
            <button
              type="button"
              className="scratchpad-widget__accordion-btn scratchpad-widget__accordion-btn--delete"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button
              type="button"
              className="scratchpad-widget__restore"
              onClick={handleRestore}
            >
              ↑ Restore to scratchpad
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ScratchpadWidget({ className }: ScratchpadWidgetProps) {
  const content = useSyncExternalStore(
    subscribeScratchpad,
    getScratchpadSnapshot,
    getScratchpadServerSnapshot,
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveButtonState>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshNotes = useCallback(async () => {
    try {
      setNotes(await fetchNotesFromApi());
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchNotesFromApi();
        if (!cancelled) setNotes(data);
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setVaultLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    updateScratchpadSnapshot(value);

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      persistScratchpad(value);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      if (flashRef.current !== null) clearTimeout(flashRef.current);
    };
  }, []);

  const flashSaveButton = useCallback((state: SaveButtonState) => {
    if (flashRef.current !== null) clearTimeout(flashRef.current);
    setSaveState(state);
    if (state === "saving") return;
    flashRef.current = setTimeout(() => {
      setSaveState("idle");
      flashRef.current = null;
    }, FLASH_MS);
  }, []);

  const handleSaveToVault = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      flashSaveButton("flash-error");
      return;
    }

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setSaveState("saving");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!response.ok) {
        flashSaveButton("flash-failed");
        return;
      }

      updateScratchpadSnapshot("");
      persistScratchpad("");
      await refreshNotes();
      flashSaveButton("flash-success");
    } catch {
      flashSaveButton("flash-failed");
    }
  }, [content, refreshNotes, flashSaveButton]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteNote = useCallback(
    async (id: string) => {
      if (!confirm("Delete this note?")) return;

      try {
        const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
        if (!response.ok) return;
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch {
        // ignore
      }
    },
    [],
  );

  const handleRestore = useCallback((noteContent: string) => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    updateScratchpadSnapshot(noteContent);
    persistScratchpad(noteContent);
  }, []);

  const handleClear = useCallback(() => {
    if (!content) return;
    if (!confirm("Clear scratchpad?")) return;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    updateScratchpadSnapshot("");
    persistScratchpad("");
  }, [content]);

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "flash-success"
        ? "Saved to vault"
        : saveState === "flash-failed"
          ? "Save failed"
          : "↓ Save to Vault";

  const saveClass =
    saveState === "flash-error" || saveState === "flash-failed"
      ? "scratchpad-widget__save--flash-error"
      : saveState === "flash-success"
        ? "scratchpad-widget__save--flash-success"
        : "";

  return (
    <>
      <style>{WIDGET_STYLES}</style>
      <div className={`scratchpad-widget ${className ?? ""}`}>
        <section className="scratchpad-widget__scratchpad" aria-label="Scratchpad">
          <div className="scratchpad-widget__header">
            <span className="scratchpad-widget__label">
              <span className="scratchpad-widget__icon" aria-hidden>
                ✏
              </span>
              Scratchpad
            </span>
            <button
              type="button"
              className="scratchpad-widget__clear"
              onClick={handleClear}
              disabled={!content}
            >
              Clear
            </button>
          </div>

          <div className="scratchpad-widget__textarea-wrap">
            <textarea
              className="scratchpad-widget__textarea"
              value={content}
              onChange={handleChange}
              placeholder="Write anything... save what matters."
              rows={5}
              spellCheck
            />
            <div className="scratchpad-widget__footer">
              <span className="scratchpad-widget__autosave">Auto-saved</span>
              <span className="scratchpad-widget__count" aria-live="polite">
                {content.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`scratchpad-widget__save ${saveClass}`}
            onClick={() => void handleSaveToVault()}
            disabled={saveState === "saving"}
          >
            {saveLabel}
          </button>
        </section>

        <hr className="scratchpad-widget__divider" />

        <section className="scratchpad-widget__vault" aria-label="Vault">
          <h3 className="scratchpad-widget__vault-label">
            <span aria-hidden>🔒</span> Vault
          </h3>

          {vaultLoading ? (
            <div className="scratchpad-widget__vault-list" aria-busy="true">
              <VaultSkeleton />
            </div>
          ) : notes.length === 0 ? (
            <p className="scratchpad-widget__vault-empty">Nothing saved yet.</p>
          ) : (
            <div className="scratchpad-widget__vault-list">
              {notes.map((note) => (
                <VaultAccordion
                  key={note.id}
                  note={note}
                  expanded={expandedIds.has(note.id)}
                  onToggle={() => toggleExpanded(note.id)}
                  onDelete={() => void handleDeleteNote(note.id)}
                  onRestore={() => handleRestore(note.content)}
                />
              ))}
            </div>
          )}

          <Link className="scratchpad-widget__view-all" href="/notes">
            View all notes →
          </Link>
        </section>
      </div>
    </>
  );
}
