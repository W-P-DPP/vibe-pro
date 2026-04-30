#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

if [ "$#" -gt 0 ]; then
  docker compose -f "$COMPOSE_FILE" logs -f --tail=200 "$@"
else
  docker compose -f "$COMPOSE_FILE" logs -f --tail=200
fi
