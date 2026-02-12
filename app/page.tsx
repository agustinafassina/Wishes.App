// app/page.tsx
"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import Map from "../components/Map";
import ThemeToggle from "../components/ThemeToggle";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { marked } from "marked";
import { useToast } from "../components/ToastContext";
import { getApiErrorDisplay } from "../lib/api-error-display";
import { hapticLight } from "../lib/haptic";

/** Si el valor parece un email, devolvemos solo la parte antes del @ */
function beforeAt(value: string): string {
  const s = value.trim();
  return s.includes("@") ? s.split("@")[0].trim() : s;
}

function getDisplayName(user: { name?: string; given_name?: string; family_name?: string; nickname?: string; email?: string }) {
  const parts = [user.given_name, user.family_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (user.name?.trim()) return beforeAt(user.name);
  if (user.nickname?.trim()) return beforeAt(user.nickname);
  if (user.email?.trim() && user.email.includes("@")) return beforeAt(user.email);
  return "User";
}

export default function Home() {
  const toast = useToast();
  const { user, isLoading } = useUser();
  const contentRef = useRef<HTMLDivElement>(null);
  const manualPdfRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingManual, setIsExportingManual] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const displayName = user ? getDisplayName(user) : null;

  const scrollToSection = (id: string) => {
    hapticLight();
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!profileMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
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
    setProfileMenuOpen((open) => !open);
  };

  const handleBackup = async (format: "json" | "csv") => {
    setIsExportingBackup(true);
    try {
      const res = await fetch("/api/locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load data");
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : [];
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wishes-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded as JSON.");
      } else {
        const headers = ["name", "code", "latitude", "longitude", "status", "notes", "visitedAt", "tags", "flag"];
        const escapeCsv = (v: unknown) => {
          const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
          return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = list.map((row: Record<string, unknown>) =>
          headers.map((h) => escapeCsv(row[h])).join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wishes-backup-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded as CSV.");
      }
    } catch (error) {
      console.error("Backup error:", error);
      toast.error(getApiErrorDisplay(error, "Could not create backup."));
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExportManualPDF = async () => {
    if (isExportingManual) return;
    const container = manualPdfRef.current;
    if (!container) {
      toast.error("Error al preparar el manual.");
      return;
    }
    setIsExportingManual(true);
    try {
      const res = await fetch("/api/manual");
      if (!res.ok) throw new Error(`Manual no disponible (${res.status}).`);
      const markdown = await res.text();
      const html = await marked.parse(markdown);
      container.innerHTML = typeof html === "string" ? html : "";
      if (!container.innerHTML.trim()) throw new Error("El manual está vacío.");

      await new Promise((r) => setTimeout(r, 500));

      const scrollHeight = container.scrollHeight;
      const scrollWidth = container.scrollWidth;
      if (scrollHeight < 10 || scrollWidth < 10) {
        throw new Error("No se pudo renderizar el contenido del manual.");
      }

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: scrollWidth,
        height: scrollHeight,
        windowWidth: scrollWidth,
        windowHeight: scrollHeight,
      });

      container.innerHTML = "";

      if (canvas.width < 10 || canvas.height < 10) {
        throw new Error("La imagen del manual no se generó correctamente.");
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Manual-de-uso-Wishes-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      toast.success("Manual descargado como PDF.");
    } catch (error) {
      console.error("Error exporting manual PDF:", error);
      if (manualPdfRef.current) manualPdfRef.current.innerHTML = "";
      toast.error(getApiErrorDisplay(error, "No se pudo generar el PDF."));
    } finally {
      setIsExportingManual(false);
    }
  };

  const handleExportPDF = async () => {
    if (!contentRef.current || isExporting) return;

    setIsExporting(true);

    try {
      const infoWindows = document.querySelectorAll('[role="dialog"]');
      infoWindows.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0e1a',
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      infoWindows.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      const fileName = `Agustina-Fassina-Travel-List-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      const message = error instanceof Error ? error.message : 'An error occurred while exporting the PDF. Please try again.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-container">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="page-header">
        <div className="header-identity">
          <div className="logo-wrapper">
              {user?.picture ? (
                <img
                  className="logo"
                  src={user.picture}
                  alt={displayName ?? "Avatar"}
                  width={72}
                  height={72}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Image
                  className="logo"
                  src="/agus_animada.PNG"
                  alt="Avatar"
                  width={72}
                  height={72}
                  priority
                />
              )}
          </div>
          <div className="header-text">
            <h1 className="page-title">{displayName ?? "My travel bucket list"}</h1>
            <p className="header-tagline">
              <img src="https://flagcdn.com/w40/ar.png" alt="Argentina" className="header-flag" width={28} height={21} />
              <span>My travel bucket list</span>
            </p>
          </div>
        </div>
        <div className="header-travel-badge" aria-hidden>
          <svg className="header-travel-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="header-travel-label">Travels</span>
        </div>
      </header>

      <main id="main-content" className="main-content" ref={contentRef} tabIndex={-1}>
        <div className="content-section">
          <Map shareUserName={displayName ?? "User"} />
        </div>

        <div ref={manualPdfRef} className="manual-pdf-source" aria-hidden />
      </main>

      <footer className="bottom-bar" role="navigation" aria-label="App actions">
        <div className="bottom-bar-inner">
          <button
            type="button"
            className="bottom-bar-btn bottom-bar-btn-nav"
            onClick={() => scrollToSection("travel-map")}
            title="Go to map"
            aria-label="Go to travel map"
          >
            <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="bottom-bar-label">Map</span>
          </button>
          <button
            type="button"
            className="bottom-bar-btn bottom-bar-btn-nav"
            onClick={() => scrollToSection("country-list")}
            title="Go to list"
            aria-label="Go to country list"
          >
            <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span className="bottom-bar-label">List</span>
          </button>
          <span className="bottom-bar-divider" aria-hidden />
          <button
            type="button"
            className="bottom-bar-btn"
            title="Download user manual (PDF)"
            aria-label="Download user manual as PDF"
            onClick={handleExportManualPDF}
            disabled={isExportingManual}
          >
            {isExportingManual ? (
              <span className="bottom-bar-spinner" aria-hidden />
            ) : (
              <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span className="bottom-bar-label">{isExportingManual ? "…" : "Manual"}</span>
          </button>
          <ThemeToggle />
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className={`bottom-bar-btn bottom-bar-btn-profile ${profileMenuOpen ? "profile-menu-open" : ""}`}
              title="Profile and export options"
              aria-label="Profile and export options"
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
              onClick={handleProfileClick}
            >
              <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="bottom-bar-label">Profile</span>
            </button>
            {profileMenuOpen && (
              <div className="profile-menu" role="menu" aria-label="Export options">
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleExportPDF();
                  }}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <span className="profile-menu-spinner" aria-hidden />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span>{isExporting ? "Exporting…" : "Export PDF"}</span>
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleBackup("json");
                  }}
                  disabled={isExportingBackup}
                >
                  {isExportingBackup ? (
                    <span className="profile-menu-spinner" aria-hidden />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span>{isExportingBackup ? "Backing up…" : "Backup (JSON)"}</span>
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleBackup("csv");
                  }}
                  disabled={isExportingBackup}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </button>
              </div>
            )}
          </div>
          {isLoading ? (
            <span className="bottom-bar-btn bottom-bar-btn-placeholder" aria-hidden>
              <span className="bottom-bar-spinner" />
              <span className="bottom-bar-label">…</span>
            </span>
          ) : user ? (
            <a
              href="/auth/logout"
              className="bottom-bar-btn bottom-bar-btn-logout"
              title="Log out"
              aria-label="Log out"
            >
              <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="bottom-bar-label">Log out</span>
            </a>
          ) : (
            <a
              href="/auth/login"
              className="bottom-bar-btn bottom-bar-btn-login"
              title="Log in"
              aria-label="Log in"
            >
              <svg className="bottom-bar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className="bottom-bar-label">Log in</span>
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}