import {
  displayDomain,
  displayTitle,
  LINK_TYPE_LABELS,
} from "@/lib/link-display";
import type { SavedLink } from "@/types/link";

export type LinkExportFormat = "markdown" | "json" | "csv";

export const LINK_EXPORT_FORMATS: {
  id: LinkExportFormat;
  label: string;
}[] = [
  { id: "markdown", label: "Markdown" },
  { id: "json", label: "JSON" },
  { id: "csv", label: "CSV" },
];

function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function linksToCsv(links: SavedLink[]): string {
  const header = [
    "title",
    "url",
    "type",
    "domain",
    "description",
    "tags",
    "created_at",
  ];

  const rows = links.map((link) => [
    displayTitle(link),
    link.url,
    LINK_TYPE_LABELS[link.type],
    displayDomain(link),
    link.description?.trim() ?? "",
    link.tags.join("; "),
    link.created_at,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvField(cell)).join(","))
    .join("\n");
}

function linksToMarkdown(links: SavedLink[], exportedAt: Date): string {
  const dateLabel = exportedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const sections = links.map((link) => {
    const title = displayTitle(link);
    const domain = displayDomain(link);
    const description = link.description?.trim();
    const tags = link.tags.length > 0 ? link.tags.join(", ") : null;

    const lines = [
      `## ${title}`,
      "",
      `- **URL:** ${link.url}`,
      `- **Type:** ${LINK_TYPE_LABELS[link.type]}`,
    ];

    if (domain) {
      lines.push(`- **Domain:** ${domain}`);
    }

    lines.push(`- **Saved:** ${formatSavedDate(link.created_at)}`);

    if (tags) {
      lines.push(`- **Tags:** ${tags}`);
    }

    if (description) {
      lines.push("", description);
    }

    return lines.join("\n");
  });

  return [`# Your library — ${dateLabel}`, "", ...sections].join("\n\n");
}

export function serializeLinks(
  links: SavedLink[],
  format: LinkExportFormat,
  exportedAt = new Date(),
): string {
  switch (format) {
    case "json":
      return JSON.stringify(links, null, 2);
    case "csv":
      return linksToCsv(links);
    case "markdown":
      return linksToMarkdown(links, exportedAt);
  }
}

export function exportFilename(
  format: LinkExportFormat,
  exportedAt = new Date(),
): string {
  const day = exportedAt.toISOString().slice(0, 10);
  const ext = format === "markdown" ? "md" : format;
  return `mwa-links-${day}.${ext}`;
}

export function exportMimeType(format: LinkExportFormat): string {
  switch (format) {
    case "json":
      return "application/json";
    case "csv":
      return "text/csv;charset=utf-8";
    case "markdown":
      return "text/markdown;charset=utf-8";
  }
}

export function downloadLinksExport(
  links: SavedLink[],
  format: LinkExportFormat,
): void {
  const exportedAt = new Date();
  const content = serializeLinks(links, format, exportedAt);
  const blob = new Blob([content], { type: exportMimeType(format) });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFilename(format, exportedAt);
  anchor.click();
  URL.revokeObjectURL(url);
}
