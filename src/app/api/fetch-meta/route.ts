import { NextResponse } from "next/server";

export type FetchMetaResponse = {
  title: string;
  description: string;
  thumbnail: string;
  type: "youtube" | "github" | "tweet" | "doc" | "article";
  domain: string;
};

type FetchMetaBody = {
  url?: string;
};

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const EMPTY_META: FetchMetaResponse = {
  title: "",
  description: "",
  thumbnail: "",
  type: "article",
  domain: "",
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function getMetaContent(
  html: string,
  key: string,
  attr: "property" | "name" = "property",
): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${key}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function getTitleFromHtml(html: string): string {
  const ogTitle = getMetaContent(html, "og:title");
  if (ogTitle) {
    return ogTitle;
  }

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1].trim()) : "";
}

function detectType(parsed: URL): FetchMetaResponse["type"] {
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const href = parsed.href.toLowerCase();

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    return "youtube";
  }
  if (host === "github.com" || host.endsWith(".github.com")) {
    return "github";
  }
  if (
    host === "twitter.com" ||
    host === "x.com" ||
    host.endsWith(".twitter.com")
  ) {
    return "tweet";
  }
  if (href.endsWith(".pdf") || href.includes("docs.")) {
    return "doc";
  }

  return "article";
}

function getYouTubeVideoId(parsed: URL): string | null {
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return id || null;
  }

  if (host.endsWith("youtube.com")) {
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) {
      return fromQuery;
    }

    const pathMatch = parsed.pathname.match(/\/(embed|v|shorts)\/([^/?]+)/i);
    if (pathMatch?.[2]) {
      return pathMatch[2];
    }
  }

  return null;
}

function getYouTubeThumbnail(parsed: URL): string | null {
  const videoId = getYouTubeVideoId(parsed);
  return videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : null;
}

function parseMetaFromHtml(html: string): {
  title: string;
  description: string;
  thumbnail: string;
} {
  return {
    title: getTitleFromHtml(html),
    description: getMetaContent(html, "og:description") ?? "",
    thumbnail: getMetaContent(html, "og:image") ?? "",
  };
}

export async function POST(
  request: Request,
): Promise<NextResponse<FetchMetaResponse>> {
  let body: FetchMetaBody;

  try {
    body = (await request.json()) as FetchMetaBody;
  } catch {
    return NextResponse.json(EMPTY_META);
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return NextResponse.json(EMPTY_META);
  }

  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json(EMPTY_META);
  }

  const type = detectType(parsed);
  const domain = parsed.hostname.replace(/^www\./i, "");

  try {
    const response = await fetch(parsed.href, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      const youtubeThumbnail = type === "youtube" ? getYouTubeThumbnail(parsed) : null;
      return NextResponse.json({
        title: "",
        description: "",
        thumbnail: youtubeThumbnail ?? "",
        type,
        domain,
      });
    }

    const html = await response.text();
    const meta = parseMetaFromHtml(html);
    const youtubeThumbnail =
      type === "youtube" ? getYouTubeThumbnail(parsed) : null;

    return NextResponse.json({
      title: meta.title,
      description: meta.description,
      thumbnail: youtubeThumbnail ?? meta.thumbnail,
      type,
      domain,
    });
  } catch {
    const youtubeThumbnail = type === "youtube" ? getYouTubeThumbnail(parsed) : null;
    return NextResponse.json({
      title: "",
      description: "",
      thumbnail: youtubeThumbnail ?? "",
      type,
      domain,
    });
  }
}
