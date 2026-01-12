"use client"; // Asegúrate de que este componente se ejecute en el cliente

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Icono para el marcador (opcional)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

const Map = () => {
  const [position, setPosition] = useState([51.505, -0.09]); // Coordenadas para centrar el mapa (ejemplo: Londres)
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Verifica si el código se está ejecutando en el cliente
    if (typeof window !== 'undefined') {
      setMapReady(true);
    }
  }, []);

  return (
    <div className="map-container" style={{ marginTop: '20px', width: '100%', height: '300px', overflow: 'hidden' }}>
      {mapReady && ( // Renderiza el mapa solo si está listo
        <MapContainer
          center={position}
          zoom={2}
          style={{ height: '100%', width: '100%' }} // Usar 100% para ajustar al contenedor padre
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={position}>
            <Popup>
              ¡Aquí está tu marcador!
            </Popup>
          </Marker>
        </MapContainer>
      )}
    </div>
  );
};

export default Map;