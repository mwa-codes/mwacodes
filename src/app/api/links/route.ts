import { NextResponse } from "next/server";
import type { FetchMetaResponse } from "@/app/api/fetch-meta/route";
import type { TagLinkResponse } from "@/app/api/tag-link/route";
import { supabase } from "@/lib/supabase";
import { getSupabaseForWrites } from "@/lib/supabase-server";
import type { SavedLink } from "@/types/link";

export type LinksApiError = {
  error: string;
};

type CreateLinkBody = {
  url?: string;
};

const LINK_TYPES: SavedLink["type"][] = [
  "youtube",
  "github",
  "article",
  "doc",
  "tweet",
  "tool",
  "other",
];

function getBaseUrl(request: Request): string {
  const host = request.headers.get("host");
  if (!host) {
    return process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function escapePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatWriteError(message: string, code?: string): string {
  if (code === "42501" || message.includes("row-level security")) {
    return "Database blocked save (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run supabase/policies.sql in the Supabase SQL Editor.";
  }

  return process.env.NODE_ENV === "development" ? message : "Failed to save link";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchMeta(
  baseUrl: string,
  url: string,
): Promise<FetchMetaResponse> {
  const response = await fetch(`${baseUrl}/api/fetch-meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return (await response.json()) as FetchMetaResponse;
}

async function fetchTags(
  baseUrl: string,
  title: string,
  description: string,
  url: string,
): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/tag-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, url }),
  });

  const data = (await response.json()) as TagLinkResponse;
  return data.tags;
}

export async function GET(
  request: Request,
): Promise<NextResponse<SavedLink[] | LinksApiError>> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search")?.trim();
  const tag = searchParams.get("tag")?.trim();

  if (type && !LINK_TYPES.includes(type as SavedLink["type"])) {
    return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
  }

  let query = supabase
    .from("links")
    .select("*")
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (search) {
    const pattern = escapePostgrestValue(`%${search}%`);
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []) as SavedLink[]);
}

export async function POST(
  request: Request,
): Promise<NextResponse<SavedLink | LinksApiError>> {
  let body: CreateLinkBody;

  try {
    body = (await request.json()) as CreateLinkBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(request);

  try {
    const meta = await fetchMeta(baseUrl, url);
    const tags = await fetchTags(
      baseUrl,
      meta.title,
      meta.description,
      url,
    );

    const { data, error } = await getSupabaseForWrites()
      .from("links")
      .insert({
        url,
        title: emptyToNull(meta.title),
        description: emptyToNull(meta.description),
        thumbnail: emptyToNull(meta.thumbnail),
        type: meta.type,
        tags,
        domain: emptyToNull(meta.domain),
      })
      .select()
      .single();

    if (error) {
      const message = formatWriteError(error.message, error.code);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(data as SavedLink, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
