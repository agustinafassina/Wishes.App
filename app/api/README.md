# Travel Track API
Internal REST API for the Travel Track app. All endpoints that manage locations require an authenticated user (Auth0 session). This README documents the contract so the frontend and any future backend (e.g. database-backed) can stay aligned.

---

## Authentication
- **Locations** (`GET /api/locations`, `POST /api/add-country`, etc.): require a valid Auth0 session (cookie). If not authenticated, responses are `401 Unauthorized` with body `{ "error": "Unauthorized" }`.
- **Manual** (`GET /api/manual`): no auth; returns the usage manual as markdown.

---

## Conventions
- **Base path:** `/api`
- **Content-Type:** request body is `application/json` for POST; responses are `application/json` unless stated otherwise.
- **Errors:** error responses use a single key `error` (string) with a human-readable message. Optional future fields (e.g. `code`) can be added without breaking this contract.

---

## Endpoints
### GET `/api/locations`
Returns the list of places (countries and cities) for the current user.
| Aspect | Details |
|--------|--------|
| Auth | Required |
| Request | None (no body) |
| Success | `200` – body is an **array of [Place](#place-country)** |
| Empty list | `200` with `[]` if the user has no locations yet |
| Error | `401` – not logged in. `500` – `{ "error": "Failed to load locations" }` |

### POST `/api/add-country`
Creates a new place (country or city) for the current user. Duplicate is identified by the pair `(code, name)` (same code with different name, e.g. England vs Scotland, or France vs Paris, is allowed).

| Aspect | Details |
|--------|--------|
| Auth | Required |
| Request body | JSON, see [Add place body](#add-place-request-body) |
| Success | `200` – `{ "success": true, "message": string, "country": Place }` |
| Error | `400` – validation (missing fields, invalid status/`kind`, duplicate). `401` – not logged in. `429` – rate limited. `500` – `{ "error": "Failed to add country" }` |

#### Add place request body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Place name (e.g. "Italy", "Rome", "Scotland") |
| `code` | string | Yes | ISO 2-letter **country** code (e.g. "IT", "GB") |
| `latitude` | number | Yes | Latitude for the map |
| `longitude` | number | Yes | Longitude for the map |
| `status` | string | Yes | One of: `"done"`, `"in review"`, `"pending"` |
| `kind` | string | No | `"country"` (default if omitted) or `"city"` |
| `flag` | string | No | Flag image URL; if omitted, a default (e.g. flagcdn) is used |
| `photos` | string[] | No | Array of photo URLs; default `[]` |

### POST `/api/update-country`
Updates the **status** of an existing place. Identified by `(countryCode, countryName)`.

| Aspect | Details |
|--------|--------|
| Auth | Required |
| Request body | `{ "countryCode": string, "countryName": string, "newStatus": string }` – `newStatus` must be `"done"`, `"in review"`, or `"pending"` |
| Success | `200` – `{ "success": true, "message": string, "country": Place }` |
| Error | `400` – missing fields or invalid status. `401` – not logged in. `404` – place not found or user locations file not found. `429` – rate limited. `500` – `{ "error": "Failed to update country status" }` |

### POST `/api/update-country-notes`
Updates `notes`, `visitedAt`, and/or `tags` of an existing place. Identified by `(countryCode, countryName)`.

| Aspect | Details |
|--------|--------|
| Auth | Required |
| Request body | `{ "countryCode": string, "countryName": string, "notes"?: string, "visitedAt"?: string, "tags"?: string[] }` – at least one of `notes`, `visitedAt`, `tags` is typically sent |
| Success | `200` – `{ "success": true, "message": "Notes updated", "country": Place }` |
| Error | `400` – missing countryCode or countryName. `401` – not logged in. `404` – place not found or user locations file not found. `429` – rate limited. `500` – `{ "error": "Failed to update notes" }` |

### POST `/api/delete-country`
Deletes a place for the current user. Identified by `(countryCode, countryName)`.

| Aspect | Details |
|--------|--------|
| Auth | Required |
| Request body | `{ "countryCode": string, "countryName": string }` |
| Success | `200` – `{ "success": true, "message": string }` (e.g. "Country X deleted" / "City X deleted") |
| Error | `400` – missing countryCode or countryName. `401` – not logged in. `404` – place not found or user locations file not found. `429` – rate limited. `500` – `{ "error": "Failed to delete country" }` |

### GET `/api/manual`
Returns the usage manual as plain markdown. No authentication.

| Aspect | Details |
|--------|--------|
| Auth | Not required |
| Request | None |
| Success | `200` – body is **plain text** (markdown). Header `Content-Type: text/markdown; charset=utf-8`, optional `Content-Disposition` for download filename |
| Error | `404` – `{ "error": "Manual not found" }` |

## Types (response contract)

### Place (Country)
Used in list responses and in success bodies for add/update. Response key remains `country` for backwards compatibility.
```ts
{
  name: string;
  code: string;           // e.g. "IT", "GB" (country ISO code)
  latitude: number;
  longitude: number;
  status: "done" | "in review" | "pending";
  kind?: "country" | "city";  // omitted or "country" = country; "city" = city
  flag?: string;          // optional URL
  photos?: string[];
  notes?: string;
  visitedAt?: string;
  tags?: string[];
  tag?: string;           // deprecated, prefer tags
}
```

**Uniqueness:** `(code, name)` per user. Completing a city may sync the related country row to `done` when that country already exists.

## Future migration (e.g. database)
When moving to a database-backed API:
- Keep the **same paths and HTTP methods** and the **same response shapes** (array of places, `{ success, message, country }`, `{ error }`) so the frontend keeps working.
- Request bodies can stay as documented; only the implementation (file vs DB) changes.
- Optional: add stable **ids** (e.g. `id: string`) to Place and use `id` in update/delete in addition to or instead of `(countryCode, countryName)`; document the new contract here.