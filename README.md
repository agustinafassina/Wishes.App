# ✈️ Wishes App - Personal Travel Bucket List
A modern web app to track countries you want to visit, are planning, or have already explored — with an interactive world map, progress stats, and per-user storage.

**Español:** [README_ES.md](./README_ES.md)

<p align="center">
  <img src="first-part.png" alt="Dashboard — stats, map, and list" width="480">
  <img src="second-part.png" alt="Country cards and progress" width="480">
</p>

## ✨ What it does
- **Countries & Cities** — switch between sections in the map chrome; cities carry a country `code` and optional city name
- **Interactive map** — Leaflet + CARTO tiles, markers by status (**Complete**, **Review**, **To Do**)
- **Unified filters** — pills (**All · Complete · Review · To Do**) filter both map and list for the active section
- **Place list** — card grid (up to 3 columns), A–Z / Z–A sort, search
- **Progress** — bar and milestones for **countries** when filtering **Complete** (share link or progress image); cities do not use the /195 bar
- **Per place** — change status via **Move to**, view/edit notes (visited), delete with confirmation
- **Add country / city** — from the map toolbar (or empty-state CTA); optional **Pick from map** for coordinates (Nominatim reverse-geocode)
- **Themes** — light and dark mode
- **Auth0** — each user has a private list; brand mark available for Universal Login

For step-by-step usage in Spanish, see [MANUAL_DE_USO.md](./MANUAL_DE_USO.md).

## 💾 How data is stored
There is no SQL/MongoDB database. After login, the app reads and writes a **JSON file per user** under `data/locations/users/` (filename derived from the Auth0 identity). This folder is **outside** `public/`, so files are never served as static URLs — only authenticated API routes can read/write them.

- Details: [data/locations/users/README.md](./data/locations/users/README.md)

API routes (`app/api/*`) handle create, update, delete, and loading locations for the signed-in user.

