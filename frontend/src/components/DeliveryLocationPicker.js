import React, { useState, useCallback } from 'react';

// Lazy-load mapbox to avoid crashing when token is missing
let MapComponent = null;
let MarkerComponent = null;

try {
  const mapboxMod = require('react-map-gl');
  MapComponent = mapboxMod.default || mapboxMod.Map;
  MarkerComponent = mapboxMod.Marker;
  require('mapbox-gl/dist/mapbox-gl.css');
} catch (_) {
  // mapbox-gl not available
}

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// Default center: geographic center of continental US (fallback only)
const DEFAULT_CENTER = { longitude: -98.5795, latitude: 39.8283, zoom: 4 };

export default function DeliveryLocationPicker({ initialLocation, onChange }) {
  const hasLocation = initialLocation?.latitude && initialLocation?.longitude;

  const [markerPos, setMarkerPos] = useState({
    longitude: hasLocation ? parseFloat(initialLocation.longitude) : DEFAULT_CENTER.longitude,
    latitude: hasLocation ? parseFloat(initialLocation.latitude) : DEFAULT_CENTER.latitude,
  });

  const [viewState, setViewState] = useState({
    longitude: hasLocation ? parseFloat(initialLocation.longitude) : DEFAULT_CENTER.longitude,
    latitude: hasLocation ? parseFloat(initialLocation.latitude) : DEFAULT_CENTER.latitude,
    zoom: hasLocation ? 16 : DEFAULT_CENTER.zoom,
  });

  const onDragEnd = useCallback((event) => {
    const { lng, lat } = event.lngLat;
    const pos = { longitude: lng, latitude: lat };
    setMarkerPos(pos);
    onChange(pos);
  }, [onChange]);

  if (!MAPBOX_TOKEN || !MapComponent) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-800 mb-1">Map unavailable</p>
        <p className="text-amber-700 text-xs">Add <code className="bg-amber-100 px-1 rounded">REACT_APP_MAPBOX_TOKEN</code> to enable the interactive delivery pin map.</p>
        {hasLocation && (
          <p className="text-amber-600 text-xs mt-2">Using your saved address for delivery coordinates.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className="rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: 260 }}
      >
        <MapComponent
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
        >
          <MarkerComponent
            longitude={markerPos.longitude}
            latitude={markerPos.latitude}
            draggable
            onDragEnd={onDragEnd}
            anchor="bottom"
          >
            <div
              style={{ fontSize: 36, lineHeight: 1, cursor: 'grab', userSelect: 'none' }}
              title="Drag to your exact stacking location"
            >
              📍
            </div>
          </MarkerComponent>
        </MapComponent>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Drag the pin to your <strong>exact stacking location</strong>
      </p>
    </div>
  );
}
