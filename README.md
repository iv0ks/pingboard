# pingboard

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Node](https://img.shields.io/badge/Node-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
[![GHCR](https://img.shields.io/badge/ghcr.io-iv0ks%2Fpingboard-blue?logo=docker)](https://github.com/iv0ks/pingboard/pkgs/container/pingboard)

**pingboard is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw — a **write IDOR with mass assignment** — so you can practice finding and exploiting it in a safe and controlled environment.

<br>

<div align="center">

| 🛡️ Vulnerability | 🎯 Difficulty | 🛠️ Stack | 🚩 Entry point |
| :--- | :--- | :--- | :--- |
| Write IDOR + mass assignment (CWE-639) | ⭐⭐ Level 2 | Node · NestJS | `PATCH /api/users/:id` |

</div>

<br>

> [!NOTE]
> The guided, spoiler-free path is [GUIDE.md](GUIDE.md); the full answer waits in [SOLUTION.md](SOLUTION.md) whenever you want it.

<br>

## 📂 Project layout

The repository is organised so the vulnerable code is easy to find and reason
about. The **application** lives in `src/` (a small NestJS API plus a static
profile page), the **data layer** is Drizzle ORM over Postgres (`src/db/` +
`drizzle/` migrations), and the **tooling** around it (Docker, CI/CD, linters)
turns the lab into a production-shaped project. The challenge flag is never in
the repo — it is baked into the image and seeded into the victim's profile.

```
pingboard/
├── src/                      # the application (the bug lives here)
│   ├── main.ts               # bootstrap: session, validation pipe, static UI
│   ├── app.module.ts         # root module
│   ├── health.controller.ts  # GET /healthz → "ok"
│   ├── auth.ts               # password hashing
│   ├── config.ts             # env-backed configuration
│   ├── auth/
│   │   └── auth.controller.ts   # POST /api/login · /api/logout
│   ├── users/
│   │   ├── users.controller.ts  # the vulnerable PATCH /api/users/:id
│   │   ├── users.service.ts     # applyUpdate — spreads the whole payload
│   │   ├── dto.ts               # UpdateUserDto (deliberately permissive)
│   │   ├── auth.guard.ts        # session guard (no ownership check)
│   │   └── users.module.ts
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema (users + privilege fields)
│   │   ├── client.ts         # Postgres connection
│   │   ├── migrate.ts        # applies migrations on startup
│   │   └── seed.ts           # seeds users (flag on the victim's profile)
│   └── public/               # the profile UI (html/css/js)
├── drizzle/                  # generated SQL migrations
├── tests/                    # http smoke tests (vitest + supertest)
├── GUIDE.md                  # non-spoiler learning guide
├── SOLUTION.md               # exploit writeup + the fix (spoilers)
├── SECURITY.md               # security policy (it's a lab — read before reporting)
├── .github/workflows/        # integration · delivery · security · release
├── Dockerfile                # hardened multi-stage image (node:26-slim)
├── docker-compose.yml        # postgres + pingboard + traefik stack
├── docker-entrypoint.sh      # migrates + seeds, then starts the app
└── .env.example              # DB creds, session secret, flag, Traefik ACME
```

The flag is **not** in the repo: the `Dockerfile` bakes it in via a build arg
and the seed writes it into the victim's private profile note.

<br>

## 🚀 The Lab

The lab ships as a Docker Compose stack with three services:

- **`postgres`** — Postgres 16. The app waits until it is *healthy* before migrating.
- **`pingboard`** — the API + profile UI, published on port `3000`.
- **`traefik`** — an optional reverse proxy for HTTPS on a real hostname.

Because the stack attaches to an **external** Docker network (`iv0ks-dev`),
create it once before the first run:

```bash
docker network create iv0ks-dev
```

<br>

#### Option A — app + database (quickest)

Build and start the database and the app (Compose skips `traefik` when you name
services explicitly):

```bash
docker compose up -d --build postgres pingboard
```

The entrypoint migrates the schema and seeds the data automatically, so the app
is ready at:

- **<http://localhost:3000>**

Sign in with the seeded demo account **`alice` / `password123`**. That is all
you need to start playing with Burp Suite.

<br>

#### Option B — full stack with Traefik (HTTPS + hostname)

Bring up everything to also expose the app through Traefik with TLS:

```bash
docker compose up -d --build
```

Now the _same_ app is reachable two ways at once:

- **<http://localhost:3000>** — direct, no TLS (handy for quick testing).
- **<https://pingboard.iv0ks.dev>** — proxied by Traefik with a real certificate.

Traefik routing is defined in `tools/traefik/`. TLS uses the ACME DNS-01
challenge via Namecheap, so Traefik needs those API credentials — copy
`.env.example` to `.env` and fill them in (the `.env` file is gitignored). The
dashboard is at `https://traefik.iv0ks.dev`.

<br>

> [!CAUTION]
> The `pingboard.iv0ks.dev` hostname must resolve to the host running the stack.
> For purely local experiments, Option A (localhost) is simpler and needs no
> DNS or certificates.

<br>

## 🎯 The Challenge

### The Scenario

pingboard is a small social network. You sign in as **alice** and you get a
profile page where you can edit your display name, bio and location — your own
profile, nothing else. Saving your changes fires a `PATCH` to the API with your
user id in the URL. A normal user only ever edits their own profile through that
page. You're going to prove that boundary is an illusion — in *both* directions.

### Your objective

Reach another user's account through the profile-update endpoint and capture the
flag hidden in that user's private note — then, for good measure, grant yourself
a privilege the form never offered you.

> [!NOTE]
> The flag has the format `FLAG{...}`.

### The rules

Everything happens over HTTP against the running app — no need to read the
source to win (though you can). The flag is **not** in the repo: it lives in
another user's private field in the database, reachable only by breaking access
control on the running app.

> [!TIP]
> For the full method, the **[Learning Guide](GUIDE.md)** walks you through it.

<br>

## ⚖️ Legal / ethics

This is an **educational, deliberately vulnerable** lab. Run it only locally, on
owned, isolated infrastructure (Docker). Never deploy it publicly, and never use
these techniques against systems without explicit written authorization.
