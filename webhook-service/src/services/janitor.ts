import cron, { type ScheduledTask } from 'node-cron';
import type { SonarrClient } from './sonarr.js';
import type { WatchedRegistry } from './prefetchEngine.js';

type Logger = {
  info: (message: string, meta?: object) => void;
  error: (message: string, meta?: object) => void;
};

export class JanitorService {
  private readonly schedule: string;
  private task: ScheduledTask | null = null;

  constructor(
    private readonly sonarr: Pick<SonarrClient, 'getSeriesEpisodes' | 'deleteEpisodeFile' | 'monitorEpisodes'>,
    private readonly watchedRegistry: WatchedRegistry,
    private readonly logger: Logger,
    schedule = '0 */6 * * *'
  ) {
    this.schedule = schedule;
  }

  start(): void {
    this.task = cron.schedule(this.schedule, () => {
      void this.cleanup();
    });
    this.logger.info('Janitor schedule started', { schedule: this.schedule });
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
  }

  async cleanup(now = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleEntries = this.watchedRegistry.getOlderThan(cutoff);

    for (const stale of staleEntries) {
      try {
        const episodes = await this.sonarr.getSeriesEpisodes(stale.seriesId);
        const episode = episodes.find((candidate) => candidate.id === stale.episodeId);

        if (!episode) {
          this.watchedRegistry.remove(stale.episodeId);
          continue;
        }

        if (episode.episodeFileId) {
          await this.sonarr.deleteEpisodeFile(episode.episodeFileId);
        }

        await this.sonarr.monitorEpisodes([episode.id], false);
        this.watchedRegistry.remove(episode.id);

        this.logger.info('Cleaned watched episode', { episodeId: episode.id, seriesId: episode.seriesId });
      } catch (error) {
        this.logger.error('Failed to clean watched episode', {
          episodeId: stale.episodeId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
}
