"use client";

import { useMemo, useRef, useState } from "react";

type Props = {
  streamId: string;
  title: string;
  prefetchPayload?: {
    seriesId: number;
    seasonNumber: number;
    episodeNumber: number;
  };
};

export function VideoPlayer({ streamId, title, prefetchPayload }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [triggered, setTriggered] = useState(false);
  const [showSubs, setShowSubs] = useState(true);
  const [quality, setQuality] = useState("auto");

  const source = useMemo(() => `/api/stream/${streamId}`, [streamId]);

  async function maybePrefetch() {
    if (triggered || !prefetchPayload || !videoRef.current) return;

    const video = videoRef.current;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;

    const completion = video.currentTime / video.duration;
    if (completion < 0.9) return;

    setTriggered(true);
    await fetch("/api/prefetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefetchPayload)
    });
  }

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        controls
        className="aspect-video w-full rounded-2xl border border-zinc-800 bg-black"
        src={source}
        onTimeUpdate={() => {
          void maybePrefetch();
        }}
      >
        {showSubs ? <track kind="subtitles" srcLang="en" label="English" /> : null}
      </video>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
        <p className="font-medium text-white">Now Playing: {title}</p>
        <button
          type="button"
          onClick={() => setShowSubs((value) => !value)}
          className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200"
        >
          Subtitles: {showSubs ? "On" : "Off"}
        </button>
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-200"
        >
          <option value="auto">Auto</option>
          <option value="2160p">2160p</option>
          <option value="1080p">1080p</option>
        </select>
      </div>
    </div>
  );
}
