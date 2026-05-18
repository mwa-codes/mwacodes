export type BookmarkCategory = "tool" | "read" | "ref" | "social";

export type Bookmark = {
  title: string;
  url: string;
  category: BookmarkCategory;
};

/** Quick links — keep in sync with BookmarksWidget BOOKMARKS array. */
export const BOOKMARKS: Bookmark[] = [
  {
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    category: "ref",
  },
  {
    title: "GitHub",
    url: "https://github.com",
    category: "tool",
  },
  {
    title: "OpenAI Platform",
    url: "https://platform.openai.com/docs",
    category: "ref",
  },
  {
    title: "Next.js Docs",
    url: "https://nextjs.org/docs",
    category: "ref",
  },
  {
    title: "Stack Overflow",
    url: "https://stackoverflow.com",
    category: "tool",
  },
  {
    title: "Hacker News",
    url: "https://news.ycombinator.com",
    category: "read",
  },
  {
    title: "Vercel",
    url: "https://vercel.com",
    category: "tool",
  },
  {
    title: "npm",
    url: "https://www.npmjs.com",
    category: "tool",
  },
  {
    title: "CSS-Tricks",
    url: "https://css-tricks.com",
    category: "read",
  },
  {
    title: "X (Twitter)",
    url: "https://x.com",
    category: "social",
  },
];
