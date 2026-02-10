"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "wishes-theme";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    const preferred = stored ?? "dark";
    setThemeState(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        <svg className="theme-toggle-icon theme-toggle-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3.5" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="6.36" y2="6.36" />
          <line x1="17.64" y1="17.64" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="6.36" y2="17.64" />
          <line x1="17.64" y1="6.36" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg className="theme-toggle-icon theme-toggle-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
