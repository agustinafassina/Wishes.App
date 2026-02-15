// app/page.tsx – Server Component: no "use client"; interactive UI lives in HomeClient.
import HomeClient from "@/components/HomeClient";

export default function Home() {
  return (
    <div className="page-container">
      <HomeClient />
    </div>
  );
}
