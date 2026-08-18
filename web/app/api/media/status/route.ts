import { NextRequest, NextResponse } from "next/server";
import { getMovieByTmdbId, getQueues, getSeriesByTmdbId } from "@/lib/server/media-clients";
import type { Availability } from "@/lib/types";

export async function GET(request: NextRequest) {
  const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"));
  const type = request.nextUrl.searchParams.get("type");

  if (!tmdbId || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ message: "tmdbId and valid type are required" }, { status: 400 });
  }

  try {
    const [movie, series, queues] = await Promise.all([
      type === "movie" ? getMovieByTmdbId(tmdbId) : Promise.resolve(null),
      type === "tv" ? getSeriesByTmdbId(tmdbId) : Promise.resolve(null),
      getQueues()
    ]);

    if (movie?.hasFile || series?.hasFile) {
      const downloaded: Availability = { state: "downloaded" };
      return NextResponse.json(downloaded);
    }

    const queueItems = [...queues.radarr, ...queues.sonarr];
    const queueMatch = queueItems.find((record) => (movie ? record.title.includes(movie.title) : series ? record.title.includes(series.title) : false));

    if (queueMatch) {
      const total = queueMatch.size || 1;
      const progress = Math.max(0, Math.min(100, ((total - queueMatch.sizeleft) / total) * 100));
      const downloading: Availability = { state: "downloading", progress };
      return NextResponse.json(downloading);
    }

    const available: Availability = { state: "available" };
    return NextResponse.json(available);
  } catch (error) {
    return NextResponse.json(
      { message: "Unable to resolve media status", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
