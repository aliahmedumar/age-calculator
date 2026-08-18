import 'dotenv/config';
import Fastify from 'fastify';
import { registerWebhookRoute } from './routes/webhook.js';
import { JanitorService } from './services/janitor.js';
import { PrefetchEngine, WatchedRegistry } from './services/prefetchEngine.js';
import { SonarrClient } from './services/sonarr.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const sonarrUrl = process.env.SONARR_URL ?? 'http://sonarr:8989';
const sonarrApiKey = process.env.SONARR_API_KEY;

if (!sonarrApiKey) {
  throw new Error('SONARR_API_KEY is required');
}

const app = Fastify({ logger: true });
const sonarrClient = new SonarrClient(sonarrUrl, sonarrApiKey);
const watchedRegistry = new WatchedRegistry();
const prefetchEngine = new PrefetchEngine(sonarrClient, watchedRegistry);
const janitor = new JanitorService(sonarrClient, watchedRegistry, app.log);

await registerWebhookRoute(app, prefetchEngine);

janitor.start();

const close = async (): Promise<void> => {
  janitor.stop();
  await app.close();
};

process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());

app
  .listen({ host, port })
  .then(() => {
    app.log.info(`Webhook service listening on ${host}:${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exitCode = 1;
  });
