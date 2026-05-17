"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "mwa_scratchpad";
const DEBOUNCE_MS = 500;

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
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore write errors
  }
}

export type ScratchpadWidgetProps = {
  className?: string;
};

export function ScratchpadWidget({ className }: ScratchpadWidgetProps) {
  const content = useSyncExternalStore(
    subscribeScratchpad,
    getScratchpadSnapshot,
    getScratchpadServerSnapshot
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      updateScratchpadSnapshot(value);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        persistScratchpad(value);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    if (!confirm("Clear scratchpad?")) return;

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    updateScratchpadSnapshot("");
    persistScratchpad("");
  }, []);

  return (
    <div className={`scratchpad-widget ${className ?? ""}`}>
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
        >
          Clear
        </button>
      </div>

      <textarea
        className="scratchpad-widget__textarea"
        value={content}
        onChange={handleChange}
        placeholder="Thoughts, snippets, anything..."
        rows={6}
        spellCheck
      />

      <div className="scratchpad-widget__footer">
        <span className="scratchpad-widget__autosave">Auto-saved</span>
        <span className="scratchpad-widget__count" aria-live="polite">
          {content.length}
        </span>
      </div>
    </div>
  );
}
