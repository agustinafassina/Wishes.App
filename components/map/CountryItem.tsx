"use client";

import { useEffect, useRef, useState } from 'react';
import type { CountryLocation } from '@/types/country';
import { normalizeTags, STATUS_OPTIONS } from './utils';

interface CountryItemProps {
  location: CountryLocation;
  status: string;
  onRequestDelete: (loc: CountryLocation) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  onMoveToStatus?: (loc: CountryLocation, newStatus: string) => void;
  isDeleting?: boolean;
}

export default function CountryItem({
  location,
  status,
  onRequestDelete,
  onEditNotes,
  onViewNotes,
  onMoveToStatus,
  isDeleting,
}: CountryItemProps) {
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moveMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (moveMenuRef.current && !moveMenuRef.current.contains(target)) setMoveMenuOpen(false);
    };
    document.addEventListener('click', close, true);
    document.addEventListener('touchstart', close, true);
    return () => {
      document.removeEventListener('click', close, true);
      document.removeEventListener('touchstart', close, true);
    };
  }, [moveMenuOpen]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) setMoreMenuOpen(false);
    };
    document.addEventListener('click', close, true);
    document.addEventListener('touchstart', close, true);
    return () => {
      document.removeEventListener('click', close, true);
      document.removeEventListener('touchstart', close, true);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) setPopoverOpen(false);
    };
    document.addEventListener('click', close, true);
    document.addEventListener('touchstart', close, true);
    return () => {
      document.removeEventListener('click', close, true);
      document.removeEventListener('touchstart', close, true);
    };
  }, [popoverOpen]);

  const statusClass = status.replace(/\s+/g, '-');
  const isDone = status === 'done';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    onRequestDelete(location);
  };

  const handleEditNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEditNotes?.(location);
  };

  const handleViewNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onViewNotes?.(location);
  };

  const notesPreview = location.notes?.trim()
    ? location.notes.trim().length > 80
      ? `${location.notes.trim().slice(0, 80)}…`
      : location.notes.trim()
    : null;
  const tooltipLines: { text: string; className?: string }[] = [];
  const locationTags = normalizeTags(location);
  if (isDone) {
    if (location.visitedAt?.trim()) tooltipLines.push({ text: `Visited in ${location.visitedAt.trim()}` });
    if (notesPreview) tooltipLines.push({ text: notesPreview, className: 'country-item-tooltip-notes' });
    if (tooltipLines.length === 0 && locationTags.length === 0) tooltipLines.push({ text: 'No notes yet' });
  } else {
    tooltipLines.push({ text: status === 'in review' ? 'In review' : 'Pending' });
  }

  return (
    <div className={`country-item country-item-${statusClass} ${isDeleting ? 'item-deleting' : ''}`}>
      {isDeleting && (
        <div className="country-item-deleting-overlay" aria-hidden>
          <span className="country-item-deleting-spinner" />
          <span>Deleting...</span>
        </div>
      )}
      <div className="country-item-info-wrap" ref={popoverRef}>
        <div
          className={`country-item-tooltip ${popoverOpen ? 'country-item-tooltip-open' : ''}`}
          role="tooltip"
          id={`country-item-tooltip-${location.id}`}
        >
          {locationTags.length > 0 && (
            <div className="country-item-tooltip-tags">
              {locationTags.map((t, i) => (
                <span key={i} className="country-item-tooltip-tag-pill">
                  <svg className="country-item-tooltip-tag-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          )}
          {tooltipLines.map((line, i) => (
            <span key={i} className={`country-item-tooltip-line ${line.className ?? ''}`.trim()}>{line.text}</span>
          ))}
        </div>
        <div className="country-item-text">
          {location.flag && <img src={location.flag} alt="" className="country-flag" />}
          <button
            type="button"
            className="country-item-info-trigger"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPopoverOpen((o) => !o); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-expanded={popoverOpen}
            aria-label={`Show details for ${location.name}`}
            aria-describedby={popoverOpen ? `country-item-tooltip-${location.id}` : undefined}
          >
            <span className="country-name">{location.name}</span>
            <span className="country-item-info-icon" aria-hidden>i</span>
          </button>
        </div>
      </div>
      <div className="country-item-actions">
        <div className="country-item-actions-inline">
          {isDone && onViewNotes && (
            <button
              type="button"
              className="country-item-view-btn"
              onClick={handleViewNotesClick}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`View notes: ${location.name}`}
              title="View notes and visit date"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          {isDone && onEditNotes && (
            <button
              type="button"
              className="country-item-notes-btn"
              onClick={handleEditNotesClick}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Edit notes: ${location.name}`}
              title="Edit notes and visit date"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onMoveToStatus && (
            <div className="country-item-move-wrap" ref={moveMenuRef}>
              <button
                type="button"
                className={`country-item-move-btn ${moveMenuOpen ? 'country-item-move-btn-open' : ''}`}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoveMenuOpen((o) => !o); }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`Move ${location.name} to another list`}
                aria-expanded={moveMenuOpen}
                aria-haspopup="true"
                title="Move to another list"
              >
                <svg className="country-item-move-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 17L17 7" />
                  <path d="M17 7H7V17" />
                </svg>
              </button>
              {moveMenuOpen && (
                <div className="country-item-move-menu" role="menu">
                  <p className="country-item-move-menu-title">Move to</p>
                  {STATUS_OPTIONS.filter((opt) => opt.id !== status).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitem"
                      className={`country-item-move-menu-item country-item-move-menu-item--${opt.id.replace(/\s+/g, '-')}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onMoveToStatus(location, opt.id);
                        setMoveMenuOpen(false);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <span className="country-item-move-menu-dot" aria-hidden />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="country-item-delete-btn"
            onClick={handleDeleteClick}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Delete ${location.name}`}
            title="Delete country"
            disabled={isDeleting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
        <div className="country-item-more-wrap" ref={moreMenuRef}>
          <button
            type="button"
            className={`country-item-more-btn ${moreMenuOpen ? 'country-item-more-btn-open' : ''}`}
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoreMenuOpen((o) => !o); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`More actions for ${location.name}`}
            aria-expanded={moreMenuOpen}
            aria-haspopup="true"
            title="More actions"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {moreMenuOpen && (
            <div className="country-item-more-menu" role="menu">
              {isDone && onViewNotes && (
                <button
                  type="button"
                  role="menuitem"
                  className="country-item-more-menu-item country-item-more-menu-item--view"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoreMenuOpen(false); handleViewNotesClick(e as unknown as React.MouseEvent); }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View notes
                </button>
              )}
              {isDone && onEditNotes && (
                <button
                  type="button"
                  role="menuitem"
                  className="country-item-more-menu-item country-item-more-menu-item--edit"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoreMenuOpen(false); handleEditNotesClick(e as unknown as React.MouseEvent); }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit notes
                </button>
              )}
              {onMoveToStatus &&
                STATUS_OPTIONS.filter((opt) => opt.id !== status).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    className={`country-item-more-menu-item country-item-more-menu-item--move country-item-more-menu-item--${opt.id.replace(/\s+/g, '-')}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      onMoveToStatus(location, opt.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M7 17L17 7" />
                      <path d="M17 7H7V17" />
                    </svg>
                    Move to {opt.label}
                  </button>
                ))}
              <button
                type="button"
                role="menuitem"
                className="country-item-more-menu-item country-item-more-menu-item--delete"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMoreMenuOpen(false); handleDeleteClick(e as unknown as React.MouseEvent); }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={isDeleting}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
