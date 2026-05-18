"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { Goal } from "@/app/api/goals/route";

const MAX_GOALS = 7;
const GOALS_DATE_KEY = "goals_date";

const WIDGET_STYLES = `
.goals-widget {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 0.75rem;
}

.goals-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.goals-widget__label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.goals-widget__icon {
  font-size: 0.7rem;
  line-height: 1;
}

.goals-widget__count {
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
}

.goals-widget__input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.goals-widget__input {
  flex: 1;
  min-width: 0;
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

.goals-widget__input::placeholder {
  color: var(--fg-dim);
}

.goals-widget__input:focus {
  border-color: rgba(34, 211, 238, 0.35);
}

.goals-widget__add {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--fg-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.goals-widget__add:hover:not(:disabled) {
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.goals-widget__add:disabled {
  opacity: 0.45;
  cursor: default;
}

.goals-widget__max {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-dim);
}

.goals-widget__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.goals-widget__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.25rem;
  padding: 0.35rem 0;
  border-top: 1px solid var(--card-border);
}

.goals-widget__item:first-child {
  border-top: none;
  padding-top: 0;
}

.goals-widget__checkbox {
  position: relative;
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  margin: 0;
  padding: 0;
  appearance: none;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  border-radius: 2px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.goals-widget__checkbox:hover {
  border-color: rgba(34, 211, 238, 0.35);
}

.goals-widget__checkbox:checked {
  background: var(--accent-dim);
  border-color: rgba(34, 211, 238, 0.5);
  transform: scale(1.05);
}

.goals-widget__checkbox:checked::after {
  content: "";
  position: absolute;
  left: 0.28rem;
  top: 0.12rem;
  width: 0.3rem;
  height: 0.55rem;
  border: solid var(--accent);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  animation: goals-check-pop 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes goals-check-pop {
  from {
    transform: rotate(45deg) scale(0);
    opacity: 0;
  }
  to {
    transform: rotate(45deg) scale(1);
    opacity: 1;
  }
}

.goals-widget__text {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  letter-spacing: 0.02em;
  color: var(--fg);
  word-break: break-word;
  transition:
    color 0.2s ease,
    opacity 0.2s ease;
}

.goals-widget__text--done {
  color: var(--fg-dim);
  text-decoration: line-through;
  opacity: 0.75;
}

.goals-widget__delete {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--fg-dim);
  background: transparent;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  opacity: 0;
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
}

.goals-widget__item:hover .goals-widget__delete,
.goals-widget__delete:focus-visible {
  opacity: 1;
}

.goals-widget__delete:hover {
  color: #f87171;
}

.goals-widget__empty {
  margin: 0.15rem 0 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--fg-dim);
}

.goals-widget__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.25rem;
}

.goals-widget__hint {
  margin: 0;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: var(--fg-dim);
}

.goals-widget__celebrate {
  margin: 0;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  color: var(--fg-muted);
}

.goals-widget__skeleton {
  height: 2.25rem;
  border-radius: 2px;
}

.goals-widget__skeleton + .goals-widget__skeleton {
  margin-top: 0.5rem;
}
`;

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });
}

function GoalsSkeleton() {
  return (
    <div className="goals-widget goals-widget--loading" aria-hidden>
      <div className="skeleton goals-widget__skeleton" />
      <div className="skeleton goals-widget__skeleton" />
      <div className="skeleton goals-widget__skeleton" />
    </div>
  );
}

export type GoalsWidgetProps = {
  className?: string;
};

