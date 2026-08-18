"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/video-player";

export default function WatchPage() {
  const params = useParams<{ type: "movie" | "tv"; id: string }>();
  const type = params.type;
  const id = params.id;

  const streamId = useMemo(() => {
    const relativePath = type === "movie" ? `movies/${id}.mp4` : `tv/${id}.mp4`;
    return Buffer.from(relativePath).toString("base64url");
  }, [id, type]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-5 px-4 py-6 md:px-8">
      <h1 className="text-2xl font-semibold text-white">Built-in Web Player</h1>
      <VideoPlayer
        streamId={streamId}
        title={`${type.toUpperCase()} #${id}`}
        prefetchPayload={
          type === "tv"
            ? {
                seriesId: Number(id),
                seasonNumber: 1,
                episodeNumber: 1
              }
            : undefined
        }
      />
    </main>
  );
}
