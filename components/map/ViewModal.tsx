"use client";

import { forwardRef } from 'react';
import type { CountryLocation } from '@/types/country';
import { normalizeTags } from './utils';

interface ViewModalProps {
  location: CountryLocation | null;
  onClose: () => void;
}

const ViewModal = forwardRef<HTMLDivElement, ViewModalProps>(function ViewModal(
  { location, onClose },
  ref
) {
  if (!location) return null;

  const tags = normalizeTags(location);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-modal-title"
    >
      <div
        ref={ref}
        className="modal-content modal-content-view"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header modal-header-view">
          <div className="modal-header-view-top">
            <div className="modal-title-wrap">
              <h2 id="view-modal-title" className="modal-title">
                {location.name}
              </h2>
              {tags.length > 0 && (
                <div className="view-modal-tags">
                  {tags.map((t, i) => (
                    <span key={i} className="view-modal-tag">
                      <svg
                        className="view-modal-tag-icon"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {location.visitedAt && (
            <p className="view-modal-visited-at">
              <svg
                className="view-modal-date-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Visited in {location.visitedAt}
            </p>
          )}
        </div>
        <div className="modal-body">
          {location.notes ? (
            <p className="view-modal-notes">{location.notes}</p>
          ) : (
            !location.visitedAt && (
              <p className="view-modal-empty">No notes or visit date.</p>
            )
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-submit" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

export default ViewModal;
