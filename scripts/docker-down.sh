#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.prod.yml}"

docker compose -f "$COMPOSE_FILE" down
