"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CurrencyApiError,
  CurrencyApiSuccess,
  TrackedCurrency,
} from "../app/api/currency/route";

export type CurrencyWidgetProps = {
  className?: string;
};

/** Shown below the PKR hero rate */
const SECONDARY_CURRENCIES: TrackedCurrency[] = [
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "IQD",
  "IRR",
];

const RATE_DECIMALS: Record<TrackedCurrency, number> = {
  PKR: 2,
  EUR: 4,
  GBP: 4,
  SAR: 4,
  AED: 4,
  IQD: 2,
  IRR: 0,
};

type PkrConvertTarget = Exclude<TrackedCurrency, "PKR">;

const PKR_CONVERT_TARGETS: PkrConvertTarget[] = [
  "SAR",
  "AED",
  "IQD",
  "IRR",
  "EUR",
  "GBP",
];

type ConvertCurrency = TrackedCurrency | "USD";

type ConvertPair =
  | "usd-pkr"
  | "pkr-usd"
  | `pkr-${Lowercase<PkrConvertTarget>}`
  | `${Lowercase<PkrConvertTarget>}-pkr`;

const PKR_CROSS_OPTIONS: { id: ConvertPair; label: string }[] =
  PKR_CONVERT_TARGETS.flatMap((code) => {
    const lower = code.toLowerCase() as Lowercase<PkrConvertTarget>;
    return [
      { id: `pkr-${lower}` as ConvertPair, label: `PKR → ${code}` },
      { id: `${lower}-pkr` as ConvertPair, label: `${code} → PKR` },
    ];
  });

const CONVERT_OPTIONS: { id: ConvertPair; label: string }[] = [
  { id: "usd-pkr", label: "USD → PKR" },
  { id: "pkr-usd", label: "PKR → USD" },
  ...PKR_CROSS_OPTIONS,
];

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: CurrencyApiSuccess }
  | { status: "error"; data: CurrencyApiSuccess | null };

function minutesAgo(isoOrUtc: string): number {
  const then = new Date(isoOrUtc).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 60_000));
}

function formatUpdatedLabel(isoOrUtc: string): string {
  const mins = minutesAgo(isoOrUtc);
  if (mins === 0) return "Updated just now";
  if (mins === 1) return "Updated 1 min ago";
  return `Updated ${mins} mins ago`;
}

function formatRate(value: number, currency: TrackedCurrency): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: RATE_DECIMALS[currency],
  });
}

function formatConverted(value: number, currency: ConvertCurrency): string {
  if (currency === "USD") {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  }
  return formatRate(value, currency);
}

function parsePair(
  pair: ConvertPair,
): { from: ConvertCurrency; to: ConvertCurrency } | null {
  if (pair === "usd-pkr") return { from: "USD", to: "PKR" };
  if (pair === "pkr-usd") return { from: "PKR", to: "USD" };

  if (pair.startsWith("pkr-")) {
    const code = pair.slice(4).toUpperCase() as PkrConvertTarget;
    if (!PKR_CONVERT_TARGETS.includes(code)) return null;
    return { from: "PKR", to: code };
  }

  if (pair.endsWith("-pkr")) {
    const code = pair.slice(0, -4).toUpperCase() as PkrConvertTarget;
    if (!PKR_CONVERT_TARGETS.includes(code)) return null;
    return { from: code, to: "PKR" };
  }

  return null;
}

/** Rates are units of each currency per 1 USD. */
function convertBetween(
  amount: number,
  from: ConvertCurrency,
  to: ConvertCurrency,
  rates: CurrencyApiSuccess["rates"],
): number | null {
  if (from === "USD" && to !== "USD") {
    return amount * rates[to];
  }

  if (to === "USD" && from !== "USD") {
    const fromRate = rates[from];
    return fromRate > 0 ? amount / fromRate : null;
  }

  if (from === "USD" || to === "USD") return null;

  const fromRate = rates[from];
  if (fromRate <= 0) return null;
  return amount * (rates[to] / fromRate);
}

function convertAmount(
  amount: number,
  pair: ConvertPair,
  rates: CurrencyApiSuccess["rates"],
): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;

  const parsed = parsePair(pair);
  if (!parsed) return null;

  return convertBetween(amount, parsed.from, parsed.to, rates);
}

