"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Availability, TmdbDetails } from "@/lib/types";

const backdropBase = "https://image.tmdb.org/t/p/original";

async function fetchDetails(type: string, id: string): Promise<TmdbDetails> {
  const response = await fetch(`/api/tmdb/${type}/${id}?append_to_response=credits`);
  if (!response.ok) throw new Error("Failed to load details");
  const payload = (await response.json()) as Record<string, unknown>;

  return {
    id: Number(payload.id),
    title: String(payload.title ?? payload.name ?? "Untitled"),
    overview: String(payload.overview ?? ""),
    backdropPath: (payload.backdrop_path as string | null) ?? null,
    posterPath: (payload.poster_path as string | null) ?? null,
    releaseDate: (payload.release_date as string | undefined) ?? (payload.first_air_date as string | undefined) ?? null,
    voteAverage: Number(payload.vote_average ?? 0),
    mediaType: type as "movie" | "tv",
    runtime: (payload.runtime as number | undefined) ?? null,
    seasons: (payload.seasons as { season_number: number; episode_count: number; name: string }[] | undefined) ?? undefined,
    cast: (((payload.credits as { cast?: Record<string, unknown>[] } | undefined)?.cast ?? []) as Record<string, unknown>[])
      .slice(0, 10)
      .map((member) => ({
        id: Number(member.id),
        name: String(member.name ?? ""),
        character: member.character ? String(member.character) : undefined,
        profilePath: (member.profile_path as string | null) ?? null
      }))
  };
}

async function fetchAvailability(type: string, id: string): Promise<Availability> {
  const response = await fetch(`/api/media/status?type=${type}&tmdbId=${id}`);
  if (!response.ok) return { state: "available" };
  return (await response.json()) as Availability;
}

export default function MediaDetailsPage() {
  const params = useParams<{ type: "movie" | "tv"; id: string }>();
  const type = params.type;
  const id = params.id;

  const details = useQuery({
    queryKey: ["details", type, id],
    queryFn: () => fetchDetails(type, id)
  });

  const availability = useQuery({
    queryKey: ["availability", type, id],
    queryFn: () => fetchAvailability(type, id)
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/media/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: Number(id), type, quality: "4k" })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body);
      }

      return response.json();
    }
  });

  if (details.isLoading) return <main className="p-8 text-zinc-300">Loading media details...</main>;
  if (!details.data) return <main className="p-8 text-red-300">Unable to load media details.</main>;

  const item = details.data;
  const isDownloaded = availability.data?.state === "downloaded";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-6 md:px-8">
      <section
        className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
        style={{ backgroundImage: item.backdropPath ? `url(${backdropBase}${item.backdropPath})` : undefined, backgroundSize: "cover" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/45" />
        <div className="relative z-10 max-w-3xl space-y-4 p-8">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">4K</span>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">HDR</span>
            {item.runtime ? <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-200">{item.runtime}m</span> : null}
          </div>
          <h1 className="text-4xl font-bold text-white">{item.title}</h1>
          <p className="text-zinc-200">{item.overview}</p>
          <div className="flex gap-3">
            {isDownloaded ? (
              <Link
                href={`/watch/${type}/${id}`}
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black"
              >
                Watch Now
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => requestMutation.mutate()}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white"
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? "Queueing..." : "Fetch in 4K"}
              </button>
            )}
          </div>
          {requestMutation.isSuccess ? <p className="text-sm text-emerald-300">Download request sent successfully.</p> : null}
          {requestMutation.isError ? <p className="text-sm text-red-300">Failed to queue request.</p> : null}
        </div>
      </section>

      {item.seasons?.length ? (
        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="text-lg font-semibold text-white">Seasons</h2>
          <div className="grid gap-2 md:grid-cols-3">
            {item.seasons.map((season) => (
              <div key={season.season_number} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="font-medium text-zinc-100">{season.name}</p>
                <p className="text-sm text-zinc-400">Episodes: {season.episode_count}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-white">Cast</h2>
        <div className="grid gap-2 md:grid-cols-4">
          {item.cast.map((member) => (
            <div key={member.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="font-medium text-zinc-100">{member.name}</p>
              <p className="text-xs text-zinc-400">{member.character ?? ""}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
