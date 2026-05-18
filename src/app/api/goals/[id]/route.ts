import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { Goal } from "@/app/api/goals/route";

export type DeleteGoalResponse = {
  success: true;
};

export type GoalsIdApiError = {
  error: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchGoalBody = {
  completed?: boolean;
};

function formatWriteError(message: string, code?: string): string {
  if (code === "42501" || message.includes("row-level security")) {
    return "Database blocked update (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run policies for the goals table in Supabase.";
  }

  return process.env.NODE_ENV === "development" ? message : "Failed to update goal";
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse<Goal | GoalsIdApiError>> {
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Goal id is required" }, { status: 400 });
  }

  let body: PatchGoalBody;

  try {
    body = (await request.json()) as PatchGoalBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.completed !== "boolean") {
    return NextResponse.json(
      { error: "completed must be a boolean" },
      { status: 400 },
    );
  }

  const { data, error } = await getSupabaseServer()
    .from("goals")
    .update({ completed: body.completed })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const message = formatWriteError(error.message, error.code);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json(data as Goal);
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<DeleteGoalResponse | GoalsIdApiError>> {
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Goal id is required" }, { status: 400 });
  }

  let error: { message: string; code?: string } | null = null;
  let count: number | null = null;

  try {
    const result = await getSupabaseServer()
      .from("goals")
      .delete({ count: "exact" })
      .eq("id", id);
    error = result.error;
    count = result.count;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (error) {
    const message =
      error.code === "42501" ||
      error.message.includes("row-level security")
        ? "Database blocked delete (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run policies for the goals table in Supabase."
        : process.env.NODE_ENV === "development"
          ? error.message
          : "Failed to delete goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
