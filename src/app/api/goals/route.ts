import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export type Goal = {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  created_at: string;
};

export type GoalsApiError = {
  error: string;
};

type CreateGoalBody = {
  text?: string;
};

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatWriteError(message: string, code?: string): string {
  if (code === "42501" || message.includes("row-level security")) {
    return "Database blocked save (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run policies for the goals table in Supabase.";
  }

  return process.env.NODE_ENV === "development" ? message : "Failed to save goal";
}

export async function GET(): Promise<NextResponse<Goal[] | GoalsApiError>> {
  const { data, error } = await getSupabaseServer()
    .from("goals")
    .select("*")
    .eq("date", todayDate())
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []) as Goal[]);
}

export async function POST(
  request: Request,
): Promise<NextResponse<Goal | GoalsApiError>> {
  let body: CreateGoalBody;

  try {
    body = (await request.json()) as CreateGoalBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { data, error } = await getSupabaseServer()
    .from("goals")
    .insert({ text, date: todayDate() })
    .select()
    .single();

  if (error) {
    const message = formatWriteError(error.message, error.code);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(data as Goal, { status: 201 });
}
