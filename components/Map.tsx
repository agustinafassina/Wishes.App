"use client";

import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
  tag?: string;
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
}

// Draggable Country Item Component
const DraggableCountryItem = ({
  location,
  status,
  onDelete,
  onEditNotes,
  onViewNotes,
  isDeleting,
}: {
  location: CountryLocation;
  status: string;
  onDelete: (id: string) => void;
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
    if (window.confirm(`Delete "${location.name}" from the list?`)) {
      onDelete(location.id);
    }
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
  if (isDone) {
    if (location.visitedAt?.trim()) tooltipLines.push({ text: `Visited in ${location.visitedAt.trim()}` });
    if (notesPreview) tooltipLines.push({ text: notesPreview, className: 'country-item-tooltip-notes' });
    if (tooltipLines.length === 0 && !location.tag?.trim()) tooltipLines.push({ text: 'No notes yet' });
  } else {
    tooltipLines.push({ text: status === 'in review' ? 'In review' : 'Pending' });
  }
  const tagTrimmed = location.tag?.trim();

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
        {tagTrimmed && (
          <span className="country-item-tooltip-tag-pill">
            <svg className="country-item-tooltip-tag-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            {tagTrimmed}
          </span>
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
  onDeleteCountry,
  onEditNotes,
  onViewNotes,
  onSortClick,
  sortOrder,
  deletingId,
}: { 
  id: string;
  title: string;
  icon: string;
  locations: CountryLocation[];
  status: string;
  emptyMessage: string;
  onDoubleClick: () => void;
  onDeleteCountry: (id: string) => void;
  onEditNotes?: (loc: CountryLocation) => void;
  onViewNotes?: (loc: CountryLocation) => void;
  onSortClick?: (columnId: string) => void;
  sortOrder?: 'a-z' | 'z-a';
  deletingId?: string | null;
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
              onDelete={onDeleteCountry}
              onEditNotes={onEditNotes}
              onViewNotes={onViewNotes}
              isDeleting={deletingId === location.id}
            />
          ))
        ) : (
          <p className="empty-state">{emptyMessage}</p>
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

const Map = ({ onExportPDF, isExporting = false, shareUserName = 'My progress' }: MapProps) => {
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('pending');
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
  const [notesForm, setNotesForm] = useState({ notes: '', visitedAt: '', tag: '' });
  const [showViewModal, setShowViewModal] = useState(false);
  const [locationForView, setLocationForView] = useState<CountryLocation | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);

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
          tag: country.tag,
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
        throw new Error('Failed to update country status');
      }

      const result = await response.json();
      console.log('Country status updated in JSON:', result);
    } catch (error) {
      console.error('Error updating country status:', error);
      // Revert the optimistic update on error
      setLocations((prevLocations) => {
        return prevLocations.map((location) =>
          location.id === countryId
            ? { ...location, status: originalStatus }
            : location
        );
      });
      alert('Failed to update country status. Please try again.');
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
        throw new Error('Failed to add country');
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
        tag: country.tag,
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
      alert('Failed to add country. Please try again.');
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
      if (!response.ok) throw new Error('Failed to delete country');

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
        tag: country.tag,
      }));
      setLocations(reorderLocationsByColumnSort(places, columnSortRef.current));
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('Failed to delete country. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditNotes = (location: CountryLocation) => {
    setLocationForNotes(location);
    setNotesForm({
      notes: location.notes || '',
      visitedAt: location.visitedAt || '',
      tag: location.tag || '',
    });
    setNotesFormErrors({});
    setShowNotesModal(true);
  };

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
          tag: notesForm.tag.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to update notes');

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
        tag: country.tag,
      }));
      setLocations(reorderLocationsByColumnSort(places, columnSortRef.current));
      setShowNotesModal(false);
      setLocationForNotes(null);
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to save notes. Please try again.');
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

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch {
      alert('Could not copy link.');
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
      alert('Could not generate image.');
    } finally {
      setIsSharingImage(false);
    }
  };

  const mapOptions = {
    styles: [
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
    ],
    disableDefaultUI: false,
    zoomControl: true,
    zoomControlOptions: { position: 7 },
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    mapTypeId: "roadmap",
    backgroundColor: "#0a0e1a"
  };

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
        <div className="map-filters">
          <div className="filter-label">Filter by status:</div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilters.done ? 'active' : ''}`}
              onClick={() => handleFilterToggle('done')}
              aria-pressed={statusFilters.done}
            >
              <span className="filter-icon">✓</span>
              <span>Done</span>
            </button>
            <button
              className={`filter-btn ${statusFilters['in review'] ? 'active' : ''}`}
              onClick={() => handleFilterToggle('in review')}
              aria-pressed={statusFilters['in review']}
            >
              <span className="filter-icon">⏳</span>
              <span>In Review</span>
            </button>
            <button
              className={`filter-btn ${statusFilters.pending ? 'active' : ''}`}
              onClick={() => handleFilterToggle('pending')}
              aria-pressed={statusFilters.pending}
            >
              <span className="filter-icon">○</span>
              <span>Pending</span>
            </button>
          </div>
        </div>
        
        <div className="map-wrapper">
          <GoogleMap
            mapContainerClassName="map-container"
            mapContainerStyle={{ height: '500px', width: '100%', borderRadius: '16px' }}
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
                <div className="info-window">
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
        </div>

        <div className="progress-timeline">
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
              style={{ width: `${progressPercentage}%` }}
            >
              <span className="progress-percentage">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-remaining">
              <span className="progress-remaining-text">{remainingCount} remaining</span>
            </div>
          </div>
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
              icon="✓"
              locations={doneLocations}
              status="done"
              emptyMessage="No countries completed yet"
              onDoubleClick={() => handleColumnDoubleClick('done')}
              onDeleteCountry={handleDeleteCountry}
              onEditNotes={handleEditNotes}
              onViewNotes={handleViewNotes}
              onSortClick={handleColumnSort}
              sortOrder={columnSort.done}
              deletingId={deletingId}
            />
            <DroppableColumn
              id="in review"
              title="In Review"
              icon="⏳"
              locations={inReviewLocations}
              status="in review"
              emptyMessage="No countries in review"
              onDoubleClick={() => handleColumnDoubleClick('in review')}
              onDeleteCountry={handleDeleteCountry}
              onSortClick={handleColumnSort}
              sortOrder={columnSort['in review']}
              deletingId={deletingId}
            />
            <DroppableColumn
              id="pending"
              title="Pending"
              icon="○"
              locations={pendingLocations}
              status="pending"
              emptyMessage="No pending countries"
              onDoubleClick={() => handleColumnDoubleClick('pending')}
              onDeleteCountry={handleDeleteCountry}
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
                    {locationForView.tag && (
                      <span className="view-modal-tag">
                        <svg className="view-modal-tag-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        {locationForView.tag}
                      </span>
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
          <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Notes and visit date — {locationForNotes.name}</h2>
                <button className="modal-close" onClick={() => setShowNotesModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="notes-tag">Word that identifies this country</label>
                  <input
                    id="notes-tag"
                    type="text"
                    value={notesForm.tag}
                    onChange={(e) => setNotesForm({ ...notesForm, tag: e.target.value })}
                    placeholder="e.g. color, cleanliness, madness"
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
                <button className="btn-cancel" onClick={() => setShowNotesModal(false)} disabled={isSavingNotes}>Cancel</button>
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
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Add new country</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
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
                <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
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