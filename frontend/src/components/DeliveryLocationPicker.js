import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default icons break in webpack — patch them
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const US_CENTER = [39.8283, -98.5795];

// Flies the map to a new center when initialLocation changes
function MapFly({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null);

  return (
    <Marker
      position={position}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const { lat, lng } = m.getLatLng();
            onDragEnd({ latitude: lat, longitude: lng });
          }
        },
      }}
    />
  );
}

export default function DeliveryLocationPicker({ initialLocation, onChange }) {
  const hasLocation =
    initialLocation?.latitude != null && initialLocation?.longitude != null;

  const startPos = hasLocation
    ? [parseFloat(initialLocation.latitude), parseFloat(initialLocation.longitude)]
    : US_CENTER;

  const [markerPos, setMarkerPos] = useState(startPos);
  const zoom = hasLocation ? 16 : 4;

  const handleDragEnd = (pos) => {
    setMarkerPos([pos.latitude, pos.longitude]);
    onChange(pos);
  };

  return (
    <div>
      <div
        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: 260 }}
      >
        <MapContainer
          center={startPos}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
          />
          <MapFly center={markerPos} zoom={zoom} />
          <DraggableMarker position={markerPos} onDragEnd={handleDragEnd} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Drag the pin to your <strong>exact stacking location</strong> · Map data © OpenStreetMap
      </p>
    </div>
  );
}
