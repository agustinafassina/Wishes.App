"use client"; // Asegúrate de que este componente se ejecute en el cliente

import { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const API_KEY = ''; // Reemplaza con tu clave de API

interface Location {
  name: string;
  position: {
    lat: number;
    lng: number;
  };
}

const Map = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.0, lng: 0.0 });
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    fetch('/locations/web_locations.json') // Asegúrate de que el JSON está en la carpeta public
      .then(response => response.json())
      .then(data => {
        const places = data.map((country: any) => ({
          name: country.name,
          position: {
            lat: country.latitude,
            lng: country.longitude
          }
        }));

        setLocations(places);
        if (places.length > 0) {
          setMapCenter(places[0].position); // Centrar el mapa en el primer país
          setZoom(2); // Ajustar el zoom para ver el mapa completo
        }
      })
      .catch(error => console.error('Error loading countries:', error));
  }, []);

  return (
    <LoadScript googleMapsApiKey={API_KEY}>
      <div style={{ width: '100%', padding: '0 20px' }}> {/* Aumentar el ancho con padding */}
        <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', width: 'calc(100% - 40px)', margin: '0 auto' }}>
          <GoogleMap
            mapContainerStyle={{ height: '400px', width: '100%' }} // Mapa ocupará el 100% del contenedor
            center={mapCenter}
            zoom={zoom}
          >
            {locations.map((location, index) => (
              <Marker 
                key={index} 
                position={location.position} 
                title={location.name} 
                icon={{
                  url: "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png", // Cambia el icono si lo deseas
                  scaledSize: new window.google.maps.Size(30, 30), // Tamaño del icono
                }}
              />
            ))}
          </GoogleMap>
        </div>
        <div style={{ marginTop: '20px', maxWidth: '1200px', margin: '0 auto' }}> {/* Contenedor centrado para la lista */}
          {locations.map((location, index) => (
            <div key={index} style={{ border: '1px solid #007BFF', borderRadius: '8px', padding: '15px', marginBottom: '10px', backgroundColor: '#f1f1f1' }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#007BFF' }}>{location.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </LoadScript>
  );
};

export default Map;