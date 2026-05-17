import { NextResponse } from "next/server";

export type WeatherApiSuccess = {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
};

export type WeatherApiError = {
  error: string;
};

type OpenWeatherResponse = {
  name: string;
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  cod?: number;
  message?: string;
};

export async function GET(): Promise<
  NextResponse<WeatherApiSuccess | WeatherApiError>
> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const city = process.env.WEATHER_CITY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeather API key is not configured" },
      { status: 500 },
    );
  }

  if (!city?.trim()) {
    return NextResponse.json(
      { error: "Weather city is not configured" },
      { status: 500 },
    );
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city.trim());
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  try {
    const response = await fetch(url.toString(), {
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `City not found: ${city}` },
          { status: 404 },
        );
      }

      const body = (await response.json().catch(() => null)) as OpenWeatherResponse | null;
      return NextResponse.json(
        { error: body?.message ?? "Failed to fetch weather data" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as OpenWeatherResponse;
    const current = data.weather[0];

    if (!current) {
      return NextResponse.json(
        { error: "Weather data is incomplete" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      city: data.name,
      temperature: Math.round(data.main.temp),
      condition: current.description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: current.icon,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach weather service" },
      { status: 502 },
    );
  }
}
