import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapView({ center, pickup, drop }) {
    const map = useMap();

    useEffect(() => {
        if (pickup && drop) {
            map.fitBounds([pickup, drop], { padding: [40, 40] });
        } else {
            map.setView(center, map.getZoom());
        }
    }, [center, drop, map, pickup]);

    return (
        <>
            {pickup && <Marker position={pickup}><Popup>Pickup</Popup></Marker>}
            {drop && <Marker position={drop}><Popup>Drop</Popup></Marker>}
            {pickup && drop && <Polyline positions={[pickup, drop]} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }} />}
        </>
    );
}

export default function LiveMap({ lat = 28.6139, lng = 77.2090, pickupLat, pickupLng, dropLat, dropLng, title = 'Pickup Location' }) {
    const pickup = pickupLat != null && pickupLng != null ? [pickupLat, pickupLng] : null;
    const drop = dropLat != null && dropLng != null ? [dropLat, dropLng] : null;
    const center = pickup || [lat, lng];
    return (
        <div style={{ width: '100%', height: '280px', borderRadius: '12px', overflow: 'hidden' }}>
            <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapView center={center} pickup={pickup || [lat, lng]} drop={drop} />
                {!pickup && <Marker position={[lat, lng]}><Popup>{title}</Popup></Marker>}
            </MapContainer>
        </div>
    );
}