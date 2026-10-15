import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { IUbs } from '../types/ubs';
import { Navigation, ExternalLink, MapPin } from 'lucide-react';

interface UbsMapProps {
  ubsList: IUbs[];
  userLat: number | null;
  userLon: number | null;
  selectedUbsId: string | null;
  onSelectUbs: (id: string) => void;
  isDarkMode: boolean;
}

// Ícones Customizados em SVG do Leaflet
const createUbsIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: ${isSelected ? '36px' : '28px'};
        height: ${isSelected ? '36px' : '28px'};
        background: ${isSelected ? '#047857' : '#059669'};
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createUserLocationIcon = () =>
  L.divIcon({
    className: 'user-marker',
    html: `
      <div class="user-location-pulse" style="
        width: 20px;
        height: 20px;
        background: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(37,99,235,0.6);
        transform: translate(-50%, -50%);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

// Componente para recentralizar o mapa suavemente
const MapController: React.FC<{
  userLat: number | null;
  userLon: number | null;
  selectedUbs: IUbs | null;
  ubsList: IUbs[];
}> = ({ userLat, userLon, selectedUbs, ubsList }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedUbs && selectedUbs.latitude && selectedUbs.longitude) {
      map.flyTo([selectedUbs.latitude, selectedUbs.longitude], 15, { duration: 1 });
    } else if (userLat !== null && userLon !== null) {
      map.flyTo([userLat, userLon], 14, { duration: 1.2 });
    } else if (ubsList.length > 0) {
      const validCoords = ubsList.filter((u) => u.latitude && u.longitude);
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(
          validCoords.map((u) => [u.latitude!, u.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [userLat, userLon, selectedUbs, ubsList, map]);

  return null;
};

export const UbsMap: React.FC<UbsMapProps> = ({
  ubsList,
  userLat,
  userLon,
  selectedUbsId,
  onSelectUbs,
  isDarkMode,
}) => {
  // Ponto central padrão: Brasil (ou São Paulo como fallback)
  const defaultCenter: [number, number] = userLat && userLon
    ? [userLat, userLon]
    : [-15.7938, -47.8827]; // Brasília

  const defaultZoom = userLat && userLon ? 13 : 4;

  const selectedUbs = ubsList.find((u) => u.id === selectedUbsId) || null;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Camada de Tiles OpenStreetMap oficial */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> colaboradores'
          url={
            isDarkMode
              ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        <MapController
          userLat={userLat}
          userLon={userLon}
          selectedUbs={selectedUbs}
          ubsList={ubsList}
        />

        {/* Marcador da Localização do Usuário (se consentida) */}
        {userLat !== null && userLon !== null && (
          <Marker position={[userLat, userLon]} icon={createUserLocationIcon()}>
            <Popup>
              <div className="text-xs p-1">
                <span className="font-bold text-blue-600 block">Sua Localização Atual</span>
                <span className="text-slate-500">Coordenadas obtidas com sua autorização via navegador.</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcadores das UBS cadastradas */}
        {ubsList.map((ubs) => {
          if (!ubs.latitude || !ubs.longitude) return null;
          const isSelected = ubs.id === selectedUbsId;

          return (
            <Marker
              key={ubs.id}
              position={[ubs.latitude, ubs.longitude]}
              icon={createUbsIcon(isSelected)}
              eventHandlers={{
                click: () => onSelectUbs(ubs.id),
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1.5 max-w-xs">
                  <span className="font-bold text-emerald-700 block text-sm">
                    {ubs.nomeOficial}
                  </span>
                  <div className="flex items-start gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{ubs.endereco}, {ubs.numero || 'S/N'} - {ubs.municipio}/{ubs.uf}</span>
                  </div>
                  {ubs.distanciaKm !== undefined && (
                    <div className="text-emerald-800 font-semibold flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      <span>{ubs.distanciaKm} km de você</span>
                    </div>
                  )}
                  {ubs.rotasExternas && (
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-200">
                      <a
                        href={ubs.rotasExternas.googleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline font-medium flex items-center gap-1"
                      >
                        Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
