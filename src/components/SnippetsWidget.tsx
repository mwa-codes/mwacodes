"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import type { Snippet } from "@/app/api/snippets/route";

const FLASH_MS = 1800;

const LANGUAGES = [
  "JS",
  "TS",
  "Python",
  "SQL",
  "Bash",
  "CSS",
  "Other",
] as const;

type Language = (typeof LANGUAGES)[number];
type Tab = "saved" | "new";

const WIDGET_STYLES = `
.snippets-widget {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 0.75rem;
}

.snippets-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.snippets-widget__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.snippets-widget__icon {
  font-size: 0.7rem;
  line-height: 1;
}

.snippets-widget__tabs {
  display: flex;
  gap: 0.35rem;
}

.snippets-widget__tab {
  padding: 0.3rem 0.55rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.58rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-dim);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.snippets-widget__tab:hover {
  color: var(--fg-muted);
  border-color: var(--card-border);
}

.snippets-widget__tab--active {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
  background: rgba(34, 211, 238, 0.08);
}

.snippets-widget__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.snippets-widget__flash {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: #4ade80;
  animation: snippets-widget-fade 0.2s ease;
}

@keyframes snippets-widget-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.snippets-widget__empty {
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  color: var(--fg-dim);
}

.snippets-widget__list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.snippets-widget__skeleton {
  height: 44px;
  border-radius: 0;
}

.snippets-widget__skeleton + .snippets-widget__skeleton {
  border-top: 1px solid var(--card-border);
}

.snippets-widget__accordion {
  border-bottom: 1px solid var(--card-border);
}

.snippets-widget__accordion:last-child {
  border-bottom: none;
}

.snippets-widget__accordion-bar {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 0.65rem;
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

.snippets-widget__accordion-bar:hover {
  background: rgba(255, 255, 255, 0.04);
}

.snippets-widget__badge {
  flex-shrink: 0;
  padding: 0.15rem 0.4rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 2px;
  border: 1px solid transparent;
}

.snippets-widget__badge--js {
  color: #facc15;
  background: rgba(250, 204, 21, 0.12);
  border-color: rgba(250, 204, 21, 0.25);
}

.snippets-widget__badge--ts {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.25);
}

.snippets-widget__badge--python {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  border-color: rgba(74, 222, 128, 0.25);
}

.snippets-widget__badge--sql {
  color: #c084fc;
  background: rgba(192, 132, 252, 0.12);
  border-color: rgba(192, 132, 252, 0.25);
}

.snippets-widget__badge--bash {
  color: #a1a1aa;
  background: rgba(161, 161, 170, 0.12);
  border-color: rgba(161, 161, 170, 0.25);
}

.snippets-widget__badge--neutral {
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--card-border);
}

.snippets-widget__accordion-title {
  overflow: hidden;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snippets-widget__accordion-date {
  flex-shrink: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-dim);
  white-space: nowrap;
}

.snippets-widget__accordion-chevron {
  flex-shrink: 0;
  font-size: 0.7rem;
  line-height: 1;
  color: var(--fg-dim);
  transition: transform 0.25s ease;
}

.snippets-widget__accordion-chevron--open {
  transform: rotate(180deg);
}

.snippets-widget__accordion-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.snippets-widget__accordion-panel--open {
  max-height: 1200px;
}

.snippets-widget__accordion-body {
  margin: 0 0.15rem 0.65rem;
  padding: 0.75rem 0.85rem;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 2px;
}

.snippets-widget__code-wrap {
  max-height: 200px;
  overflow-y: auto;
  border-radius: 2px;
}

.snippets-widget__code-wrap pre {
  margin: 0 !important;
  padding: 0.65rem 0 !important;
  background: transparent !important;
}

.snippets-widget__code-wrap code {
  font-family: var(--font-mono), monospace !important;
  font-size: 0.72rem !important;
  line-height: 1.5 !important;
}

.snippets-widget__accordion-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.snippets-widget__accordion-btn {
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

.snippets-widget__accordion-btn:hover {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.snippets-widget__accordion-btn--delete:hover {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.4);
}

.snippets-widget__form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.snippets-widget__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.snippets-widget__input,
.snippets-widget__select,
.snippets-widget__textarea {
  width: 100%;
  padding: 0.45rem 0.55rem;
  font-family: inherit;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: var(--fg);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  outline: none;
  transition: border-color 0.15s ease;
}

.snippets-widget__textarea {
  font-family: var(--font-mono), monospace;
  min-height: calc(1.5em * 6);
  line-height: 1.5;
  resize: none;
}

.snippets-widget__input::placeholder,
.snippets-widget__textarea::placeholder {
  color: var(--fg-dim);
}

.snippets-widget__input:focus,
.snippets-widget__select:focus,
.snippets-widget__textarea:focus {
  border-color: rgba(34, 211, 238, 0.35);
}

.snippets-widget__submit {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
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

.snippets-widget__submit:hover:not(:disabled) {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.snippets-widget__submit:disabled {
  cursor: default;
  opacity: 0.7;
}
`;

function formatSnippetDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function badgeClass(language: string): string {
  const key = language.toLowerCase();
  if (key === "js") return "snippets-widget__badge--js";
  if (key === "ts") return "snippets-widget__badge--ts";
  if (key === "python") return "snippets-widget__badge--python";
  if (key === "sql") return "snippets-widget__badge--sql";
  if (key === "bash") return "snippets-widget__badge--bash";
  return "snippets-widget__badge--neutral";
}

function highlightLanguage(language: string): string {
  switch (language) {
    case "JS":
      return "javascript";
    case "TS":
      return "typescript";
    case "Python":
      return "python";
    case "SQL":
      return "sql";
    case "Bash":
      return "bash";
    case "CSS":
      return "css";
    default:
      return "plaintext";
  }
}

