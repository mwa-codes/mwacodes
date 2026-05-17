"use client";

import { useCallback, useEffect, useState } from "react";
import type { GitHubApiSuccess } from "../app/api/github/route";

export type GitHubWidgetProps = {
  className?: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "success"; data: GitHubApiSuccess }
  | { status: "error"; message: string };

function GitHubSkeleton() {
  return (
    <div className="github-widget github-widget--loading" aria-hidden>
      <div className="github-skeleton-row github-skeleton-row--profile">
        <div className="skeleton github-skeleton github-skeleton--avatar" />
        <div className="github-skeleton-col">
          <div className="skeleton github-skeleton github-skeleton--name" />
          <div className="skeleton github-skeleton github-skeleton--bio" />
        </div>
      </div>
      <div className="github-skeleton-row github-skeleton-row--stats">
        <div className="skeleton github-skeleton github-skeleton--stat" />
        <div className="skeleton github-skeleton github-skeleton--stat" />
        <div className="skeleton github-skeleton github-skeleton--stat" />
      </div>
      <div className="github-skeleton-list">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton github-skeleton github-skeleton--repo" />
        ))}
      </div>
    </div>
  );
}

export function GitHubWidget({ className }: GitHubWidgetProps) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const loadGitHub = useCallback(async () => {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/github");
      const body = (await response.json()) as
        | GitHubApiSuccess
        | { error: string };

      if (!response.ok || "error" in body) {
        setState({
          status: "error",
          message: "error" in body ? body.error : "Failed to load GitHub",
        });
        return;
      }

      setState({ status: "success", data: body });
    } catch {
      setState({
        status: "error",
        message: "Unable to load GitHub",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/github");
        const body = (await response.json()) as
          | GitHubApiSuccess
          | { error: string };

        if (cancelled) return;

        if (!response.ok || "error" in body) {
          setState({
            status: "error",
            message: "error" in body ? body.error : "Failed to load GitHub",
          });
          return;
        }

        setState({ status: "success", data: body });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Unable to load GitHub",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return <GitHubSkeleton />;
  }

  if (state.status === "error") {
    return (
      <div className={`github-widget github-widget--error ${className ?? ""}`}>
        <span className="widget-label">GitHub</span>
        <p className="widget-error">{state.message}</p>
        <button type="button" className="widget-retry" onClick={loadGitHub}>
          Try again
        </button>
      </div>
    );
  }

  const { data } = state;
  const displayName = data.name ?? data.username;

  return (
    <div className={`github-widget ${className ?? ""}`}>
      <div className="github-profile">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="github-avatar"
          src={data.avatarUrl}
          alt=""
          width={48}
          height={48}
        />
        <div className="github-profile__text">
          <p className="github-name">{displayName}</p>
          {data.bio && <p className="github-bio">{data.bio}</p>}
        </div>
      </div>

      <dl className="github-stats">
        <div className="github-stats__item">
          <dt>Repos</dt>
          <dd>{data.publicRepos}</dd>
        </div>
        <div className="github-stats__item">
          <dt>Followers</dt>
          <dd>{data.followers}</dd>
        </div>
        <div className="github-stats__item">
          <dt>Following</dt>
          <dd>{data.following}</dd>
        </div>
      </dl>

      <ul className="github-repos">
        {data.repos.map((repo) => (
          <li key={repo.htmlUrl}>
            <a
              className="github-repo"
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="github-repo__name">{repo.name}</span>
              <span className="github-repo__meta">
                {repo.language && (
                  <span className="github-repo__lang">{repo.language}</span>
                )}
                <span className="github-repo__stars">★ {repo.stars}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
