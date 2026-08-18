import { config, requireValue } from "@/lib/server/config";
import { fetchJson } from "@/lib/server/http";

type ArrItem = { id: number; title: string; tmdbId?: number; hasFile?: boolean; monitored?: boolean };

type QueueRecord = {
  id: number;
  title: string;
  status: string;
  sizeleft: number;
  size: number;
  timeleft: string;
};

export async function radarrRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson(`${config.radarrUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": requireValue(config.radarrApiKey, "RADARR_API_KEY"),
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

export async function sonarrRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return fetchJson(`${config.sonarrUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": requireValue(config.sonarrApiKey, "SONARR_API_KEY"),
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
}

export async function qbRequest<T>(path: string): Promise<T> {
  return fetchJson(`${config.qbUrl.replace(/\/$/, "")}${path}`, {
    headers: config.qbCookie ? { Cookie: config.qbCookie } : undefined
  });
}

export async function getMovieByTmdbId(tmdbId: number): Promise<ArrItem | null> {
  const movies = await radarrRequest<ArrItem[]>("/api/v3/movie");
  return movies.find((movie) => movie.tmdbId === tmdbId) ?? null;
}

export async function getSeriesByTmdbId(tmdbId: number): Promise<ArrItem | null> {
  const series = await sonarrRequest<ArrItem[]>("/api/v3/series");
  return series.find((item) => item.tmdbId === tmdbId) ?? null;
}

export async function getQueues(): Promise<{ sonarr: QueueRecord[]; radarr: QueueRecord[] }> {
  const [sonarr, radarr] = await Promise.all([
    sonarrRequest<{ records: QueueRecord[] }>("/api/v3/queue?page=1&pageSize=50"),
    radarrRequest<{ records: QueueRecord[] }>("/api/v3/queue?page=1&pageSize=50")
  ]);

  return {
    sonarr: sonarr.records ?? [],
    radarr: radarr.records ?? []
  };
}
