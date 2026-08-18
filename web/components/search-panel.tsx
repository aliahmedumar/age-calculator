"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Availability, TmdbMedia } from "@/lib/types";

const posterBase = "https://image.tmdb.org/t/p/w300";

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

async function fetchSearch(query: string): Promise<TmdbMedia[]> {
  if (!query.trim()) return [];
  const response = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Search failed");
  const payload = (await response.json()) as { results?: TmdbMedia[] };
  return (payload.results ?? [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => ({
      id: item.id,
      title: (item as unknown as { title?: string; name?: string }).title ?? (item as unknown as { name?: string }).name ?? "",
      overview: item.overview,
      backdropPath: (item as unknown as { backdrop_path?: string | null }).backdrop_path ?? null,
      posterPath: (item as unknown as { poster_path?: string | null }).poster_path ?? null,
      releaseDate:
        (item as unknown as { release_date?: string; first_air_date?: string }).release_date ??
        (item as unknown as { first_air_date?: string }).first_air_date ??
        null,
      voteAverage: Number((item as unknown as { vote_average?: number }).vote_average ?? 0),
      mediaType: (item as unknown as { media_type: "movie" | "tv" }).media_type
    }));
}

async function fetchStatus(id: number, type: "movie" | "tv"): Promise<Availability> {
  const response = await fetch(`/api/media/status?tmdbId=${id}&type=${type}`);
  if (!response.ok) return { state: "available" };
  return (await response.json()) as Availability;
}

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => fetchSearch(debounced),
    enabled: debounced.trim().length > 1
  });

  const statusQueries = useMemo(
    () => results.map((result) => ({ id: result.id, type: result.mediaType })),
    [results]
  );

  return (
    <section className="space-y-4">
      <div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search movies or shows..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-white placeholder:text-zinc-400 focus:border-red-500 focus:outline-none"
        />
      </div>
      {isFetching ? <p className="text-sm text-zinc-400">Searching...</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((item, index) => (
          <SearchCard key={`${item.mediaType}-${item.id}`} item={item} statusRef={statusQueries[index]} />
        ))}
      </div>
    </section>
  );
}

function SearchCard({ item, statusRef }: { item: TmdbMedia; statusRef?: { id: number; type: "movie" | "tv" } }) {
  const { data } = useQuery({
    queryKey: ["status", statusRef?.id, statusRef?.type],
    queryFn: () => fetchStatus(statusRef!.id, statusRef!.type),
    enabled: Boolean(statusRef),
    staleTime: 20_000
  });

  const statusLabel =
    data?.state === "downloaded"
      ? "Downloaded (Ready to Stream)"
      : data?.state === "downloading"
        ? `Downloading (${Math.round(data.progress ?? 0)}%)`
        : "Available in 4K (One-Click Request)";

  return (
    <Link
      href={`/media/${item.mediaType}/${item.id}`}
      className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 transition hover:border-zinc-600"
    >
      <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {item.posterPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${posterBase}${item.posterPath}`} alt={item.title} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="font-medium text-white">{item.title}</p>
        <p className="line-clamp-2 text-sm text-zinc-300">{item.overview}</p>
        <p className="text-xs text-emerald-300">{statusLabel}</p>
      </div>
    </Link>
  );
}
