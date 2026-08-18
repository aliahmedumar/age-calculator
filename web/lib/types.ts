export type MediaType = "movie" | "tv";

export type TmdbMedia = {
  id: number;
  title: string;
  overview: string;
  backdropPath: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  mediaType: MediaType;
};

export type TmdbDetails = TmdbMedia & {
  runtime: number | null;
  seasons?: { season_number: number; episode_count: number; name: string }[];
  episodes?: { episode_number: number; name: string }[];
  cast: { id: number; name: string; character?: string; profilePath?: string | null }[];
};

export type AvailabilityState = "downloaded" | "downloading" | "available";

export type Availability = {
  state: AvailabilityState;
  progress?: number;
};

export type DownloadItem = {
  id: string;
  name: string;
  source: "qbittorrent" | "sonarr" | "radarr";
  progress: number;
  eta?: number;
  sizeBytes?: number;
  downloadSpeed?: number;
  seeds?: number;
  state?: string;
};
