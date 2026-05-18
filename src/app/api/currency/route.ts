import { NextResponse } from "next/server";

export const TRACKED_CURRENCIES = [
  "PKR",
  "EUR",
  "GBP",
  "SAR",
  "AED",
  "IQD",
  "IRR",
] as const;

export type TrackedCurrency = (typeof TRACKED_CURRENCIES)[number];

export type CurrencyApiSuccess = {
  base: "USD";
  rates: Record<TrackedCurrency, number>;
  lastUpdated: string;
};

export type CurrencyApiError = {
  error: true;
};

type OpenErApiResponse = {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const API_URL = "https://open.er-api.com/v6/latest/USD";

let cache: { data: CurrencyApiSuccess; fetchedAt: number } | null = null;

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_TTL_MS;
}

function extractRates(data: OpenErApiResponse): CurrencyApiSuccess | null {
  const rates = {} as Record<TrackedCurrency, number>;

  for (const code of TRACKED_CURRENCIES) {
    const value = data.rates[code];
    if (typeof value !== "number") return null;
    rates[code] = value;
  }

  return {
    base: "USD",
    rates,
    lastUpdated: data.time_last_update_utc,
  };
}

export async function GET(): Promise<
  NextResponse<CurrencyApiSuccess | CurrencyApiError>
> {
  if (cache && isCacheFresh(cache.fetchedAt)) {
    return NextResponse.json(cache.data);
  }

  try {
    const response = await fetch(API_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json({ error: true }, { status: 503 });
    }

    const data = (await response.json()) as OpenErApiResponse;

    if (data.result !== "success") {
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json({ error: true }, { status: 503 });
    }

    const payload = extractRates(data);
    if (!payload) {
      if (cache) return NextResponse.json(cache.data);
      return NextResponse.json({ error: true }, { status: 502 });
    }

    cache = { data: payload, fetchedAt: Date.now() };
    return NextResponse.json(payload);
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: true }, { status: 503 });
  }
}
