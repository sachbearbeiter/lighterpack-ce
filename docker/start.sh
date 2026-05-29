#!/bin/sh
set -e

echo "Running DB migrations..."
node_modules/.bin/tsx scripts/migrate.ts

echo "Starting app..."
exec node build
