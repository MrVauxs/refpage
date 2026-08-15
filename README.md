# refpage

A small, private character reference sheet site — SvelteKit (adapter-node), Better Auth, Drizzle and SQLite, packaged to run on [Coolify](https://coolify.io).

## Developing

```sh
bun install
cp .env.example .env   # then fill in BETTER_AUTH_SECRET and ORIGIN
bun run db:push        # or db:migrate to apply the committed migrations
bun run dev
```

Useful scripts:

| script                 | what it does                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| `bun run build`        | production build into `build/`                                     |
| `bun run start`        | run the production build (`node build`)                            |
| `bun run check`        | typecheck                                                          |
| `bun run db:generate`  | generate a migration from the schema into `drizzle/`               |
| `bun run db:migrate`   | apply migrations with drizzle-kit (development)                    |
| `bun run db:migrate:prod` | apply migrations with plain node (what the container runs)      |
| `bun run auth:schema`  | regenerate `src/lib/server/db/auth.schema.ts` from the auth config |

Migrations in `drizzle/` are committed and applied automatically on container start, so schema changes ship with the deploy. Regenerate them (`db:generate`) whenever you touch `src/lib/server/db/schema.ts` or the auth config.

## State that must persist

Everything the app writes lives under a single directory, mounted as one volume at `/data`:

| path            | contents                        | env var        |
| --------------- | ------------------------------- | -------------- |
| `/data/db`      | the SQLite database (plus WAL)  | `DATABASE_URL` |
| `/data/uploads` | uploaded images                 | `UPLOAD_DIR`   |

The database is a plain file on that volume — nothing about it is baked into the image, so it survives rebuilds and redeploys without any rewrite of the app. Uploads are deliberately kept out of `static/`, which is part of the image and would be wiped on every deploy.

Images are written by `saveUpload()` in `src/lib/server/uploads.ts` and served by `src/routes/uploads/[...path]/+server.ts` at `/uploads/<key>`. Keys are random UUIDs, so a URL is unguessable but shareable; if you'd rather require a signed-in session for every image, add a `locals.user` check to that route.

## Deploying to Coolify

Both supported build packs work. **Docker Compose** is the smoother path because the volume and health check come with the file.

### Option A — Docker Compose

1. New Resource → Private/Public Repository → Build Pack: **Docker Compose**, compose file `docker-compose.yaml`.
2. Coolify picks up the generated domain (`SERVICE_FQDN_REFPAGE_3000`), the `refpage-data` volume and the health check from the file.
3. Optionally set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in the environment tab to turn on GitHub sign-in.
4. Deploy.

`BETTER_AUTH_SECRET` is generated once by Coolify (`SERVICE_PASSWORD_BETTERAUTH`) and stored with the resource. Override it in the UI if you want to bring your own — changing it later logs everyone out.

### Option B — Dockerfile

1. New Resource → Private/Public Repository → Build Pack: **Dockerfile**.
2. Ports exposed: `3000`.
3. Add a persistent storage entry: volume mount, destination path `/data`.
4. Set the environment variables:

   | variable                                | value                                          |
   | --------------------------------------- | ---------------------------------------------- |
   | `ORIGIN`                                | the app's public URL, e.g. `https://refs.example.com` |
   | `BETTER_AUTH_SECRET`                    | 32+ random characters                          |
   | `DATABASE_URL`                          | `/data/db/refpage.db` (already the image default) |
   | `UPLOAD_DIR`                            | `/data/uploads` (already the image default)    |
   | `BODY_SIZE_LIMIT`                       | `25M` (already the image default)              |
   | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | optional, enables GitHub sign-in             |

5. Health check path: `/api/health` on port 3000. (The image also declares its own `HEALTHCHECK`.)
6. Deploy.

`ORIGIN` must match the public URL exactly, scheme included. If it doesn't, SvelteKit rejects form POSTs with *"Cross-site POST form submissions are forbidden"* and Better Auth builds broken callback URLs.

### What the container does on start

`docker/entrypoint.sh` creates `/data/db` and `/data/uploads` on the freshly mounted volume, hands them to the unprivileged `node` user, applies pending migrations, and only then starts the server as that user.

### Health

`GET /api/health` returns `200` with `{"status":"ok","database":"ok","uploads":"ok"}`, or `503` and the failing check's error message — which is what a misconfigured or unmounted volume looks like.

### Backups

The whole of `/data` is the backup: stop the container (or accept a WAL-consistent copy) and archive the directory, or point Coolify's scheduled backups at the volume.

## Notes

- The image builds without any secrets or database — env vars are read at runtime, so one image can be promoted between environments.
- `better-sqlite3` ships prebuilt Node-API binaries for linux x64/arm64, so nothing is compiled during the build. This is why the install steps run with `--ignore-scripts`.
- Local `.env` files are never copied into the image (see `.dockerignore`).
