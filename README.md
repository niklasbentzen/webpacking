# Bikepacking Blog & Tracking Platform

<img width="1732" height="1169" alt="ui" src="https://github.com/user-attachments/assets/76c43b1d-d686-4a34-95cf-10dc0068df4f" />

## Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Frontend    | React 19, React Router 7                |
| Maps        | Leaflet + React Leaflet                 |
| Charts      | Recharts                                |
| Build tool  | Vite                                    |
| Backend     | PocketBase 0.26.6 (self-hosted, SQLite) |
| GPS parsing | fit-file-parser, @we-gold/gpxjs         |

## Getting Started


### Prerequisites

- Node.js ≥ 18
- PocketBase binary at `pocketbase/pocketbase` — download from [pocketbase.io](https://pocketbase.io/docs)

### Install & run

```bash
npm install
```

Start both servers in separate terminals:

```bash
npm run dev   # Frontend → http://localhost:5173
npm run pb    # PocketBase → http://localhost:8090
```

PocketBase admin UI is at `http://localhost:8090/_/`. On first run, create a superuser there before logging into the app.

### Environment

Create a `.env.local` file:

```
VITE_PB_URL=http://localhost:8090
```

### Build & deploy

```bash
git pull && npm install && npm run build
sudo systemctl restart pocketbase
sudo systemctl restart webpacking-web   # only needed if it isn't already running
```

`npm run build` writes straight to `./dist`. The `web` script
(`npm run web`, wired up as the `webpacking-web` systemd service) serves
that folder directly with [serve](https://www.npmjs.com/package/serve) on
port 8080 — there's no separate copy step, since it reads from disk on
every request. Only `pocketbase` needs restarting after a deploy.

### Production topology

This app runs across two Raspberry Pis:

- **bagpi** — runs this app. `pocketbase` serves the API on `:8090`
  (bound to `0.0.0.0` so the other Pi can reach it), and `serve` serves the
  built `dist/` folder on `:8080`. No nginx runs here.
- **The other Pi** — runs nginx, terminates `bagfra.cc`, and routes by
  path: `/api/` and `/_/` → `bagpi:8090`, everything else → `bagpi:8080`.
