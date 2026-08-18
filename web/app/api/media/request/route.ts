import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { radarrRequest, sonarrRequest } from "@/lib/server/media-clients";
import { getDetails } from "@/lib/server/tmdb";
import { z } from "zod";

const requestSchema = z.object({
  tmdbId: z.number().int().positive(),
  type: z.enum(["movie", "tv"]),
  quality: z.literal("4k")
});

export async function POST(request: NextRequest) {
  try {
    const payload = requestSchema.parse(await request.json());

    if (payload.type === "movie") {
      const details = await getDetails("movie", String(payload.tmdbId));
      const body = {
        title: details.title,
        qualityProfileId: config.radarrQualityProfileId,
        titleSlug: details.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        tmdbId: payload.tmdbId,
        monitored: true,
        rootFolderPath: config.movieRootPath,
        addOptions: {
          searchForMovie: true
        }
      };
      const response = await radarrRequest("/api/v3/movie", { method: "POST", body: JSON.stringify(body) });
      return NextResponse.json({ status: "queued", source: "radarr", response });
    }

    const lookup = await sonarrRequest<Record<string, unknown>[]>(`/api/v3/series/lookup?term=tmdb:${payload.tmdbId}`);
    const series = lookup[0];

    if (!series) {
      return NextResponse.json({ message: "Series lookup failed for TMDB ID" }, { status: 404 });
    }

    const seasons = ((series.seasons as Record<string, unknown>[] | undefined) ?? []).map((season) => ({
      seasonNumber: season.seasonNumber,
      monitored: true
    }));

    const requestBody = {
      ...series,
      qualityProfileId: config.sonarrQualityProfileId,
      rootFolderPath: config.tvRootPath,
      monitored: true,
      seasons,
      addOptions: {
        searchForMissingEpisodes: true,
        searchForCutoffUnmetEpisodes: true
      }
    };

    const response = await sonarrRequest("/api/v3/series", { method: "POST", body: JSON.stringify(requestBody) });
    return NextResponse.json({ status: "queued", source: "sonarr", response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request", issues: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Unable to queue request", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
