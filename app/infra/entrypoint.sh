#!/bin/sh
# Load .env file into environment variables if it exists
if [ -f /app/.env ]; then
  set -a
  . /app/.env
  set +a
fi
exec node server.js
