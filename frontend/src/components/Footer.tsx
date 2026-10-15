import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface FooterProps {
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  return (
    <footer className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4">
        <p className="flex items-start sm:items-center gap-1.5 leading-snug">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>
            Dados do <strong>CNES/DATASUS (Ministério da Saúde)</strong>. Horários, serviços e vacinas devem
            ser confirmados com a unidade antes de ir.
          </span>
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline">© {new Date().getFullYear()} UBS Perto de Você · Mapa © OpenStreetMap</span>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="inline-flex items-center gap-1 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacidade &amp; LGPD
          </button>
          <a
            href="https://dadosabertos.saude.gov.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Dados Abertos
          </a>
        </div>
      </div>
    </footer>
  );
};
