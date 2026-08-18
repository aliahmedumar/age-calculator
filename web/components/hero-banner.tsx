"use client";

import Link from "next/link";
import type { TmdbMedia } from "@/lib/types";

const imageBase = "https://image.tmdb.org/t/p/original";

export function HeroBanner({ item }: { item?: TmdbMedia }) {
  if (!item) {
    return (
      <section className="h-96 animate-pulse rounded-2xl bg-zinc-900/70" />
    );
  }

  return (
    <section
      className="relative h-[26rem] overflow-hidden rounded-3xl border border-zinc-800 bg-cover bg-center"
      style={{ backgroundImage: item.backdropPath ? `url(${imageBase}${item.backdropPath})` : undefined }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35" />
      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-4 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-300">Trending in 4K</p>
        <h1 className="text-4xl font-extrabold text-white">{item.title}</h1>
        <p className="line-clamp-3 text-zinc-200">{item.overview}</p>
        <div className="flex gap-3">
          <Link
            href={`/media/${item.mediaType}/${item.id}`}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            View Details
          </Link>
        </div>
      </div>
    </section>
  );
}
