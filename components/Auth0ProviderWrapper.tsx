"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";

export default function Auth0ProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Auth0Provider>{children}</Auth0Provider>;
}
