"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CountryLocation } from '@/types/country';
import { getStatusDisplayLabel, normalizeTags, STATUS_OPTIONS } from './utils';

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

  const metaKind =
    isDone && location.visitedAt?.trim()
      ? 'visited'
      : status === 'in review'
        ? 'planned'
        : 'unscheduled';

  const statusLabel = getStatusDisplayLabel(status);
  const statusClass = status.replace(/\s+/g, '-');

  return (
    <article
      className={`country-list-card country-list-card--${statusClass} ${isDeleting ? 'country-list-card--deleting' : ''} ${moreOpen ? 'country-list-card--menu-open' : ''}`}
      aria-label={`${location.name}, ${statusLabel}`}
    >
      {isDeleting && (
        <div className="country-list-card-deleting" aria-hidden>
          <span className="country-list-card-deleting-spinner" />
          <span>Deleting...</span>
        </div>
      )}
      <div className="country-list-card-header">
        {location.flag && (
          <img src={location.flag} alt="" className="country-list-card-flag" />
        )}
        <div className="country-list-card-title-wrap">
          <h3 className="country-list-card-name">{location.name}</h3>
        </div>
        <div className="country-list-card-actions" ref={moreRef}>
          <button
            ref={moreBtnRef}
            type="button"
            className={`country-list-card-more-btn ${moreOpen ? 'country-list-card-more-btn--open' : ''}`}
            onClick={(e) => { e.stopPropagation(); setMoreOpen((o) => !o); }}
            aria-label={`More actions for ${location.name}`}
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
      <div className="country-list-card-details">
        <p className={`country-list-card-meta country-list-card-meta--${metaKind}`}>
          {metaKind === 'visited' ? (
            <>
              <span className="country-list-card-meta-label">Visited</span>
              <span className="country-list-card-meta-value">{location.visitedAt!.trim()}</span>
            </>
          ) : metaKind === 'planned' ? (
            <span className="country-list-card-meta-value">Planned</span>
          ) : (
            <span className="country-list-card-meta-value country-list-card-meta-value--muted">Not scheduled</span>
          )}
        </p>
        {tags.length > 0 && (
          <div className="country-list-card-tags">
            {tags.map((t, i) => (
              <span key={i} className="country-list-card-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
