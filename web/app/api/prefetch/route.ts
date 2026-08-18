import { NextRequest, NextResponse } from "next/server";
import { sonarrRequest } from "@/lib/server/media-clients";
import { z } from "zod";

const prefetchSchema = z.object({
  seriesId: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative(),
  episodeNumber: z.number().int().nonnegative()
});

type Episode = {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
};

export async function POST(request: NextRequest) {
  try {
    const payload = prefetchSchema.parse(await request.json());
    const episodes = await sonarrRequest<Episode[]>(`/api/v3/episode?seriesId=${payload.seriesId}`);

    const ordered = [...episodes].sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
      return a.episodeNumber - b.episodeNumber;
    });

    const currentIndex = ordered.findIndex(
      (episode) =>
        episode.seasonNumber === payload.seasonNumber &&
        episode.episodeNumber === payload.episodeNumber
    );

    if (currentIndex < 0) {
      return NextResponse.json({ message: "Current episode not found" }, { status: 404 });
    }

    const nextIds = ordered.slice(currentIndex + 1, currentIndex + 3).map((episode) => episode.id);

    if (!nextIds.length) {
      return NextResponse.json({ status: "no-next-episodes" });
    }

    await sonarrRequest("/api/v3/episode/monitor", {
      method: "PUT",
      body: JSON.stringify({ episodeIds: nextIds, monitored: true })
    });

    const command = await sonarrRequest("/api/v3/command", {
      method: "POST",
      body: JSON.stringify({ name: "EpisodeSearch", episodeIds: nextIds })
    });

    return NextResponse.json({ status: "prefetch-triggered", episodeIds: nextIds, command });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid prefetch payload", issues: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Unable to process prefetch", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
