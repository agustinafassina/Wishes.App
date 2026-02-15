"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CountryLocation } from '@/types/country';
import { normalizeTags, STATUS_OPTIONS } from './utils';

interface CountryListCardProps {
  location: CountryLocation;
  status: string;
  onRequestDelete: (loc: CountryLocation) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  onMoveToStatus?: (loc: CountryLocation, newStatus: string) => void;
  isDeleting?: boolean;
}

export default function CountryListCard({
  location,
  status,
  onRequestDelete,
  onEditNotes,
  onViewNotes,
  onMoveToStatus,
  isDeleting,
}: CountryListCardProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0, left: 0 });
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLDivElement>(null);
  const tags = normalizeTags(location);
  const isDone = status === 'done';

  const MENU_MIN_WIDTH = 180;

  useLayoutEffect(() => {
    if (!moreOpen || !moreBtnRef.current || typeof document === 'undefined') return;
    const rect = moreBtnRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    // If menu would overflow right, anchor its right edge to the button so it opens left
    if (rect.left + MENU_MIN_WIDTH > viewportW - 8) {
      setMenuPosition({ top: rect.top - 8, right: viewportW - rect.right });
    } else {
      setMenuPosition({ top: rect.top - 8, left: rect.left });
    }
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const inButton = moreRef.current?.contains(target);
      const inMenu = menuPortalRef.current?.contains(target);
      if (!inButton && !inMenu) setMoreOpen(false);
    };
    document.addEventListener('click', close, true);
    document.addEventListener('touchstart', close, true);
    return () => {
      document.removeEventListener('click', close, true);
      document.removeEventListener('touchstart', close, true);
    };
  }, [moreOpen]);

  const dateLine = isDone && location.visitedAt?.trim()
    ? `Visited: ${location.visitedAt.trim()}`
    : status === 'in review'
      ? 'Planned'
      : 'Not scheduled';

  const statusLabel = status === 'done' ? 'Complete' : status === 'in review' ? 'In Review' : 'To Do';
  const statusClass = status.replace(/\s+/g, '-');

  return (
    <div className={`country-list-card country-list-card--${statusClass} ${isDeleting ? 'country-list-card--deleting' : ''} ${moreOpen ? 'country-list-card--menu-open' : ''}`}>
      {isDeleting && (
        <div className="country-list-card-deleting" aria-hidden>
          <span className="country-list-card-deleting-spinner" />
          <span>Deleting...</span>
        </div>
      )}
      {location.flag && (
        <img src={location.flag} alt="" className="country-list-card-flag" />
      )}
      <div className="country-list-card-body">
        <h3 className="country-list-card-name">{location.name}</h3>
        <p className="country-list-card-meta">
          <span className="country-list-card-meta-icon" aria-hidden>📅</span>
          {dateLine}
        </p>
        {tags.length > 0 && (
          <div className="country-list-card-tags">
            {tags.map((t, i) => (
              <span key={i} className="country-list-card-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="country-list-card-right">
        <span className={`country-list-card-badge country-list-card-badge--${statusClass}`}>
          {statusLabel}
        </span>
        <div className="country-list-card-more-wrap" ref={moreRef}>
          <button
            ref={moreBtnRef}
            type="button"
            className={`country-list-card-more-btn ${moreOpen ? 'country-list-card-more-btn--open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setMoreOpen((o) => !o); }}
            aria-label="More actions"
            aria-expanded={moreOpen}
            aria-haspopup="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {moreOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={menuPortalRef}
              className="country-list-card-more-portal"
              style={{
                position: 'fixed',
                top: `${menuPosition.top}px`,
                ...(menuPosition.right != null
                  ? { right: `${menuPosition.right}px`, left: 'auto' }
                  : { left: `${menuPosition.left ?? 0}px` }),
              }}
              role="presentation"
            >
              <div className="country-list-card-more-menu country-list-card-more-menu--portal" role="menu">
                {isDone && onViewNotes && (
                  <button type="button" role="menuitem" className="country-list-card-more-item"
                    onClick={(e) => { e.stopPropagation(); setMoreOpen(false); onViewNotes(location); }}>
                    View notes
                  </button>
                )}
                {isDone && onEditNotes && (
                  <button type="button" role="menuitem" className="country-list-card-more-item"
                    onClick={(e) => { e.stopPropagation(); setMoreOpen(false); onEditNotes(location); }}>
                    Edit notes
                  </button>
                )}
                {onMoveToStatus && STATUS_OPTIONS.filter((o) => o.id !== status).map((opt) => (
                  <button key={opt.id} type="button" role="menuitem" className="country-list-card-more-item"
                    onClick={(e) => { e.stopPropagation(); setMoreOpen(false); onMoveToStatus(location, opt.id); }}>
                    Move to {opt.label}
                  </button>
                ))}
                <button type="button" role="menuitem" className="country-list-card-more-item country-list-card-more-item--delete"
                  onClick={(e) => { e.stopPropagation(); setMoreOpen(false); onRequestDelete(location); }} disabled={isDeleting}>
                  Delete
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
