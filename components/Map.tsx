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
const DraggableCountryItem = ({ location, status }: { location: CountryLocation; status: string }) => {
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

  // Map status for CSS class (replace spaces with hyphens)
  const statusClass = status.replace(/\s+/g, '-');

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
  onDoubleClick
}: { 
  id: string;
  title: string;
  icon: string;
  locations: CountryLocation[];
  status: string;
  emptyMessage: string;
  onDoubleClick: () => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  // Map status for CSS class (replace spaces with hyphens)
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
            <DraggableCountryItem key={location.code} location={location} status={status} />
          ))
        ) : (
          <p className="empty-state">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
};

const Map = () => {
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('pending');
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

  const filteredLocations = locations.filter(location => location.status === 'done');

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
      alert('Error al actualizar el estado del país. Por favor, intenta nuevamente.');
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
      alert('Por favor completa todos los campos requeridos (nombre, código, latitud, longitud)');
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
      alert('Error al agregar el país. Por favor, intenta nuevamente.');
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
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true
  };

  return (
    <LoadScript googleMapsApiKey={API_KEY}>
      <div className="map-section">
        <div className="map-header">
          <h2 className="section-title">My Travel Map</h2>
        </div>
        
        <div className="map-wrapper">
          <GoogleMap
            mapContainerStyle={{ height: '500px', width: '100%' }}
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
            />
            <DroppableColumn
              id="in review"
              title="In Review"
              icon="⏳"
              locations={inReviewLocations}
              status="in review"
              emptyMessage="No countries in review"
              onDoubleClick={() => handleColumnDoubleClick('in review')}
            />
            <DroppableColumn
              id="pending"
              title="Pending"
              icon="○"
              locations={pendingLocations}
              status="pending"
              emptyMessage="No pending countries"
              onDoubleClick={() => handleColumnDoubleClick('pending')}
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
                <h2 className="modal-title">Agregar Nuevo País</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="country-name">Nombre del País *</label>
                  <input
                    id="country-name"
                    type="text"
                    value={newCountry.name}
                    onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                    placeholder="Ej: Francia"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="country-code">Código del País (ISO) *</label>
                  <input
                    id="country-code"
                    type="text"
                    value={newCountry.code}
                    onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                    placeholder="Ej: FR"
                    maxLength={2}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="country-latitude">Latitud *</label>
                    <input
                      id="country-latitude"
                      type="number"
                      step="any"
                      value={newCountry.latitude}
                      onChange={(e) => setNewCountry({ ...newCountry, latitude: e.target.value })}
                      placeholder="Ej: 46.2276"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country-longitude">Longitud *</label>
                    <input
                      id="country-longitude"
                      type="number"
                      step="any"
                      value={newCountry.longitude}
                      onChange={(e) => setNewCountry({ ...newCountry, longitude: e.target.value })}
                      placeholder="Ej: 2.2137"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="country-flag">URL de la Bandera (opcional)</label>
                  <input
                    id="country-flag"
                    type="text"
                    value={newCountry.flag}
                    onChange={(e) => setNewCountry({ ...newCountry, flag: e.target.value })}
                    placeholder="Dejar vacío para usar flagcdn.com automático"
                  />
                </div>
                <div className="form-group">
                  <label>Estado: <strong>{targetStatus}</strong></label>
                  <p className="form-help">Este país se agregará a la columna "{targetStatus}"</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button className="btn-submit" onClick={handleAddCountry}>
                  Agregar País
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