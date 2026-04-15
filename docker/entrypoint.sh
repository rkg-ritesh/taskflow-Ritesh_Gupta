#!/bin/sh
set -e

export PATH="/app/node_modules/.bin:$PATH"
PRISMA="node /app/node_modules/prisma/build/index.js"

echo "Running database migrations..."
$PRISMA migrate deploy

echo "Seeding database..."
$PRISMA db seed || echo "Seed skipped (data may already exist)"

echo "Starting Next.js server..."
exec node server.js
