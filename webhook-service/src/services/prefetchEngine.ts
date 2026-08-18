import { extractEpisodeReference, isCompletedPlayback, isEpisodePayload, type JellyfinWebhookEvent } from '../types/jellyfin.js';
import type { SonarrClient, SonarrEpisode } from './sonarr.js';

export type WatchedEntry = {
  episodeId: number;
  seriesId: number;
  watchedAt: string;
};

export class WatchedRegistry {
  private readonly records = new Map<number, WatchedEntry>();

  add(entry: WatchedEntry): void {
    this.records.set(entry.episodeId, entry);
  }

  remove(episodeId: number): void {
    this.records.delete(episodeId);
  }

  getOlderThan(cutoffDate: Date): WatchedEntry[] {
    return [...this.records.values()].filter((entry) => new Date(entry.watchedAt).getTime() <= cutoffDate.getTime());
  }
}

function compareEpisodes(left: SonarrEpisode, right: SonarrEpisode): number {
  if (left.seasonNumber !== right.seasonNumber) {
    return left.seasonNumber - right.seasonNumber;
  }

  return left.episodeNumber - right.episodeNumber;
}

export function findNextEpisodeIds(currentEpisode: SonarrEpisode, allEpisodes: SonarrEpisode[], count: number): number[] {
  const orderedEpisodes = [...allEpisodes].sort(compareEpisodes);
  const currentIndex = orderedEpisodes.findIndex((episode) => episode.id === currentEpisode.id);

  if (currentIndex < 0) {
    return [];
  }

  return orderedEpisodes.slice(currentIndex + 1, currentIndex + 1 + count).map((episode) => episode.id);
}

export type PrefetchResult =
  | { status: 'skipped'; reason: string }
  | { status: 'prefetched'; currentEpisodeId: number; nextEpisodeIds: number[] }
  | { status: 'completed-no-next'; currentEpisodeId: number };

export class PrefetchEngine {
  constructor(
    private readonly sonarr: Pick<SonarrClient, 'getSeriesEpisodes' | 'monitorEpisodes' | 'triggerEpisodeSearch'>,
    private readonly watchedRegistry: WatchedRegistry
  ) {}

  async handlePlaybackEvent(event: JellyfinWebhookEvent): Promise<PrefetchResult> {
    if (!isEpisodePayload(event)) {
      return { status: 'skipped', reason: 'Unsupported item type' };
    }

    if (!isCompletedPlayback(event)) {
      return { status: 'skipped', reason: 'Playback not completed' };
    }

    const reference = extractEpisodeReference(event);
    if (!reference) {
      return { status: 'skipped', reason: 'Unable to derive episode reference' };
    }

    const episodes = await this.sonarr.getSeriesEpisodes(reference.seriesId);
    const currentEpisode = episodes.find(
      (episode) => episode.seasonNumber === reference.seasonNumber && episode.episodeNumber === reference.episodeNumber
    );

    if (!currentEpisode) {
      return { status: 'skipped', reason: 'Current episode not found in Sonarr' };
    }

    this.watchedRegistry.add({
      episodeId: currentEpisode.id,
      seriesId: currentEpisode.seriesId,
      watchedAt: new Date().toISOString()
    });

    const nextEpisodeIds = findNextEpisodeIds(currentEpisode, episodes, 2);

    if (!nextEpisodeIds.length) {
      return { status: 'completed-no-next', currentEpisodeId: currentEpisode.id };
    }

    await this.sonarr.monitorEpisodes(nextEpisodeIds, true);
    await this.sonarr.triggerEpisodeSearch(nextEpisodeIds);

    return {
      status: 'prefetched',
      currentEpisodeId: currentEpisode.id,
      nextEpisodeIds
    };
  }
}
