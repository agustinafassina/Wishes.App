"use client";

import { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

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

const Map = () => {
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);
  const [selectedLocation, setSelectedLocation] = useState<CountryLocation | null>(null);

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
          <p className="section-subtitle">Countries visited and on my wishlist</p>
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

        <div className="country-lists-container">
          <div className="country-card done">
            <div className="card-header">
              <div className="card-icon card-icon-done">✓</div>
              <h2 className="country-title">Completed</h2>
            </div>
            <div className="country-list-content">
              {doneLocations.length > 0 ? (
                doneLocations.map((location) => (
                  <div key={location.code} className="country-item country-item-done">
                    {location.flag && (
                      <img 
                        src={location.flag} 
                        alt={`${location.name} flag`} 
                        className="country-flag"
                      />
                    )}
                    <span className="country-name">{location.name}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No countries completed yet</p>
              )}
            </div>
          </div>

          <div className="country-card in-review">
            <div className="card-header">
              <div className="card-icon card-icon-review">⏳</div>
              <h2 className="country-title">In Review</h2>
            </div>
            <div className="country-list-content">
              {inReviewLocations.length > 0 ? (
                inReviewLocations.map((location) => (
                  <div key={location.code} className="country-item country-item-review">
                    {location.flag && (
                      <img 
                        src={location.flag} 
                        alt={`${location.name} flag`} 
                        className="country-flag"
                      />
                    )}
                    <span className="country-name">{location.name}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No countries in review</p>
              )}
            </div>
          </div>

          <div className="country-card pending">
            <div className="card-header">
              <div className="card-icon card-icon-pending">○</div>
              <h2 className="country-title">Pending</h2>
            </div>
            <div className="country-list-content">
              {pendingLocations.length > 0 ? (
                pendingLocations.map((location) => (
                  <div key={location.code} className="country-item country-item-pending">
                    {location.flag && (
                      <img 
                        src={location.flag} 
                        alt={`${location.name} flag`} 
                        className="country-flag"
                      />
                    )}

                    <span className="country-name">{location.name}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">No pending countries</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </LoadScript>
  );
};

export default Map;