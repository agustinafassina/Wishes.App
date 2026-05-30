"use client";

import type { CountryLocation } from '@/types/country';
import CountryItem from './CountryItem';
import EmptyState from './EmptyState';

interface CountryColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  locations: CountryLocation[];
  status: string;
  emptyMessage: string;
  onDoubleClick: () => void;
  onRequestDelete: (loc: CountryLocation) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  onMoveToStatus?: (loc: CountryLocation, newStatus: string) => void;
  onSortClick?: (columnId: string) => void;
  sortOrder?: 'a-z' | 'z-a';
  deletingId?: string | null;
  onEmptyCtaClick?: () => void;
}

export default function CountryColumn({
  id,
  title,
  icon,
  locations,
  status,
  emptyMessage,
  onDoubleClick,
  onRequestDelete,
  onEditNotes,
  onViewNotes,
  onMoveToStatus,
  onSortClick,
  sortOrder,
  deletingId,
  onEmptyCtaClick,
}: CountryColumnProps) {
  const statusClass = status.replace(/\s+/g, '-');

  return (
    <div className={`country-card ${statusClass}`} onDoubleClick={onDoubleClick}>
      <div className="card-header">
        <div className={`card-icon card-icon-${statusClass}`}>{icon}</div>
        <h2 className="country-title">{title}</h2>
        {onSortClick && locations.length > 1 && (
          <button
            type="button"
            className="column-sort-btn"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onSortClick(id); }}
            onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={(e) => e.stopPropagation()}
            title={sortOrder === 'z-a' ? 'Sort A–Z' : 'Sort Z–A'}
            aria-label={sortOrder === 'z-a' ? 'Sort A–Z' : 'Sort Z–A'}
          >
            {sortOrder === 'z-a' ? 'Z–A' : 'A–Z'}
          </button>
        )}
      </div>
      <div className="country-list-content">
        <div className="country-list-scroll">
          {locations.length > 0 ? (
            locations.map((location) => (
              <CountryItem
                key={location.id}
                location={location}
                status={status}
                onRequestDelete={onRequestDelete}
                onEditNotes={onEditNotes}
                onViewNotes={onViewNotes}
                onMoveToStatus={onMoveToStatus}
                isDeleting={deletingId === location.id}
              />
            ))
          ) : (
            <EmptyState
              variant="inline"
              message={emptyMessage}
              onAddCountry={onEmptyCtaClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