export function GoalsWidget({ className }: GoalsWidgetProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sortedGoals = useMemo(() => sortGoals(goals), [goals]);
  const completedCount = goals.filter((g) => g.completed).length;
  const allDone = goals.length > 0 && completedCount === goals.length;
  const atMax = goals.length >= MAX_GOALS;

  const refetchGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals");
      const body = (await response.json()) as Goal[] | { error: string };

      if (!response.ok || !Array.isArray(body)) {
        setGoals([]);
        return;
      }

      setGoals(body);
    } catch {
      setGoals([]);
    }
  }, []);

  useEffect(() => {
    const today = todayDate();
    try {
      const stored = localStorage.getItem(GOALS_DATE_KEY);
      if (stored !== today) {
        localStorage.setItem(GOALS_DATE_KEY, today);
      }
    } catch {
      /* ignore */
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/goals");
        const body = (await response.json()) as Goal[] | { error: string };

        if (cancelled) return;

        if (!response.ok || !Array.isArray(body)) {
          setGoals([]);
          return;
        }

        setGoals(body);
      } catch {
        if (!cancelled) setGoals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const addGoal = useCallback(async () => {
    const text = input.trim();
    if (!text || atMax || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await response.json()) as Goal | { error: string };

      if (!response.ok || "error" in body) return;

      setGoals((prev) => sortGoals([...prev, body]));
      setInput("");
    } finally {
      setSubmitting(false);
    }
  }, [atMax, input, submitting]);

  const toggleGoal = useCallback(async (goal: Goal) => {
    const completed = !goal.completed;
    setGoals((prev) =>
      sortGoals(
        prev.map((g) => (g.id === goal.id ? { ...g, completed } : g)),
      ),
    );

    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      const body = (await response.json()) as Goal | { error: string };

      if (!response.ok || "error" in body) {
        setGoals((prev) =>
          sortGoals(
            prev.map((g) =>
              g.id === goal.id ? { ...g, completed: goal.completed } : g,
            ),
          ),
        );
        return;
      }

      setGoals((prev) =>
        sortGoals(prev.map((g) => (g.id === goal.id ? body : g))),
      );
    } catch {
      setGoals((prev) =>
        sortGoals(
          prev.map((g) =>
            g.id === goal.id ? { ...g, completed: goal.completed } : g,
          ),
        ),
      );
    }
  }, []);

  const deleteGoal = useCallback(
    async (id: string) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));

      try {
        const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
        if (!response.ok) {
          void refetchGoals();
        }
      } catch {
        void refetchGoals();
      }
    },
    [refetchGoals],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void addGoal();
  }

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: WIDGET_STYLES }} />
        <GoalsSkeleton />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: WIDGET_STYLES }} />
      <div className={`goals-widget ${className ?? ""}`}>
        <header className="goals-widget__header">
          <span className="goals-widget__label">
            <span className="goals-widget__icon" aria-hidden>
              🎯
            </span>
            Today&apos;s Goals
          </span>
          {goals.length > 0 ? (
            <span className="goals-widget__count" aria-live="polite">
              {completedCount}/{goals.length}
            </span>
          ) : null}
        </header>

        {atMax ? (
          <p className="goals-widget__max">Max goals reached</p>
        ) : (
          <form className="goals-widget__input-row" onSubmit={handleSubmit}>
            <input
              className="goals-widget__input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a goal for today..."
              disabled={submitting}
              aria-label="New goal"
            />
            <button
              type="submit"
              className="goals-widget__add"
              disabled={submitting || !input.trim()}
              aria-label="Add goal"
            >
              +
            </button>
          </form>
        )}

        {sortedGoals.length === 0 ? (
          <p className="goals-widget__empty">
            No goals yet. What do you want to finish today?
          </p>
        ) : (
          <ul className="goals-widget__list">
            {sortedGoals.map((goal) => (
              <li key={goal.id} className="goals-widget__item">
                <input
                  type="checkbox"
                  className="goals-widget__checkbox"
                  checked={goal.completed}
                  onChange={() => void toggleGoal(goal)}
                  aria-label={`Mark "${goal.text}" as ${goal.completed ? "incomplete" : "complete"}`}
                />
                <p
                  className={`goals-widget__text${goal.completed ? " goals-widget__text--done" : ""}`}
                >
                  {goal.text}
                </p>
                <button
                  type="button"
                  className="goals-widget__delete"
                  onClick={() => void deleteGoal(goal.id)}
                  aria-label={`Delete goal "${goal.text}"`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="goals-widget__footer">
          <p className="goals-widget__hint">Resets at midnight</p>
          {allDone ? (
            <p className="goals-widget__celebrate">All done! 🎉</p>
          ) : null}
        </footer>
      </div>
    </>
  );
}
