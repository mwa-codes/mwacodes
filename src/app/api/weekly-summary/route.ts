import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseServer } from "@/lib/supabase-server";

export type WeeklySummaryApiSuccess = {
  summary: string;
  generatedAt: string;
  linkCount: number;
  noteCount: number;
};

export type WeeklySummaryApiError = {
  error: string;
};

type WeekLink = {
  title: string | null;
  type: string;
  tags: string[];
  url: string;
};

type WeekNote = {
  content: string;
};

const SYSTEM_PROMPT =
  "You are a personal assistant writing a weekly retrospective. Be concise, insightful, and specific. No generic advice. Under 120 words total.";

function sevenDaysAgoIso(): string {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  return since.toISOString();
}

function buildUserPrompt(links: WeekLink[], notes: WeekNote[]): string {
  const titles = links
    .map((l) => l.title?.trim() || l.url)
    .filter(Boolean);
  const topics = [
    ...new Set(links.flatMap((l) => (Array.isArray(l.tags) ? l.tags : []))),
  ];

  return `Based on what I saved and noted this week, write a brief paragraph summarizing what I was focused on, what topics recurred, and one observation about my interests this week.

Links saved (${links.length}): ${titles.join(", ")}
Topics: ${topics.join(", ")}
Notes written: ${notes.length}
Note previews: ${notes.map((n) => n.content.slice(0, 100)).join(" | ")}

Write as if you know me. Be direct.`;
}

export async function POST(): Promise<
  NextResponse<WeeklySummaryApiSuccess | WeeklySummaryApiError>
> {
  if (new Date().getDay() !== 1) {
    return NextResponse.json(
      { error: "Weekly summary is only generated on Mondays" },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured" },
      { status: 500 },
    );
  }

  const since = sevenDaysAgoIso();
  const db = getSupabaseServer();

  const [linksResult, notesResult] = await Promise.all([
    db
      .from("links")
      .select("title, type, tags, url")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
    db
      .from("notes")
      .select("content")
      .gte("created_at", since)
      .order("created_at", { ascending: false }),
  ]);

  if (linksResult.error || notesResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch weekly activity" },
      { status: 500 },
    );
  }

  const links = (linksResult.data ?? []) as WeekLink[];
  const notes = ((notesResult.data ?? []) as { content: string }[]).map(
    (note) => ({
      content: (note.content ?? "").slice(0, 200),
    }),
  );

  try {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(links, notes) },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      summary,
      generatedAt: new Date().toISOString(),
      linkCount: links.length,
      noteCount: notes.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate summary";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
