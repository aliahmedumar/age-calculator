import type { FastifyInstance } from 'fastify';
import { JellyfinWebhookSchema } from '../types/jellyfin.js';
import type { PrefetchEngine } from '../services/prefetchEngine.js';

export async function registerWebhookRoute(app: FastifyInstance, prefetchEngine: PrefetchEngine): Promise<void> {
  app.post('/api/v1/jellyfin/webhook', async (request, reply) => {
    const parsed = JellyfinWebhookSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid Jellyfin webhook payload',
        issues: parsed.error.flatten()
      });
    }

    const result = await prefetchEngine.handlePlaybackEvent(parsed.data);
    return reply.status(200).send(result);
  });
}
