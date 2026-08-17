# Per-user locations (private)

User travel lists are stored here as one JSON file per Auth0 identity.
This directory is **not** under `public/`, so files are never served as static assets.
The app reads/writes them only through authenticated API routes (`/api/locations`, etc.).

## Filename convention

Derived from Auth0 `email`, else `nickname`, else `sub`:

- Email: `@` and `.` → `_`  
  Example: `user@gmail.com` → `user_gmail_com.json`
- Other ids: sanitized to `[a-z0-9_-]`

## Structure

Each file is a JSON array of places (countries and/or cities), same shape as historically used in the app (`name`, `code`, `latitude`, `longitude`, `status`, optional `kind`, `flag`, notes, etc.).

## Local / Docker

- Dev: files appear here automatically when users save data.
- Docker: mount a host folder onto `/app/data/locations/users` (see README).
- `*.json` files are gitignored — do not commit real user data.
