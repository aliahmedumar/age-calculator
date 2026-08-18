"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard } from "lucide-react";
import { DownloadDashboard } from "@/components/download-dashboard";
import { HeroBanner } from "@/components/hero-banner";
import { MediaRow } from "@/components/media-row";
import { SearchPanel } from "@/components/search-panel";
import type { TmdbMedia } from "@/lib/types";

async function fetchTmdb(path: string): Promise<TmdbMedia[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Failed to fetch TMDB data");
  const payload = (await response.json()) as { results?: Record<string, unknown>[] };

  return (payload.results ?? []).map((item) => ({
    id: Number(item.id),
    title: String(item.title ?? item.name ?? "Untitled"),
    overview: String(item.overview ?? ""),
    backdropPath: (item.backdrop_path as string | null) ?? null,
    posterPath: (item.poster_path as string | null) ?? null,
    releaseDate: (item.release_date as string | undefined) ?? (item.first_air_date as string | undefined) ?? null,
    voteAverage: Number(item.vote_average ?? 0),
    mediaType: (item.media_type as "movie" | "tv" | undefined) ?? (path.includes("movie") ? "movie" : "tv")
  }));
}

export default function Home() {
  const trendingMovies = useQuery({
    queryKey: ["tmdb", "trending-movies"],
    queryFn: () => fetchTmdb("/api/tmdb/trending/movie/week")
  });

  const popularSeries = useQuery({
    queryKey: ["tmdb", "popular-series"],
    queryFn: () => fetchTmdb("/api/tmdb/tv/popular")
  });

  const trendingAll = useQuery({
    queryKey: ["tmdb", "trending-all"],
    queryFn: () => fetchTmdb("/api/tmdb/trending/all/week")
  });

  const downloading = useQuery({
    queryKey: ["downloads-preview"],
    queryFn: async () => {
      const response = await fetch("/api/media/downloads");
      if (!response.ok) return [];
      const payload = (await response.json()) as { downloads: { name: string; progress: number }[] };
      return payload.downloads.map((entry, index) => ({
        id: index + 100_000,
        title: entry.name,
        overview: `Download progress: ${entry.progress}%`,
        backdropPath: null,
        posterPath: null,
        releaseDate: null,
        voteAverage: 0,
        mediaType: "movie" as const
      }));
    }
  });

  const hero = useMemo(() => trendingAll.data?.[0], [trendingAll.data]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-6 md:px-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clapperboard className="h-7 w-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">StreamHub 4K</h1>
            <p className="text-xs text-zinc-400">Netflix-style control center for Sonarr/Radarr/qBittorrent</p>
          </div>
        </div>
      </header>

      <HeroBanner item={hero} />

      <SearchPanel />

      <MediaRow title="Trending Movies" items={trendingMovies.data ?? []} />
      <MediaRow title="Popular Series" items={popularSeries.data ?? []} />
      <MediaRow title="Currently Downloading" items={downloading.data ?? []} />
      <MediaRow title="Recently Downloaded" items={trendingMovies.data?.slice(0, 8) ?? []} />

      <DownloadDashboard />
    </main>
  );
}
