import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { UbsList } from './components/UbsList';
import { UbsMap } from './components/UbsMap';
import { PrivacyModal } from './components/PrivacyModal';
import { Footer } from './components/Footer';
import { fetchUbs } from './services/api';
import { UbsFilterState } from './types/ubs';
import { Map, List } from 'lucide-react';

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
};

function MainApplication() {
  const [filters, setFilters] = useState<UbsFilterState>(initialFilters);
  const [selectedUbsId, setSelectedUbsId] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'split' | 'list' | 'map'>('list');

  // Dark Mode State com persistência
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

  // Consulta com TanStack Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ubs', filters],
    queryFn: () => fetchUbs(filters),
  });

  const handleFilterChange = (newFilters: Partial<UbsFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setSelectedUbsId(null);
  };

  const handleSelectUbs = (id: string) => {
    setSelectedUbsId(id);
    // No mobile, se selecionou na lista, podemos alternar para o mapa se desejado
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Header
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Barra de Pesquisa e Filtros */}
        <SearchBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          isLoading={isLoading}
        />

        {/* Alternador Mobile (Lista vs Mapa) */}
        <div className="flex lg:hidden bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileView('list')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileView === 'list'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
            Ver Lista ({data?.metadados.total ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setMobileView('map')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              mobileView === 'map'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Map className="w-4 h-4" />
            Ver Mapa Interativo
          </button>
        </div>

        {/* Layout Principal: 2 Colunas no Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna da Esquerda: Lista de Resultados */}
          <div
            className={`lg:col-span-6 space-y-4 ${
              mobileView === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            <UbsList
              data={data}
              isLoading={isLoading}
              isError={isError}
              error={error as Error}
              selectedUbsId={selectedUbsId}
              onSelectUbs={handleSelectUbs}
              page={filters.page}
              onPageChange={(newPage) => handleFilterChange({ page: newPage })}
              onRetry={() => refetch()}
            />
          </div>

          {/* Coluna da Direita: Mapa Interativo com Leaflet */}
          <div
            className={`lg:col-span-6 lg:sticky lg:top-24 h-[500px] lg:h-[calc(100vh-8rem)] ${
              mobileView === 'list' ? 'hidden lg:block' : 'block'
            }`}
          >
            <UbsMap
              ubsList={data?.dados || []}
              userLat={filters.userLat}
              userLon={filters.userLon}
              selectedUbsId={selectedUbsId}
              onSelectUbs={handleSelectUbs}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </main>

      <Footer onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
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
