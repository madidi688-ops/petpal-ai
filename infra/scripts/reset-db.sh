#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "Resetting PetPal database..."
docker compose exec -T postgres psql -U petpal -d petpal -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec -T backend npx prisma migrate deploy
docker compose exec -T backend npx prisma db seed
echo "Done."
