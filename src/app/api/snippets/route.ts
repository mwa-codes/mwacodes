import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export type Snippet = {
  id: string;
  title: string;
  code: string;
  language: string;
  created_at: string;
};

export type SnippetsApiError = {
  error: string;
};

type CreateSnippetBody = {
  title?: string;
  code?: string;
  language?: string;
};

function formatWriteError(message: string, code?: string): string {
  if (code === "42501" || message.includes("row-level security")) {
    return "Database blocked save (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run policies for the snippets table in Supabase.";
  }

  return process.env.NODE_ENV === "development" ? message : "Failed to save snippet";
}

export async function GET(): Promise<NextResponse<Snippet[] | SnippetsApiError>> {
  const { data, error } = await getSupabaseServer()
    .from("snippets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch snippets" },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []) as Snippet[]);
}

export async function POST(
  request: Request,
): Promise<NextResponse<Snippet | SnippetsApiError>> {
  let body: CreateSnippetBody;

  try {
    body = (await request.json()) as CreateSnippetBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const code = body.code?.trim();
  const language = body.language?.trim();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  if (!language) {
    return NextResponse.json({ error: "Language is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseServer()
    .from("snippets")
    .insert({ title, code, language })
    .select()
    .single();

  if (error) {
    const message = formatWriteError(error.message, error.code);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(data as Snippet, { status: 201 });
}
