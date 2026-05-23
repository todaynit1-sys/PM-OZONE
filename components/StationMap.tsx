
import React, { useEffect, useRef } from 'react';
import { IndustrialComplex } from '../types';

interface StationMapProps {
    complex: IndustrialComplex;
    stationName: string;
    stationLat?: number;
    stationLon?: number;
    stationAddress?: string;
}

declare const L: any; // Leaflet global type

export const StationMap: React.FC<StationMapProps> = ({ complex, stationName, stationLat, stationLon, stationAddress }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!stationLat || !stationLon) return;

        if (mapInstance.current) {
            mapInstance.current.remove();
        }

        try {
            const map = L.map(mapRef.current).setView([complex.lat, complex.lon], 11);
            mapInstance.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Icon definitions
            const complexIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            const stationIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // Add markers
            const cMarker = L.marker([complex.lat, complex.lon], { icon: complexIcon }).addTo(map);
            cMarker.bindPopup(`<b>산업단지: ${complex.name}</b><br/>${complex.address}`).openPopup();

            const sMarker = L.marker([stationLat, stationLon], { icon: stationIcon }).addTo(map);
            sMarker.bindPopup(`<b>측정소: ${stationName}</b><br/>${stationAddress || '주소 정보 없음'}`);

            // Draw line
            const latlngs = [
                [complex.lat, complex.lon],
                [stationLat, stationLon]
            ];
            const polyline = L.polyline(latlngs, {color: 'blue', weight: 3, opacity: 0.5, dashArray: '10, 10'}).addTo(map);

            // Fit bounds
            const group = new L.featureGroup([cMarker, sMarker]);
            map.fitBounds(group.getBounds().pad(0.2));

        } catch (e) {
            console.error("Map initialization failed", e);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [complex, stationName, stationLat, stationLon, stationAddress]);

    return (
        <div className="flex flex-col space-y-2">
            {!stationLat || !stationLon ? (
                <div className="h-64 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 rounded-lg">
                    지도 위치 정보를 불러올 수 없습니다.
                </div>
            ) : (
                <div ref={mapRef} className="h-64 w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-inner z-0" />
            )}
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-3 text-sm">
                <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-600 pb-1">주소 정보 (Address)</div>
                <div className="flex flex-col space-y-2">
                    <div className="flex items-start">
                        <span className="flex-shrink-0 w-3 h-3 rounded-full bg-red-500 mt-1.5 mr-2"></span>
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{complex.name}</span>
                            <div className="text-gray-600 dark:text-gray-400 text-xs">{complex.address}</div>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <span className="flex-shrink-0 w-3 h-3 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                        <div>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{stationName} 측정소</span>
                            <div className="text-gray-600 dark:text-gray-400 text-xs">{stationAddress || '주소 정보 미등록'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
