import { NextResponse } from "next/server";
import { statfs } from "node:fs/promises";
import { config } from "@/lib/server/config";
import { getQueues, qbRequest } from "@/lib/server/media-clients";
import type { DownloadItem } from "@/lib/types";

type QBTorrent = {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  eta: number;
  size: number;
  num_seeds: number;
  state: string;
};

export async function GET() {
  try {
    const [qbTorrents, queues, disk] = await Promise.all([
      qbRequest<QBTorrent[]>("/api/v2/torrents/info?filter=downloading"),
      getQueues(),
      statfs(config.mediaRoot)
    ]);

    const qbDownloads: DownloadItem[] = qbTorrents.map((torrent) => ({
      id: torrent.hash,
      name: torrent.name,
      source: "qbittorrent",
      progress: Math.round(torrent.progress * 100),
      eta: torrent.eta,
      sizeBytes: torrent.size,
      downloadSpeed: torrent.dlspeed,
      seeds: torrent.num_seeds,
      state: torrent.state
    }));

    const sonarrDownloads: DownloadItem[] = queues.sonarr.map((item) => ({
      id: `sonarr-${item.id}`,
      name: item.title,
      source: "sonarr",
      progress: Math.round(((item.size - item.sizeleft) / Math.max(item.size, 1)) * 100),
      sizeBytes: item.size,
      state: item.status
    }));

    const radarrDownloads: DownloadItem[] = queues.radarr.map((item) => ({
      id: `radarr-${item.id}`,
      name: item.title,
      source: "radarr",
      progress: Math.round(((item.size - item.sizeleft) / Math.max(item.size, 1)) * 100),
      sizeBytes: item.size,
      state: item.status
    }));

    const used = disk.blocks - disk.bfree;
    const total = disk.blocks;

    return NextResponse.json({
      downloads: [...qbDownloads, ...sonarrDownloads, ...radarrDownloads],
      disk: {
        availableBytes: disk.bavail * disk.bsize,
        totalBytes: total * disk.bsize,
        usedBytes: used * disk.bsize,
        usedPercent: Math.round((used / Math.max(total, 1)) * 100)
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Unable to fetch download state", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
