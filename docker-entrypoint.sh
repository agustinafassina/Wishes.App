#!/bin/sh
# Asegura que PORT esté definido (default 3000) y arranca el servidor Next.js
export PORT="${PORT:-3000}"
exec node server.js