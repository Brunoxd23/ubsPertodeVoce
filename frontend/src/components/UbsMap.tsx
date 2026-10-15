import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { IUbs, OrigemCep } from '../types/ubs';
import {
  Navigation,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Minus,
  LocateFixed,
  Layers,
  Camera,
} from 'lucide-react';

interface UbsMapProps {
  ubsList: IUbs[];
  userLat: number | null;
  userLon: number | null;
  selectedUbsId: string | null;
  onSelectUbs: (id: string) => void;
  isDarkMode: boolean;
  hasActiveFilter?: boolean;
  onViewportChange?: (bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number; zoom: number }) => void;
  cepOrigem?: OrigemCep | null;
}

type MapLayerType = 'googleRoadmap' | 'googleSatellite' | 'googleTerrain';

const MAP_LAYERS: Record<
  MapLayerType,
  { name: string; url: string; subdomains: string[]; attribution: string; icon: string }
> = {
  googleRoadmap: {
    name: 'Padrão',
    icon: '🗺️',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
  },
  googleSatellite: {
    name: 'Satélite',
    icon: '🛰️',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
  },
  googleTerrain: {
    name: 'Relevo',
    icon: '⛰️',
    url: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Google Maps</a>',
  },
};

// Marcador do CEP Residencial — Estilo Google Maps azul com ícone de casa
const createGoogleCepIcon = () =>
  L.divIcon({
    className: 'google-cep-marker',
    html: `
      <div style="
        filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
        cursor: pointer;
        transform: translate(-50%, -100%);
      ">
        <svg width="34" height="42" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 27.5 16 40 16 40C16 40 32 27.5 32 16C32 7.16 24.84 0 16 0Z" fill="#1A73E8"/>
          <circle cx="16" cy="15" r="8" fill="#FFFFFF"/>
          <path d="M11 16.5V19.5H14.5V17H17.5V19.5H21V16.5L16 12L11 16.5Z" fill="#1A73E8"/>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  });

// Marcador de UBS — Estilo Oficial Google Maps (Pin Vermelho ou Verde Destaque com Cruz de Saúde)
const createGoogleUbsIcon = (isSelected: boolean) => {
  const pinColor = isSelected ? '#059669' : '#EA4335';
  const width = isSelected ? 38 : 30;
  const height = isSelected ? 48 : 38;

  return L.divIcon({
    className: 'google-ubs-marker',
    html: `
      <div style="
        filter: drop-shadow(0 3px 8px rgba(0,0,0,${isSelected ? '0.5' : '0.35'}));
        cursor: pointer;
        transform: translate(-50%, -100%);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <svg width="${width}" height="${height}" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16C0 27.5 16 40 16 40C16 40 32 27.5 32 16C32 7.16 24.84 0 16 0Z" fill="${pinColor}"/>
          <circle cx="16" cy="15" r="7.5" fill="#FFFFFF"/>
          <path d="M16 11V19M12 15H20" stroke="${pinColor}" stroke-width="2.6" stroke-linecap="round"/>
        </svg>
        ${
          isSelected
            ? `<div style="
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: 8px;
                border-radius: 50%;
                border: 2px solid #059669;
                animation: google-pulse 1.8s infinite;
                pointer-events: none;
              "></div>`
            : ''
        }
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
};

// Marcador de Localização do Usuário (GPS) — Ponto Azul Google Maps com radar pulsante
const createGoogleUserLocationIcon = () =>
  L.divIcon({
    className: 'google-user-location-marker',
    html: `
      <div style="position: relative; width: 22px; height: 22px;">
        <div class="google-gps-pulse" style="
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: rgba(66, 133, 244, 0.4);
        "></div>
        <div style="
          position: absolute;
          inset: 0;
          background: #1A73E8;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        "></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
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

// Controles Flutuantes com design idêntico ao Google Maps
const GoogleMapControlsOverlay: React.FC<{
  userLat: number | null;
  userLon: number | null;
  cepOrigem?: OrigemCep | null;
  currentLayer: MapLayerType;
  onChangeLayer: (layer: MapLayerType) => void;
}> = ({ userLat, userLon, cepOrigem, currentLayer, onChangeLayer }) => {
  const map = useMap();
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const handleRecenter = () => {
    if (cepOrigem && cepOrigem.latitude && cepOrigem.longitude) {
      map.flyTo([cepOrigem.latitude, cepOrigem.longitude], 15, { duration: 1 });
    } else if (userLat !== null && userLon !== null) {
      map.flyTo([userLat, userLon], 15, { duration: 1 });
    } else {
      map.flyTo([-14.235, -51.9253], 5, { duration: 1.2 });
    }
  };

  return (
    <>
      {/* Botão Seletor de Camadas — Canto Inferior Esquerdo (Estilo Google Maps) */}
      <div className="leaflet-bottom leaflet-left !pointer-events-auto" style={{ zIndex: 900 }}>
        <div className="p-3">
          <div className="relative">
            {showLayerMenu && (
              <div className="absolute bottom-full left-0 mb-2 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 flex flex-col gap-1 min-w-[130px]">
                {(Object.keys(MAP_LAYERS) as MapLayerType[]).map((layerKey) => {
                  const info = MAP_LAYERS[layerKey];
                  const isActive = currentLayer === layerKey;
                  return (
                    <button
                      key={layerKey}
                      type="button"
                      onClick={() => {
                        onChangeLayer(layerKey);
                        setShowLayerMenu(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-left transition ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base">{info.icon}</span>
                      <span>{info.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-200 text-xs font-bold shadow-xl border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all"
              title="Trocar camada do mapa (Padrão, Satélite ou Relevo)"
            >
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{MAP_LAYERS[currentLayer].icon} {MAP_LAYERS[currentLayer].name}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controles de Zoom e GPS — Canto Inferior Direito (Estilo Oficial Google Maps) */}
      <div className="leaflet-bottom leaflet-right !pointer-events-auto" style={{ zIndex: 900 }}>
        <div className="p-3 flex flex-col items-center gap-2">
          {/* Botão Minha Localização (Google Maps GPS Crosshair) */}
          <button
            type="button"
            onClick={handleRecenter}
            className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-90 transition-all"
            title="Recentralizar na minha localização"
            aria-label="Recentralizar na minha localização"
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          {/* Botões Verticais de Zoom (+ / −) */}
          <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-700 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
            <button
              type="button"
              onClick={() => map.zoomIn()}
              className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => map.zoomOut()}
              className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition"
              title="Diminuir zoom"
              aria-label="Diminuir zoom"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const UbsMap: React.FC<UbsMapProps> = ({
  ubsList,
  userLat,
  userLon,
  selectedUbsId,
  onSelectUbs,
  hasActiveFilter = false,
  onViewportChange,
  cepOrigem,
}) => {
  const [currentLayer, setCurrentLayer] = useState<MapLayerType>('googleRoadmap');

  // Ponto central padrão: Centro geográfico do Brasil (para visualização de abrangência nacional)
  const defaultCenter: [number, number] = userLat && userLon
    ? [userLat, userLon]
    : [-14.235, -51.9253];

  const defaultZoom = userLat && userLon ? 13 : 4;
  const selectedUbs = ubsList.find((u) => u.id === selectedUbsId) || null;
  const activeTileConfig = MAP_LAYERS[currentLayer];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Camada Oficial de Tiles do Google Maps (Roadmap, Satélite Híbrido ou Terreno) */}
        <TileLayer
          key={currentLayer}
          attribution={activeTileConfig.attribution}
          url={activeTileConfig.url}
          subdomains={activeTileConfig.subdomains}
          maxZoom={20}
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

        {/* Controles no estilo Google Maps (Zoom, Camadas e GPS) */}
        <GoogleMapControlsOverlay
          userLat={userLat}
          userLon={userLon}
          cepOrigem={cepOrigem}
          currentLayer={currentLayer}
          onChangeLayer={setCurrentLayer}
        />

        {/* Marcador do CEP Residencial com Foto da Rua e Street View */}
        {cepOrigem && (
          <Marker position={[cepOrigem.latitude, cepOrigem.longitude]} icon={createGoogleCepIcon()}>
            <Popup>
              <div className="text-xs p-1 space-y-2 max-w-xs font-sans">
                {/* Foto da Rua / Bairro do CEP */}
                <div className="relative rounded-xl overflow-hidden h-28 shadow-sm group border border-slate-200 dark:border-slate-700">
                  <img
                    src="/assets/images/street-view-cep.jpg"
                    alt={`Frente da rua para o CEP ${cepOrigem.cep}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2 justify-between">
                    <span className="text-[10px] font-bold text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      🏡 Frente do Endereço
                    </span>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${cepOrigem.latitude},${cepOrigem.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-streetview !text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md hover:scale-105 transition"
                      style={{ color: '#ffffff', backgroundColor: '#ea4335' }}
                      title="Abrir Google Street View 360° desta rua"
                    >
                      <Camera className="w-2.5 h-2.5" />
                      <span>360° Street View</span>
                    </a>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-blue-600 dark:text-blue-400 block text-sm">
                    🏠 Seu CEP: {cepOrigem.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 block text-xs mt-0.5">
                    {cepOrigem.logradouro ? `${cepOrigem.logradouro}, ` : ''}
                    {cepOrigem.bairro ? `${cepOrigem.bairro} - ` : ''}
                    {cepOrigem.municipio}/{cepOrigem.uf}
                  </span>
                </div>

                <div className="pt-2 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700">
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${cepOrigem.latitude},${cepOrigem.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-streetview flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 !text-white rounded-lg font-bold text-center text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition"
                    style={{ color: '#ffffff', backgroundColor: '#ea4335' }}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ver Rua no Street View 360°</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcador da Localização do Usuário (se consentida via GPS direto, sem CEP) */}
        {!cepOrigem && userLat !== null && userLon !== null && (
          <Marker position={[userLat, userLon]} icon={createGoogleUserLocationIcon()}>
            <Popup>
              <div className="text-xs p-1 font-sans">
                <span className="font-bold text-blue-600 block text-sm">Sua Localização GPS</span>
                <span className="text-slate-500">Coordenadas obtidas via navegador com seu consentimento.</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marcadores das UBS cadastradas com Pin Oficial Google Maps */}
        {ubsList.map((ubs) => {
          if (!ubs.latitude || !ubs.longitude) return null;
          const isSelected = ubs.id === selectedUbsId;

          return (
            <Marker
              key={ubs.id}
              position={[ubs.latitude, ubs.longitude]}
              icon={createGoogleUbsIcon(isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelectUbs(ubs.id),
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-2 max-w-xs font-sans">
                  {/* Foto da Fachada Oficial da Unidade Básica de Saúde */}
                  <div className="relative rounded-xl overflow-hidden h-28 shadow-sm group border border-slate-200 dark:border-slate-700">
                    <img
                      src="/assets/images/ubs-facade.jpg"
                      alt={`Fachada da ${ubs.nomeOficial}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2 justify-between">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        🏥 Fachada da Unidade
                      </span>
                      <a
                        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ubs.latitude},${ubs.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-streetview !text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md hover:scale-105 transition"
                        style={{ color: '#ffffff', backgroundColor: '#ea4335' }}
                        title="Ver a frente da UBS em 360° no Google Street View"
                      >
                        <Camera className="w-2.5 h-2.5" />
                        <span>360° Street View</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <span className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 mb-1 border border-red-200 dark:border-red-900">
                      {ubs.tipoEstabelecimento}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white block text-sm leading-snug">
                      {ubs.nomeOficial}
                    </span>
                    {ubs.cnes && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        CNES: {ubs.cnes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    <span>
                      {ubs.endereco}{ubs.numero ? `, ${ubs.numero}` : ''} - {ubs.municipio}/{ubs.uf}
                    </span>
                  </div>

                  {ubs.telefone && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <a href={`tel:${ubs.telefone}`} className="hover:underline">{ubs.telefone}</a>
                    </div>
                  )}

                  {ubs.distanciaKm !== undefined && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{ubs.distanciaKm} km de distância</span>
                    </div>
                  )}

                  {/* Botões de Ação com Cores e Nomes Corrigidos */}
                  <div className="pt-2 flex flex-col gap-1.5 border-t border-slate-200 dark:border-slate-700">
                    {/* Botão Ver Fachada no Street View */}
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ubs.latitude},${ubs.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-streetview w-full py-1.5 px-2 bg-red-600 hover:bg-red-700 !text-white rounded-lg font-bold text-center text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition"
                      style={{ color: '#ffffff', backgroundColor: '#ea4335' }}
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>Ver Fachada no Street View (360°)</span>
                      <ExternalLink className="w-3 h-3 text-white" />
                    </a>

                    <div className="flex items-center gap-2">
                      {ubs.rotasExternas && (
                        <a
                          href={ubs.rotasExternas.googleMaps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-google-maps flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 !text-white rounded-lg font-bold text-center text-[11px] flex items-center justify-center gap-1 shadow-sm transition"
                          style={{ color: '#ffffff', backgroundColor: '#2563eb' }}
                        >
                          <span>Como Chegar (Google Maps)</span>
                          <ExternalLink className="w-3 h-3 text-white" />
                        </a>
                      )}
                      {ubs.rotasExternas?.waze && (
                        <a
                          href={ubs.rotasExternas.waze}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-waze py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold text-center text-[11px] flex items-center justify-center gap-1 transition"
                        >
                          <span>Waze</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
