#!/bin/sh
# Asegura que PORT esté definido (default 3000)
export PORT="${PORT:-3000}"

# So that the app can write user JSONs (with or without volume mount), ensure the directory
# exists and is owned by nextjs (uid 1001). Runs as root at container start, then drops to nextjs.
mkdir -p /app/public/locations/users
chown -R nextjs:nodejs /app/public/locations/users 2>/dev/null || true

exec su-exec nextjs node server.js