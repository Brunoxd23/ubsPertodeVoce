import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { IUbs } from '../types/ubs';
import { Navigation, ExternalLink, MapPin, Phone } from 'lucide-react';

interface UbsMapProps {
  ubsList: IUbs[];
  userLat: number | null;
  userLon: number | null;
  selectedUbsId: string | null;
  onSelectUbs: (id: string) => void;
  isDarkMode: boolean;
  hasActiveFilter?: boolean;
  onViewportChange?: (bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number; zoom: number }) => void;
}

// Ícones Customizados em SVG do Leaflet
const createUbsIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        width: ${isSelected ? '38px' : '28px'};
        height: ${isSelected ? '38px' : '28px'};
        background: ${isSelected ? '#047857' : '#059669'};
        border: ${isSelected ? '3px solid #ffffff' : '2px solid #ffffff'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${isSelected ? '0 0 0 3px rgba(5, 150, 105, 0.4), 0 6px 14px rgba(0,0,0,0.35)' : '0 3px 8px rgba(0,0,0,0.25)'};
        transform: translate(-50%, -50%);
        transition: all 0.25s ease;
      ">
        <svg width="${isSelected ? '20' : '16'}" height="${isSelected ? '20' : '16'}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
  hasActiveFilter?: boolean;
}> = ({ userLat, userLon, selectedUbs, ubsList, hasActiveFilter }) => {
  const map = useMap();

  // Recalcula o tamanho do mapa sempre que o container mudar (ex.: recolher a barra lateral)
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (selectedUbs && selectedUbs.latitude && selectedUbs.longitude) {
      map.flyTo([selectedUbs.latitude, selectedUbs.longitude], 15, { duration: 1 });
    } else if (userLat !== null && userLon !== null) {
      map.flyTo([userLat, userLon], 14, { duration: 1.2 });
    } else if (hasActiveFilter && ubsList.length > 0) {
      // Ajusta os limites apenas quando houver filtro ativo de busca (cidade, termo, UF ou GPS)
      const validCoords = ubsList.filter((u) => u.latitude && u.longitude);
      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(
          validCoords.map((u) => [u.latitude!, u.longitude!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [userLat, userLon, selectedUbs, ubsList, hasActiveFilter, map]);

  return null;
};

// Observador de movimentação da janela do mapa (pan/zoom) para busca dinâmica
const MapViewportWatcher: React.FC<{
  onViewportChange?: (bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number; zoom: number }) => void;
  enabled: boolean;
}> = ({ onViewportChange, enabled }) => {
  const map = useMapEvents({
    moveend: () => {
      if (!enabled || !onViewportChange) return;
      const b = map.getBounds();
      onViewportChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLon: b.getWest(),
        maxLon: b.getEast(),
        zoom: map.getZoom(),
      });
    },
  });
  return null;
};

export const UbsMap: React.FC<UbsMapProps> = ({
  ubsList,
  userLat,
  userLon,
  selectedUbsId,
  onSelectUbs,
  isDarkMode,
  hasActiveFilter = false,
  onViewportChange,
}) => {
  // Ponto central padrão: Centro geográfico do Brasil (para visualização de abrangência nacional)
  const defaultCenter: [number, number] = userLat && userLon
    ? [userLat, userLon]
    : [-14.235, -51.9253];

  const defaultZoom = userLat && userLon ? 13 : 4;

  const selectedUbs = ubsList.find((u) => u.id === selectedUbsId) || null;

  return (
    <div className="absolute inset-0 overflow-hidden">
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
          hasActiveFilter={hasActiveFilter}
        />

        <MapViewportWatcher
          onViewportChange={onViewportChange}
          enabled={!hasActiveFilter}
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
                <div className="text-xs p-1 space-y-2 max-w-xs">
                  <div>
                    <span className="inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-1">
                      {ubs.tipoEstabelecimento}
                    </span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-sm leading-snug">
                      {ubs.nomeOficial}
                    </span>
                    {ubs.cnes && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        CNES: {ubs.cnes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                      {ubs.endereco}{ubs.numero ? `, ${ubs.numero}` : ''} - {ubs.municipio}/{ubs.uf}
                    </span>
                  </div>

                  {ubs.telefone && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{ubs.telefone}</span>
                    </div>
                  )}

                  {ubs.distanciaKm !== undefined && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      <span>{ubs.distanciaKm} km de distância</span>
                    </div>
                  )}

                  {ubs.rotasExternas && (
                    <div className="pt-2 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700">
                      <a
                        href={ubs.rotasExternas.googleMaps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={ubs.rotasExternas.waze}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        Waze <ExternalLink className="w-3 h-3" />
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
