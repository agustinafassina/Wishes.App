// app/page.tsx
"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingManual, setIsExportingManual] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
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
        <div className="header-nav-left">
          <div className="hamburger-menu-wrap" ref={profileMenuRef}>
            <button
              ref={hamburgerButtonRef}
              type="button"
              className="header-icon-btn"
              onClick={handleProfileClick}
              title="Menu"
              aria-label="Menu"
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
            >
              <svg className="header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {profileMenuOpen && typeof document !== "undefined" && createPortal(
              <div
                ref={menuPortalRef}
                className="hamburger-menu-portal"
                style={{
                  position: 'fixed',
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                }}
                role="presentation"
              >
                <div className="hamburger-menu hamburger-menu--portal" role="menu" aria-label="App menu">
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => { setProfileMenuOpen(false); scrollToSection("travel-map"); }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>Map</span>
                </button>
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => { setProfileMenuOpen(false); scrollToSection("country-list"); }}
                >
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
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => { setProfileMenuOpen(false); handleExportManualPDF(); }}
                  disabled={isExportingManual}
                >
                  {isExportingManual ? (
                    <span className="profile-menu-spinner" aria-hidden />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  <span>{isExportingManual ? "…" : "Manual (PDF)"}</span>
                </button>
                <div className="hamburger-menu-theme-row">
                  <span className="hamburger-menu-theme-label">Theme</span>
                  <ThemeToggle />
                </div>
                <button
                  type="button"
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => { setProfileMenuOpen(false); handleExportPDF(); }}
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
                  onClick={() => { setProfileMenuOpen(false); handleBackup("json"); }}
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
                  onClick={() => { setProfileMenuOpen(false); handleBackup("csv"); }}
                  disabled={isExportingBackup}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>CSV</span>
                </button>
                {user ? (
                  <a
                    href="/auth/logout"
                    className="profile-menu-item profile-menu-item-logout"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                      <line x1="9" y1="21" x2="5" y2="21" />
                      <line x1="5" y1="21" x2="5" y2="3" />
                    </svg>
                    <span>Log out</span>
                  </a>
                ) : (
                  <a
                    href="/auth/login"
                    className="profile-menu-item profile-menu-item-login"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span>Log in</span>
                  </a>
                )}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
        <h1 className="header-title">Travel Tracker</h1>
        <div className="header-nav-right">
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => {
              hapticLight();
              scrollToSection("travel-map");
            }}
            title="Add country"
            aria-label="Add country"
          >
            <svg className="header-icon header-icon-plus" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <main id="main-content" className="main-content" ref={contentRef} tabIndex={-1}>
        <div className="content-section">
          <Map shareUserName={displayName ?? "User"} />
        </div>

        <div ref={manualPdfRef} className="manual-pdf-source" aria-hidden />
      </main>
    </div>
  );
}