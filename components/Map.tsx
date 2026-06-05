"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useToast } from './ToastContext';
import { getApiErrorDisplay } from '@/lib/api-error-display';
import { env } from '@/lib/env';
import { hapticLight, hapticSuccess } from '@/lib/haptic';
import type { CountryLocation } from '@/types/country';
import {
  AddCountryModal,
  CountryListCard,
  DashboardSkeleton,
  EmptyState,
  getEmptyStateCopy,
  getFirstUseEmptyStateCopy,
  getListSearchResultsAnnouncement,
  getStatusDisplayLabel,
  MapPopup,
  matchesCountrySearch,
  normalizeTags,
  NotesModal,
  ShareModal,
  statusFiltersForListTab,
  ViewModal,
} from '@/components/map/index';
import type { ListTabFilterId } from '@/components/map/index';
import { useLocations } from '@/hooks/useLocations';
import { useCountryActions } from '@/hooks/useCountryActions';
import ConfirmModal from './ConfirmModal';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const API_KEY = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const MAP_ZOOM_MIN = 1;
const MAP_ZOOM_MAX = 18;

function MapZoomControls({
  onZoomIn,
  onZoomOut,
  zoom,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}) {
  return (
    <div className="map-custom-controls" role="group" aria-label="Map zoom controls">
      <button
        type="button"
        className="map-zoom-btn"
        onClick={onZoomIn}
        disabled={zoom >= MAP_ZOOM_MAX}
        aria-label="Zoom in"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        className="map-zoom-btn"
        onClick={onZoomOut}
        disabled={zoom <= MAP_ZOOM_MIN}
        aria-label="Zoom out"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

interface MapProps {
  shareUserName?: string;

  triggerOpenAddModal?: number;
}

const Map = ({ shareUserName = 'My progress', triggerOpenAddModal = 0 }: MapProps) => {
  const toast = useToast();
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [columnSort, setColumnSort] = useState<Record<string, 'a-z' | 'z-a'>>({
    done: 'a-z',
    'in review': 'a-z',
    pending: 'a-z',
  });
  const columnSortRef = useRef(columnSort);
  columnSortRef.current = columnSort;
  const getColumnSort = useCallback(() => columnSortRef.current, []);

  const { locations, setLocations, isLoadingLocations, refetchLocations, reorderByColumnSort } = useLocations({
    getColumnSort,
    onFirstLoad: (pos) => {
      setMapCenter(pos);
      setZoom(2);
    },
  });

  const { deleteCountry, moveToStatus, saveNotes, addCountry } = useCountryActions({
    setLocations,
    refetchLocations,
    toast,
  });

  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pickingLocationFromMap, setPickingLocationFromMap] = useState(false);
  const pickingLocationFromMapRef = useRef(false);
  pickingLocationFromMapRef.current = pickingLocationFromMap;
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('pending');
  const [confirmDeleteLocation, setConfirmDeleteLocation] = useState<CountryLocation | null>(null);
  const [confirmLeaveModal, setConfirmLeaveModal] = useState<'add' | 'notes' | null>(null);
  const [listTabBelow, setListTabBelow] = useState<ListTabFilterId>('all');

  const statusFilters = useMemo(() => statusFiltersForListTab(listTabBelow), [listTabBelow]);
  const [listSearchQuery, setListSearchQuery] = useState('');
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
    if (triggerOpenAddModal <= 0) return;
    setTargetStatus('pending');
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
  }, [triggerOpenAddModal]);

  const filteredLocations = locations.filter(location => {
    return statusFilters[location.status as keyof typeof statusFilters] === true;
  });

  const handleMarkerClick = (countryLocation: CountryLocation): void => {
    setSelectedLocation(countryLocation);
  };

  const getMarkerIcon = useCallback((status: string) => {
    if (typeof window === 'undefined') return undefined;
    const g = (window as unknown as { google?: { maps?: { SymbolPath?: { CIRCLE: number } } } }).google;
    if (!g?.maps?.SymbolPath) return undefined;
    const colors: Record<string, string> = { done: '#059669', 'in review': '#d97706', pending: '#dc2626' };
    return {
      path: g.maps.SymbolPath.CIRCLE,
      fillColor: colors[status] || colors.pending,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10,
    };
  }, []);

  const handleMoveToStatus = async (location: CountryLocation, newStatus: string) => {
    setIsSavingStatus(true);
    try {
      await moveToStatus(location, newStatus);
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
    const flagUrl = newCountry.flag || `https://flagcdn.com/w40/${newCountry.code.toLowerCase()}.png`;
    const payload = {
      name: newCountry.name,
      code: newCountry.code.toUpperCase(),
      latitude: parseFloat(newCountry.latitude),
      longitude: parseFloat(newCountry.longitude),
      flag: flagUrl,
      photos: newCountry.photos.filter(p => p.trim() !== ''),
      status: targetStatus,
    };
    try {
      await addCountry(payload);
      setShowAddModal(false);
      hapticSuccess();
      setNewCountry({ name: '', code: '', latitude: '', longitude: '', flag: '', photos: [] });
    } catch (error) {
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
      await deleteCountry(location);
      hapticSuccess();
    } catch (error) {
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

  const handleMapZoomChanged = useCallback(() => {
    const z = mapInstanceRef.current?.getZoom();
    if (typeof z === 'number') setZoom(z);
  }, []);

  const handleZoomIn = useCallback(() => {
    hapticLight();
    const map = mapInstanceRef.current;
    const current = map?.getZoom() ?? zoom;
    const next = Math.min(current + 1, MAP_ZOOM_MAX);
    map?.setZoom(next);
    setZoom(next);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    hapticLight();
    const map = mapInstanceRef.current;
    const current = map?.getZoom() ?? zoom;
    const next = Math.max(current - 1, MAP_ZOOM_MIN);
    map?.setZoom(next);
    setZoom(next);
  }, [zoom]);

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
      await saveNotes(locationForNotes, {
        notes: notesForm.notes.trim() || undefined,
        visitedAt: notesForm.visitedAt.trim() || undefined,
        tags: notesForm.tags.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setShowNotesModal(false);
      setLocationForNotes(null);
    } catch (error) {
      toast.error(getApiErrorDisplay(error, 'Failed to save notes. Please try again.'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const doneLocations = locations.filter(location => location.status === 'done');
  const pendingLocations = locations.filter(location => location.status === 'pending');
  const inReviewLocations = locations.filter(location => location.status === 'in review');

  const sortedAllLocations = useMemo(
    () => reorderByColumnSort(locations, columnSort),
    [locations, columnSort, reorderByColumnSort]
  );

  const locationsForListTab = useMemo(() => {
    if (listTabBelow === 'all') return sortedAllLocations;
    if (listTabBelow === 'done') return doneLocations;
    if (listTabBelow === 'in review') return inReviewLocations;
    return pendingLocations;
  }, [listTabBelow, sortedAllLocations, doneLocations, inReviewLocations, pendingLocations]);

  const listSearchTrimmed = listSearchQuery.trim();

  const displayLocationsBelow = useMemo(() => {
    if (!listSearchTrimmed) return locationsForListTab;
    return locationsForListTab.filter((loc) => matchesCountrySearch(loc, listSearchTrimmed));
  }, [locationsForListTab, listSearchTrimmed]);

  const listSearchAriaTarget = useMemo(
    () =>
      getListSearchResultsAnnouncement({
        query: listSearchTrimmed,
        resultCount: displayLocationsBelow.length,
        tabTotalCount: locationsForListTab.length,
        tab: listTabBelow,
      }),
    [listSearchTrimmed, displayLocationsBelow.length, locationsForListTab.length, listTabBelow]
  );

  const [listSearchAriaMessage, setListSearchAriaMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setListSearchAriaMessage(listSearchAriaTarget);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [listSearchAriaTarget]);

  const handleListSort = useCallback(() => {
    hapticLight();
    if (listTabBelow === 'all') {
      const current =
        columnSort.done === columnSort['in review'] && columnSort.done === columnSort.pending
          ? columnSort.done
          : 'a-z';
      const nextOrder: 'a-z' | 'z-a' = current === 'a-z' ? 'z-a' : 'a-z';
      const nextSort = { done: nextOrder, 'in review': nextOrder, pending: nextOrder };
      setColumnSort(nextSort);
      setLocations((prev) => reorderByColumnSort(prev, nextSort));
      return;
    }
    const nextOrder: 'a-z' | 'z-a' = columnSort[listTabBelow] === 'a-z' ? 'z-a' : 'a-z';
    const nextSort = { ...columnSort, [listTabBelow]: nextOrder };
    setColumnSort(nextSort);
    setLocations((prev) => reorderByColumnSort(prev, nextSort));
  }, [listTabBelow, columnSort, reorderByColumnSort, setLocations]);

  const listSortOrder = useMemo((): 'a-z' | 'z-a' => {
    if (listTabBelow === 'all') {
      const { done, 'in review': inReview, pending } = columnSort;
      if (done === inReview && done === pending) return done;
      return 'a-z';
    }
    return columnSort[listTabBelow];
  }, [listTabBelow, columnSort]);

  const showListSort = locationsForListTab.length > 1;

  const TOTAL_COUNTRIES = 195;
  const visitedCount = doneLocations.length;
  const remainingCount = TOTAL_COUNTRIES - visitedCount;
  const progressPercentage = (visitedCount / TOTAL_COUNTRIES) * 100;

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

  const milestone = visitedCount >= 10
    ? { label: `${visitedCount} countries!`, emoji: visitedCount >= 100 ? '🎉' : visitedCount >= 50 ? '🌟' : '🌍' }
    : null;

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
      zoomControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      scaleControl: false,
      rotateControl: false,
      mapTypeId: "roadmap",
      backgroundColor: isLight ? "#f8fafc" : "#0a0e1a"
    };
  }, [mapTheme]);

  const applyListTab = useCallback((tab: ListTabFilterId) => {
    hapticLight();
    setListTabBelow(tab);
  }, []);

  const handleMapStatusFilter = useCallback(
    (status: 'done' | 'in review' | 'pending') => {
      applyListTab(status);
    },
    [applyListTab]
  );

  const isFirstUse = locations.length === 0 && !pickingLocationFromMap && !isLoadingLocations;

  return (
    <LoadScript googleMapsApiKey={API_KEY}>
      <div className={`map-section${isFirstUse ? ' map-section--first-use' : ''}`}>
        {isSavingStatus && (
          <div className="saving-status-banner" role="status" aria-live="polite">
            <span className="saving-status-spinner" aria-hidden />
            <span>Saving...</span>
          </div>
        )}
        {isLoadingLocations ? (
          <DashboardSkeleton />
        ) : (
        <>
        {locations.length > 0 && (
        <div className="stats-bubbles" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`stats-bubble stats-bubble-done ${listTabBelow === 'done' || listTabBelow === 'all' ? 'stats-bubble--active' : ''}`}
            onClick={() => handleMapStatusFilter('done')}
            aria-pressed={listTabBelow === 'done' || listTabBelow === 'all'}
            title="Show Complete on map and list"
          >
            <span className="stats-bubble-number">{doneLocations.length}</span>
            <span className="stats-bubble-label">{getStatusDisplayLabel('done')}</span>
          </button>
          <button
            type="button"
            className={`stats-bubble stats-bubble-in-review ${listTabBelow === 'in review' || listTabBelow === 'all' ? 'stats-bubble--active' : ''}`}
            onClick={() => handleMapStatusFilter('in review')}
            aria-pressed={listTabBelow === 'in review' || listTabBelow === 'all'}
            title="Show Review on map and list"
          >
            <span className="stats-bubble-number">{inReviewLocations.length}</span>
            <span className="stats-bubble-label">{getStatusDisplayLabel('in review')}</span>
          </button>
          <button
            type="button"
            className={`stats-bubble stats-bubble-pending ${listTabBelow === 'pending' || listTabBelow === 'all' ? 'stats-bubble--active' : ''}`}
            onClick={() => handleMapStatusFilter('pending')}
            aria-pressed={listTabBelow === 'pending' || listTabBelow === 'all'}
            title="Show To Do on map and list"
          >
            <span className="stats-bubble-number">{pendingLocations.length}</span>
            <span className="stats-bubble-label">{getStatusDisplayLabel('pending')}</span>
          </button>
        </div>
        )}

        {locations.length > 0 && (
        <section className="quick-actions" aria-label="Quick actions">
          <h2 className="quick-actions-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <button
              type="button"
              className="quick-action-btn quick-action-btn-share"
              onClick={() => {
                hapticLight();
                setShowShareModal(true);
              }}
              aria-label="Share travel progress"
            >
              <span className="quick-action-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </span>
              <span className="quick-action-label">Share</span>
            </button>
            <button
              type="button"
              className="quick-action-btn quick-action-btn-list"
              onClick={() => {
                hapticLight();
                document.getElementById('country-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={locations.length === 0}
              aria-label={locations.length === 0 ? 'View list (add a country first)' : 'Go to country list'}
            >
              <span className="quick-action-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </span>
              <span className="quick-action-label">View list</span>
            </button>
          </div>
        </section>
        )}
        <ShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          onCopyLink={handleCopyShareLink}
          onDownloadImage={handleDownloadShareImage}
          shareLinkCopied={shareLinkCopied}
          isSharingImage={isSharingImage}
        />

        {locations.length > 0 ? (
        <div className="dashboard-map-panel">
        <div id="travel-map" className="map-header map-header--unified">
          <div className="map-header-top">
            <div className="map-world-map-row" role="group" aria-label="World map section">
              <h2 className="map-world-map-title">World Map</h2>
              {locations.length > 0 && (
                <div className="map-header-toolbar map-header-toolbar--inline" role="group" aria-label="Filter map by status">
                  <div className="map-header-toolbar-pills map-header-toolbar-pills--legend-style" role="group" aria-label="Filter map and switch list column">
                    <button
                      type="button"
                      className={`filter-btn filter-btn-done ${listTabBelow === 'done' || listTabBelow === 'all' ? 'active' : ''}`}
                      onClick={() => handleMapStatusFilter('done')}
                      aria-pressed={listTabBelow === 'done' || listTabBelow === 'all'}
                      title="Show Complete on map and list"
                    >
                      <span className="filter-btn-dot" aria-hidden />
                      <span className="filter-btn-label">Complete</span>
                      {doneLocations.length > 0 && (
                        <span className="filter-btn-count">{doneLocations.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`filter-btn filter-btn-in-review ${listTabBelow === 'in review' || listTabBelow === 'all' ? 'active' : ''}`}
                      onClick={() => handleMapStatusFilter('in review')}
                      aria-pressed={listTabBelow === 'in review' || listTabBelow === 'all'}
                      title="Show Review on map and list"
                    >
                      <span className="filter-btn-dot" aria-hidden />
                      <span className="filter-btn-label">Review</span>
                      {inReviewLocations.length > 0 && (
                        <span className="filter-btn-count">{inReviewLocations.length}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`filter-btn filter-btn-pending ${listTabBelow === 'pending' || listTabBelow === 'all' ? 'active' : ''}`}
                      onClick={() => handleMapStatusFilter('pending')}
                      aria-pressed={listTabBelow === 'pending' || listTabBelow === 'all'}
                      title="Show To Do on map and list"
                    >
                      <span className="filter-btn-dot" aria-hidden />
                      <span className="filter-btn-label">To Do</span>
                      {pendingLocations.length > 0 && (
                        <span className="filter-btn-count">{pendingLocations.length}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
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
          </div>
            {locations.length > 0 && (
            <div className="map-section-map-wrap map-section-map-wrap--inside-header">
              <div
                id="map-wrapper-id"
                className={`map-wrapper ${pickingLocationFromMap ? 'map-wrapper--picking' : ''}`}
              >
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
                  mapContainerStyle={{ height: '100%', width: '100%', borderRadius: 0 }}
                  center={mapCenter}
                  zoom={zoom}
                  options={mapOptions}
                  onLoad={handleMapLoad}
                  onZoomChanged={handleMapZoomChanged}
                  onClick={handleMapClick}
                >
                {filteredLocations.map((location) => {
                  const countryLocation: CountryLocation = location;
                  return (
                    <Marker
                      key={location.id}
                      position={location.position}
                      title={location.name}
                      icon={getMarkerIcon(location.status)}
                      onClick={() => handleMarkerClick(countryLocation)}
                    />
                  );
                })}
                {selectedLocation && (
                  <InfoWindow
                    position={selectedLocation.position}
                    onCloseClick={() => setSelectedLocation(null)}
                  >
                    <MapPopup location={selectedLocation} />
                  </InfoWindow>
                )}
                </GoogleMap>
                <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} zoom={zoom} />
                </>
              </div>
              <div className="map-legend" role="group" aria-label="Map legend">
                  <span className="map-legend-item map-legend-item--done">
                    <span className="map-legend-dot" aria-hidden />
                    <span className="map-legend-label">Complete</span>
                  </span>
                  <span className="map-legend-item map-legend-item--in-review">
                    <span className="map-legend-dot" aria-hidden />
                    <span className="map-legend-label">Review</span>
                  </span>
                  <span className="map-legend-item map-legend-item--pending">
                    <span className="map-legend-dot" aria-hidden />
                    <span className="map-legend-label">To Do</span>
                  </span>
                </div>
            </div>
            )}
        </div>

          <section id="country-list" className="list-section-below-map" aria-label="Country list">
            <div className="list-tabs-bar">
              <div className="list-tabs-wrap" role="tablist" aria-label="Filter list by status">
                <button
                  type="button"
                  role="tab"
                  className={`list-tab ${listTabBelow === 'all' ? 'list-tab--active' : ''}`}
                  aria-selected={listTabBelow === 'all'}
                  onClick={() => applyListTab('all')}
                >
                  All ({locations.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`list-tab ${listTabBelow === 'done' ? 'list-tab--active' : ''}`}
                  aria-selected={listTabBelow === 'done'}
                  onClick={() => applyListTab('done')}
                >
                  Complete ({doneLocations.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`list-tab ${listTabBelow === 'in review' ? 'list-tab--active' : ''}`}
                  aria-selected={listTabBelow === 'in review'}
                  onClick={() => applyListTab('in review')}
                >
                  Review ({inReviewLocations.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`list-tab ${listTabBelow === 'pending' ? 'list-tab--active' : ''}`}
                  aria-selected={listTabBelow === 'pending'}
                  onClick={() => applyListTab('pending')}
                >
                  To Do ({pendingLocations.length})
                </button>
              </div>
              <div className="list-search-wrap">
                {showListSort && (
                  <button
                    type="button"
                    className="list-sort-btn"
                    onClick={handleListSort}
                    title={listSortOrder === 'z-a' ? 'Sort A–Z' : 'Sort Z–A'}
                    aria-label={listSortOrder === 'z-a' ? 'Sort A–Z' : 'Sort Z–A'}
                  >
                    {listSortOrder === 'z-a' ? 'Z–A' : 'A–Z'}
                  </button>
                )}
                <label className="list-search" htmlFor="country-list-search">
                  <span className="list-search-label">Search countries</span>
                  <svg className="list-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="country-list-search"
                    type="search"
                    className="list-search-input"
                    placeholder="Search…"
                    value={listSearchQuery}
                    onChange={(e) => setListSearchQuery(e.target.value)}
                    aria-label="Search countries in list"
                    aria-describedby="country-list-search-results"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {listSearchQuery.length > 0 && (
                    <button
                      type="button"
                      className="list-search-clear"
                      onClick={() => setListSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </label>
                <p
                  id="country-list-search-results"
                  className="sr-only"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {listSearchAriaMessage}
                </p>
              </div>
            </div>
            {listTabBelow === 'done' && (
            <div className="progress-bar-standalone progress-bar-standalone--below-map" role="region" aria-label="Travel progress">
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
                    </div>
                  </div>
                  {milestone && (
                    <p className="progress-bar-standalone-milestone" role="status" aria-live="polite">
                      <span className="progress-bar-standalone-milestone-emoji">{milestone.emoji}</span>
                      <span>{milestone.label}</span>
                    </p>
                  )}
            </div>
            )}
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
            <div className="list-section-below-map-content">
              <div className="country-list-scroll country-list-scroll--standalone">
                {displayLocationsBelow.length > 0 ? (
                  displayLocationsBelow.map((loc) => (
                    <CountryListCard
                      key={loc.id}
                      location={loc}
                      status={loc.status}
                      onRequestDelete={(l: CountryLocation) => setConfirmDeleteLocation(l)}
                      onEditNotes={handleEditNotes}
                      onViewNotes={handleViewNotes}
                      onMoveToStatus={handleMoveToStatus}
                      isDeleting={deletingId === loc.id}
                    />
                  ))
                ) : (
                  <EmptyState
                    variant="inline"
                    {...getEmptyStateCopy({
                      search: listSearchTrimmed || undefined,
                      tab: listTabBelow,
                    })}
                    onAddCountry={() => {
                      hapticLight();
                      handleColumnDoubleClick('pending');
                    }}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
        ) : null}

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
                    onZoomChanged={handleMapZoomChanged}
                    onClick={handleMapClick}
                  />
                  <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} zoom={zoom} />
                </div>
              </div>
            ) : (
            <EmptyState
              variant="hero"
              primaryCta
              {...getFirstUseEmptyStateCopy()}
              onAddCountry={() => handleColumnDoubleClick('pending')}
              isAdding={isAddingCountry}
            />
            )
          ) : (
          <>

        <ViewModal
          ref={viewModalRef}
          location={showViewModal ? locationForView : null}
          onClose={() => setShowViewModal(false)}
        />

          </>
          )}

        <NotesModal
          ref={notesModalRef}
          open={showNotesModal && !!locationForNotes}
          location={locationForNotes}
          form={notesForm}
          errors={notesFormErrors}
          isSaving={isSavingNotes}
          onClose={requestCloseNotesModal}
          onFormChange={setNotesForm}
          onSave={handleSaveNotes}
          onClearError={(field) => setNotesFormErrors((prev) => ({ ...prev, [field]: '' }))}
        />

        <AddCountryModal
          ref={addModalRef}
          open={showAddModal}
          form={newCountry}
          errors={addCountryErrors}
          targetStatus={targetStatus}
          isAdding={isAddingCountry}
          onClose={requestCloseAddModal}
          onFormChange={setNewCountry}
          onClearError={(field) => setAddCountryErrors((prev) => ({ ...prev, [field]: '' }))}
          onPickFromMap={startPickingFromMap}
          onSubmit={handleAddCountry}
        />
        </>
        )}
      </div>
    </LoadScript>
  );
};

export default Map;
