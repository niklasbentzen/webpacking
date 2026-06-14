# Bagfra — Bikepacking Blog & Tracking Platform

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
```
