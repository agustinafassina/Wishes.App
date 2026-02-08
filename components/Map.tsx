"use client";

import { useEffect, useState } from 'react';
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
  name: string;
  code: string;
  position: {
    lat: number;
    lng: number;
  };
  photos: string[]; 
  status: string;
  flag?: string;
}

interface CountryData {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  photos: string[];
  status: string;
  flag?: string;
}

// Draggable Country Item Component
const DraggableCountryItem = ({ location, status, onDelete }: { location: CountryLocation; status: string; onDelete: (code: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: location.code,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const statusClass = status.replace(/\s+/g, '-');

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(`¿Borrar "${location.name}" de la lista?`)) {
      onDelete(location.code);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`country-item country-item-${statusClass} ${isDragging ? 'dragging' : ''}`}
    >
      {location.flag && (
        <img 
          src={location.flag} 
          alt={`${location.name} flag`} 
          className="country-flag"
        />
      )}
      <span className="country-name">{location.name}</span>
      <button
        type="button"
        className="country-item-delete-btn"
        onClick={handleDeleteClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Borrar ${location.name}`}
        title="Borrar país"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
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
  onDeleteCountry
}: { 
  id: string;
  title: string;
  icon: string;
  locations: CountryLocation[];
  status: string;
  emptyMessage: string;
  onDoubleClick: () => void;
  onDeleteCountry: (code: string) => void;
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
      </div>
      <div 
        ref={setNodeRef} 
        className={`country-list-content ${isOver ? 'drag-over' : ''}`}
      >
        {locations.length > 0 ? (
          locations.map((location) => (
            <DraggableCountryItem key={location.code} location={location} status={status} onDelete={onDeleteCountry} />
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
}

const Map = ({ onExportPDF, isExporting = false }: MapProps) => {
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
  const [newCountry, setNewCountry] = useState({
    name: '',
    code: '',
    latitude: '',
    longitude: '',
    flag: '',
    photos: [] as string[],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetch('/locations/web_locations.json')
      .then(response => response.json())
      .then((data: CountryData[]) => {
        const places: CountryLocation[] = data.map((country) => ({
          name: country.name,
          code: country.code,
          position: {
            lat: country.latitude,
            lng: country.longitude
          },
          photos: country.photos || [],
          status: country.status || "pending",
          flag: country.flag || ""
        }));

        setLocations(places);
        if (places.length > 0) {
          setMapCenter(places[0].position);
          setZoom(2);
        }
      })
      .catch(error => console.error('Error loading countries:', error));
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

    const countryCode = active.id as string;
    const newStatus = over.id as string;

    // Valid status values
    const validStatuses = ['done', 'in review', 'pending'];
    if (!validStatuses.includes(newStatus)) return;

    // Find the original location
    const originalLocation = locations.find(loc => loc.code === countryCode);
    if (!originalLocation) return;

    // If the status hasn't changed, don't do anything
    if (originalLocation.status === newStatus) return;

    // Save the original status for potential rollback
    const originalStatus = originalLocation.status;

    // Optimistically update the UI
    setLocations((prevLocations) => {
      return prevLocations.map((location) =>
        location.code === countryCode
          ? { ...location, status: newStatus }
          : location
      );
    });

    // Update the JSON file via API
    try {
      const response = await fetch('/api/update-country', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode,
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
          location.code === countryCode
            ? { ...location, status: originalStatus }
            : location
        );
      });
      alert('Failed to update country status. Please try again.');
    }
  };

  const getActiveCountry = () => {
    if (!activeId) return null;
    return locations.find(loc => loc.code === activeId) || null;
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
    setShowAddModal(true);
  };

  const handleAddCountry = async () => {
    // Validate required fields
    if (!newCountry.name || !newCountry.code || !newCountry.latitude || !newCountry.longitude) {
      alert('Please complete all required fields (name, code, latitude, longitude)');
      return;
    }

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
        name: country.name,
        code: country.code,
        position: {
          lat: country.latitude,
          lng: country.longitude
        },
        photos: country.photos || [],
        status: country.status || "pending",
        flag: country.flag || ""
      }));

      setLocations(places);
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
    }
  };

  const handleDeleteCountry = async (countryCode: string) => {
    try {
      const response = await fetch('/api/delete-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode }),
      });
      if (!response.ok) throw new Error('Failed to delete country');

      const locationsResponse = await fetch('/locations/web_locations.json');
      const locationsData = await locationsResponse.json();
      const places: CountryLocation[] = locationsData.map((country: CountryData) => ({
        name: country.name,
        code: country.code,
        position: { lat: country.latitude, lng: country.longitude },
        photos: country.photos || [],
        status: country.status || 'pending',
        flag: country.flag || '',
      }));
      setLocations(places);
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('No se pudo borrar el país. Intentá de nuevo.');
    }
  };

  const doneLocations = locations.filter(location => location.status === 'done');
  const pendingLocations = locations.filter(location => location.status === 'pending');
  const inReviewLocations = locations.filter(location => location.status === 'in review');
  
  // Total countries in the world (UN recognized)
  const TOTAL_COUNTRIES = 195;
  const visitedCount = doneLocations.length;
  const remainingCount = TOTAL_COUNTRIES - visitedCount;
  const progressPercentage = (visitedCount / TOTAL_COUNTRIES) * 100;

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
        <div className="map-header">
          <h2 className="section-title">Travel Map</h2>
        </div>

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
                  key={location.code} 
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
                        alt={`${selectedLocation.name} flag`} 
                        className="info-window-flag"
                      />
                    )}
                    <h3 className="info-window-title">{selectedLocation.name}</h3>
                  </div>
                  {selectedLocation.photos && selectedLocation.photos.length > 0 && (
                    <div className="info-window-photos">
                      {selectedLocation.photos.slice(0, 3).map((photo, photoIndex) => (
                        <img 
                          key={photoIndex} 
                          src={photo} 
                          alt={`Photo from ${selectedLocation.name}`} 
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
            <div className="progress-stats">
              <span className="progress-visited">{visitedCount}</span>
              <span className="progress-separator">/</span>
              <span className="progress-total">{TOTAL_COUNTRIES}</span>
              <span className="progress-label">countries visited</span>
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
                    onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                    placeholder="Ex: France"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="country-code">Country code (ISO) *</label>
                  <input
                    id="country-code"
                    type="text"
                    value={newCountry.code}
                    onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: FR"
                    maxLength={2}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="country-latitude">Latitude *</label>
                    <input
                      id="country-latitude"
                      type="number"
                      step="any"
                      value={newCountry.latitude}
                      onChange={(e) => setNewCountry({ ...newCountry, latitude: e.target.value })}
                      placeholder="Ex: 46.2276"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country-longitude">Longitude *</label>
                    <input
                      id="country-longitude"
                      type="number"
                      step="any"
                      value={newCountry.longitude}
                      onChange={(e) => setNewCountry({ ...newCountry, longitude: e.target.value })}
                      placeholder="Ex: 2.2137"
                    />
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
                <button className="btn-submit" onClick={handleAddCountry}>
                  Add country
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadScript>
  );
};

export default Map;