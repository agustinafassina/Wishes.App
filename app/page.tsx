// app/page.tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Map from "../components/Map";
import ThemeToggle from "../components/ThemeToggle";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "../components/ToastContext";

export default function Home() {
  const toast = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleLogoutClick = () => {
    toast.success("Log out will be available when you add sign-in.");
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
      <main className="main-content" ref={contentRef}>
        <header className="page-header">
          <div className="header-identity">
            <div className="logo-wrapper">
              <Image
                className="logo"
                src="/agus_animada.PNG"
                alt="Agus"
                width={160}
                height={160}
                priority
              />
            </div>
            <div className="header-text">
              <h1 className="page-title">Agustina Fassina</h1>
              <p className="header-tagline">
                <img src="https://flagcdn.com/w40/ar.png" alt="Argentina" className="header-flag" width={28} height={21} />
                <span>My travel bucket list</span>
              </p>
            </div>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <button
              type="button"
              className="header-btn header-btn-logout"
              onClick={handleLogoutClick}
              title="Log out (coming soon)"
              aria-label="Log out"
            >
              <svg className="header-btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="header-btn-label">Log out</span>
            </button>
          </div>
        </header>

        <div className="content-section">
          <Map onExportPDF={handleExportPDF} isExporting={isExporting} shareUserName="Agustina Fassina" />
        </div>
      </main>
    </div>
  );
}