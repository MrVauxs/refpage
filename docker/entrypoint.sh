#!/bin/sh
set -eu

# Defaults match the Dockerfile; both point inside the persistent /data volume.
: "${DATABASE_URL:=/data/db/refpage.db}"
: "${UPLOAD_DIR:=/data/uploads}"
export DATABASE_URL UPLOAD_DIR

DB_DIR=$(dirname "$DATABASE_URL")

# A freshly mounted volume is owned by root, so create and hand over the
# directories before dropping privileges.
mkdir -p "$DB_DIR" "$UPLOAD_DIR"
if [ "$(id -u)" = "0" ]; then
	chown -R node:node "$DB_DIR" "$UPLOAD_DIR"
	RUN_AS="gosu node"
else
	RUN_AS=""
fi

# Migrations must succeed before the server starts accepting traffic.
$RUN_AS node /app/scripts/migrate.js

exec $RUN_AS node /app/build