## 🏳️ Place object (country or city)
Each entry in the user JSON array can include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Place name (e.g. `"Italy"` or `"Rome"`). |
| `code` | string | Yes | ISO 3166-1 alpha-2 country code (e.g. `"IT"`). |
| `latitude` | number | Yes | Map marker latitude. |
| `longitude` | number | Yes | Map marker longitude. |
| `status` | string | Yes | `"done"`, `"in review"`, or `"pending"`. |
| `kind` | string | No | `"country"` (default if omitted) or `"city"`. |
| `flag` | string | No | Flag image URL (defaults via [flagcdn.com](https://flagcdn.com) from `code`). |
| `photos` | string[] | No | Photo URLs. |
| `notes` | string | No | Travel notes (typically when `status` is `"done"`). |
| `visitedAt` | string | No | Visit date or period (e.g. `"2024"`, `"April 2024"`). |
| `tags` | string[] | No | Tags (e.g. `["food", "history"]`). |
| `tag` | string | No | Legacy single tag; ignored if `tags` is set. |

**Uniqueness:** the pair `(code, name)` must be unique per user (same code with a different name is allowed, e.g. England vs Scotland).

Country example:

```json
{
  "name": "Italy",
  "code": "IT",
  "latitude": 41.8719,
  "longitude": 12.5674,
  "kind": "country",
  "flag": "https://flagcdn.com/w40/it.png",
  "status": "done",
  "notes": "Amazing trip.",
  "visitedAt": "April 2024",
  "tags": ["food", "history"]
}
```

City example:

```json
{
  "name": "Rome",
  "code": "IT",
  "latitude": 41.9028,
  "longitude": 12.4964,
  "kind": "city",
  "status": "done",
  "visitedAt": "2024"
}
```

## ✅ Features
| Area | Status |
|------|--------|
| Countries / Cities sections | Done |
| Leaflet + CARTO tiles + custom zoom | Done |
| Map pills filter map + list | Done |
| Pick coordinates from map (Nominatim) | Done |
| Add / update / delete places | Done |
| Notes & tags (visited) | Done |
| Light / dark theme | Done |
| Share link / progress image | Done |
| Auth0 login + brand assets | Done |
| Search + A–Z sort | Done |
| Progress milestones (10 / 25 / 50…) | Done |
| Export / import backup (JSON/CSV) | Planned |

## 📋 Requirements
- Node.js 18+
- Auth0 application (Regular Web Application)

## ⚙️ Environment setup
1. Copy the example env file:

```bash
cp .env.example .env
```

2. Set variables:

| Variable | Description |
|----------|-------------|
| `AUTH0_DOMAIN` | Auth0 tenant domain. |
| `AUTH0_CLIENT_ID` | Application Client ID. |
| `AUTH0_CLIENT_SECRET` | Application Client Secret. |
| `AUTH0_SECRET` | Random string ≥ 32 chars for session cookies (`openssl rand -hex 32`). |
| `APP_BASE_URL` | App URL (dev: `http://localhost:3000`; prod: `https://…`). No trailing slash. |

**Auth0 application URIs (development):**

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

Add the same URLs for production using your public host (see below).

**Auth0 Universal Login logo** (public URL, no auth required):

- Mark (triangle): `{APP_BASE_URL}/logo-mark.png`
- Full logo: `{APP_BASE_URL}/logo.jpeg`
- Favicon: `{APP_BASE_URL}/favicon.png`

Example `.env`:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=your_long_random_secret_at_least_32_chars
APP_BASE_URL=http://localhost:3000
```

### 🗺️ Map (Leaflet + CARTO)
No Maps API key. The map uses CARTO tiles (`light_all` / `dark_all`). **Pick from map** reverse-geocodes via Nominatim when available.

## 🚀 Install and run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other package managers: `yarn dev`, `pnpm dev`, `bun dev`.

```bash
npm run build
npm start
```

## 🐳 Docker
Default port **3000** (override with build arg or `PORT` env).

Auth0 env vars are required at **image build** time (`next build` constructs the Auth0 client) and again at **runtime**.

**Build** (pass the same values as in `.env`):

```bash
docker build -t wishes-app \
  --build-arg AUTH0_DOMAIN=your-tenant.us.auth0.com \
  --build-arg AUTH0_CLIENT_ID=your_client_id \
  --build-arg AUTH0_CLIENT_SECRET=your_client_secret \
  --build-arg AUTH0_SECRET=your_long_random_secret_at_least_32_chars \
  --build-arg APP_BASE_URL=http://localhost:3000 \
  .
```

`AUTH0_AUDIENCE` is accepted as an optional build-arg (usually empty for this app).

**Run:**

```bash
docker run -p 3000:3000 --env-file .env wishes-app
```

**Detached:**

```bash
docker run -d -p 3000:3000 --env-file .env --name wishes-app wishes-app
```

If you see `Error: Cannot find module '/app/wishes-app'`, you passed the image name as a command. Use only `docker run -p 3000:3000 wishes-app`.

**Other port (e.g. 8080):**

```bash
docker build --build-arg PORT=8080 -t wishes-app \
  --build-arg AUTH0_DOMAIN=... --build-arg AUTH0_CLIENT_ID=... \
  --build-arg AUTH0_CLIENT_SECRET=... --build-arg AUTH0_SECRET=... \
  --build-arg APP_BASE_URL=http://localhost:8080 .
docker run -p 8080:8080 -e PORT=8080 --env-file .env wishes-app
```

### 📁 Persist user JSON with a volume
Container filesystem is ephemeral. Mount host data so user lists survive rebuilds:

```bash
mkdir -p ./data/locations/users
docker run -d -p 3000:3000 --env-file .env \
  -v "$(pwd)/data/locations/users:/app/data/locations/users" \
  --name wishes-app wishes-app
```

Windows (PowerShell):

```powershell
docker run -d -p 3000:3000 --env-file .env -v "${PWD}\data\locations\users:/app/data/locations/users" --name wishes-app wishes-app
```

**Seed from a previous deploy (optional):** copy your backed-up JSON files into `./data/locations/users/` on the host before starting the container.

**Backup:** copy `./data/locations/users/` on the server. In-app export/import is planned.

### 🚢 Docker Hub
```bash
docker build -t YOUR_USER/wishes-app:latest .
docker login
docker push YOUR_USER/wishes-app:latest
```

## 🌐 Production deploy
Use a public `APP_BASE_URL` (no trailing slash), e.g. `https://yourdomain.com` or `http://IP:3000`.

| Variable | Production |
|----------|------------|
| `APP_BASE_URL` | Public URL users open in the browser |
| `AUTH0_*` | Same tenant; add production callback/logout URLs in Auth0 |

**Auth0 (production):**

- Allowed Callback URLs: `https://yourdomain.com/auth/callback`
- Allowed Logout URLs: `https://yourdomain.com`

Run with `--env-file .env` and the volume mount for `data/locations/users` if you need persistence.

## 🛠️ Tech stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **leaflet** / **react-leaflet** · **@auth0/nextjs-auth0**
- **html2canvas** (share image)
- **CSS** design tokens (`app/styles/_variables.css`, `_components.css`, `_responsive.css`) + Tailwind import in `globals.css`
- **next/font** (Poppins)

## 📂 Project structure
```
app/
  api/              # add-country, delete-country, locations, update-country, …
  styles/           # variables, components, responsive
  icon.png, apple-icon.png   # favicon / PWA icon (App Router)
  layout.tsx, page.tsx, globals.css
components/
  Map.tsx, HomeClient.tsx, …
  map/              # CountryListCard, TravelLeafletMap, modals, EmptyState, utils
hooks/              # useLocations, useCountryActions, …
lib/                # env, auth0, place-aggregation, place-validation, reverse-geocode, …
data/locations/users/   # private per-user JSON (gitignored *.json)
public/
  logo-mark.png, logo.jpeg, favicon.png   # static brand (Auth0 / UI)
  brand/            # original logo sources
```

## 📚 Related documentations
| File | Language | Purpose |
|------|----------|---------|
| [README_ES.md](./README_ES.md) | Spanish | This readme in Spanish |
| [MANUAL_DE_USO.md](./MANUAL_DE_USO.md) | Spanish | End-user guide |
| [app/api/README.md](./app/api/README.md) | English | Internal API contract |
| [Security-Checklist.md](./Security-Checklist.md) | Spanish | Security hardening checklist |
| [UXUI-CHECKLIST.md](./UXUI-CHECKLIST.md) | Spanish | UX/UI checklist |

## 🔧 Troubleshooting
| Issue | Check |
|-------|--------|
| Map blank | Network / CSP allowing CARTO tiles (`*.basemaps.cartocdn.com`) |
| Auth errors | Auth0 domain, client id/secret, callback/logout URLs, `AUTH0_SECRET` length |
| Data not saved | Write access to `data/locations/users/` (or Docker volume mount) |
| 401 / not logged in | Log in via Auth0; app requires a session |
| `docker build` fails on Auth0/env | Pass Auth0 / `APP_BASE_URL` as `--build-arg` (needed at build time) |

## 📄 License
By Agustina Fassina — personal project; use as reference for your own work.
