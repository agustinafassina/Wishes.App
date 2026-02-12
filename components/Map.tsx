"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useToast } from './ToastContext';
import { getApiErrorDisplay } from '../lib/api-error-display';
import { hapticLight, hapticSuccess } from '../lib/haptic';
import ConfirmModal from './ConfirmModal';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface CountryLocation {
  id: string;
  name: string;
  code: string;
  position: {
    lat: number;
    lng: number;
  };
  photos: string[];
  status: string;
  flag?: string;
  notes?: string;
  visitedAt?: string;
  /** @deprecated use tags */
  tag?: string;
  tags?: string[];
}

interface CountryData {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  photos: string[];
  status: string;
  flag?: string;
  notes?: string;
  visitedAt?: string;
  tag?: string;
  tags?: string[];
}

function normalizeTags(c: { tag?: string; tags?: string[] }): string[] {
  if (Array.isArray(c.tags) && c.tags.length > 0) return c.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  if (typeof c.tag === 'string' && c.tag.trim() !== '') return [c.tag.trim()];
  return [];
}

const iconProps = { width: 24, height: 24, viewBox: '0 0 24 24' as const, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const IconDone = () => (
  <svg {...iconProps} aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconInReview = () => (
  <svg {...iconProps} aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconPending = () => (
  <svg {...iconProps} aria-hidden>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: 'done', label: 'Completed' },
  { id: 'in review', label: 'In Review' },
  { id: 'pending', label: 'Pending' },
];

// Draggable Country Item Component
function CountryItem({
  location,
  status,
  onRequestDelete,
  onEditNotes,
  onViewNotes,
  onMoveToStatus,
  isDeleting,
}: {
  location: CountryLocation;
  status: string;
  onRequestDelete: (loc: CountryLocation) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  onMoveToStatus?: (loc: CountryLocation, newStatus: string) => void;
  isDeleting?: boolean;
}) {
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

  const notesPreview = location.notes?.trim() ? (location.notes.trim().length > 80 ? `${location.notes.trim().slice(0, 80)}…` : location.notes.trim()) : null;
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
    <div
      className={`country-item country-item-${statusClass} ${isDeleting ? 'item-deleting' : ''}`}
    >
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
          {location.flag && (
            <img
              src={location.flag}
              alt=""
              className="country-flag"
            />
          )}
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
        {/* Inline actions: shown on desktop, hidden on mobile (replaced by More menu) */}
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

        {/* More menu: shown on mobile only; one button opens View / Edit / Move to… / Delete */}
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
              {onMoveToStatus && STATUS_OPTIONS.filter((opt) => opt.id !== status).map((opt) => (
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

// Country column (list card)
function CountryColumn({ 
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
}: { 
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
}) {
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
            <div className="empty-state" data-status={statusClass}>
              <div className="empty-state-icon">{icon}</div>
              <p className="empty-state-message">{emptyMessage}</p>
              {status === 'pending' && onEmptyCtaClick && (
                <p className="empty-state-hint">Or double-tap this card to add one.</p>
              )}
              {(status === 'in review' || status === 'done') && onEmptyCtaClick && (
                <p className="empty-state-hint">Use the move icon to move items between columns or add below.</p>
              )}
              {onEmptyCtaClick && (
                <button
                  type="button"
                  className="empty-state-cta"
                  onClick={(e) => { e.stopPropagation(); onEmptyCtaClick(); }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  Add country
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MapProps {
  shareUserName?: string;
}

const Map = ({ shareUserName = 'My progress' }: MapProps) => {
  const toast = useToast();
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pickingLocationFromMap, setPickingLocationFromMap] = useState(false);
  const pickingLocationFromMapRef = useRef(false);
  pickingLocationFromMapRef.current = pickingLocationFromMap;
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('pending');
  const [confirmDeleteLocation, setConfirmDeleteLocation] = useState<CountryLocation | null>(null);
  const [confirmLeaveModal, setConfirmLeaveModal] = useState<'add' | 'notes' | null>(null);
  const [statusFilters, setStatusFilters] = useState({
    done: true,
    'in review': false,
    pending: false,
  });
  const [columnSort, setColumnSort] = useState<Record<string, 'a-z' | 'z-a'>>({
    done: 'a-z',
    'in review': 'a-z',
    pending: 'a-z',
  });
  const columnSortRef = useRef(columnSort);
  columnSortRef.current = columnSort;
  type ListTabId = 'done' | 'in review' | 'pending';
  const [mobileListTab, setMobileListTab] = useState<ListTabId>('done');
  const [newCountry, setNewCountry] = useState({
    name: '',
    code: '',
    latitude: '',
    longitude: '',
    flag: '',
    photos: [] as string[],
  });
  const [addCountryErrors, setAddCountryErrors] = useState<Record<string, string>>({});
  const [notesFormErrors, setNotesFormErrors] = useState<Record<string, string>>({});

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [locationForNotes, setLocationForNotes] = useState<CountryLocation | null>(null);
  const [notesForm, setNotesForm] = useState({ notes: '', visitedAt: '', tags: '' });
  const [showViewModal, setShowViewModal] = useState(false);
  const [locationForView, setLocationForView] = useState<CountryLocation | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const viewModalRef = useRef<HTMLDivElement>(null);
  const notesModalRef = useRef<HTMLDivElement>(null);
  const addModalRef = useRef<HTMLDivElement>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setMapTheme(el.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsLoadingLocations(true);
    fetch('/api/locations', { credentials: 'include' })
      .then((response) => {
        if (!response.ok) return response.json().then(() => []);
        return response.json();
      })
      .then((data: CountryData[]) => {
        const list = Array.isArray(data) ? data : [];
        const places: CountryLocation[] = list.map((country) => ({
          id: `${country.code}-${country.name}`,
          name: country.name,
          code: country.code,
          position: {
            lat: country.latitude,
            lng: country.longitude
          },
          photos: country.photos || [],
          status: country.status || "pending",
          flag: country.flag || "",
          notes: country.notes,
          visitedAt: country.visitedAt,
          tags: normalizeTags(country),
        }));

        const initialSort = { done: 'a-z' as const, 'in review': 'a-z' as const, pending: 'a-z' as const };
        setLocations(reorderLocationsByColumnSort(places, initialSort));
        if (places.length > 0) {
          setMapCenter(places[0].position);
          setZoom(2);
        }
      })
      .catch((error) => {
        console.error('Error loading countries:', error);
        setLocations([]);
      })
      .finally(() => setIsLoadingLocations(false));
  }, []);

  const filteredLocations = locations.filter(location => {
    return statusFilters[location.status as keyof typeof statusFilters] === true;
  });

  const handleMarkerClick = (countryLocation: CountryLocation): void => {
    setSelectedLocation(countryLocation);
  };

  const handleMoveToStatus = async (location: CountryLocation, newStatus: string) => {
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(newStatus) || location.status === newStatus) return;
    const countryId = location.id;
    const originalStatus = location.status;
    setLocations((prev) =>
      prev.map((loc) => (loc.id === countryId ? { ...loc, status: newStatus } : loc))
    );
    setIsSavingStatus(true);
    try {
      const response = await fetch('/api/update-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: location.code,
          countryName: location.name,
          newStatus,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }
    } catch (error) {
      console.error('Error updating country status:', error);
      setLocations((prev) =>
        prev.map((loc) => (loc.id === countryId ? { ...loc, status: originalStatus } : loc))
      );
      toast.error(getApiErrorDisplay(error, 'Failed to update status. Please try again.'));
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleColumnDoubleClick = (status: string) => {
    hapticLight();
    setTargetStatus(status);
    setNewCountry({
      name: '',
      code: '',
      latitude: '',
      longitude: '',
      flag: '',
      photos: [],
    });
    setAddCountryErrors({});
    setShowAddModal(true);
  };

  const validateAddCountry = (): Record<string, string> => {
    const err: Record<string, string> = {};
    const name = newCountry.name.trim();
    const code = newCountry.code.trim();
    const latStr = newCountry.latitude.trim();
    const lngStr = newCountry.longitude.trim();
    if (!name) err.name = 'Country name is required';
    if (!code) err.code = 'Country code is required';
    else if (code.length !== 2) err.code = 'Code must be 2 letters (e.g. FR, US)';
    if (!latStr) err.latitude = 'Latitude is required';
    else {
      const lat = parseFloat(latStr);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) err.latitude = 'Latitude must be between -90 and 90';
    }
    if (!lngStr) err.longitude = 'Longitude is required';
    else {
      const lng = parseFloat(lngStr);
      if (Number.isNaN(lng) || lng < -180 || lng > 180) err.longitude = 'Longitude must be between -180 and 180';
    }
    return err;
  };

  const handleAddCountry = async () => {
    const errors = validateAddCountry();
    if (Object.keys(errors).length > 0) {
      setAddCountryErrors(errors);
      return;
    }
    setAddCountryErrors({});
    setIsAddingCountry(true);

    // Generate flag URL if code is provided
    const flagUrl = newCountry.flag || `https://flagcdn.com/w40/${newCountry.code.toLowerCase()}.png`;

    const countryData = {
      name: newCountry.name,
      code: newCountry.code.toUpperCase(),
      latitude: parseFloat(newCountry.latitude),
      longitude: parseFloat(newCountry.longitude),
      flag: flagUrl,
      photos: newCountry.photos.filter(p => p.trim() !== ''),
      status: targetStatus,
    };

    try {
      const response = await fetch('/api/add-country', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(countryData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }

      const result = await response.json();
      console.log('Country added:', result);

      // Reload locations from user's JSON
      const locationsResponse = await fetch('/api/locations', { credentials: 'include' });
      const locationsData = await (locationsResponse.ok ? locationsResponse.json() : Promise.resolve([]));
      const list = Array.isArray(locationsData) ? locationsData : [];
      const places: CountryLocation[] = list.map((country: CountryData) => ({
        id: `${country.code}-${country.name}`,
        name: country.name,
        code: country.code,
        position: {
          lat: country.latitude,
          lng: country.longitude
        },
        photos: country.photos || [],
        status: country.status || "pending",
        flag: country.flag || "",
        notes: country.notes,
        visitedAt: country.visitedAt,
        tags: normalizeTags(country),
      }));

      setLocations(reorderLocationsByColumnSort(places, columnSortRef.current));
      setShowAddModal(false);
      hapticSuccess();
      setNewCountry({
        name: '',
        code: '',
        latitude: '',
        longitude: '',
        flag: '',
        photos: [],
      });
    } catch (error) {
      console.error('Error adding country:', error);
      toast.error(getApiErrorDisplay(error, 'Failed to add country. Please try again.'));
    } finally {
      setIsAddingCountry(false);
    }
  };

  const handleDeleteCountry = async (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (!location) return;
    setDeletingId(locationId);
    try {
      const response = await fetch('/api/delete-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: location.code, countryName: location.name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }

      const locationsResponse = await fetch('/api/locations', { credentials: 'include' });
      const locationsData = await (locationsResponse.ok ? locationsResponse.json() : Promise.resolve([]));
      const list = Array.isArray(locationsData) ? locationsData : [];
      const places: CountryLocation[] = list.map((country: CountryData) => ({
        id: `${country.code}-${country.name}`,
        name: country.name,
        code: country.code,
        position: { lat: country.latitude, lng: country.longitude },
        photos: country.photos || [],
        status: country.status || 'pending',
        flag: country.flag || '',
        notes: country.notes,
        visitedAt: country.visitedAt,
        tags: normalizeTags(country),
      }));
      setLocations(reorderLocationsByColumnSort(places, columnSortRef.current));
      hapticSuccess();
    } catch (error) {
      console.error('Error deleting country:', error);
      toast.error(getApiErrorDisplay(error, 'Failed to delete country. Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditNotes = (location: CountryLocation) => {
    setLocationForNotes(location);
    const tags = normalizeTags(location);
    setNotesForm({
      notes: location.notes || '',
      visitedAt: location.visitedAt || '',
      tags: tags.join(', '),
    });
    setNotesFormErrors({});
    setShowNotesModal(true);
  };

  const normalizedTagsStr = (s: string) =>
    s.split(',').map((t) => t.trim()).filter(Boolean).join(', ');

  const isAddFormDirty = () =>
    Boolean(
      newCountry.name.trim() ||
      newCountry.code.trim() ||
      newCountry.latitude.trim() ||
      newCountry.longitude.trim() ||
      newCountry.flag.trim() ||
      newCountry.photos.length > 0
    );

  const isNotesFormDirty = () => {
    if (!locationForNotes) return false;
    const origTags = normalizedTagsStr(normalizeTags(locationForNotes).join(', '));
    const currTags = normalizedTagsStr(notesForm.tags);
    return (
      notesForm.notes !== (locationForNotes.notes || '') ||
      notesForm.visitedAt !== (locationForNotes.visitedAt || '') ||
      currTags !== origTags
    );
  };

  const requestCloseAddModal = () => {
    if (isAddFormDirty()) {
      setConfirmLeaveModal('add');
    } else {
      setShowAddModal(false);
      setPickingLocationFromMap(false);
      setNewCountry({ name: '', code: '', latitude: '', longitude: '', flag: '', photos: [] });
    }
  };

  const startPickingFromMap = () => {
    setShowAddModal(false);
    setPickingLocationFromMap(true);
    setMapCollapsed(false);
  };

  const cancelPickingFromMap = () => {
    setPickingLocationFromMap(false);
  };

  const applyPickedLocation = (lat: number, lng: number) => {
    setNewCountry((prev) => ({
      ...prev,
      latitude: String(Number(lat.toFixed(6))),
      longitude: String(Number(lng.toFixed(6))),
    }));
    setMapCenter({ lat, lng });
    setZoom(10);
    setPickingLocationFromMap(false);
    setShowAddModal(true);
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapInstanceRef.current = map;
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!pickingLocationFromMapRef.current || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const latStr = String(Number(lat.toFixed(6)));
    const lngStr = String(Number(lng.toFixed(6)));

    const applyWithCountry = (countryName: string, countryCode: string) => {
      setNewCountry((prev) => ({
        ...prev,
        name: countryName,
        code: countryCode.toUpperCase(),
        latitude: latStr,
        longitude: lngStr,
      }));
      setMapCenter({ lat, lng });
      setZoom(10);
      setPickingLocationFromMap(false);
      setShowAddModal(true);
    };

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      let name = '';
      let code = '';
      if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
        const comp = results[0].address_components;
        const country = comp?.find((c) => c.types.includes('country'));
        if (country) {
          name = country.long_name;
          code = country.short_name ?? '';
        }
      }
      applyWithCountry(name, code);
    });
  }, []);

  const requestCloseNotesModal = () => {
    if (isNotesFormDirty()) {
      setConfirmLeaveModal('notes');
    } else {
      setShowNotesModal(false);
      setLocationForNotes(null);
    }
  };

  const confirmLeaveAndClose = () => {
    if (confirmLeaveModal === 'add') {
      setShowAddModal(false);
      setPickingLocationFromMap(false);
      setNewCountry({ name: '', code: '', latitude: '', longitude: '', flag: '', photos: [] });
    } else if (confirmLeaveModal === 'notes') {
      setShowNotesModal(false);
      setLocationForNotes(null);
    }
    setConfirmLeaveModal(null);
  };

  useFocusTrap(viewModalRef, !!(showViewModal && locationForView), {
    onEscape: () => setShowViewModal(false),
  });
  useFocusTrap(notesModalRef, !!(showNotesModal && locationForNotes), {
    onEscape: requestCloseNotesModal,
  });
  useFocusTrap(addModalRef, showAddModal, {
    onEscape: requestCloseAddModal,
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((showAddModal && isAddFormDirty()) || (showNotesModal && isNotesFormDirty())) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showAddModal, showNotesModal, newCountry, notesForm, locationForNotes]);

  const validateNotesForm = (): Record<string, string> => {
    const err: Record<string, string> = {};
    const visitedAt = notesForm.visitedAt.trim();
    if (visitedAt) {
      const yearMatch = /^\d{4}$/.test(visitedAt);
      const yearMonthMatch = /^\d{4}-\d{2}$/.test(visitedAt);
      if (!yearMatch && !yearMonthMatch) {
        if (visitedAt.length > 50) err.visitedAt = 'Keep "Visited in" under 50 characters';
        else if (/^\d+$/.test(visitedAt)) err.visitedAt = 'Use a 4-digit year (e.g. 2024)';
      } else if (yearMatch) {
        const y = parseInt(visitedAt, 10);
        if (y < 1900 || y > 2100) err.visitedAt = 'Enter a year between 1900 and 2100';
      }
    }
    return err;
  };

  const handleViewNotes = (location: CountryLocation) => {
    setLocationForView(location);
    setShowViewModal(true);
  };

  const handleSaveNotes = async () => {
    if (!locationForNotes) return;
    const errors = validateNotesForm();
    if (Object.keys(errors).length > 0) {
      setNotesFormErrors(errors);
      return;
    }
    setNotesFormErrors({});
    setIsSavingNotes(true);
    try {
      const response = await fetch('/api/update-country-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: locationForNotes.code,
          countryName: locationForNotes.name,
          notes: notesForm.notes.trim() || undefined,
          visitedAt: notesForm.visitedAt.trim() || undefined,
          tags: notesForm.tags.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }

      const locationsResponse = await fetch('/api/locations', { credentials: 'include' });
      const locationsData = await (locationsResponse.ok ? locationsResponse.json() : Promise.resolve([]));
      const list = Array.isArray(locationsData) ? locationsData : [];
      const places: CountryLocation[] = list.map((country: CountryData) => ({
        id: `${country.code}-${country.name}`,
        name: country.name,
        code: country.code,
        position: { lat: country.latitude, lng: country.longitude },
        photos: country.photos || [],
        status: country.status || 'pending',
        flag: country.flag || '',
        notes: country.notes,
        visitedAt: country.visitedAt,
        tags: normalizeTags(country),
      }));
      setLocations(reorderLocationsByColumnSort(places, columnSortRef.current));
      setShowNotesModal(false);
      setLocationForNotes(null);
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(getApiErrorDisplay(error, 'Failed to save notes. Please try again.'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const sortByName = (list: CountryLocation[], order: 'a-z' | 'z-a') =>
    [...list].sort((a, b) =>
      order === 'a-z'
        ? (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
        : (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' })
    );

  const reorderLocationsByColumnSort = (
    list: CountryLocation[],
    sortState: Record<string, 'a-z' | 'z-a'>
  ): CountryLocation[] => {
    const done = list.filter(l => l.status === 'done');
    const inReview = list.filter(l => l.status === 'in review');
    const pending = list.filter(l => l.status === 'pending');
    return [
      ...sortByName(done, sortState.done ?? 'a-z'),
      ...sortByName(inReview, sortState['in review'] ?? 'a-z'),
      ...sortByName(pending, sortState.pending ?? 'a-z'),
    ];
  };

  const doneLocations = locations.filter(location => location.status === 'done');
  const pendingLocations = locations.filter(location => location.status === 'pending');
  const inReviewLocations = locations.filter(location => location.status === 'in review');

  const handleColumnSort = (columnId: string) => {
    const nextOrder: 'a-z' | 'z-a' = columnSort[columnId] === 'a-z' ? 'z-a' : 'a-z';
    const nextSort: Record<string, 'a-z' | 'z-a'> = { ...columnSort, [columnId]: nextOrder };
    setColumnSort(nextSort);
    setLocations(prev => reorderLocationsByColumnSort(prev, nextSort));
  };

  // Total countries in the world (UN recognized)
  const TOTAL_COUNTRIES = 195;
  const visitedCount = doneLocations.length;
  const remainingCount = TOTAL_COUNTRIES - visitedCount;
  const progressPercentage = (visitedCount / TOTAL_COUNTRIES) * 100;

  // Animated progress: on first load bar fills from 0 to current % over ~800ms
  const [progressDisplay, setProgressDisplay] = useState(0);
  const hasAnimatedProgressRef = useRef(false);
  useEffect(() => {
    if (isLoadingLocations) return;
    const pct = (locations.filter(l => l.status === 'done').length / TOTAL_COUNTRIES) * 100;
    if (!hasAnimatedProgressRef.current) {
      hasAnimatedProgressRef.current = true;
      const duration = 820;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);
        setProgressDisplay(easeOut * pct);
        if (t < 1) requestAnimationFrame(step);
        else setProgressDisplay(pct);
      };
      const id = requestAnimationFrame(step);
      return () => cancelAnimationFrame(id);
    }
    setProgressDisplay(pct);
  }, [isLoadingLocations, locations, TOTAL_COUNTRIES]);

  // Milestone badge: muestra el número real; emoji según hito (10, 50, 100)
  const milestone = visitedCount >= 10
    ? { label: `${visitedCount} countries!`, emoji: visitedCount >= 100 ? '🎉' : visitedCount >= 50 ? '🌟' : '🌍' }
    : null;

  // Mini celebration when crossing 10, 20 or 30 countries (trigger class for CSS animation)
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null);
  const prevVisitedRef = useRef(visitedCount);
  useEffect(() => {
    if (isLoadingLocations) return;
    const prev = prevVisitedRef.current;
    prevVisitedRef.current = visitedCount;
    const justHit10 = visitedCount === 10 && prev < 10;
    const justHit20 = visitedCount === 20 && prev < 20;
    const justHit30 = visitedCount === 30 && prev < 30;
    if (justHit10 || justHit20 || justHit30) {
      setCelebratingMilestone(visitedCount);
      const t = setTimeout(() => setCelebratingMilestone(null), 2600);
      return () => clearTimeout(t);
    }
  }, [isLoadingLocations, visitedCount]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const handleDownloadShareImage = async () => {
    if (!shareCardRef.current || isSharingImage) return;
    setIsSharingImage(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#1a1f35',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `travel-progress-${visitedCount}-${TOTAL_COUNTRIES}-countries.png`;
      a.click();
    } catch (error) {
      console.error('Share image error:', error);
      toast.error('Could not generate image.');
    } finally {
      setIsSharingImage(false);
    }
  };

  const mapOptions = useMemo(() => {
    const darkStyles = [
      { featureType: "all", elementType: "geometry", stylers: [{ color: "#1a1f35" }] },
      { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#0a0e1a" }] },
      { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0e1a" }] },
      { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#252b42" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e2339" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a3049" }] },
      { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1a1f35" }] },
      { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
      { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#252b42" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#1e2339" }] },
      { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#252b42" }] },
      { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "rgba(139, 92, 246, 0.3)" }] },
      { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#252b42" }] }
    ];
    const lightStyles = [
      { featureType: "all", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
      { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
      { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#e0f2fe" }] },
      { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
      { featureType: "road", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f1f5f9" }] },
      { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] },
      { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
      { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
      { featureType: "poi", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
      { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
      { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "rgba(99, 102, 241, 0.35)" }] },
      { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] }
    ];
    const isLight = mapTheme === 'light';
    return {
      styles: isLight ? lightStyles : darkStyles,
      disableDefaultUI: false,
      zoomControl: true,
      zoomControlOptions: { position: 7 },
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      mapTypeId: "roadmap",
      backgroundColor: isLight ? "#f8fafc" : "#0a0e1a"
    };
  }, [mapTheme]);

  const handleFilterToggle = (status: 'done' | 'in review' | 'pending') => {
    hapticLight();
    setStatusFilters(prev => {
      const next = { ...prev, [status]: !prev[status] };
      const anyOn = next.done || next['in review'] || next.pending;
      if (!anyOn) return prev;
      return next;
    });
    setMobileListTab(status);
  };

  return (
    <LoadScript googleMapsApiKey={API_KEY}>
      <div className="map-section">
        {isSavingStatus && (
          <div className="saving-status-banner" role="status" aria-live="polite">
            <span className="saving-status-spinner" aria-hidden />
            <span>Saving...</span>
          </div>
        )}
        <div id="travel-map" className={`map-header ${locations.length > 0 ? 'map-header--unified' : ''}`}>
          <div className="map-header-top">
            <div className="map-header-text">
              <div className="map-header-title-row">
                <span className="map-header-icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <h2 className="section-title">Your travel map</h2>
              </div>
              <p className="section-subtitle">Track where you've been and where you want to go.</p>
            </div>
            {locations.length === 0 && (
              <div className="map-header-actions">
                <button
                  type="button"
                  className="btn-add-country-header btn-add-country-header--compact"
                  onClick={() => handleColumnDoubleClick('pending')}
                  disabled={isAddingCountry}
                  aria-label={isAddingCountry ? 'Adding country…' : 'Add new country'}
                  aria-busy={isAddingCountry}
                >
                  {isAddingCountry ? (
                    <>
                      <span className="btn-spinner" aria-hidden />
                      <span>Adding…</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add country</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
            {locations.length > 0 && (
            <>
            <div className="map-header-toolbar" role="group" aria-label="Map options">
              <span className="map-header-toolbar-label">Map & list</span>
              <div className="map-header-toolbar-pills" role="group" aria-label="Filter map and switch list column">
                <button
                  type="button"
                  className={`filter-btn filter-btn-done ${statusFilters.done ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('done')}
                  aria-pressed={statusFilters.done}
                  title={statusFilters.done ? 'Shown on map · View Done list' : 'Show on map · View Done list'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">Done</span>
                  {doneLocations.length > 0 && (
                    <span className="filter-btn-count">{doneLocations.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`filter-btn filter-btn-in-review ${statusFilters['in review'] ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('in review')}
                  aria-pressed={statusFilters['in review']}
                  title={statusFilters['in review'] ? 'Shown on map · View In Review list' : 'Show on map · View In Review list'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">In Review</span>
                  {inReviewLocations.length > 0 && (
                    <span className="filter-btn-count">{inReviewLocations.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`filter-btn filter-btn-pending ${statusFilters.pending ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('pending')}
                  aria-pressed={statusFilters.pending}
                  title={statusFilters.pending ? 'Shown on map · View Pending list' : 'Show on map · View Pending list'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">Pending</span>
                  {pendingLocations.length > 0 && (
                    <span className="filter-btn-count">{pendingLocations.length}</span>
                  )}
                </button>
              </div>
              <span className="map-header-toolbar-sep" aria-hidden />
              <button
                type="button"
                className="btn-add-country-header btn-add-country-header--compact btn-add-country-header--in-toolbar"
                onClick={() => handleColumnDoubleClick('pending')}
                disabled={isAddingCountry}
                aria-label={isAddingCountry ? 'Adding country…' : 'Add new country'}
                aria-busy={isAddingCountry}
              >
                {isAddingCountry ? (
                  <>
                    <span className="btn-spinner" aria-hidden />
                    <span>Adding…</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add country</span>
                  </>
                )}
              </button>
              <span className="map-header-toolbar-sep" aria-hidden />
              <button
                type="button"
                className={`map-toggle-btn map-toggle-btn--in-bar ${mapCollapsed ? 'map-toggle-btn--collapsed' : ''}`}
                onClick={() => { hapticLight(); setMapCollapsed((c) => !c); }}
                aria-expanded={!mapCollapsed}
                aria-controls="map-wrapper-id"
                aria-label={mapCollapsed
                  ? (filteredLocations.length > 0 ? `Show map (${filteredLocations.length} ${filteredLocations.length === 1 ? 'country' : 'countries'} on map)` : 'Show map')
                  : 'Hide map'}
              >
                {mapCollapsed ? (
                  <>
                    <svg className="map-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="map-toggle-text">Show map</span>
                    {filteredLocations.length > 0 && (
                      <span className="map-toggle-count" aria-hidden>
                        {filteredLocations.length}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <svg className="map-toggle-icon map-toggle-icon--up" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span className="map-toggle-text">Hide map</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className={`map-toggle-btn map-toggle-btn--in-bar ${listCollapsed ? 'map-toggle-btn--collapsed' : ''}`}
                onClick={() => { hapticLight(); setListCollapsed((c) => !c); }}
                aria-expanded={!listCollapsed}
                aria-controls="list-wrapper-id"
                aria-label={listCollapsed
                  ? (filteredLocations.length > 0 ? `Show list (${filteredLocations.length} ${filteredLocations.length === 1 ? 'country' : 'countries'})` : 'Show list')
                  : 'Hide list'}
              >
                {listCollapsed ? (
                  <>
                    <svg className="map-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span className="map-toggle-text">Show list</span>
                    {filteredLocations.length > 0 && (
                      <span className="map-toggle-count" aria-hidden>
                        {filteredLocations.length}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <svg className="map-toggle-icon map-toggle-icon--up" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span className="map-toggle-text">Hide list</span>
                  </>
                )}
              </button>
            </div>
            <div className={`map-section-map-wrap map-section-map-wrap--inside-header ${mapCollapsed ? 'map-section-map-wrap--map-collapsed' : ''}`}>
              <div
                id="map-wrapper-id"
                className={`map-wrapper ${mapCollapsed ? 'map-wrapper--collapsed' : ''} ${pickingLocationFromMap ? 'map-wrapper--picking' : ''}`}
              >
                {!mapCollapsed && (
                <div className="view-map-row" role="group" aria-label="View map">
                  <span className="list-pills-label">View map</span>
                </div>
                )}
                {!mapCollapsed && (
                <>
                {pickingLocationFromMap && (
                  <div className="map-pick-banner" role="status" aria-live="polite">
                    <span className="map-pick-banner-text">Click on an empty area of the map (not on a marker) to set coordinates</span>
                    <button type="button" className="map-pick-banner-cancel" onClick={cancelPickingFromMap}>
                      Cancel
                    </button>
                  </div>
                )}
                <GoogleMap
                  key={mapTheme}
                  mapContainerClassName="map-container"
                  mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '20px' }}
                  center={mapCenter}
                  zoom={zoom}
                  options={mapOptions}
                  onLoad={handleMapLoad}
                  onClick={handleMapClick}
                >
                {filteredLocations.map((location) => {
                  const countryLocation: CountryLocation = location;
                  return (
                    <Marker 
                      key={location.id} 
                      position={location.position} 
                      title={location.name} 
                      onClick={() => handleMarkerClick(countryLocation)}
                    />
                  );
                })}
                {selectedLocation && (
                  <InfoWindow 
                    position={selectedLocation.position} 
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <div className={`info-window info-window--${selectedLocation.status.replace(/\s+/g, '-')}`}>
                      <span className="info-window-status-pill">{selectedLocation.status === 'done' ? 'Done' : selectedLocation.status === 'in review' ? 'In Review' : 'Pending'}</span>
                      <div className="info-window-header">
                        {selectedLocation.flag && (
                          <img 
                            src={selectedLocation.flag} 
                            alt="" 
                            className="info-window-flag"
                          />
                        )}
                        <h3 className="info-window-title">{selectedLocation.name}</h3>
                      </div>
                      {selectedLocation.status === 'done' && (selectedLocation.visitedAt || selectedLocation.notes) && (
                        <div className="info-window-visited">
                          {selectedLocation.visitedAt && (
                            <p className="info-window-visited-at">Visited in {selectedLocation.visitedAt}</p>
                          )}
                          {selectedLocation.notes && (
                            <p className="info-window-notes">{selectedLocation.notes}</p>
                          )}
                        </div>
                      )}
                      {selectedLocation.photos && selectedLocation.photos.length > 0 && (
                        <div className="info-window-photos">
                          {selectedLocation.photos.slice(0, 3).map((photo, photoIndex) => (
                            <img 
                              key={photoIndex} 
                              src={photo} 
                              alt="" 
                              className="info-window-photo"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
                </GoogleMap>
                </>
                )}
              </div>
            </div>
            <div
              id="list-wrapper-id"
              className={`list-section-inside-map ${listCollapsed ? 'list-section-inside-map--collapsed' : ''}`}
              aria-hidden={listCollapsed}
            >
            <div className="list-section-inside-map-inner">
            <div className="list-pills-row list-pills-row--inside-map" role="group" aria-label="View list by status">
              <span className="list-pills-label">View list</span>
              <div className="list-pills" role="group" aria-label="Filter columns by status">
                <button
                  type="button"
                  className={`filter-btn filter-btn-done ${statusFilters.done ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('done')}
                  aria-pressed={statusFilters.done}
                  title={statusFilters.done ? 'Hide Done column' : 'Show Done column'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">Done</span>
                  {doneLocations.length > 0 && (
                    <span className="filter-btn-count">{doneLocations.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`filter-btn filter-btn-in-review ${statusFilters['in review'] ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('in review')}
                  aria-pressed={statusFilters['in review']}
                  title={statusFilters['in review'] ? 'Hide In Review column' : 'Show In Review column'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">In Review</span>
                  {inReviewLocations.length > 0 && (
                    <span className="filter-btn-count">{inReviewLocations.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`filter-btn filter-btn-pending ${statusFilters.pending ? 'active' : ''}`}
                  onClick={() => handleFilterToggle('pending')}
                  aria-pressed={statusFilters.pending}
                  title={statusFilters.pending ? 'Hide Pending column' : 'Show Pending column'}
                >
                  <span className="filter-btn-dot" aria-hidden />
                  <span className="filter-btn-label">Pending</span>
                  {pendingLocations.length > 0 && (
                    <span className="filter-btn-count">{pendingLocations.length}</span>
                  )}
                </button>
              </div>
            </div>
            {statusFilters.done && (
            <>
            <div className="progress-bar-standalone progress-bar-standalone--inside-list" role="region" aria-label="Travel progress">
              {celebratingMilestone !== null && (
                <div className="progress-bar-standalone-celebration" role="alert" aria-live="assertive">
                  <span className="progress-bar-standalone-celebration-emoji">🎉</span>
                  <span>You reached {celebratingMilestone} countries!</span>
                </div>
              )}
              <div className="progress-bar-standalone-inner">
                <span className="progress-bar-standalone-count">{visitedCount} / {TOTAL_COUNTRIES}</span>
                <div className="progress-bar-standalone-bar">
                  <div className="progress-bar-standalone-fill" style={{ width: `${progressDisplay}%` }}>
                    <span className="progress-bar-standalone-pct">{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <span className="progress-bar-standalone-remaining" aria-hidden>{remainingCount} left</span>
                </div>
                <div className="progress-bar-standalone-actions">
                  <button
                    type="button"
                    className="btn-share-progress btn-share-progress--strip"
                    onClick={() => setShowShareModal(true)}
                    aria-label="Share progress"
                    title="Share progress"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share</span>
                  </button>
                  {showShareModal && (
                    <>
                      <div className="share-modal-backdrop" onClick={() => setShowShareModal(false)} aria-hidden />
                      <div className="share-modal" role="dialog" aria-label="Share options">
                        <button type="button" className="share-modal-close" onClick={() => setShowShareModal(false)} aria-label="Close">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <h2 className="share-modal-title">Share your progress</h2>
                        <div className="share-modal-actions">
                          <button type="button" className="share-action-btn" onClick={handleCopyShareLink}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            <span>{shareLinkCopied ? 'Copied!' : 'Copy link'}</span>
                          </button>
                          <button type="button" className="share-action-btn" onClick={handleDownloadShareImage} disabled={isSharingImage}>
                            {isSharingImage ? (
                              <span className="share-spinner" aria-hidden />
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            )}
                            <span>{isSharingImage ? 'Creating...' : 'Download image'}</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {milestone && (
                <p className="progress-bar-standalone-milestone" role="status" aria-live="polite">
                  <span className="progress-bar-standalone-milestone-emoji">{milestone.emoji}</span>
                  <span>{milestone.label}</span>
                </p>
              )}
            </div>
            <div ref={shareCardRef} className="share-card-for-image" aria-hidden>
              <div className="share-card-inner">
                <p className="share-card-name">{shareUserName}</p>
                <p className="share-card-stats">{visitedCount} / {TOTAL_COUNTRIES} countries visited</p>
                <div className="share-card-bar-wrap">
                  <div className="share-card-bar-fill" style={{ width: `${progressPercentage}%` }} />
                </div>
                <p className="share-card-tagline">My travel bucket list</p>
              </div>
            </div>
            </>
            )}
            <div id="country-list" className="country-lists-wrapper country-lists-wrapper--inside-map">
              <div className="country-lists-container">
                <div
                  className={`country-column ${statusFilters.done ? 'country-column-visible' : ''}`}
                  id="panel-done"
                  role="tabpanel"
                  aria-labelledby="tab-done"
                  data-tab="done"
                >
                  <CountryColumn
                    id="done"
                    title="Completed"
                    icon={<IconDone />}
                    locations={doneLocations}
                    status="done"
                    emptyMessage="No countries completed yet"
                    onDoubleClick={() => handleColumnDoubleClick('done')}
                    onEmptyCtaClick={() => handleColumnDoubleClick('done')}
                    onRequestDelete={(loc) => setConfirmDeleteLocation(loc)}
                    onEditNotes={handleEditNotes}
                    onViewNotes={handleViewNotes}
                    onMoveToStatus={handleMoveToStatus}
                    onSortClick={handleColumnSort}
                    sortOrder={columnSort.done}
                    deletingId={deletingId}
                  />
                </div>
                <div
                  className={`country-column ${statusFilters['in review'] ? 'country-column-visible' : ''}`}
                  id="panel-in-review"
                  role="tabpanel"
                  aria-labelledby="tab-in-review"
                  data-tab="in review"
                >
                  <CountryColumn
                    id="in review"
                    title="In Review"
                    icon={<IconInReview />}
                    locations={inReviewLocations}
                    status="in review"
                    emptyMessage="No countries in review"
                    onDoubleClick={() => handleColumnDoubleClick('in review')}
                    onEmptyCtaClick={() => handleColumnDoubleClick('in review')}
                    onRequestDelete={(loc) => setConfirmDeleteLocation(loc)}
                    onMoveToStatus={handleMoveToStatus}
                    onSortClick={handleColumnSort}
                    sortOrder={columnSort['in review']}
                    deletingId={deletingId}
                  />
                </div>
                <div
                  className={`country-column ${statusFilters.pending ? 'country-column-visible' : ''}`}
                  id="panel-pending"
                  role="tabpanel"
                  aria-labelledby="tab-pending"
                  data-tab="pending"
                >
                  <CountryColumn
                    id="pending"
                    title="Pending"
                    icon={<IconPending />}
                    locations={pendingLocations}
                    status="pending"
                    emptyMessage="No pending countries"
                    onDoubleClick={() => handleColumnDoubleClick('pending')}
                    onEmptyCtaClick={() => handleColumnDoubleClick('pending')}
                    onRequestDelete={(loc) => setConfirmDeleteLocation(loc)}
                    onMoveToStatus={handleMoveToStatus}
                    onSortClick={handleColumnSort}
                    sortOrder={columnSort.pending}
                    deletingId={deletingId}
                  />
                </div>
              </div>
            </div>
            </div>
            </div>
            </>
          )}
        </div>

        {isLoadingLocations ? (
          <div className="loading-skeleton" aria-busy="true" aria-label="Loading locations">
            <div className="skeleton-map" />
            <div className="skeleton-progress">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-stats" />
              <div className="skeleton-bar" />
            </div>
            <div className="skeleton-cards">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        ) : (
        <>
          <ConfirmModal
            open={confirmDeleteLocation !== null}
            title="Delete country"
            message={confirmDeleteLocation ? `Delete "${confirmDeleteLocation.name}" from the list?` : ''}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            onConfirm={() => {
              if (confirmDeleteLocation) {
                hapticLight();
                handleDeleteCountry(confirmDeleteLocation.id);
                setConfirmDeleteLocation(null);
              }
            }}
            onCancel={() => setConfirmDeleteLocation(null)}
          />
          <ConfirmModal
            open={confirmLeaveModal !== null}
            title="Leave without saving?"
            message="You have unsaved changes. Leave anyway?"
            confirmLabel="Leave"
            cancelLabel="Stay"
            variant="default"
            onConfirm={confirmLeaveAndClose}
            onCancel={() => setConfirmLeaveModal(null)}
          />
          {locations.length === 0 ? (
            pickingLocationFromMap ? (
              <div className="map-section-map-wrap">
                <div
                  id="map-wrapper-id"
                  className="map-wrapper map-wrapper--picking"
                >
                  <div className="map-pick-banner" role="status" aria-live="polite">
                    <span className="map-pick-banner-text">Click on the map to set coordinates</span>
                    <button type="button" className="map-pick-banner-cancel" onClick={cancelPickingFromMap}>
                      Cancel
                    </button>
                  </div>
                  <GoogleMap
                    key={mapTheme}
                    mapContainerClassName="map-container"
                    mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '20px' }}
                    center={mapCenter}
                    zoom={zoom}
                    options={mapOptions}
                    onLoad={handleMapLoad}
                    onClick={handleMapClick}
                  />
                </div>
              </div>
            ) : (
            <div className="map-empty-state" role="status" aria-live="polite">
              <div className="map-empty-state-icon-wrap" aria-hidden>
                <svg className="map-empty-state-icon-svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <p className="map-empty-state-title">Start your journey</p>
              <p className="map-empty-state-hint">Add your first country to begin your travel bucket list. Use the button below or double-tap a column to add one.</p>
              <button
                type="button"
                className="btn-add-country-header map-empty-state-cta"
                onClick={() => handleColumnDoubleClick('pending')}
                disabled={isAddingCountry}
                aria-label={isAddingCountry ? 'Adding country…' : 'Add new country'}
                aria-busy={isAddingCountry}
              >
                {isAddingCountry ? (
                  <>
                    <span className="btn-spinner" aria-hidden />
                    <span>Adding…</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add country</span>
                  </>
                )}
              </button>
            </div>
            )
          ) : (
          <>

        {/* View notes modal (read-only) */}
        {showViewModal && locationForView && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)} role="dialog" aria-modal="true" aria-labelledby="view-modal-title">
            <div ref={viewModalRef} className="modal-content modal-content-view" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header modal-header-view">
                <div className="modal-header-view-top">
                  <div className="modal-title-wrap">
                    <h2 id="view-modal-title" className="modal-title">{locationForView.name}</h2>
                    {normalizeTags(locationForView).length > 0 && (
                      <div className="view-modal-tags">
                        {normalizeTags(locationForView).map((t, i) => (
                          <span key={i} className="view-modal-tag">
                            <svg className="view-modal-tag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                              <line x1="7" y1="7" x2="7.01" y2="7" />
                            </svg>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
                </div>
                {locationForView.visitedAt && (
                  <p className="view-modal-visited-at">
                    <svg className="view-modal-date-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Visited in {locationForView.visitedAt}
                  </p>
                )}
              </div>
              <div className="modal-body">
                {locationForView.notes ? (
                  <p className="view-modal-notes">{locationForView.notes}</p>
                ) : (
                  !locationForView.visitedAt && (
                    <p className="view-modal-empty">No notes or visit date.</p>
                  )
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-submit" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

          </>
          )}
        {/* Notes & visit date modal (Done countries) */}
        {showNotesModal && locationForNotes && (
          <div className="modal-overlay" onClick={requestCloseNotesModal} role="dialog" aria-modal="true" aria-labelledby="notes-modal-title">
            <div ref={notesModalRef} className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 id="notes-modal-title" className="modal-title">Notes and visit date — {locationForNotes.name}</h2>
                <button type="button" className="modal-close" onClick={requestCloseNotesModal} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="notes-tags">Tags (separate with commas)</label>
                  <input
                    id="notes-tags"
                    type="text"
                    value={notesForm.tags}
                    onChange={(e) => setNotesForm({ ...notesForm, tags: e.target.value })}
                    placeholder="e.g. color, food, mountains"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="notes-visited-at">Visited in (e.g. 2024, 2024-06, or March 2024)</label>
                  <input
                    id="notes-visited-at"
                    type="text"
                    value={notesForm.visitedAt}
                    onChange={(e) => {
                      setNotesForm({ ...notesForm, visitedAt: e.target.value });
                      if (notesFormErrors.visitedAt) setNotesFormErrors((prev) => ({ ...prev, visitedAt: '' }));
                    }}
                    placeholder="e.g. March 2024"
                    aria-invalid={!!notesFormErrors.visitedAt}
                    aria-describedby={notesFormErrors.visitedAt ? 'notes-visited-at-error' : undefined}
                  />
                  {notesFormErrors.visitedAt && (
                    <p id="notes-visited-at-error" className="form-error" role="alert">{notesFormErrors.visitedAt}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="notes-text">Notes</label>
                  <textarea
                    id="notes-text"
                    rows={4}
                    value={notesForm.notes}
                    onChange={(e) => setNotesForm({ ...notesForm, notes: e.target.value })}
                    placeholder="Memories, places you visited, etc."
                    className="form-textarea"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={requestCloseNotesModal} disabled={isSavingNotes}>Cancel</button>
                <button className="btn-submit" onClick={handleSaveNotes} disabled={isSavingNotes}>
                  {isSavingNotes ? (
                    <>
                      <span className="btn-spinner" aria-hidden />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Country Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={requestCloseAddModal} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <div ref={addModalRef} className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 id="add-modal-title" className="modal-title">Add new country</h2>
                <button type="button" className="modal-close" onClick={requestCloseAddModal} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="country-name">Country name *</label>
                  <input
                    id="country-name"
                    type="text"
                    value={newCountry.name}
                    onChange={(e) => {
                      setNewCountry({ ...newCountry, name: e.target.value });
                      if (addCountryErrors.name) setAddCountryErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="Ex: France"
                    aria-invalid={!!addCountryErrors.name}
                    aria-describedby={addCountryErrors.name ? 'country-name-error' : undefined}
                  />
                  {addCountryErrors.name && (
                    <p id="country-name-error" className="form-error" role="alert">{addCountryErrors.name}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="country-code">Country code (ISO) *</label>
                  <input
                    id="country-code"
                    type="text"
                    value={newCountry.code}
                    onChange={(e) => {
                      setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() });
                      if (addCountryErrors.code) setAddCountryErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    placeholder="Ex: FR"
                    maxLength={2}
                    aria-invalid={!!addCountryErrors.code}
                    aria-describedby={addCountryErrors.code ? 'country-code-error' : undefined}
                  />
                  {addCountryErrors.code && (
                    <p id="country-code-error" className="form-error" role="alert">{addCountryErrors.code}</p>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="country-latitude">Latitude *</label>
                    <input
                      id="country-latitude"
                      type="number"
                      step="any"
                      value={newCountry.latitude}
                      onChange={(e) => {
                        setNewCountry({ ...newCountry, latitude: e.target.value });
                        if (addCountryErrors.latitude) setAddCountryErrors((prev) => ({ ...prev, latitude: '' }));
                      }}
                      placeholder="Ex: 46.2276"
                      aria-invalid={!!addCountryErrors.latitude}
                      aria-describedby={addCountryErrors.latitude ? 'country-latitude-error' : undefined}
                    />
                    {addCountryErrors.latitude && (
                      <p id="country-latitude-error" className="form-error" role="alert">{addCountryErrors.latitude}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label htmlFor="country-longitude">Longitude *</label>
                    <input
                      id="country-longitude"
                      type="number"
                      step="any"
                      value={newCountry.longitude}
                      onChange={(e) => {
                        setNewCountry({ ...newCountry, longitude: e.target.value });
                        if (addCountryErrors.longitude) setAddCountryErrors((prev) => ({ ...prev, longitude: '' }));
                      }}
                      placeholder="Ex: 2.2137"
                      aria-invalid={!!addCountryErrors.longitude}
                      aria-describedby={addCountryErrors.longitude ? 'country-longitude-error' : undefined}
                    />
                    {addCountryErrors.longitude && (
                      <p id="country-longitude-error" className="form-error" role="alert">{addCountryErrors.longitude}</p>
                    )}
                  </div>
                </div>
                <div className="form-group form-group-pick-map">
                  <button type="button" className="btn-pick-from-map" onClick={startPickingFromMap} aria-label="Pick location from map">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>Pick from map</span>
                  </button>
                  <p className="form-help">Click to close this form and select a point on the map; latitude and longitude will be filled automatically.</p>
                </div>
                <div className="form-group">
                  <label htmlFor="country-flag">Flag URL (optional)</label>
                  <input
                    id="country-flag"
                    type="text"
                    value={newCountry.flag}
                    onChange={(e) => setNewCountry({ ...newCountry, flag: e.target.value })}
                    placeholder="Leave empty to use flagcdn.com automatically"
                  />
                </div>
                <div className="form-group">
                  <label>Status: <strong>{targetStatus}</strong></label>
                  <p className="form-help">This country will be added to the "{targetStatus}" column</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={requestCloseAddModal}>
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleAddCountry} disabled={isAddingCountry}>
                  {isAddingCountry ? (
                    <>
                      <span className="btn-spinner" aria-hidden />
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add country'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </LoadScript>
  );
};

export default Map;