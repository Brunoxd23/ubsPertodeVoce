import React, { useState } from 'react';
import { Search, MapPin, Navigation, SlidersHorizontal, RotateCcw, AlertCircle, Loader2, Camera, ExternalLink } from 'lucide-react';
import { UbsFilterState } from '../types/ubs';
import { fetchUbsByCep } from '../services/api';

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

  // Estado para busca direta por CEP residencial
  const [cepInput, setCepInput] = useState('');
  const [cepError, setCepError] = useState<string | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const handleUseLocation = () => {
    setGeoError(null);
    setCepError(null);

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
          cepOrigem: null,
          page: 1,
        });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Permissão de GPS negada. Digite seu CEP no campo abaixo para localizar a UBS mais próxima!');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Sinal de GPS indisponível no momento. Digite seu CEP no campo abaixo.');
            break;
          case error.TIMEOUT:
            setGeoError('Tempo limite excedido ao obter localização. Tente novamente ou use seu CEP.');
            break;
          default:
            setGeoError('Não foi possível obter a sua localização GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleSearchCep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCep = cepInput.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      setCepError('Por favor, informe um CEP válido com 8 dígitos (ex: 06786-070).');
      return;
    }

    setCepError(null);
    setGeoError(null);
    setIsSearchingCep(true);

    try {
      const res = await fetchUbsByCep(cleanCep, filters.raioKm);
      onFilterChange({
        userLat: res.origemCep.latitude,
        userLon: res.origemCep.longitude,
        cepOrigem: res.origemCep,
        page: 1,
      });
    } catch (err: any) {
      setCepError(err.message || 'Não foi possível localizar este CEP. Verifique os números informados.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleClearLocation = () => {
    onFilterChange({ userLat: null, userLon: null, cepOrigem: null, page: 1 });
    setCepInput('');
    setCepError(null);
    setGeoError(null);
  };

  const handleResetAll = () => {
    setCepInput('');
    setCepError(null);
    setGeoError(null);
    onReset();
  };

  const hasLocation = filters.userLat !== null;
  const isCepActive = Boolean(filters.cepOrigem);

  return (
    <div className="space-y-2.5">
      {/* 1. Localização por GPS voluntário + Seletor de Raio */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating || isLoading || isSearchingCep}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-70 ${hasLocation && !isCepActive
            ? 'bg-emerald-700 hover:bg-emerald-800'
            : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          aria-label="Autorizar e usar minha localização geográfica para buscar UBS próximas"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="truncate">
            {isLocating
              ? 'Obtendo GPS...'
              : hasLocation && !isCepActive
                ? 'GPS Ativo'
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
            title="Raio de busca (usado com a localização e busca por CEP)"
          >
            {RAIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Busca Rápida por Qualquer CEP Residencial */}
      <form onSubmit={handleSearchCep} className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <label htmlFor="search-cep-input" className="sr-only">
            Digite seu CEP para encontrar a UBS mais próxima
          </label>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none select-none">
          </span>
          <input
            id="search-cep-input"
            type="text"
            inputMode="numeric"
            maxLength={9}
            value={cepInput}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 5) {
                val = `${val.slice(0, 5)}-${val.slice(5, 8)}`;
              }
              setCepInput(val);
              if (cepError) setCepError(null);
            }}
            placeholder="Digite qualquer CEP (ex: 06786-070)..."
            className={`${inputBase} pl-8 pr-2 text-xs font-mono`}
          />
        </div>
        <button
          type="submit"
          disabled={isSearchingCep || isLoading || cepInput.replace(/\D/g, '').length !== 8}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1 shrink-0"
          title="Localizar a primeira UBS mais próxima deste CEP"
        >
          {isSearchingCep ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span>Mais Perto</span>
          )}
        </button>
      </form>

      {/* Banner de CEP ativo com Foto da Rua e Link para Google Street View */}
      {filters.cepOrigem && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-xs overflow-hidden shadow-sm animate-in fade-in duration-200">
          <div className="relative h-20 w-full overflow-hidden">
            <img
              src="/assets/images/street-view-cep.jpg"
              alt={`Foto da rua para o CEP ${filters.cepOrigem.cep}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-2 justify-between">
              <span className="text-[10px] font-bold text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                📍 Frente do Endereço
              </span>
              <a
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${filters.cepOrigem.latitude},${filters.cepOrigem.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md transition"
                title="Abrir Street View 360° no Google Maps"
              >
                <Camera className="w-2.5 h-2.5" />
                <span>Street View 360°</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div className="p-2.5 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block truncate">
                CEP {filters.cepOrigem.cep.replace(/(\d{5})(\d{3})/, '$1-$2')} ativo
              </span>
              <span className="text-emerald-700 dark:text-emerald-300 text-[11px] block truncate">
                {filters.cepOrigem.logradouro ? `${filters.cepOrigem.logradouro}, ` : ''}
                {filters.cepOrigem.bairro ? `${filters.cepOrigem.bairro} - ` : ''}
                {filters.cepOrigem.municipio}/{filters.cepOrigem.uf}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearLocation}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded text-xs bg-emerald-100 dark:bg-emerald-900/50"
              title="Remover localização por CEP"
              aria-label="Remover localização por CEP"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Banner de GPS Ativo (sem CEP) */}
      {hasLocation && !isCepActive && (
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            Coordenadas GPS ativas
          </span>
          <button
            type="button"
            onClick={handleClearLocation}
            className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
          >
            Remover
          </button>
        </div>
      )}

      {/* Alertas de Erro */}
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

      {cepError && (
        <div
          role="alert"
          className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span className="flex-1">{cepError}</span>
          <button
            type="button"
            onClick={() => setCepError(null)}
            className="text-rose-700 dark:text-rose-400 font-bold hover:underline"
            aria-label="Fechar aviso de CEP"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Busca textual geral (Nome, Bairro, Endereço) */}
      <div className="relative">
        <label htmlFor="search-termo" className="sr-only">
          Buscar por nome da UBS, bairro ou endereço
        </label>
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="search-termo"
          type="text"
          value={filters.termo}
          onChange={(e) => onFilterChange({ termo: e.target.value, page: 1 })}
          placeholder="Nome, bairro ou endereço..."
          className={`${inputBase} pl-9 pr-3`}
        />
      </div>

      {/* 4. Município, UF e Botão de Limpar */}
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
          onClick={handleResetAll}
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
