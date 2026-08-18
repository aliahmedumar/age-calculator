"use client";

import Link from "next/link";
import type { TmdbMedia } from "@/lib/types";

const posterBase = "https://image.tmdb.org/t/p/w500";

export function MediaRow({ title, items }: { title: string; items: TmdbMedia[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            href={`/media/${item.mediaType}/${item.id}`}
            key={`${item.mediaType}-${item.id}`}
            className="group w-48 shrink-0"
          >
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {item.posterPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${posterBase}${item.posterPath}`}
                  alt={item.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400">No Image</div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-200">{item.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
