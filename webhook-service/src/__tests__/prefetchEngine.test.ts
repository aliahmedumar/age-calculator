import { describe, expect, it, vi } from 'vitest';
import { findNextEpisodeIds, PrefetchEngine, WatchedRegistry } from '../services/prefetchEngine.js';
import type { SonarrEpisode } from '../services/sonarr.js';

const episodes: SonarrEpisode[] = [
  { id: 1, seriesId: 10, seasonNumber: 1, episodeNumber: 1, hasFile: true, monitored: true },
  { id: 2, seriesId: 10, seasonNumber: 1, episodeNumber: 2, hasFile: false, monitored: false },
  { id: 3, seriesId: 10, seasonNumber: 1, episodeNumber: 3, hasFile: false, monitored: false },
  { id: 4, seriesId: 10, seasonNumber: 2, episodeNumber: 1, hasFile: false, monitored: false },
  { id: 5, seriesId: 10, seasonNumber: 2, episodeNumber: 2, hasFile: false, monitored: false }
];

describe('findNextEpisodeIds', () => {
  it('returns next two episodes in same season', () => {
    expect(findNextEpisodeIds(episodes[0], episodes, 2)).toEqual([2, 3]);
  });

  it('rolls over to next season when needed', () => {
    expect(findNextEpisodeIds(episodes[2], episodes, 2)).toEqual([4, 5]);
  });
});

describe('PrefetchEngine', () => {
  it('monitors and searches for next two episodes for completed playback', async () => {
    const getSeriesEpisodes = vi.fn().mockResolvedValue(episodes);
    const monitorEpisodes = vi.fn().mockResolvedValue(undefined);
    const triggerEpisodeSearch = vi.fn().mockResolvedValue({ id: 99, name: 'EpisodeSearch', state: 'queued' });

    const engine = new PrefetchEngine(
      {
        getSeriesEpisodes,
        monitorEpisodes,
        triggerEpisodeSearch
      },
      new WatchedRegistry()
    );

    const result = await engine.handlePlaybackEvent({
      NotificationType: 'PlaybackStop',
      ItemType: 'Episode',
      Played: true,
      SeriesId: 10,
      SeasonNumber: 1,
      EpisodeNumber: 1
    });

    expect(result).toEqual({ status: 'prefetched', currentEpisodeId: 1, nextEpisodeIds: [2, 3] });
    expect(getSeriesEpisodes).toHaveBeenCalledWith(10);
    expect(monitorEpisodes).toHaveBeenCalledWith([2, 3], true);
    expect(triggerEpisodeSearch).toHaveBeenCalledWith([2, 3]);
  });

  it('returns skipped for incomplete playback', async () => {
    const engine = new PrefetchEngine(
      {
        getSeriesEpisodes: vi.fn(),
        monitorEpisodes: vi.fn(),
        triggerEpisodeSearch: vi.fn()
      },
      new WatchedRegistry()
    );

    const result = await engine.handlePlaybackEvent({
      NotificationType: 'PlaybackProgress',
      ItemType: 'Episode',
      Played: false,
      SeriesId: 10,
      SeasonNumber: 1,
      EpisodeNumber: 1,
      PlaybackPositionTicks: 80,
      RunTimeTicks: 100
    });

    expect(result).toEqual({ status: 'skipped', reason: 'Playback not completed' });
  });
});
