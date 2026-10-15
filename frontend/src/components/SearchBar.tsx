import React, { useState } from 'react';
import { Search, MapPin, Navigation, SlidersHorizontal, RotateCcw, AlertCircle } from 'lucide-react';
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
            setGeoError('Permissão de localização não autorizada. Você pode pesquisar digitando o Município, Bairro ou CEP abaixo.');
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
    onFilterChange({
      userLat: null,
      userLon: null,
      page: 1,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 sm:p-5 transition-colors">
      {/* Botão de Destaque: Geolocalização Voluntária */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={isLocating || isLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm ${
              filters.userLat !== null
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
            }`}
            aria-label="Autorizar e usar minha localização geográfica para buscar UBS próximas"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>
              {isLocating
                ? 'Obtendo localização...'
                : filters.userLat !== null
                ? 'Localização ativa (Atualizar)'
                : 'Usar minha localização'}
            </span>
          </button>

          {filters.userLat !== null && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline px-2 py-1"
            >
              Remover GPS
            </button>
          )}
        </div>

        {/* Seletor de Raio (Ativo quando há GPS ou busca com raio) */}
        <div className="flex items-center gap-2">
          <label htmlFor="raio-select" className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Raio de busca:
          </label>
          <select
            id="raio-select"
            value={filters.raioKm}
            onChange={(e) => onFilterChange({ raioKm: Number(e.target.value), page: 1 })}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {RAIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerta de erro de Geolocalização (se houver) */}
      {geoError && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <span>{geoError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeoError(null)}
            className="text-amber-700 dark:text-amber-400 font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulário de Busca Textual (Município, UF, Bairro, CEP ou Nome) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Campo de Termo Livre */}
        <div className="sm:col-span-6 relative">
          <label htmlFor="search-termo" className="sr-only">
            Buscar por nome da UBS, bairro ou endereço
          </label>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-termo"
            type="text"
            value={filters.termo}
            onChange={(e) => onFilterChange({ termo: e.target.value, page: 1 })}
            placeholder="Nome da unidade, bairro, endereço ou CEP..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Município */}
        <div className="sm:col-span-3 relative">
          <label htmlFor="search-municipio" className="sr-only">
            Município
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <MapPin className="w-4 h-4" />
          </div>
          <input
            id="search-municipio"
            type="text"
            value={filters.municipio}
            onChange={(e) => onFilterChange({ municipio: e.target.value, page: 1 })}
            placeholder="Município..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Seletor de UF */}
        <div className="sm:col-span-2">
          <label htmlFor="search-uf" className="sr-only">
            Estado (UF)
          </label>
          <select
            id="search-uf"
            value={filters.uf}
            onChange={(e) => onFilterChange({ uf: e.target.value, page: 1 })}
            className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">UF (Todas)</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>

        {/* Botão Limpar Filtros */}
        <div className="sm:col-span-1 flex items-center justify-center">
          <button
            type="button"
            onClick={onReset}
            className="w-full h-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center"
            title="Limpar todos os filtros"
            aria-label="Limpar todos os filtros de pesquisa"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
