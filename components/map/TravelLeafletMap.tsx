"use client";

import { useEffect, useMemo, type MutableRefObject } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { CountryLocation } from '@/types/country';
import MapPopup from './MapPopup';
import 'leaflet/dist/leaflet.css';

const STATUS_COLORS: Record<string, string> = {
  done: '#059669',
  'in review': '#d97706',
  pending: '#dc2626',
};

const CARTO_LIGHT =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const CARTO_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function statusDivIcon(status: string): L.DivIcon {
  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return L.divIcon({
    className: 'leaflet-status-marker',
    html: `<span class="leaflet-status-marker-dot" style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function MapViewSync({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

function MapEventBridge({
  picking,
  onMapClick,
  onZoomChange,
}: {
  picking: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (!picking) return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = picking ? 'crosshair' : '';
  }, [map, picking]);

  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(t);
  }, [map]);

  return null;
}

function ZoomBridge({
  mapRef,
}: {
  mapRef: MutableRefObject<L.Map | null>;
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

export interface TravelLeafletMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  theme: 'light' | 'dark';
  locations: CountryLocation[];
  selectedLocation: CountryLocation | null;
  pickingLocation: boolean;
  mapRef: MutableRefObject<L.Map | null>;
  onZoomChange: (zoom: number) => void;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerClick: (location: CountryLocation) => void;
  onPopupClose: () => void;
  className?: string;
  borderRadius?: string;
}

export default function TravelLeafletMap({
  center,
  zoom,
  theme,
  locations,
  selectedLocation,
  pickingLocation,
  mapRef,
  onZoomChange,
  onMapClick,
  onMarkerClick,
  onPopupClose,
  className = 'map-container',
  borderRadius = '0',
}: TravelLeafletMapProps) {
  const tileUrl = theme === 'light' ? CARTO_LIGHT : CARTO_DARK;
  const icons = useMemo(() => {
    const cache: Record<string, L.DivIcon> = {};
    for (const status of Object.keys(STATUS_COLORS)) {
      cache[status] = statusDivIcon(status);
    }
    return cache;
  }, []);

  return (
    <MapContainer
      className={className}
      center={[center.lat, center.lng]}
      zoom={zoom}
      minZoom={1}
      maxZoom={18}
      zoomControl={false}
      attributionControl
      style={{ height: '100%', width: '100%', borderRadius }}
    >
      <TileLayer key={theme} url={tileUrl} attribution={CARTO_ATTR} subdomains="abcd" maxZoom={20} />
      <MapViewSync center={center} zoom={zoom} />
      <MapEventBridge
        picking={pickingLocation}
        onMapClick={onMapClick}
        onZoomChange={onZoomChange}
      />
      <ZoomBridge mapRef={mapRef} />
      {locations.map((location) => (
        <Marker
          key={location.id}
          position={[location.position.lat, location.position.lng]}
          title={location.name}
          icon={icons[location.status] || icons.pending}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e.originalEvent);
              if (pickingLocation) return;
              onMarkerClick(location);
            },
          }}
        />
      ))}
      {selectedLocation && !pickingLocation ? (
        <Popup
          position={[selectedLocation.position.lat, selectedLocation.position.lng]}
          eventHandlers={{ remove: onPopupClose }}
        >
          <MapPopup location={selectedLocation} />
        </Popup>
      ) : null}
    </MapContainer>
  );
}
