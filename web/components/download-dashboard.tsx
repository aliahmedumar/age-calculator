"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDriveDownload } from "lucide-react";
import type { DownloadItem } from "@/lib/types";

type Payload = {
  downloads: DownloadItem[];
  disk: { availableBytes: number; totalBytes: number; usedBytes: number; usedPercent: number };
};

async function fetchDownloads(): Promise<Payload> {
  const response = await fetch("/api/media/downloads", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch downloads");
  return (await response.json()) as Payload;
}

function formatBytes(value = 0): string {
  const gb = value / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function DownloadDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["downloads"],
    queryFn: fetchDownloads,
    refetchInterval: 5000
  });

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-2">
        <HardDriveDownload className="h-5 w-5 text-red-400" />
        <h2 className="text-xl font-semibold text-white">Activity & Download Manager</h2>
      </div>
      {isLoading ? <p className="text-sm text-zinc-400">Loading activity...</p> : null}
      {error ? <p className="text-sm text-red-400">Failed to load activity.</p> : null}
      {data ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Progress</th>
                  <th className="px-2 py-2">Speed</th>
                  <th className="px-2 py-2">ETA</th>
                  <th className="px-2 py-2">Seeds</th>
                </tr>
              </thead>
              <tbody>
                {data.downloads.map((item) => (
                  <tr key={item.id} className="border-t border-zinc-800 text-zinc-100">
                    <td className="max-w-xs truncate px-2 py-2">{item.name}</td>
                    <td className="px-2 py-2 capitalize">{item.source}</td>
                    <td className="px-2 py-2">
                      <div className="w-40 rounded-full bg-zinc-800">
                        <div className="h-2 rounded-full bg-red-500" style={{ width: `${item.progress}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400">{item.progress}%</span>
                    </td>
                    <td className="px-2 py-2">{item.downloadSpeed ? `${(item.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s` : "-"}</td>
                    <td className="px-2 py-2">{item.eta && item.eta > 0 ? `${Math.round(item.eta / 60)}m` : "-"}</td>
                    <td className="px-2 py-2">{item.seeds ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-300">Storage Health</p>
            <p className="text-lg font-semibold text-white">{data.disk.usedPercent}% used</p>
            <p className="text-xs text-zinc-400">
              {formatBytes(data.disk.usedBytes)} / {formatBytes(data.disk.totalBytes)} used • {formatBytes(data.disk.availableBytes)} free
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
