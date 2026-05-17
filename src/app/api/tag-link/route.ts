import { NextResponse } from "next/server";
import OpenAI from "openai";

export type TagLinkResponse = {
  tags: string[];
};

export type TagLinkApiError = {
  error: string;
};

type TagLinkBody = {
  title?: string;
  description?: string;
  url?: string;
};

const SYSTEM_PROMPT =
  "You are a tagging assistant. Return ONLY a JSON array of 2-4 lowercase tags. No explanation. No markdown. Just the array.";

function buildUserPrompt(title: string, description: string, url: string): string {
  return `Tag this link:
Title: ${title}
Description: ${description}
URL: ${url}

Examples of good tags: ['javascript', 'tutorial'], ['productivity', 'focus'], ['machine-learning', 'paper']`;
}

function parseTags(raw: string): string[] {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      return ["untagged"];
    }

    const tags = parsed
      .filter((item): item is string => typeof item === "string")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    return tags.length > 0 ? tags : ["untagged"];
  } catch {
    return ["untagged"];
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<TagLinkResponse | TagLinkApiError>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key is not configured" },
      { status: 500 },
    );
  }

  let body: TagLinkBody;

  try {
    body = (await request.json()) as TagLinkBody;
  } catch {
    return NextResponse.json({ tags: ["untagged"] });
  }

  const title = body.title?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const url = body.url?.trim() ?? "";

  try {
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(title, description, url) },
      ],
      max_tokens: 80,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ tags: ["untagged"] });
    }

    return NextResponse.json({ tags: parseTags(content) });
  } catch {
    return NextResponse.json({ tags: ["untagged"] });
  }
}
