import React from 'react';
import { Cross, Moon, Sun, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenPrivacy: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleDarkMode,
  onOpenPrivacy,
}) => {
  return (
    <header className="shrink-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Largura total: marca colada à esquerda e ações coladas à direita */}
      <div className="w-full h-14 pl-3 pr-3 sm:pl-4 sm:pr-4 flex items-center justify-between gap-3">
        {/* Marca e título — extrema esquerda */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Cross className="w-5 h-5 rotate-45 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
              <span className="truncate">UBS Perto de Você</span>
              <span className="hidden sm:inline-block shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Dados Abertos SUS
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block leading-tight">
              Rede de Atenção Básica de Saúde em todo o território nacional
            </p>
          </div>
        </div>

        {/* Ações — extrema direita */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Abrir aviso de privacidade e conformidade com a LGPD"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Privacidade &amp; LGPD</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label={isDarkMode ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
