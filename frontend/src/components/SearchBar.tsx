import React, { useState } from 'react';
import { Search, MapPin, Navigation, SlidersHorizontal, RotateCcw, AlertCircle, X } from 'lucide-react';
import { UbsFilterState } from '../types/ubs';

interface SearchBarProps {
  filters: UbsFilterState;
  onFilterChange: (newFilters: Partial<UbsFilterState>) => void;
  onReset: () => void;
  isLoading: boolean;
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const RAIOS = [
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
];

const inputBase =
  'w-full py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const SearchBar: React.FC<SearchBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  isLoading,
}) => {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseLocation = () => {
    setGeoError(null);

    if (!('geolocation' in navigator)) {
      setGeoError('Geolocalização não é suportada pelo seu navegador atual.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onFilterChange({
          userLat: position.coords.latitude,
          userLon: position.coords.longitude,
          page: 1,
        });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Permissão de localização não autorizada. Você pode pesquisar digitando o Município, Bairro ou CEP.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Sinal de GPS indisponível no momento. Tente utilizar a pesquisa manual.');
            break;
          case error.TIMEOUT:
            setGeoError('Tempo limite excedido ao obter localização. Tente novamente.');
            break;
          default:
            setGeoError('Não foi possível obter a sua localização no momento.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleClearLocation = () => {
    onFilterChange({ userLat: null, userLon: null, page: 1 });
  };

  const hasLocation = filters.userLat !== null;

  return (
    <div className="space-y-2.5">
      {/* Geolocalização voluntária + raio */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating || isLoading}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-70 ${
            hasLocation ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
          aria-label="Autorizar e usar minha localização geográfica para buscar UBS próximas"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="truncate">
            {isLocating
              ? 'Obtendo localização...'
              : hasLocation
              ? 'Localização ativa'
              : 'Usar minha localização'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <label htmlFor="raio-select" className="sr-only">
            Raio de busca
          </label>
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <select
            id="raio-select"
            value={filters.raioKm}
            onChange={(e) => onFilterChange({ raioKm: Number(e.target.value), page: 1 })}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="Raio de busca (usado com a localização)"
          >
            {RAIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasLocation && (
        <button
          type="button"
          onClick={handleClearLocation}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
        >
          <X className="w-3 h-3" />
          Remover minha localização
        </button>
      )}

      {geoError && (
        <div
          role="alert"
          className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span className="flex-1">{geoError}</span>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="text-amber-700 dark:text-amber-400 font-bold hover:underline"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Busca textual */}
      <div className="relative">
        <label htmlFor="search-termo" className="sr-only">
          Buscar por nome da UBS, bairro, endereço ou CEP
        </label>
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="search-termo"
          type="text"
          value={filters.termo}
          onChange={(e) => onFilterChange({ termo: e.target.value, page: 1 })}
          placeholder="Nome, bairro, endereço ou CEP..."
          className={`${inputBase} pl-9 pr-3`}
        />
      </div>

      <div className="grid grid-cols-[1fr_5.5rem_2.25rem] gap-2">
        <div className="relative">
          <label htmlFor="search-municipio" className="sr-only">
            Município
          </label>
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-municipio"
            type="text"
            value={filters.municipio}
            onChange={(e) => onFilterChange({ municipio: e.target.value, page: 1 })}
            placeholder="Município..."
            className={`${inputBase} pl-9 pr-3`}
          />
        </div>

        <div>
          <label htmlFor="search-uf" className="sr-only">
            Estado (UF)
          </label>
          <select
            id="search-uf"
            value={filters.uf}
            onChange={(e) => onFilterChange({ uf: e.target.value, page: 1 })}
            className={`${inputBase} px-2`}
          >
            <option value="">UF</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="Limpar todos os filtros"
          aria-label="Limpar todos os filtros de pesquisa"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