const highlighterTheme = {
  ...atomOneDark,
  'hljs': {
    ...atomOneDark.hljs,
    background: "transparent",
  },
};

function SnippetsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="skeleton snippets-widget__skeleton"
          aria-hidden
        />
      ))}
    </>
  );
}

function SnippetAccordion({
  snippet,
  expanded,
  onToggle,
  onDelete,
}: {
  snippet: Snippet;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [copyLabel, setCopyLabel] = useState("Copy");

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(snippet.code).then(() => {
      setCopyLabel("Copied!");
      window.setTimeout(() => setCopyLabel("Copy"), 1500);
    });
  }, [snippet.code]);

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onDelete();
    },
    [onDelete],
  );

  return (
    <article className="snippets-widget__accordion">
      <button
        type="button"
        className="snippets-widget__accordion-bar"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className={`snippets-widget__badge ${badgeClass(snippet.language)}`}>
          {snippet.language}
        </span>
        <span className="snippets-widget__accordion-title">{snippet.title}</span>
        <span className="snippets-widget__accordion-date">
          {formatSnippetDate(snippet.created_at)}
        </span>
        <span
          className={`snippets-widget__accordion-chevron${expanded ? " snippets-widget__accordion-chevron--open" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div
        className={`snippets-widget__accordion-panel${expanded ? " snippets-widget__accordion-panel--open" : ""}`}
      >
        <div className="snippets-widget__accordion-body">
          <div className="snippets-widget__code-wrap">
            <SyntaxHighlighter
              language={highlightLanguage(snippet.language)}
              style={highlighterTheme}
              customStyle={{ background: "transparent", margin: 0 }}
              PreTag="pre"
            >
              {snippet.code}
            </SyntaxHighlighter>
          </div>
          <div className="snippets-widget__accordion-actions">
            <button
              type="button"
              className="snippets-widget__accordion-btn"
              onClick={handleCopy}
            >
              {copyLabel}
            </button>
            <button
              type="button"
              className="snippets-widget__accordion-btn snippets-widget__accordion-btn--delete"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export type SnippetsWidgetProps = {
  className?: string;
};

export function SnippetsWidget({ className }: SnippetsWidgetProps) {
  const [tab, setTab] = useState<Tab>("saved");
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [successFlash, setSuccessFlash] = useState(false);

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<Language>("JS");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refetchSnippets = useCallback(async () => {
    try {
      const response = await fetch("/api/snippets");
      const body = (await response.json()) as Snippet[] | { error: string };

      if (!response.ok || !Array.isArray(body)) {
        setSnippets([]);
        return;
      }

      setSnippets(body);
    } catch {
      setSnippets([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      await refetchSnippets();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refetchSnippets]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
        if (!response.ok) return;
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting) return;

      const trimmedTitle = title.trim();
      const trimmedCode = code.trim();
      if (!trimmedTitle || !trimmedCode) return;

      setSubmitting(true);

      try {
        const response = await fetch("/api/snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            code: trimmedCode,
            language,
          }),
        });

        const body = (await response.json()) as Snippet | { error: string };
        if (!response.ok || !("id" in body)) return;

        setSnippets((prev) => [body, ...prev]);
        setTitle("");
        setCode("");
        setLanguage("JS");
        setTab("saved");
        setSuccessFlash(true);
        window.setTimeout(() => setSuccessFlash(false), FLASH_MS);
      } catch {
        /* ignore */
      } finally {
        setSubmitting(false);
      }
    },
    [code, language, submitting, title],
  );

  return (
  <>
    <style>{WIDGET_STYLES}</style>
    <div className={`snippets-widget ${className ?? ""}`}>
      <header className="snippets-widget__header">
        <span className="snippets-widget__label">
          <span className="snippets-widget__icon" aria-hidden>
            {"</>"}
          </span>
          Snippets
        </span>
        <div
          className="snippets-widget__tabs"
          role="tablist"
          aria-label="Snippet views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "saved"}
            className={`snippets-widget__tab${tab === "saved" ? " snippets-widget__tab--active" : ""}`}
            onClick={() => setTab("saved")}
          >
            Saved
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "new"}
            className={`snippets-widget__tab${tab === "new" ? " snippets-widget__tab--active" : ""}`}
            onClick={() => setTab("new")}
          >
            New
          </button>
        </div>
      </header>

      <div className="snippets-widget__body">
        {successFlash && tab === "saved" ? (
          <p className="snippets-widget__flash">Snippet saved.</p>
        ) : null}

        {tab === "saved" ? (
          loading ? (
            <SnippetsSkeleton />
          ) : snippets.length === 0 ? (
            <p className="snippets-widget__empty">
              No snippets saved. Switch to New to add one.
            </p>
          ) : (
            <div className="snippets-widget__list">
              {snippets.map((snippet) => (
                <SnippetAccordion
                  key={snippet.id}
                  snippet={snippet}
                  expanded={expandedIds.has(snippet.id)}
                  onToggle={() => toggleExpanded(snippet.id)}
                  onDelete={() => void handleDelete(snippet.id)}
                />
              ))}
            </div>
          )
        ) : (
          <form className="snippets-widget__form" onSubmit={handleSubmit}>
            <div className="snippets-widget__field">
              <input
                type="text"
                className="snippets-widget__input"
                placeholder="e.g. Debounce function"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="snippets-widget__field">
              <select
                className="snippets-widget__select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
            <div className="snippets-widget__field">
              <textarea
                className="snippets-widget__textarea"
                placeholder="Paste your code here"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={6}
                required
              />
            </div>
            <button
              type="submit"
              className="snippets-widget__submit"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Save Snippet"}
            </button>
          </form>
        )}
      </div>
    </div>
  </>
  );
}
