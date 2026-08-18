import { z } from 'zod';

const numericLike = z.union([z.number(), z.string().regex(/^\d+$/)]).transform((value) => Number(value));

export const JellyfinWebhookSchema = z.object({
  NotificationType: z.enum(['PlaybackStart', 'PlaybackProgress', 'PlaybackStop']).optional(),
  Event: z.string().optional(),
  Played: z.boolean().optional(),
  played: z.boolean().optional(),
  ItemType: z.string().optional(),
  Item: z
    .object({
      Type: z.string().optional(),
      SeriesId: numericLike.optional(),
      ParentIndexNumber: numericLike.optional(),
      IndexNumber: numericLike.optional(),
      RunTimeTicks: z.number().optional(),
      SeriesName: z.string().optional()
    })
    .optional(),
  SeriesId: numericLike.optional(),
  SeriesIndex: numericLike.optional(),
  SeasonIndex: numericLike.optional(),
  SeasonNumber: numericLike.optional(),
  ParentIndexNumber: numericLike.optional(),
  EpisodeIndex: numericLike.optional(),
  EpisodeNumber: numericLike.optional(),
  IndexNumber: numericLike.optional(),
  PlaybackPositionTicks: z.number().optional(),
  PositionTicks: z.number().optional(),
  RunTimeTicks: z.number().optional(),
  PlayedToCompletion: z.boolean().optional()
});

export type JellyfinWebhookEvent = z.infer<typeof JellyfinWebhookSchema>;

export type EpisodeReference = {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
};

export function isEpisodePayload(event: JellyfinWebhookEvent): boolean {
  const itemType = event.ItemType ?? event.Item?.Type;
  return itemType?.toLowerCase() === 'episode';
}

export function isCompletedPlayback(event: JellyfinWebhookEvent): boolean {
  const played = event.Played ?? event.played ?? event.PlayedToCompletion ?? false;

  if (played) {
    return true;
  }

  const runtimeTicks = event.RunTimeTicks ?? event.Item?.RunTimeTicks;
  const positionTicks = event.PlaybackPositionTicks ?? event.PositionTicks;

  if (!runtimeTicks || !positionTicks || runtimeTicks <= 0) {
    return false;
  }

  return positionTicks / runtimeTicks >= 0.9;
}

export function extractEpisodeReference(event: JellyfinWebhookEvent): EpisodeReference | null {
  const seriesId = event.SeriesId ?? event.Item?.SeriesId;
  const seasonNumber = event.SeasonIndex ?? event.SeasonNumber ?? event.ParentIndexNumber ?? event.Item?.ParentIndexNumber;
  const episodeNumber = event.EpisodeIndex ?? event.EpisodeNumber ?? event.IndexNumber ?? event.Item?.IndexNumber;

  if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
    return null;
  }

  return {
    seriesId,
    seasonNumber,
    episodeNumber
  };
}
