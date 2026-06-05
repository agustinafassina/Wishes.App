# ✈️ Wishes App — Personal Travel Bucket List
A modern web app to track countries you want to visit, are planning, or have already explored — with an interactive world map, progress stats, and per-user storage.

**Español:** [README_ES.md](./README_ES.md)

<p align="center">
  <img src="first-part.png" alt="Dashboard — stats, map, and list" width="480">
  <img src="second-part.png" alt="Country cards and progress" width="480">
</p>

## ✨ What it does
- **Stats** — counts for visited, in review, and to visit
- **Quick actions** — share progress, jump to the list
- **World map** — Google Maps markers by status; filters synced with list tabs (**Complete**, **Review**, **To Do**)
- **Country list** — tabbed grid (up to 3 columns), search within the active tab, progress bar on **Complete**
- **Per country** — move status via **Move to**, view/edit notes (visited countries), delete with confirmation
- **Share & export** — share link or progress image; PDF snapshot; full backup as JSON or CSV
- **Themes** — light and dark mode
- **Auth0** — each user has a private list

For step-by-step usage in Spanish, see [MANUAL_DE_USO.md](./MANUAL_DE_USO.md).

## 💾 How data is stored
There is no SQL/MongoDB database. After login, the app reads and writes a **JSON file per user** under `public/locations/users/` (filename derived from the Auth0 identity, e.g. `agustinafassina_gmail_com.json`).

- Sample / legacy data: `public/locations/web_locations.json`
- Details: [public/locations/users/README.md](./public/locations/users/README.md)

API routes (`app/api/*`) handle create, update, delete, and loading locations for the signed-in user.

## 🏳️ Country object
Each entry in the user JSON array can include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Country name (e.g. `"Italy"`). |
| `code` | string | Yes | ISO 3166-1 alpha-2 (e.g. `"IT"`). Must be unique per user list. |
| `latitude` | number | Yes | Map marker latitude. |
| `longitude` | number | Yes | Map marker longitude. |
| `status` | string | Yes | `"done"`, `"in review"`, or `"pending"`. |
| `flag` | string | No | Flag image URL (defaults via [flagcdn.com](https://flagcdn.com) from `code`). |
| `photos` | string[] | No | Photo URLs. |
| `notes` | string | No | Travel notes (typically when `status` is `"done"`). |
| `visitedAt` | string | No | Visit date or period (e.g. `"2024"`, `"April 2024"`). |
| `tags` | string[] | No | Tags (e.g. `["food", "history"]`). |
| `tag` | string | No | Legacy single tag; ignored if `tags` is set. |

Example:

```json
{
  "name": "Italy",
  "code": "IT",
  "latitude": 41.8719,
  "longitude": 12.5674,
  "flag": "https://flagcdn.com/w40/it.png",
  "status": "done",
  "notes": "Amazing trip.",
  "visitedAt": "April 2024",
  "tags": ["food", "history"]
}
```

## ✅ Features
| Area | Status |
|------|--------|
| Google Maps + custom zoom | Done |
| Map filters ↔ list tabs | Done |
| Pick coordinates from map | Done |
| Add / update / delete countries | Done |
| Notes & tags (visited) | Done |
| Light / dark theme | Done |
| Export PDF | Done |
| Export JSON / CSV backup | Done |
| Auth0 login | Done |
| Search (within active tab) | Done |
| Import backup from UI | Planned |

## 📋 Requirements
- Node.js 18+
- Google Maps API key
- Auth0 application (Regular Web Application)

## ⚙️ Environment setup
1. Copy the example env file:

```bash
cp .env.example .env
```

2. Set variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (client). |
| `AUTH0_DOMAIN` | Auth0 tenant domain. |
| `AUTH0_CLIENT_ID` | Application Client ID. |
| `AUTH0_CLIENT_SECRET` | Application Client Secret. |
| `AUTH0_SECRET` | Random string ≥ 32 chars for session cookies (`openssl rand -hex 32`). |
| `APP_BASE_URL` | App URL (dev: `http://localhost:3000`). |

**Auth0 application URIs (development):**

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

Add the same URLs for production using your public host (see below).

Example `.env`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=your_long_random_secret_at_least_32_chars
APP_BASE_URL=http://localhost:3000
```

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

**Build:**

```bash
docker build -t wishes-app .
```

**Run:**

```bash
docker run -p 3000:3000 --env-file .env wishes-app
```

**Detached:**

```bash
docker run -d -p 3000:3000 --env-file .env --name wishes-app wishes-app
```

If you see `Error: Cannot find module '/app/wishes-app'`, you passed the image name as a command. Use only `docker run -p 3000:3000 wishes-app`.

### 📁 Persist user JSON with a volume
Container filesystem is ephemeral. Mount host data so user lists survive rebuilds:

```bash
mkdir -p ./data/locations-users
docker run -d -p 3000:3000 --env-file .env \
  -v "$(pwd)/data/locations-users:/app/public/locations/users" \
  --name wishes-app wishes-app
```

Windows (PowerShell):

```powershell
docker run -d -p 3000:3000 --env-file .env -v "${PWD}\data\locations-users:/app/public/locations/users" --name wishes-app wishes-app
```

**Seed from image (first deploy on a new server):**

```bash
docker create --name wishes-app-seed YOUR_USER/wishes-app:latest
docker cp wishes-app-seed:/app/public/locations/users/. ./data/locations-users/
docker rm wishes-app-seed
```

**Backup:** use **Export data** in the app (JSON/CSV) or copy `./data/locations-users/` on the server.

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

Run with `--env-file .env` and the volume mount for `public/locations/users` if you need persistence.

## 🛠️ Tech stack
- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **@react-google-maps/api** · **@auth0/nextjs-auth0**
- **jspdf** · **html2canvas** (export / share)
- **CSS** design tokens (`app/styles/_variables.css`, `_components.css`, `_responsive.css`) + Tailwind import in `globals.css`
- **next/font** (Poppins)

## 📂 Project structure
```
app/
  api/              # add-country, delete-country, locations, update-country, …
  styles/           # variables, components, responsive
  layout.tsx, page.tsx, globals.css
components/
  Map.tsx, HomeClient.tsx, …
  map/              # CountryListCard, modals, EmptyState, utils
hooks/              # useLocations, useCountryActions, …
lib/                # env, auth0, haptic, fonts
public/locations/
  web_locations.json    # sample / legacy
  users/*.json          # one file per Auth0 user
```

## 📚 Related docs
| File | Language | Purpose |
|------|----------|---------|
| [README_ES.md](./README_ES.md) | Spanish | This readme in Spanish |
| [MANUAL_DE_USO.md](./MANUAL_DE_USO.md) | Spanish | End-user guide |
| [MEDIUM.md](./MEDIUM.md) | English | Build story / Cursor notes |

## 🔧 Troubleshooting
| Issue | Check |
|-------|--------|
| Map blank | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, Maps API enabled in Google Cloud |
| Auth errors | Auth0 domain, client id/secret, callback/logout URLs, `AUTH0_SECRET` length |
| Data not saved | Write access to `public/locations/users/` (or Docker volume mount) |
| 401 / not logged in | Log in via Auth0; app requires a session |

## 📄 License
By Agustina Fassina — personal project; use as reference for your own work.
