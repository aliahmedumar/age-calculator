import { config, requireValue } from "@/lib/server/config";
import { fetchJson } from "@/lib/server/http";
import type { MediaType, TmdbDetails, TmdbMedia } from "@/lib/types";

function mapMedia(item: Record<string, unknown>, fallbackType?: MediaType): TmdbMedia {
  const type = (item.media_type as MediaType | undefined) ?? fallbackType ?? "movie";
  return {
    id: Number(item.id),
    title: String(item.title ?? item.name ?? "Untitled"),
    overview: String(item.overview ?? ""),
    backdropPath: (item.backdrop_path as string | null) ?? null,
    posterPath: (item.poster_path as string | null) ?? null,
    releaseDate: (item.release_date as string | undefined) ?? (item.first_air_date as string | undefined) ?? null,
    voteAverage: Number(item.vote_average ?? 0),
    mediaType: type
  };
}

export async function tmdbProxy(path: string, query?: URLSearchParams): Promise<unknown> {
  const apiKey = requireValue(config.tmdbApiKey, "TMDB_API_KEY");
  const search = new URLSearchParams(query);
  search.set("api_key", apiKey);

  const url = `${config.tmdbBaseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}?${search.toString()}`;
  return fetchJson(url, { next: { revalidate: 120 } });
}

export async function getTrending(type: "movie" | "tv" | "all" = "all"): Promise<TmdbMedia[]> {
  const response = (await tmdbProxy(`trending/${type}/week`)) as { results: Record<string, unknown>[] };
  return response.results.map((item) => mapMedia(item)).slice(0, 20);
}

export async function searchTmdb(query: string): Promise<TmdbMedia[]> {
  const response = (await tmdbProxy("search/multi", new URLSearchParams({ query }))) as {
    results: Record<string, unknown>[];
  };

  return response.results
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => mapMedia(item));
}

export async function getDetails(type: MediaType, id: string): Promise<TmdbDetails> {
  const response = (await tmdbProxy(`${type}/${id}`, new URLSearchParams({ append_to_response: "credits" }))) as Record<
    string,
    unknown
  >;

  const media = mapMedia(response, type);
  const cast = ((response.credits as { cast?: Record<string, unknown>[] } | undefined)?.cast ?? []).slice(0, 8).map((c) => ({
    id: Number(c.id),
    name: String(c.name ?? "Unknown"),
    character: c.character ? String(c.character) : undefined,
    profilePath: (c.profile_path as string | null) ?? null
  }));

  return {
    ...media,
    runtime: (response.runtime as number | undefined) ?? null,
    seasons: (response.seasons as { season_number: number; episode_count: number; name: string }[] | undefined) ?? undefined,
    cast
  };
}
