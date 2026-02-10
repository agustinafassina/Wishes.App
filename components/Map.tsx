"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useToast } from './ToastContext';
import ConfirmModal from './ConfirmModal';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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

// Draggable Country Item Component
const DraggableCountryItem = ({
  location,
  status,
  onRequestDelete,
  onEditNotes,
  onViewNotes,
  isDeleting,
}: {
  location: CountryLocation;
  status: string;
  onRequestDelete: (loc: CountryLocation) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  isDeleting?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: location.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`country-item country-item-${statusClass} ${isDragging ? 'dragging' : ''} ${isDeleting ? 'item-deleting' : ''}`}
    >
      {isDeleting && (
        <div className="country-item-deleting-overlay" aria-hidden>
          <span className="country-item-deleting-spinner" />
          <span>Deleting...</span>
        </div>
      )}
      <div className="country-item-tooltip" role="tooltip">
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
        <span className="country-name">{location.name}</span>
      </div>
      <div className="country-item-actions">
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
    </div>
  );
};

// Droppable Column Component
const DroppableColumn = ({ 
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
  onSortClick?: (columnId: string) => void;
  sortOrder?: 'a-z' | 'z-a';
  deletingId?: string | null;
  onEmptyCtaClick?: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

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
      <div 
        ref={setNodeRef} 
        className={`country-list-content ${isOver ? 'drag-over' : ''}`}
      >
        {locations.length > 0 ? (
          locations.map((location) => (
            <DraggableCountryItem
              key={location.id}
              location={location}
              status={status}
              onRequestDelete={onRequestDelete}
              onEditNotes={onEditNotes}
              onViewNotes={onViewNotes}
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
              <p className="empty-state-hint">Drag one from another column or add below.</p>
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
  );
};

interface MapProps {
  onExportPDF?: () => void;
  isExporting?: boolean;
  shareUserName?: string;
}

function getApiErrorDisplay(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') return 'Network error. Please check your connection.';
    return error.message;
  }
  return fallback;
}

const Map = ({ onExportPDF, isExporting = false, shareUserName = 'My progress' }: MapProps) => {
  const toast = useToast();
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [locationForNotes, setLocationForNotes] = useState<CountryLocation | null>(null);
  const [notesForm, setNotesForm] = useState({ notes: '', visitedAt: '', tags: '' });
  const [showViewModal, setShowViewModal] = useState(false);
  const [locationForView, setLocationForView] = useState<CountryLocation | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
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
    fetch('/locations/web_locations.json')
      .then(response => response.json())
      .then((data: CountryData[]) => {
        const places: CountryLocation[] = data.map((country) => ({
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
      .catch(error => {
        console.error('Error loading countries:', error);
      })
      .finally(() => setIsLoadingLocations(false));
  }, []);

  const filteredLocations = locations.filter(location => {
    return statusFilters[location.status as keyof typeof statusFilters] === true;
  });

  const handleMarkerClick = (countryLocation: CountryLocation): void => {
    setSelectedLocation(countryLocation);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const countryId = active.id as string;
    const newStatus = over.id as string;

    // Valid status values
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(newStatus)) return;

    // Find the original location
    const originalLocation = locations.find(loc => loc.id === countryId);
    if (!originalLocation) return;

    // If the status hasn't changed, don't do anything
    if (originalLocation.status === newStatus) return;

    // Save the original status for potential rollback
    const originalStatus = originalLocation.status;

    // Optimistically update the UI
    setLocations((prevLocations) => {
      return prevLocations.map((location) =>
        location.id === countryId
          ? { ...location, status: newStatus }
          : location
      );
    });

    // Update the JSON file via API
    setIsSavingStatus(true);
    try {
      const response = await fetch('/api/update-country', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: originalLocation.code,
          countryName: originalLocation.name,
          newStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data?.error === 'string' ? data.error : `Error (${response.status})`);
      }

      const result = await response.json();
      console.log('Country status updated in JSON:', result);
    } catch (error) {
      console.error('Error updating country status:', error);
      setLocations((prevLocations) => {
        return prevLocations.map((location) =>
          location.id === countryId
            ? { ...location, status: originalStatus }
            : location
        );
      });
      toast.error(getApiErrorDisplay(error, 'Failed to update country status. Please try again.'));
    } finally {
      setIsSavingStatus(false);
    }
  };

  const getActiveCountry = () => {
    if (!activeId) return null;
    return locations.find(loc => loc.id === activeId) || null;
  };

  const handleColumnDoubleClick = (status: string) => {
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

      // Reload locations from JSON
      const locationsResponse = await fetch('/locations/web_locations.json');
      const locationsData = await locationsResponse.json();
      const places: CountryLocation[] = locationsData.map((country: CountryData) => ({
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

      const locationsResponse = await fetch('/locations/web_locations.json');
      const locationsData = await locationsResponse.json();
      const places: CountryLocation[] = locationsData.map((country: CountryData) => ({
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
      setNewCountry({ name: '', code: '', latitude: '', longitude: '', flag: '', photos: [] });
    }
  };

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
      setNewCountry({ name: '', code: '', latitude: '', longitude: '', flag: '', photos: [] });
    } else if (confirmLeaveModal === 'notes') {
      setShowNotesModal(false);
      setLocationForNotes(null);
    }
    setConfirmLeaveModal(null);
  };

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

      const locationsResponse = await fetch('/locations/web_locations.json');
      const locationsData = await locationsResponse.json();
      const places: CountryLocation[] = locationsData.map((country: CountryData) => ({
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
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
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
        <div className="map-header">
          <h2 className="section-title">Travel Map</h2>
          <p className="section-subtitle">Filter, explore and track your countries</p>
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
          <div className="map-filters">
          <div className="filter-legend-wrap">
            <span className="filter-label">Filter by status</span>
            <span className="filter-legend">Select which to show on the map</span>
          </div>
          <div className="filter-buttons" role="group" aria-label="Filter map by status">
            <button
              type="button"
              className={`filter-btn filter-btn-done ${statusFilters.done ? 'active' : ''}`}
              onClick={() => handleFilterToggle('done')}
              aria-pressed={statusFilters.done}
              title={statusFilters.done ? 'Show done on map' : 'Hide done on map'}
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
              title={statusFilters['in review'] ? 'Show in review on map' : 'Hide in review on map'}
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
              title={statusFilters.pending ? 'Show pending on map' : 'Hide pending on map'}
            >
              <span className="filter-btn-dot" aria-hidden />
              <span className="filter-btn-label">Pending</span>
              {pendingLocations.length > 0 && (
                <span className="filter-btn-count">{pendingLocations.length}</span>
              )}
            </button>
          </div>
        </div>

        <div className="map-section-map-wrap">
          <button
            type="button"
            className="map-toggle-btn"
            onClick={() => setMapCollapsed((c) => !c)}
            aria-expanded={!mapCollapsed}
            aria-controls="map-wrapper-id"
          >
            {mapCollapsed ? (
              <>Show map</>
            ) : (
              <>Hide map</>
            )}
          </button>
          <div
            id="map-wrapper-id"
            className={`map-wrapper ${mapCollapsed ? 'map-wrapper--collapsed' : ''}`}
          >
            {!mapCollapsed && (
            <GoogleMap
              key={mapTheme}
              mapContainerClassName="map-container"
              mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '20px' }}
              center={mapCenter}
              zoom={zoom}
              options={mapOptions}
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
            )}
          </div>
        </div>

        <div className="progress-timeline">
          {celebratingMilestone !== null && (
            <div className="progress-celebration-banner" role="alert" aria-live="assertive">
              <span className="progress-celebration-emoji">🎉</span>
              <span className="progress-celebration-text">You reached {celebratingMilestone} countries!</span>
            </div>
          )}
          <div className="progress-header">
            <h3 className="progress-title">World Travel Progress</h3>
            <div className="progress-header-right">
              <div className="progress-stats">
                <span className="progress-visited">{visitedCount}</span>
                <span className="progress-separator">/</span>
                <span className="progress-total">{TOTAL_COUNTRIES}</span>
                <span className="progress-label">countries visited</span>
              </div>
              <div className="progress-share-wrap">
                <button
                  type="button"
                  className="btn-share-progress"
                  onClick={() => setShowShareModal(true)}
                  aria-label="Share progress"
                  title="Share progress"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      <h4 className="share-modal-title">Share your progress</h4>
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
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressDisplay}%` }}
            >
              <span className="progress-percentage">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-remaining">
              <span className="progress-remaining-text">{remainingCount} remaining</span>
            </div>
          </div>
          {milestone && (
            <p
              className={`progress-milestone${celebratingMilestone === visitedCount ? ' progress-milestone-celebrate' : ''}`}
              role="status"
              aria-live="polite"
            >
              <span className="progress-milestone-emoji">{milestone.emoji}</span>
              <span>{milestone.label}</span>
              {celebratingMilestone === visitedCount && (
                <span className="progress-milestone-toast"> — You hit {visitedCount} countries!</span>
              )}
            </p>
          )}
        </div>

        {/* Off-screen card for share image capture */}
        <div
          ref={shareCardRef}
          className="share-card-for-image"
          aria-hidden
        >
          <div className="share-card-inner">
            <p className="share-card-name">{shareUserName}</p>
            <p className="share-card-stats">{visitedCount} / {TOTAL_COUNTRIES} countries visited</p>
            <div className="share-card-bar-wrap">
              <div className="share-card-bar-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
            <p className="share-card-tagline">My travel bucket list</p>
          </div>
        </div>

        {onExportPDF && (
          <div className="export-pdf-container">
            <button 
              className="btn-export-pdf"
              onClick={onExportPDF}
              disabled={isExporting}
              aria-label="Export to PDF"
            >
              {isExporting ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="32" strokeLinecap="round">
                      <animate attributeName="stroke-dasharray" dur="1.5s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite" />
                      <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-16;-32;-32" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="stats-container">
          <div className="stat-card stat-done">
            <div className="stat-number">{doneLocations.length}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card stat-review">
            <div className="stat-number">{inReviewLocations.length}</div>
            <div className="stat-label">In Review</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-number">{pendingLocations.length}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="country-lists-container">
            <DroppableColumn
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
              onSortClick={handleColumnSort}
              sortOrder={columnSort.done}
              deletingId={deletingId}
            />
            <DroppableColumn
              id="in review"
              title="In Review"
              icon={<IconInReview />}
              locations={inReviewLocations}
              status="in review"
              emptyMessage="No countries in review"
              onDoubleClick={() => handleColumnDoubleClick('in review')}
              onEmptyCtaClick={() => handleColumnDoubleClick('in review')}
              onRequestDelete={(loc) => setConfirmDeleteLocation(loc)}
              onSortClick={handleColumnSort}
              sortOrder={columnSort['in review']}
              deletingId={deletingId}
            />
            <DroppableColumn
              id="pending"
              title="Pending"
              icon={<IconPending />}
              locations={pendingLocations}
              status="pending"
              emptyMessage="No pending countries"
              onDoubleClick={() => handleColumnDoubleClick('pending')}
              onEmptyCtaClick={() => handleColumnDoubleClick('pending')}
              onRequestDelete={(loc) => setConfirmDeleteLocation(loc)}
              onSortClick={handleColumnSort}
              sortOrder={columnSort.pending}
              deletingId={deletingId}
            />
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="country-item country-item-dragging">
                {getActiveCountry()?.flag && (
                  <img 
                    src={getActiveCountry()?.flag} 
                    alt={`${getActiveCountry()?.name} flag`} 
                    className="country-flag"
                  />
                )}
                <span className="country-name">{getActiveCountry()?.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* View notes modal (read-only) */}
        {showViewModal && locationForView && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content modal-content-view" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header modal-header-view">
                <div className="modal-header-view-top">
                  <div className="modal-title-wrap">
                    <h2 className="modal-title">{locationForView.name}</h2>
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

        {/* Notes & visit date modal (Done countries) */}
        {showNotesModal && locationForNotes && (
          <div className="modal-overlay" onClick={requestCloseNotesModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Notes and visit date — {locationForNotes.name}</h2>
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
          <div className="modal-overlay" onClick={requestCloseAddModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Add new country</h2>
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