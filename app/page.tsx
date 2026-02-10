// app/page.tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import Map from "../components/Map";
import ThemeToggle from "../components/ThemeToggle";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "../components/ToastContext";

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
  const [isExporting, setIsExporting] = useState(false);
  const displayName = user ? getDisplayName(user) : null;

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
      <main className="main-content" ref={contentRef}>
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
          <div className="header-actions">
            <ThemeToggle />
            {!isLoading &&
              (user ? (
                <a
                  href="/auth/logout"
                  className="header-btn header-btn-logout"
                  title="Log out"
                  aria-label="Log out"
                >
                  <svg className="header-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span className="header-btn-label">Log out</span>
                </a>
              ) : (
                <a
                  href="/auth/login"
                  className="header-btn header-btn-login"
                  title="Log in"
                  aria-label="Log in"
                >
                  <svg className="header-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span className="header-btn-label">Log in</span>
                </a>
              ))}
          </div>
        </header>

        <div className="content-section">
          <Map onExportPDF={handleExportPDF} isExporting={isExporting} shareUserName={displayName ?? "User"} />
        </div>
      </main>
    </div>
  );
}