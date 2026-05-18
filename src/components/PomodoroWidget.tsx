"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "pomodoro_sessions";

const MODE_DURATIONS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
} as const;

type PomodoroMode = keyof typeof MODE_DURATIONS;

const MODE_TABS: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "shortBreak", label: "Short Break" },
  { id: "longBreak", label: "Long Break" },
];

const MODE_FOOTER: Record<PomodoroMode, string> = {
  focus: "Stay off your phone.",
  shortBreak: "Step away from the screen.",
  longBreak: "Step away from the screen.",
};

const RING_SIZE = 168;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type StoredSessions = {
  date: string;
  count: number;
};

const sessionListeners = new Set<() => void>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadSessionsFromStorage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as StoredSessions;
    if (data.date !== todayKey()) return 0;
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

function saveSessionsToStorage(count: number): void {
  try {
    const payload: StoredSessions = { date: todayKey(), count };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors
  }
}

function subscribeSessions(listener: () => void): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function getSessionsSnapshot(): number {
  return loadSessionsFromStorage();
}

function getSessionsServerSnapshot(): number {
  return 0;
}

function publishSessions(count: number): void {
  saveSessionsToStorage(count);
  sessionListeners.forEach((listener) => listener());
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function cycleDots(completed: number): number {
  const mod = completed % 4;
  return mod === 0 && completed > 0 ? 4 : mod;
}

function breakModeAfterFocus(sessionsCompleted: number): "shortBreak" | "longBreak" {
  return sessionsCompleted % 4 === 0 ? "longBreak" : "shortBreak";
}

function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.18);
    void ctx.close();
  } catch {
    // ignore audio errors
  }
}

function notify(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // ignore notification errors
  }
}

export type PomodoroWidgetProps = {
  className?: string;
};

export function PomodoroWidget({ className }: PomodoroWidgetProps) {
  const sessionsCompleted = useSyncExternalStore(
    subscribeSessions,
    getSessionsSnapshot,
    getSessionsServerSnapshot,
  );

  const [currentMode, setCurrentMode] = useState<PomodoroMode>("focus");
  const [timeRemaining, setTimeRemaining] = useState(MODE_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const completionHandled = useRef(false);
  const modeRef = useRef(currentMode);
  const sessionsRef = useRef(sessionsCompleted);

  useEffect(() => {
    modeRef.current = currentMode;
    sessionsRef.current = sessionsCompleted;
  }, [currentMode, sessionsCompleted]);

  const handleTimerComplete = useCallback(() => {
    if (completionHandled.current) return;
    completionHandled.current = true;

    playBeep();
    const mode = modeRef.current;

    if (mode === "focus") {
      const nextSessions = sessionsRef.current + 1;
      publishSessions(nextSessions);

      const nextBreak = breakModeAfterFocus(nextSessions);
      setCurrentMode(nextBreak);
      setTimeRemaining(MODE_DURATIONS[nextBreak]);
      setIsRunning(true);
      completionHandled.current = false;

      notify(
        "Break time",
        nextBreak === "longBreak"
          ? "Long break — step away from the screen."
          : "Short break — step away from the screen.",
      );
      return;
    }

    setCurrentMode("focus");
    setTimeRemaining(MODE_DURATIONS.focus);
    setIsRunning(false);
    completionHandled.current = false;
    notify("Focus time", "Stay off your phone.");
  }, []);

  const selectMode = useCallback((mode: PomodoroMode, options?: { running?: boolean }) => {
    setCurrentMode(mode);
    setTimeRemaining(MODE_DURATIONS[mode]);
    setIsRunning(options?.running ?? false);
    completionHandled.current = false;
  }, []);

  const handleReset = useCallback(() => {
    setTimeRemaining(MODE_DURATIONS[currentMode]);
    setIsRunning(false);
    completionHandled.current = false;
  }, [currentMode]);

  const handleSkip = useCallback(() => {
    completionHandled.current = false;
    if (currentMode === "focus") {
      selectMode("shortBreak", { running: true });
      return;
    }
    selectMode("focus");
  }, [currentMode, selectMode]);

  const handleStartPause = useCallback(() => {
    if (!isRunning && typeof Notification !== "undefined") {
      void Notification.requestPermission();
    }
    setIsRunning((running) => !running);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          queueMicrotask(handleTimerComplete);
          return 0;
        }
        completionHandled.current = false;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [isRunning, handleTimerComplete]);

  const filledDots = cycleDots(sessionsCompleted);
  const totalDuration = MODE_DURATIONS[currentMode];
  const progress = totalDuration > 0 ? timeRemaining / totalDuration : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);
  const isBreak = currentMode !== "focus";

  return (
    <div
      className={`pomodoro-widget${isBreak ? " pomodoro-widget--break" : ""}${className ? ` ${className}` : ""}`}
    >
      <header className="pomodoro-widget__header">
        <span className="pomodoro-widget__label">
          <span className="pomodoro-widget__icon" aria-hidden>
            ⏱
          </span>
          Pomodoro
        </span>
        <span
          className="pomodoro-widget__dots"
          aria-label={`${filledDots} of 4 sessions completed this cycle`}
        >
          {Array.from({ length: 4 }, (_, index) => (
            <span
              key={index}
              className={`pomodoro-widget__dot${index < filledDots ? " pomodoro-widget__dot--filled" : ""}`}
              aria-hidden
            />
          ))}
        </span>
      </header>

      <div className="pomodoro-widget__tabs" role="tablist" aria-label="Timer mode">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={currentMode === tab.id}
            className={`pomodoro-widget__tab${currentMode === tab.id ? " pomodoro-widget__tab--active" : ""}`}
            onClick={() => selectMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pomodoro-widget__timer">
        <svg
          className="pomodoro-widget__ring"
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden
        >
          <circle
            className="pomodoro-widget__ring-track"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
          />
          <circle
            className={`pomodoro-widget__ring-progress${isBreak ? " pomodoro-widget__ring-progress--break" : ""}`}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <p
          className="pomodoro-widget__time"
          aria-live="polite"
          aria-label={`${formatTime(timeRemaining)} remaining`}
        >
          {formatTime(timeRemaining)}
        </p>
      </div>

      <div className="pomodoro-widget__controls">
        <button
          type="button"
          className="pomodoro-widget__main-btn"
          onClick={handleStartPause}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          className="pomodoro-widget__reset-btn"
          onClick={handleReset}
        >
          Reset
        </button>
        <button
          type="button"
          className="pomodoro-widget__skip-btn"
          onClick={handleSkip}
        >
          Skip →
        </button>
      </div>

      <p className="pomodoro-widget__footer">{MODE_FOOTER[currentMode]}</p>
    </div>
  );
}
