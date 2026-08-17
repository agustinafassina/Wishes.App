import { Auth0Client } from "@auth0/nextjs-auth0/server";

const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "";
const isHttpsApp = appBaseUrl.startsWith("https://");

export const auth0 = new Auth0Client({
  session: {
    cookie: {
      sameSite: "lax",
      secure: isHttpsApp,
    },
  },
});
