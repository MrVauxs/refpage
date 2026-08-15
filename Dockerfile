# syntax=docker/dockerfile:1

# Dependencies and build run on bun (the package manager this project uses),
# the server itself runs on node — better-sqlite3 ships Node-API prebuilds for
# linux-x64/arm64, so nothing is compiled at install time.
ARG BUN_VERSION=1.3
ARG NODE_VERSION=24

# --ignore-scripts stops bun from running node-gyp against better-sqlite3's
# binding.gyp; the package already ships a prebuilt binary for this platform.
FROM oven/bun:${BUN_VERSION} AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:${BUN_VERSION} AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production \
	PORT=3000 \
	HOST=0.0.0.0 \
	DATABASE_URL=/data/db/refpage.db \
	UPLOAD_DIR=/data/uploads \
	BODY_SIZE_LIMIT=25M

# gosu lets the entrypoint prepare the mounted volume as root and then drop to
# the unprivileged `node` user without breaking signal forwarding
RUN apt-get update \
	&& apt-get install -y --no-install-recommends gosu \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# SQLite database and image uploads both live here — mount one persistent volume
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
