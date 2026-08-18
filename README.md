# 4K Automated Streaming + JIT Prefetch Platform

This repository provisions a self-hosted media automation stack with:

- Radarr, Sonarr, Prowlarr, qBittorrent, Jellyfin (Docker Compose)
- Strict 4K profile automation for storage-efficient HEVC/x265 Web-DL/micro encodes
- Node.js TypeScript webhook microservice for Jellyfin playback events
- JIT next-episode prefetching (next 2 episodes)
- Janitor cron cleanup (delete/unmonitor watched episodes after 24h)

## Project Layout

- `/docker-compose.yml` - Full stack topology
- `/.env.example` - Required environment variables
- `/scripts/init-folders.sh` - Creates media directory structure and permissions
- `/scripts/profiles/quality-definitions.json` - 4K quality size constraints
- `/scripts/configure-profiles.ts` - Applies quality definitions to Sonarr/Radarr APIs
- `/scripts/mock-jellyfin-event.sh` - Sends a mock "finished episode" webhook event
- `/webhook-service` - Fastify TypeScript service for prefetch + janitor logic

## 1) Setup Environment

```bash
cp .env.example .env
```

Edit `.env` and set API keys from Sonarr, Radarr, and Jellyfin.

## 2) Initialize Media Folders

```bash
chmod +x /home/runner/work/age-calculator/age-calculator/scripts/init-folders.sh
ROOT_MEDIA_PATH=/srv/media PUID=1000 PGID=1000 /home/runner/work/age-calculator/age-calculator/scripts/init-folders.sh
```

## 3) Start the Media Stack

```bash
docker compose up -d
```

Services:

- Radarr: `http://localhost:7878`
- Sonarr: `http://localhost:8989`
- Prowlarr: `http://localhost:9696`
- qBittorrent: `http://localhost:8080`
- Jellyfin: `http://localhost:8096`
- Webhook service: `http://localhost:3000`

## 4) Apply 4K Quality Definitions

```bash
SONARR_URL=http://localhost:8989 \
RADARR_URL=http://localhost:7878 \
SONARR_API_KEY=<sonarr-key> \
RADARR_API_KEY=<radarr-key> \
node --loader tsx /home/runner/work/age-calculator/age-calculator/scripts/configure-profiles.ts
```

This updates Sonarr and Radarr quality-definition sizing for 2160p targets.

## 5) Configure Jellyfin Webhook Plugin

In Jellyfin:

1. Install and enable the Webhook plugin.
2. Add a destination URL:
   - `http://webhook-service:3000/api/v1/jellyfin/webhook` (inside Docker network)
   - Or `http://<host-ip>:3000/api/v1/jellyfin/webhook` (external)
3. Enable playback events (PlaybackProgress / PlaybackStop).
4. Include payload fields for series and episode indexing.

## 6) Test the Webhook Service

### Local service test

```bash
cd /home/runner/work/age-calculator/age-calculator/webhook-service
npm install
npm run dev
```

In another shell:

```bash
WEBHOOK_URL=http://localhost:3000/api/v1/jellyfin/webhook \
/home/runner/work/age-calculator/age-calculator/scripts/mock-jellyfin-event.sh
```

Expected behavior after completed episode event:

- Service resolves the current Sonarr episode
- Next 2 episodes are set to monitored
- Sonarr `EpisodeSearch` command is triggered immediately
- Current watched episode is tracked for janitor cleanup

## 7) Janitor Auto-Cleanup

The webhook service runs a cron job every 6 hours.

For watched episodes older than 24 hours:

- Deletes attached Sonarr episode file (if present)
- Marks episode unmonitored
- Removes it from local watched registry

## Webhook Service Environment Variables

- `PORT` (default `3000`)
- `HOST` (default `0.0.0.0`)
- `SONARR_URL` (default `http://sonarr:8989`)
- `SONARR_API_KEY` (required)
- `JELLYFIN_API_KEY` (optional pass-through for future webhook auth needs)

## Development + Verification

```bash
cd /home/runner/work/age-calculator/age-calculator/webhook-service
npm install
npm run test
npm run build
```
