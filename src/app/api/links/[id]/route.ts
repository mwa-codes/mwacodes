import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export type DeleteLinkResponse = {
  success: true;
};

export type DeleteLinkApiError = {
  error: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<DeleteLinkResponse | DeleteLinkApiError>> {
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Link id is required" }, { status: 400 });
  }

  let error: { message: string; code?: string } | null = null;
  let count: number | null = null;

  try {
    const result = await getSupabaseServer()
      .from("links")
      .delete({ count: "exact" })
      .eq("id", id);
    error = result.error;
    count = result.count;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete link";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (error) {
    const message =
      error.code === "42501" ||
      error.message.includes("row-level security")
        ? "Database blocked delete (RLS). Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or run supabase/policies.sql in the Supabase SQL Editor."
        : process.env.NODE_ENV === "development"
          ? error.message
          : "Failed to delete link";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
