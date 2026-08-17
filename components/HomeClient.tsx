"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@auth0/nextjs-auth0";
import Map from "./Map";
import ThemeToggle from "./ThemeToggle";
import { hapticLight } from "@/lib/haptic";
import { getDisplayName } from "@/lib/user-display-name";
import { APP_VERSION } from "@/lib/app-version";
import type { TravelSection } from "@/types/country";

export default function HomeClient() {
  const { user } = useUser();
  const contentRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [section, setSection] = useState<TravelSection>("countries");
  const displayName = user ? getDisplayName(user) : null;

  const scrollToSection = (id: string) => {
    hapticLight();
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useLayoutEffect(() => {
    if (!profileMenuOpen || !hamburgerButtonRef.current || typeof document === "undefined") return;
    const rect = hamburgerButtonRef.current.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 8, left: rect.left });
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const inButton = profileMenuRef.current?.contains(target);
      const inMenu = menuPortalRef.current?.contains(target);
      if (!inButton && !inMenu) setProfileMenuOpen(false);
    };
    document.addEventListener("click", close, true);
    document.addEventListener("touchstart", close, true);
    return () => {
      document.removeEventListener("click", close, true);
      document.removeEventListener("touchstart", close, true);
    };
  }, [profileMenuOpen]);

  const handleProfileClick = () => {
    hapticLight();
    if (!profileMenuOpen && hamburgerButtonRef.current) {
      const rect = hamburgerButtonRef.current.getBoundingClientRect();
      setMenuPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setProfileMenuOpen((open) => !open);
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="page-header">
        <div className="header-nav-left">
          <div className="hamburger-menu-wrap" ref={profileMenuRef}>
            <button
              ref={hamburgerButtonRef}
              type="button"
              className={`header-icon-btn ${user?.picture ? "header-icon-btn--avatar" : ""}`}
              onClick={handleProfileClick}
              title="Menu"
              aria-label="Menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
            >
              {user?.picture ? (
                <img src={user.picture} alt="" className="header-avatar" width={44} height={44} />
              ) : (
                <svg className="header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
            {profileMenuOpen &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={menuPortalRef}
                  className="hamburger-menu-portal"
                  style={{ position: "fixed", top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                  role="presentation"
                >
                  <div className="hamburger-menu hamburger-menu--portal" role="menu" aria-label="App menu">
                    <div className="hamburger-menu-user-header" aria-hidden>
                      <p className="hamburger-menu-welcome">Welcome</p>
                      <p className="hamburger-menu-user-name">{displayName ?? "Guest"}</p>
                    </div>
                    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); scrollToSection("travel-map"); }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>Map</span>
                    </button>
                    <button type="button" className="profile-menu-item" role="menuitem" onClick={() => { setProfileMenuOpen(false); scrollToSection("country-list"); }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      <span>List</span>
                    </button>
                    <div className="hamburger-menu-theme-row">
                      <span className="hamburger-menu-theme-label">Theme</span>
                      <ThemeToggle />
                    </div>
                    {user ? (
                      <a href="/auth/logout" className="profile-menu-item profile-menu-item-logout" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                          <line x1="9" y1="21" x2="5" y2="21" />
                          <line x1="5" y1="21" x2="5" y2="3" />
                        </svg>
                        <span>Log out</span>
                      </a>
                    ) : (
                      <a href="/auth/login" className="profile-menu-item profile-menu-item-login" role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        <span>Log in</span>
                      </a>
                    )}
                    <p className="hamburger-menu-version" aria-label={`App version ${APP_VERSION}`}>
                      v{APP_VERSION}
                    </p>
                  </div>
                </div>,
                document.body
              )}
          </div>
        </div>
        <h1 className="header-title">My Travel Track</h1>
        <div className="header-nav-right" aria-hidden="true" />
      </header>

      <main id="main-content" className="main-content" ref={contentRef} tabIndex={-1}>
        <div className="content-section">
          <div className="travel-section-switch" role="tablist" aria-label="Travel section">
            <button
              type="button"
              role="tab"
              className={`travel-section-switch-btn${section === "countries" ? " is-active" : ""}`}
              aria-selected={section === "countries"}
              onClick={() => {
                hapticLight();
                setSection("countries");
              }}
            >
              Countries
            </button>
            <button
              type="button"
              role="tab"
              className={`travel-section-switch-btn${section === "cities" ? " is-active" : ""}`}
              aria-selected={section === "cities"}
              onClick={() => {
                hapticLight();
                setSection("cities");
              }}
            >
              Cities
            </button>
          </div>
          <Map section={section} shareUserName={displayName ?? "User"} />
        </div>
      </main>
    </>
  );
}
