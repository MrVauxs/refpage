# refpage

A small, private character reference sheet site — SvelteKit (adapter-node), Better Auth, Drizzle and SQLite, packaged to run on [Coolify](https://coolify.io).

## Developing

```sh
bun install
cp .env.example .env   # then fill in BETTER_AUTH_SECRET
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

**No environment variable is required.** The image carries sensible defaults, the public URL is taken from the proxy's `x-forwarded-proto` / `x-forwarded-host` headers, and the Better Auth signing secret is generated on first boot and kept on the volume. All you have to supply is the volume and the domain.

### Option A — Dockerfile (recommended)

1. New Resource → your repository → Build Pack: **Dockerfile**.
2. Ports exposed: `3000`.
3. Persistent Storage → add a volume mount with destination path `/data`.
4. Configuration → Domains: set the domain you want.
5. Deploy.

Environment variables stay fully editable in Coolify's UI with this build pack. Everything below is optional:

| variable                                   | when you'd set it                                            |
| ------------------------------------------ | ------------------------------------------------------------ |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | to enable GitHub sign-in (both must be set)                  |
| `ALLOWED_HOSTS`                            | required for OAuth sign-in — see below                       |
| `ALLOWED_EMAILS`                           | to restrict who can create an account — see below            |
| `BETTER_AUTH_SECRET`                       | to pin your own signing secret instead of the generated one  |
| `BODY_SIZE_LIMIT`                          | to allow uploads larger than the default `25M`               |
| `DATABASE_URL`, `UPLOAD_DIR`               | to move data off `/data/db` and `/data/uploads`              |

### Option B — Docker Compose

1. New Resource → your repository → Build Pack: **Docker Compose**, compose file `docker-compose.yaml`.
2. Configuration → Domains: set the domain (the service exposes port 3000).
3. Deploy. The `refpage-data` volume and the health check come from the file.

This build pack does more for you than the Dockerfile one, because the compose file can use Coolify's magic variables:

| line in `docker-compose.yaml`               | what it does                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `SERVICE_FQDN_REFPAGE_3000`                 | generates the domain and points the proxy at port 3000                        |
| `ALLOWED_HOSTS=$SERVICE_FQDN_REFPAGE_3000`  | hands that domain to Better Auth, so GitHub sign-in needs no domain typed in  |
| `BETTER_AUTH_SECRET=$SERVICE_PASSWORD_...`  | Coolify generates a secret once and keeps it, instead of the on-volume one    |

`SERVICE_FQDN_*` expands to a bare hostname, `SERVICE_URL_*` to one with a scheme — `ALLOWED_HOSTS` wants the bare form. There is deliberately no `ORIGIN`: adapter-node v6 inlines it from `kit.paths.origin` at **build** time, so a runtime value is ignored entirely.

The only variable left to set by hand is the GitHub pair, if you want OAuth.

### What the container does on start

`docker/entrypoint.sh`:

1. creates `/data/db` and `/data/uploads` on the freshly mounted volume and hands them to the unprivileged `node` user,
2. generates `/data/auth-secret` (32 random bytes, mode 600) if `BETTER_AUTH_SECRET` isn't set — it's reused on every later boot, so sessions survive restarts and redeploys,
3. applies pending migrations,
4. starts the server as `node`.

Because the origin comes from proxy headers, don't publish the container's port directly to the internet. Put it behind the proxy (Coolify does this for you) so a client can't set `x-forwarded-host` itself.

## GitHub sign-in

Email and password sign-in works with no configuration. OAuth needs an absolute callback URL, so it needs to know the public hostname:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. Authorization callback URL: `https://<your-domain>/api/auth/callback/github`.
3. In Coolify set three variables:

   | variable               | value                                    |
   | ---------------------- | ---------------------------------------- |
   | `ALLOWED_HOSTS`        | `<your-domain>` — hostname only, no scheme, no path. Comma-separate several; `*.example.com` works. |
   | `GITHUB_CLIENT_ID`     | from the OAuth app                       |
   | `GITHUB_CLIENT_SECRET` | from the OAuth app                       |

`ALLOWED_HOSTS` is an allowlist, not a single value: the request's forwarded host is used when it matches an entry, otherwise the first entry is used as a fallback. Without it Better Auth has no absolute base URL and GitHub rejects the handshake with a relative `redirect_uri`.

## Restricting who can sign up

By default anyone who can reach the site can create an account. Set `ALLOWED_EMAILS` to a comma-separated allowlist to change that:

```
ALLOWED_EMAILS=me@example.com,someone@else.org,@mycompany.com
```

An entry is either a whole address or, with a leading `@`, a whole domain. Matching is case-insensitive. The check runs when a user record is created, so it covers GitHub sign-in and email sign-up alike; a rejected attempt writes no account, and a rejected GitHub handshake comes back to the login page with an explanation. Leaving the variable unset or empty allows everyone.

`ALLOWED_EMAILS` is the *root* list — the one only a redeploy can change. `src/lib/server/allowed-emails.ts` combines it with a second list, held in the `allowed_email` table and edited from `/admin/people`; the combined list is what the check uses.

Three things to know:

- It gates **account creation**, not sign-in. Accounts that already exist keep working, so removing an address from the list does not lock that person out — delete their row in the `user` table for that.
- The address comes from the provider. GitHub sends the account's primary email, which may differ from the one shown on their public profile.
- A root entry is also what makes someone an **administrator**, so put your own address there. See below.

## Administrators and passwords

Everyone with an account gets the whole of `/admin` — characters, uploads, share passwords. The exception is `/admin/people`, which hands out accounts and passwords and is open only to addresses written into `ALLOWED_EMAILS`. Someone invited from inside the app cannot invite anyone else.

With `ALLOWED_EMAILS` unset the allowlist is off, and *every* signed-in account is an administrator — fine for local development, not for a deployment.

There is no mail server here, so nothing sends a reset link:

- Anyone can change their own password at `/admin/account`, which needs the current one and signs them out of every other device. An account that has only ever signed in through GitHub can set a first password there instead, which turns on email sign-in for it.
- The administrator can set anyone else's password from `/admin/people` — typed or generated, shown once, and every session of theirs is dropped. That also works for a GitHub-only account, so a lost GitHub login is recoverable.

### Health

`GET /api/health` returns `200` with `{"status":"ok","database":"ok","uploads":"ok"}`, or `503` and the failing check's error message — which is what a misconfigured or unmounted volume looks like.

### Backups

The whole of `/data` is the backup: stop the container (or accept a WAL-consistent copy) and archive the directory, or point Coolify's scheduled backups at the volume.

## Notes

- The image builds without any secrets or database — env vars are read at runtime, so one image can be promoted between environments.
- `better-sqlite3` ships prebuilt Node-API binaries for linux x64/arm64, so nothing is compiled during the build. This is why the install steps run with `--ignore-scripts`.
- Local `.env` files are never copied into the image (see `.dockerignore`).
