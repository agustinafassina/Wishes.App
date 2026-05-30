

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


const RAW_GOOGLE_MAPS = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

if (!RAW_GOOGLE_MAPS) {
  throw new Error(
    "[env] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing or empty. " +
      "Add it to .env (see .env.example). The map will not work without it."
  );
}

export const env = {

  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: RAW_GOOGLE_MAPS,
} as const;


if (typeof window === "undefined") {
  getServerEnv();
}
