// app/page.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import Map from "../components/Map";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Home() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

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
      alert('An error occurred while exporting the PDF. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <main className="main-content" ref={contentRef}>
        <header className="page-header">
          <div className="header-content">
            <div className="logo-wrapper">
              <Image
                className="logo"
                src="/agus_animada.PNG"
                alt="Agus"
                width={110}
                height={110}
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
          <div className="export-pdf-container">
            <button 
              className="btn-export-pdf"
              onClick={handleExportPDF}
              aria-label="Export to PDF"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}