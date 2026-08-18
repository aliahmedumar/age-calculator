export const config = {
  tmdbApiKey: process.env.TMDB_API_KEY ?? "",
  tmdbBaseUrl: process.env.TMDB_BASE_URL ?? "https://api.themoviedb.org/3",
  sonarrUrl: process.env.SONARR_URL ?? "http://sonarr:8989",
  sonarrApiKey: process.env.SONARR_API_KEY ?? "",
  radarrUrl: process.env.RADARR_URL ?? "http://radarr:7878",
  radarrApiKey: process.env.RADARR_API_KEY ?? "",
  qbUrl: process.env.QBITTORRENT_URL ?? "http://qbittorrent:8080",
  qbCookie: process.env.QBITTORRENT_COOKIE ?? "",
  mediaRoot: process.env.ROOT_MEDIA_PATH ?? "/data/media",
  movieRootPath: process.env.RADARR_ROOT_PATH ?? "/data/media/movies",
  tvRootPath: process.env.SONARR_ROOT_PATH ?? "/data/media/tv",
  radarrQualityProfileId: Number(process.env.RADARR_QUALITY_PROFILE_ID ?? "1"),
  sonarrQualityProfileId: Number(process.env.SONARR_QUALITY_PROFILE_ID ?? "1")
};

export function requireValue(value: string, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}
