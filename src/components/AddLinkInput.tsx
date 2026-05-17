"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { SavedLink } from "@/types/link";
import type { LinksApiError } from "@/app/api/links/route";

export type AddLinkInputProps = {
  onLinkSaved: () => void;
  className?: string;
};

type Status = "idle" | "loading" | "success" | "error";

const LOADING_STEPS = [
  "Fetching page...",
  "Reading content...",
  "Tagging with AI...",
] as const;

const STEP_INTERVAL_MS = 1800;
const SUCCESS_FLASH_MS = 1400;

export function AddLinkInput({ onLinkSaved, className }: AddLinkInputProps) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((prev) =>
        prev < LOADING_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status]);

  const resetToIdle = useCallback(() => {
    setStatus("idle");
    setLoadingStep(0);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = url.trim();
      if (!trimmed || status === "loading") {
        return;
      }

      setLoadingStep(0);
      setStatus("loading");

      try {
        const response = await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });

        if (!response.ok) {
          throw new Error("Failed to save link");
        }

        const saved = (await response.json()) as SavedLink | LinksApiError;
        if ("error" in saved) {
          throw new Error(saved.error);
        }

        setStatus("success");
        onLinkSaved();

        window.setTimeout(() => {
          setUrl("");
          resetToIdle();
          inputRef.current?.focus();
        }, SUCCESS_FLASH_MS);
      } catch {
        setStatus("error");
      }
    },
    [url, status, onLinkSaved, resetToIdle],
  );

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      className={`add-link-card${isLoading ? " add-link-card--loading" : ""}${isSuccess ? " add-link-card--success" : ""}${className ? ` ${className}` : ""}`}
    >
      <form className="add-link-form" onSubmit={handleSubmit}>
        <label className="add-link-form__label" htmlFor="add-link-url">
          Save a link
        </label>
        <div className="add-link-form__row">
          <input
            ref={inputRef}
            id="add-link-url"
            className="add-link-input"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste any URL to save it..."
            value={url}
            disabled={isLoading || isSuccess}
            onChange={(event) => {
              setUrl(event.target.value);
              if (status === "error") {
                setStatus("idle");
              }
            }}
          />
          <button
            className="add-link-submit"
            type="submit"
            disabled={isLoading || isSuccess || !url.trim()}
          >
            {isLoading ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="add-link-form__footer" aria-live="polite">
          {isLoading && (
            <p className="add-link-loading" role="status">
              <span
                key={loadingStep}
                className="add-link-loading__step add-link-loading__step--active"
              >
                {LOADING_STEPS[loadingStep]}
              </span>
            </p>
          )}

          {isSuccess && (
            <p className="add-link-status add-link-status--success" role="status">
              Saved!
            </p>
          )}

          {isError && (
            <p className="add-link-status add-link-status--error" role="alert">
              Couldn&apos;t fetch that URL
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
