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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Marca e Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Cross className="w-6 h-6 rotate-45 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              UBS Perto de Você
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Dados Abertos SUS
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Rede de Atenção Básica de Saúde em todo o território nacional
            </p>
          </div>
        </div>

        {/* Ações: Privacidade LGPD e Modo Escuro */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
            aria-label="Abrir termo de privacidade e conformidade LGPD"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">Privacidade & LGPD</span>
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
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
