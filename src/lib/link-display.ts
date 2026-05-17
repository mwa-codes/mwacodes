import type { SavedLink } from "@/types/link";

export const LINK_TYPE_LABELS: Record<SavedLink["type"], string> = {
  youtube: "YouTube",
  github: "GitHub",
  article: "Article",
  doc: "Doc",
  tweet: "Tweet",
  tool: "Tool",
  other: "Other",
};

export const LINK_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "youtube", label: "YouTube" },
  { id: "github", label: "GitHub" },
  { id: "article", label: "Article" },
  { id: "doc", label: "Doc" },
  { id: "tweet", label: "Tweet" },
  { id: "tool", label: "Tool" },
  { id: "other", label: "Other" },
] as const;

export type LinkTypeFilter = (typeof LINK_TYPE_FILTERS)[number]["id"];

export function displayTitle(link: SavedLink): string {
  if (link.title?.trim()) {
    return link.title.trim();
  }
  try {
    return new URL(link.url).hostname;
  } catch {
    return link.url;
  }
}

export function displayDomain(link: SavedLink): string {
  if (link.domain?.trim()) {
    return link.domain.replace(/^www\./i, "");
  }
  try {
    return new URL(link.url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function buildLinksQuery(search: string, type: LinkTypeFilter): string {
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (type !== "all") {
    params.set("type", type);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
