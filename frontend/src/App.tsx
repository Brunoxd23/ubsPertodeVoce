import { useState, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { UbsList } from './components/UbsList';
import { UbsMap } from './components/UbsMap';
import { PrivacyModal } from './components/PrivacyModal';
import { Footer } from './components/Footer';
import { fetchUbs, fetchUbsMap } from './services/api';
import { UbsFilterState, UbsMapParams } from './types/ubs';
import { Map, List, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
      retry: 1,
    },
  },
});

const initialFilters: UbsFilterState = {
  termo: '',
  uf: '',
  municipio: '',
  raioKm: 5,
  userLat: null,
  userLon: null,
  page: 1,
  limit: 10,
  cepOrigem: null,
};

function MainApplication() {
  const [filters, setFilters] = useState<UbsFilterState>(initialFilters);
  const [selectedUbsId, setSelectedUbsId] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Janela visível do mapa (bounding box para pan/zoom dinâmico)
  const [mapViewport, setMapViewport] = useState<{
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    zoom: number;
  } | null>(null);

  const [debouncedViewport, setDebouncedViewport] = useState(mapViewport);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedViewport(mapViewport);
    }, 350);
    return () => clearTimeout(timer);
  }, [mapViewport]);

  // Dark Mode State com persistência (apenas preferência de tema, nenhum dado pessoal)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme_preference');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_preference', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_preference', 'light');
    }
  }, [isDarkMode]);

  // Consulta paginada para a lista lateral (10 itens por página)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ubs', filters],
    queryFn: () => fetchUbs(filters),
  });

  // Identifica se há filtro ativo de busca (cidade, estado, texto ou GPS)
  const hasActiveFilter = Boolean(
    filters.termo ||
      filters.uf ||
      filters.municipio ||
      (filters.userLat !== null && filters.userLon !== null)
  );

  // Parâmetros para a consulta de marcadores do mapa
  const mapQueryParams = useMemo<UbsMapParams>(() => {
    if (hasActiveFilter) {
      return {
        termo: filters.termo || undefined,
        uf: filters.uf || undefined,
        municipio: filters.municipio || undefined,
        lat: filters.userLat ?? undefined,
        lon: filters.userLon ?? undefined,
        raioKm: filters.raioKm,
        limit: 150,
      };
    }

    if (debouncedViewport && debouncedViewport.zoom >= 6) {
      return {
        minLat: debouncedViewport.minLat,
        maxLat: debouncedViewport.maxLat,
        minLon: debouncedViewport.minLon,
        maxLon: debouncedViewport.maxLon,
        limit: 150,
      };
    }

    // Visão nacional: retorna amostragem balanceada em todos os estados do Brasil
    return { limit: 162 };
  }, [
    hasActiveFilter,
    filters.termo,
    filters.uf,
    filters.municipio,
    filters.userLat,
    filters.userLon,
    filters.raioKm,
    debouncedViewport,
  ]);

  // Consulta dedicada para os marcadores do mapa
  const { data: mapData } = useQuery({
    queryKey: ['ubs-map', mapQueryParams],
    queryFn: () => fetchUbsMap(mapQueryParams),
    staleTime: 1000 * 60 * 2,
  });

  // Mescla marcadores com o item selecionado (garante exibição mesmo se selecionado na lista)
  const mapPins = useMemo(() => {
    const pins = [...(mapData?.dados || [])];
    if (selectedUbsId) {
      const alreadyPresent = pins.some((p) => p.id === selectedUbsId);
      if (!alreadyPresent && data?.dados) {
        const found = data.dados.find((u) => u.id === selectedUbsId);
        if (found && found.latitude && found.longitude) {
          pins.push(found);
        }
      }
    }
    return pins;
  }, [mapData?.dados, selectedUbsId, data?.dados]);

  // Ao selecionar uma UBS (ex.: clicando no marcador), rola a lista até o card correspondente
  useEffect(() => {
    if (!selectedUbsId) return;
    document
      .getElementById(`ubs-card-${selectedUbsId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedUbsId]);

  const handleFilterChange = (newFilters: Partial<UbsFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setSelectedUbsId(null);
    setMapViewport(null);
  };

  const total = data?.metadados.total ?? 0;

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Alternador Mobile (Lista vs Mapa) */}
        <div className="lg:hidden shrink-0 p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              aria-pressed={mobileView === 'list'}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                mobileView === 'list'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <List className="w-4 h-4" />
              Lista ({total.toLocaleString('pt-BR')})
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              aria-pressed={mobileView === 'map'}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                mobileView === 'map'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Map className="w-4 h-4" />
              Mapa
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* Barra lateral esquerda: busca + lista de UBS (rolagem independente) */}
          <aside
            aria-label="Pesquisa e lista de Unidades Básicas de Saúde"
            className={`${mobileView === 'map' ? 'hidden' : 'flex'} ${
              isSidebarOpen ? 'lg:flex' : 'lg:hidden'
            } flex-col w-full lg:w-[400px] xl:w-[430px] shrink-0 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 min-h-0`}
          >
            <div className="shrink-0 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <SearchBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                isLoading={isLoading}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <UbsList
                data={data}
                isLoading={isLoading}
                isError={isError}
                error={error as Error}
                selectedUbsId={selectedUbsId}
                onSelectUbs={setSelectedUbsId}
                page={filters.page}
                onPageChange={(newPage) => handleFilterChange({ page: newPage })}
                onRetry={() => refetch()}
              />
            </div>
          </aside>

          {/* Mapa: ocupa todo o espaço restante */}
          <section
            aria-label="Mapa interativo"
            className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'} flex-1 min-w-0 relative`}
          >
            <UbsMap
              ubsList={mapPins}
              userLat={filters.userLat}
              userLon={filters.userLon}
              selectedUbsId={selectedUbsId}
              onSelectUbs={setSelectedUbsId}
              isDarkMode={isDarkMode}
              hasActiveFilter={hasActiveFilter}
              onViewportChange={setMapViewport}
              cepOrigem={filters.cepOrigem}
            />

            {/* Recolher / expandir a lista (apenas desktop) */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="hidden lg:flex absolute top-3 left-3 z-20 items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={isSidebarOpen ? 'Recolher lista de unidades' : 'Expandir lista de unidades'}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
              {isSidebarOpen ? 'Recolher lista' : `Lista (${total.toLocaleString('pt-BR')})`}
            </button>
          </section>
        </div>
      </main>

      <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApplication />
    </QueryClientProvider>
  );
}
