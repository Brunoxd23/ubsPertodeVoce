import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface FooterProps {
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  return (
    <footer className="mt-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Aviso de Responsabilidade Pública */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-slate-800 dark:text-slate-200 block">
              Aviso sobre a Origem e Atualização dos Dados
            </strong>
            <p className="leading-relaxed">
              Os dados de unidades de saúde disponibilizados nesta plataforma são extraídos de bases públicas
              do <strong>Cadastro Nacional de Estabelecimentos de Saúde (CNES / DATASUS)</strong> mantidas pelo
              Ministério da Saúde do Brasil. Horários específicos de funcionamento, escalas profissionais e
              disponibilidade de medicamentos ou vacinas devem ser confirmados diretamente com a unidade antes
              do comparecimento.
            </p>
          </div>
        </div>

        {/* Linha de rodapé e direitos */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} UBS Perto de Você. Plataforma Cidadã de Código Aberto.</span>
            <span>•</span>
            <span>Cartografia via OpenStreetMap & Leaflet</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Privacidade & LGPD
            </button>
            <a
              href="https://dadosabertos.saude.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 underline transition"
            >
              Portal Dados Abertos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
