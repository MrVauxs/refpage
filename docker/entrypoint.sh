#!/bin/sh
set -eu

# Defaults match the Dockerfile; both point inside the persistent /data volume.
: "${DATABASE_URL:=/data/db/refpage.db}"
: "${UPLOAD_DIR:=/data/uploads}"
export DATABASE_URL UPLOAD_DIR

DB_DIR=$(dirname "$DATABASE_URL")
SECRET_FILE="${BETTER_AUTH_SECRET_FILE:-/data/auth-secret}"

# A freshly mounted volume is owned by root, so create and hand over the
# directories before dropping privileges.
mkdir -p "$DB_DIR" "$UPLOAD_DIR"
if [ "$(id -u)" = "0" ]; then
	chown -R node:node "$DB_DIR" "$UPLOAD_DIR"
	RUN_AS="gosu node"
else
	RUN_AS=""
fi

# Better Auth needs a signing secret. Rather than making the deployment fail
# without one, keep a generated secret on the volume — it stays stable across
# restarts and redeploys, so sessions survive. Setting BETTER_AUTH_SECRET in the
# environment overrides it.
if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
	if [ ! -f "$SECRET_FILE" ]; then
		node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" > "$SECRET_FILE"
		chmod 600 "$SECRET_FILE"
		if [ "$(id -u)" = "0" ]; then
			chown node:node "$SECRET_FILE"
		fi
		echo "generated a new Better Auth secret at $SECRET_FILE"
	fi
	BETTER_AUTH_SECRET=$(cat "$SECRET_FILE")
	export BETTER_AUTH_SECRET
fi

# Migrations must succeed before the server starts accepting traffic.
$RUN_AS node /app/scripts/migrate.js

exec $RUN_AS node /app/build
