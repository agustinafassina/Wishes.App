/**
 * Validated environment variables. Ensures missing required vars fail at build or
 * first request instead of later at runtime.
 *
 * - Server-only: use getServerEnv() from API routes, middleware, or server code.
 *   Validation runs when this module is first imported on the server.
 * - Client-safe: use `env` from any component. NEXT_PUBLIC_* are validated at
 *   module load and throw if missing so the build fails fast.
 *
 * See .env.example for required variable names.
 */

const REQUIRED_SERVER = [
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
] as const;

function getMissing(keys: readonly string[]): string[] {
  return keys.filter((key) => {
    const v = process.env[key];
    return v === undefined || (typeof v === "string" && v.trim() === "");
  });
}

export type ServerEnv = {
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_SECRET: string;
  APP_BASE_URL: string;
};

let serverEnvCache: ServerEnv | null = null;

/**
 * Use from server code only (API routes, middleware, server components).
 * Throws on first call if any required server env var is missing.
 */
export function getServerEnv(): ServerEnv {
  if (serverEnvCache) return serverEnvCache;
  const missingKeys = getMissing(REQUIRED_SERVER);
  if (missingKeys.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missingKeys.join(", ")}. ` +
        "Add them to .env (see .env.example)."
    );
  }
  serverEnvCache = {
    AUTH0_DOMAIN: process.env.AUTH0_DOMAIN!,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID!,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET!,
    AUTH0_SECRET: process.env.AUTH0_SECRET!,
    APP_BASE_URL: process.env.APP_BASE_URL!,
  };
  return serverEnvCache;
}

// --- Public env (safe in client components). Fail fast if missing. ---
const RAW_GOOGLE_MAPS = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

if (!RAW_GOOGLE_MAPS) {
  throw new Error(
    "[env] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing or empty. " +
      "Add it to .env (see .env.example). The map will not work without it."
  );
}

export const env = {
  /** Google Maps API key. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env. */
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: RAW_GOOGLE_MAPS,
} as const;

// Validate server env when this module is loaded on the server (build or first request).
if (typeof window === "undefined") {
  getServerEnv();
}
