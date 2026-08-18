#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/v1/jellyfin/webhook}"

curl -sS -X POST "$WEBHOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{
    "NotificationType": "PlaybackStop",
    "ItemType": "Episode",
    "Played": true,
    "SeriesId": 101,
    "SeasonNumber": 1,
    "EpisodeNumber": 1,
    "PlaybackPositionTicks": 900,
    "RunTimeTicks": 1000
  }' | jq
