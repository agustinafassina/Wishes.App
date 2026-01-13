// app/page.tsx
"use client";

import Image from "next/image";
import Map from "../components/Map";

export default function Home() {
  return (
    <div className="page-container">
      <main className="main-content">
        <header className="page-header">
          <div className="header-content">
            <div className="logo-wrapper">
              <Image
                className="logo"
                src="/agus_animada.PNG"
                alt="Agus"
                width={120}
                height={120}
                priority
              />
            </div>
            <div className="header-text">
              <h1 className="page-title">Agustina Fassina</h1>
              <p className="page-subtitle">My travel bucket list and goals to achieve</p>
            </div>
          </div>
        </header>

        <div className="content-section">
          <Map />
        </div>
      </main>
    </div>
  );
}