function resultCurrency(pair: ConvertPair): ConvertCurrency {
  const parsed = parsePair(pair);
  return parsed?.to ?? "PKR";
}

function CurrencySkeleton() {
  return (
    <div className="currency-widget currency-widget--loading" aria-hidden>
      <div className="skeleton currency-skeleton currency-skeleton--header" />
      <div className="skeleton currency-skeleton currency-skeleton--hero" />
      <div className="skeleton currency-skeleton currency-skeleton--secondary" />
      <div className="skeleton currency-skeleton currency-skeleton--converter" />
      <div className="skeleton currency-skeleton currency-skeleton--footer" />
    </div>
  );
}

export function CurrencyWidget({ className }: CurrencyWidgetProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [amount, setAmount] = useState("1");
  const [pair, setPair] = useState<ConvertPair>("usd-pkr");
  const lastGood = useRef<CurrencyApiSuccess | null>(null);

  const loadRates = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/currency");
      const body = (await response.json()) as
        | CurrencyApiSuccess
        | CurrencyApiError;

      if (!response.ok || "error" in body) {
        setState({
          status: "error",
          data: lastGood.current,
        });
        return;
      }

      lastGood.current = body;
      setState({ status: "success", data: body });
    } catch {
      setState({
        status: "error",
        data: lastGood.current,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/currency");
        const body = (await response.json()) as
          | CurrencyApiSuccess
          | CurrencyApiError;

        if (cancelled) return;

        if (!response.ok || "error" in body) {
          setState({
            status: "error",
            data: lastGood.current,
          });
          return;
        }

        lastGood.current = body;
        setState({ status: "success", data: body });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            data: lastGood.current,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  if (state.status === "loading") {
    return <CurrencySkeleton />;
  }

  const data =
    state.status === "success" || state.status === "error"
      ? state.data
      : null;
  const isError = state.status === "error";

  if (isError && !data) {
    return (
      <div
        className={`currency-widget currency-widget--error ${className ?? ""}`}
      >
        <div className="currency-widget__header">
          <span className="currency-widget__label">
            <span className="currency-widget__icon" aria-hidden>
              💱
            </span>
            Exchange Rates
          </span>
        </div>
        <p className="widget-error">Rates unavailable</p>
        <button type="button" className="widget-retry" onClick={loadRates}>
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return <CurrencySkeleton />;
  }

  const converted = convertAmount(parsedAmount, pair, data.rates);
  const resultCode = resultCurrency(pair);

  return (
    <div
      className={`currency-widget ${isError ? "currency-widget--stale" : ""} ${className ?? ""}`}
    >
      <div className="currency-widget__header">
        <span className="currency-widget__label">
          <span className="currency-widget__icon" aria-hidden>
            💱
          </span>
          Exchange Rates
        </span>
        <span className="currency-widget__updated">
          {formatUpdatedLabel(data.lastUpdated)}
        </span>
      </div>

      {isError ? (
        <p className="currency-widget__unavailable">Rates unavailable</p>
      ) : null}

      <p className="currency-widget__hero">
        1 USD ={" "}
        <span className="currency-widget__hero-value">
          {formatRate(data.rates.PKR, "PKR")}
        </span>{" "}
        PKR
      </p>

      <dl className="currency-widget__rates-grid">
        {SECONDARY_CURRENCIES.map((code) => (
          <div key={code} className="currency-widget__rate">
            <dt>{code}</dt>
            <dd>{formatRate(data.rates[code], code)}</dd>
          </div>
        ))}
      </dl>

      <div className="currency-widget__converter">
        <div className="currency-widget__converter-row">
          <input
            type="number"
            className="currency-widget__input"
            value={amount}
            min={0}
            step="any"
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount to convert"
          />
          <select
            className="currency-widget__select"
            value={pair}
            onChange={(e) => setPair(e.target.value as ConvertPair)}
            aria-label="Conversion direction"
          >
            {CONVERT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <p className="currency-widget__result" aria-live="polite">
          {converted === null ? (
            "—"
          ) : (
            <>
              {formatConverted(converted, resultCode)}{" "}
              <span className="currency-widget__result-unit">{resultCode}</span>
            </>
          )}
        </p>
      </div>

      <p className="currency-widget__footer">Rates for reference only</p>
    </div>
  );
}

