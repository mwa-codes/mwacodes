export type SavedLink = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  type:
    | "youtube"
    | "github"
    | "article"
    | "doc"
    | "tweet"
    | "tool"
    | "other";
  tags: string[];
  domain: string | null;
  created_at: string;
};
