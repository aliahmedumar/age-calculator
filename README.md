# StreamHub 4K Platform

Production-oriented, self-hosted streaming automation platform with:

- **Media stack**: Radarr, Sonarr, Prowlarr, qBittorrent, Jellyfin
- **JIT automation**: Jellyfin playback webhook prefetch + janitor cleanup
- **Standalone web app**: Next.js full-stack gateway UI (Netflix/Stremio-style) to browse, request, track downloads, and stream

## Services

- `radarr` → `:7878`
- `sonarr` → `:8989`
- `prowlarr` → `:9696`
- `qbittorrent` → `:8080`
- `jellyfin` → `:8096`
- `webhook-service` → `:3001` (default external)
- `web-ui` → `:3000`

## 1) Configure

```bash
cp /home/runner/work/age-calculator/age-calculator/.env.example /home/runner/work/age-calculator/age-calculator/.env
```

Set real API keys in `.env`:

- `TMDB_API_KEY`
- `SONARR_API_KEY`
- `RADARR_API_KEY`
- `JELLYFIN_API_KEY`
- optionally `QBITTORRENT_COOKIE`

## 2) Initialize folder structure

```bash
ROOT_MEDIA_PATH=/srv/media PUID=1000 PGID=1000 /home/runner/work/age-calculator/age-calculator/scripts/init-folders.sh
```

## 3) Start all containers

```bash
cd /home/runner/work/age-calculator/age-calculator
docker compose up -d
```

## 4) Apply quality profile sizing (2160p-efficient)

```bash
SONARR_URL=http://localhost:8989 \
RADARR_URL=http://localhost:7878 \
SONARR_API_KEY=<sonarr-key> \
RADARR_API_KEY=<radarr-key> \
node --loader tsx /home/runner/work/age-calculator/age-calculator/scripts/configure-profiles.ts
```

## Web UI Features

Open: `http://localhost:3000`

- Hero + sliders (Trending Movies, Popular Series, Recently Downloaded, Currently Downloading)
- Debounced search with availability states:
  - Downloaded (Ready to Stream)
  - Downloading (Progress %)
  - Available in 4K (One-Click Request)
- Media details view with cast, runtime, badges, and TV season list
- One-click `Fetch in 4K` request routing to Sonarr/Radarr
- Built-in web video player with subtitle toggle + quality selector
- Auto prefetch call at 90% playback for TV episodes
- Download manager dashboard (progress/speed/ETA/seeds)
- Disk storage health widget

## Next.js API Layer

- `/api/tmdb/*` → TMDB proxy (trending/discovery/details/search)
- `/api/media/request` → queues movie/series in Radarr/Sonarr
- `/api/media/downloads` → qBittorrent + Sonarr/Radarr queue aggregation + disk stats
- `/api/media/status` → media availability state for UI
- `/api/stream/[id]` → direct file streaming with Range support
- `/api/prefetch` → monitors + searches next two Sonarr episodes

## Jellyfin Webhook Test

Run service and trigger a mock completed-playback event:

```bash
WEBHOOK_URL=http://localhost:3001/api/v1/jellyfin/webhook /home/runner/work/age-calculator/age-calculator/scripts/mock-jellyfin-event.sh
```

## Local Dev

### Web UI

```bash
cd /home/runner/work/age-calculator/age-calculator/web
npm install
npm run dev
```

### Webhook Service

```bash
cd /home/runner/work/age-calculator/age-calculator/webhook-service
npm install
npm run dev
```

## Verification

```bash
cd /home/runner/work/age-calculator/age-calculator/web
npm run lint
npm run build

cd /home/runner/work/age-calculator/age-calculator/webhook-service
npm run test
npm run build
```
