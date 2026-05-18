import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export type Note = {
  id: string;
  content: string;
  preview: string | null;
  created_at: string;
};

export type NotesApiError = {
  error: string;
};

type CreateNoteBody = {
  content?: string;
};

function escapePostgrestValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatPreview(content: string): string {
  return content.trim().split("\n")[0].slice(0, 80);
}

function formatWriteError(message: string, code?: string): string {
  if (code === "42501" || message.includes("row-level security")) {
    return "Database blocked save (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run policies for the notes table in Supabase.";
  }

  return process.env.NODE_ENV === "development" ? message : "Failed to save note";
}

export async function GET(
  request: Request,
): Promise<NextResponse<Note[] | NotesApiError>> {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  let query = getSupabaseServer()
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    const pattern = escapePostgrestValue(`%${search}%`);
    query = query.or(`content.ilike.${pattern},preview.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []) as Note[]);
}

export async function POST(
  request: Request,
): Promise<NextResponse<Note | NotesApiError>> {
  let body: CreateNoteBody;

  try {
    body = (await request.json()) as CreateNoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const preview = formatPreview(content);

  const { data, error } = await getSupabaseServer()
    .from("notes")
    .insert({ content, preview })
    .select()
    .single();

  if (error) {
    const message = formatWriteError(error.message, error.code);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(data as Note, { status: 201 });
}
