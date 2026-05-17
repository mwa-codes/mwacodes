import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Links",
  description: "Browse your saved links library",
};

export default function LinksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
