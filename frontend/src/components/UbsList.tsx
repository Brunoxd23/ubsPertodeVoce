import React from 'react';
import { IUbs, UbsListResponse } from '../types/ubs';
import { UbsCard } from './UbsCard';
import { ChevronLeft, ChevronRight, AlertCircle, Inbox, Loader2 } from 'lucide-react';

interface UbsListProps {
  data: UbsListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  selectedUbsId: string | null;
  onSelectUbs: (id: string) => void;
  page: number;
  onPageChange: (newPage: number) => void;
  onRetry: () => void;
}

export const UbsList: React.FC<UbsListProps> = ({
  data,
  isLoading,
  isError,
  error,
  selectedUbsId,
  onSelectUbs,
  page,
  onPageChange,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 py-8 text-center" aria-live="polite">
        <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Consultando a base nacional de Unidades Básicas de Saúde...
        </p>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3 my-4">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
        <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
          Não foi possível carregar as unidades
        </h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
          {error?.message || 'Ocorreu um erro ao comunicar-se com os serviços de dados abertos.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const items = data?.dados || [];
  const meta = data?.metadados;

  if (items.length === 0) {
    return (
      <div className="py-12 px-4 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-4 space-y-3">
        <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Nenhuma UBS encontrada com os filtros atuais
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Experimente aumentar o raio de busca, verificar a grafia do município ou limpar os filtros para visualizar outras regiões.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Resumo dos resultados */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1" aria-live="polite">
        <span>
          <strong className="text-slate-800 dark:text-slate-200">{meta?.total.toLocaleString('pt-BR')}</strong> unidade(s)
          {meta?.filtrosAplicados.possuiCoordenadas && meta.raioKm ? ` no raio de ${meta.raioKm} km` : ''}
        </span>
        {meta?.totalPaginas && meta.totalPaginas > 1 && (
          <span>
            Página {meta.pagina} de {meta.totalPaginas.toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {/* Lista de Cards */}
      <div className="space-y-3">
        {items.map((ubs: IUbs) => (
          <UbsCard
            key={ubs.id}
            ubs={ubs}
            isSelected={ubs.id === selectedUbsId}
            onSelect={() => onSelectUbs(ubs.id)}
          />
        ))}
      </div>

      {/* Paginação */}
      {meta && meta.totalPaginas > 1 && (
        <div className="sticky bottom-0 -mx-3 -mb-3 px-3 py-2.5 flex items-center justify-between bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Página {page} de {meta.totalPaginas}
          </span>

          <button
            type="button"
            disabled={page >= meta.totalPaginas}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            Próxima
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
