"use client";

import { useCallback, useEffect, useState } from "react";
import type { WeatherApiSuccess } from "../app/api/weather/route";

export type WeatherWidgetProps = {
  className?: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: WeatherApiSuccess }
  | { status: "error"; message: string };

function formatWind(speedMs: number): string {
  return `${(speedMs * 3.6).toFixed(0)} km/h`;
}

function WeatherSkeleton() {
  return (
    <div className="weather-widget weather-widget--loading" aria-hidden>
      <div className="skeleton weather-skeleton weather-skeleton--city" />
      <div className="weather-skeleton-row">
        <div className="skeleton weather-skeleton weather-skeleton--icon" />
        <div className="skeleton weather-skeleton weather-skeleton--temp" />
      </div>
      <div className="skeleton weather-skeleton weather-skeleton--line" />
      <div className="weather-skeleton-row weather-skeleton-row--meta">
        <div className="skeleton weather-skeleton weather-skeleton--meta" />
        <div className="skeleton weather-skeleton weather-skeleton--meta" />
      </div>
    </div>
  );
}

export function WeatherWidget({ className }: WeatherWidgetProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const loadWeather = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/weather");
      const body = (await response.json()) as
        | WeatherApiSuccess
        | { error: string };

      if (!response.ok || "error" in body) {
        setState({
          status: "error",
          message: "error" in body ? body.error : "Failed to load weather",
        });
        return;
      }

      setState({ status: "success", data: body });
    } catch {
      setState({
        status: "error",
        message: "Unable to load weather",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/weather");
        const body = (await response.json()) as
          | WeatherApiSuccess
          | { error: string };

        if (cancelled) return;

        if (!response.ok || "error" in body) {
          setState({
            status: "error",
            message: "error" in body ? body.error : "Failed to load weather",
          });
          return;
        }

        setState({ status: "success", data: body });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Unable to load weather",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <WeatherSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className={`weather-widget weather-widget--error ${className ?? ""}`}>
        <span className="widget-label">Weather</span>
        <p className="widget-error">{state.message}</p>
        <button type="button" className="widget-retry" onClick={loadWeather}>
          Try again
        </button>
      </div>
    );
  }

  const { data } = state;
  const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

  return (
    <div className={`weather-widget ${className ?? ""}`}>
      <p className="weather-city">{data.city}</p>

      <div className="weather-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="weather-icon"
          src={iconUrl}
          alt=""
          width={56}
          height={56}
        />
        <p className="weather-temp">
          <span className="weather-temp__value">{data.temperature}</span>
          <span className="weather-temp__unit">°C</span>
        </p>
      </div>

      <p className="weather-condition">{data.condition}</p>

      <dl className="weather-meta">
        <div className="weather-meta__item">
          <dt>Humidity</dt>
          <dd>{data.humidity}%</dd>
        </div>
        <div className="weather-meta__item">
          <dt>Wind</dt>
          <dd>{formatWind(data.windSpeed)}</dd>
        </div>
      </dl>
    </div>
  );
}
