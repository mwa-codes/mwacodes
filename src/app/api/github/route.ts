import { NextResponse } from "next/server";

export type GitHubRepoItem = {
  name: string;
  stars: number;
  language: string | null;
  htmlUrl: string;
};

export type GitHubApiSuccess = {
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  name: string | null;
  bio: string | null;
  username: string;
  repos: GitHubRepoItem[];
};

export type GitHubApiError = {
  error: string;
};

type GitHubUserResponse = {
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  name: string | null;
  bio: string | null;
  message?: string;
};

type GitHubRepoResponse = Array<{
  name: string;
  stargazers_count: number;
  language: string | null;
  html_url: string;
}>;

const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "mwacodes-dashboard",
};

export async function GET(): Promise<
  NextResponse<GitHubApiSuccess | GitHubApiError>
> {
  const username = process.env.GITHUB_USERNAME?.trim();

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is not configured" },
      { status: 500 },
    );
  }

  const userUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=5`;

  try {
    const [userResponse, reposResponse] = await Promise.all([
      fetch(userUrl, { headers: GITHUB_HEADERS, next: { revalidate: 300 } }),
      fetch(reposUrl, { headers: GITHUB_HEADERS, next: { revalidate: 300 } }),
    ]);

    if (userResponse.status === 404) {
      return NextResponse.json(
        { error: `GitHub user not found: ${username}` },
        { status: 404 },
      );
    }

    if (!userResponse.ok) {
      const body = (await userResponse.json().catch(() => null)) as GitHubUserResponse | null;
      return NextResponse.json(
        { error: body?.message ?? "Failed to fetch GitHub profile" },
        { status: userResponse.status },
      );
    }

    if (!reposResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub repositories" },
        { status: reposResponse.status },
      );
    }

    const user = (await userResponse.json()) as GitHubUserResponse;
    const repos = (await reposResponse.json()) as GitHubRepoResponse;

    return NextResponse.json({
      avatarUrl: user.avatar_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      name: user.name,
      bio: user.bio,
      username: user.login,
      repos: repos.map((repo) => ({
        name: repo.name,
        stars: repo.stargazers_count,
        language: repo.language,
        htmlUrl: repo.html_url,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach GitHub" },
      { status: 502 },
    );
  }
}
