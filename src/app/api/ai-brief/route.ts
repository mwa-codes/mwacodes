import { NextResponse } from "next/server";
import OpenAI from "openai";

export type AIBriefApiSuccess = {
  brief: string;
  generatedAt: string;
};

export type AIBriefApiError = {
  error: string;
};

const SYSTEM_PROMPT =
  "You are a sharp, no-fluff personal assistant. Generate a concise morning brief for a developer. Be direct and useful. No filler phrases.";

function formatToday(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function buildUserPrompt(): string {
  return `Give me: 1) One sharp observation or insight for today, 2) One focus tip for deep work, 3) One thing worth thinking about. Keep total response under 120 words. Today is ${formatToday()}.`;
}

export async function POST(): Promise<
  NextResponse<AIBriefApiSuccess | AIBriefApiError>
> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured" },
      { status: 500 },
    );
  }

  try {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt() },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const brief = completion.choices[0]?.message?.content?.trim();

    if (!brief) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      brief,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate brief";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
