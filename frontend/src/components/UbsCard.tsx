import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  ExternalLink, 
  Navigation, 
  ChevronDown, 
  CheckCircle2
} from 'lucide-react';
import { IUbs } from '../types/ubs';

interface UbsCardProps {
  ubs: IUbs;
  isSelected?: boolean;
  onSelect?: () => void;
  isClosest?: boolean;
}

export const UbsCard: React.FC<UbsCardProps> = ({ ubs, isSelected, onSelect, isClosest }) => {
  const [showRoutesMenu, setShowRoutesMenu] = useState(false);

  const fullAddress = [
    ubs.endereco,
    ubs.numero ? `nº ${ubs.numero}` : null,
    ubs.complemento,
    ubs.bairro,
    `${ubs.municipio} - ${ubs.uf}`,
    ubs.cep ? `CEP ${ubs.cep}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <article
      id={`ubs-card-${ubs.id}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect?.();
        }
      }}
      tabIndex={0}
      className={`p-4 rounded-xl border transition cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        isSelected
          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
          : isClosest
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-sm'
      }`}
      aria-label={`Unidade Básica de Saúde: ${ubs.nomeOficial || 'sem nome cadastrado'}`}
    >
      {/* Top Header: Tipo, Destaque Mais Próxima e Distância */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {isClosest && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
              ⭐ Mais Próxima
            </span>
          )}
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
            {ubs.tipoEstabelecimento}
          </span>
          {ubs.cnes && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              CNES: {ubs.cnes}
            </span>
          )}
        </div>

        {ubs.distanciaKm !== undefined && (
          <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800">
            <Navigation className="w-3.5 h-3.5" />
            <span>{ubs.distanciaKm} km</span>
          </div>
        )}
      </div>

      {/* Nome da Unidade */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1">
        {ubs.nomeOficial?.trim() || 'Unidade sem nome cadastrado no CNES'}
      </h3>
      {ubs.nomeFantasia && ubs.nomeFantasia !== ubs.nomeOficial && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 italic">
          "{ubs.nomeFantasia}"
        </p>
      )}

      {/* Endereço */}
      <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2">
        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <span className="leading-relaxed">{fullAddress}</span>
      </div>

      {/* Telefone */}
      {ubs.telefone && (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-3">
          <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <a
            href={`tel:${ubs.telefone.replace(/\D/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline font-medium text-emerald-700 dark:text-emerald-400"
          >
            {ubs.telefone}
          </a>
        </div>
      )}

      {/* Coordenadas e Validação */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span>Lat: {ubs.latitude ?? 'N/D'}</span>
          <span>•</span>
          <span>Lon: {ubs.longitude ?? 'N/D'}</span>
        </div>

        {ubs.statusValidacao === 'VALIDA' && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Coordenadas Oficiais
          </span>
        )}
        {ubs.statusValidacao === 'INVERTIDA_CORRIGIDA' && (
          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Eixo Corrigido
          </span>
        )}
      </div>

      {/* Ação: Botão Como Chegar e Opções de Rotas */}
      {ubs.rotasExternas && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRoutesMenu(!showRoutesMenu);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
            aria-expanded={showRoutesMenu}
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Como chegar (Abrir no Mapa)</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1" />
          </button>

          {showRoutesMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-20 space-y-1 animate-fade-in"
            >
              <a
                href={ubs.rotasExternas.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href={ubs.rotasExternas.waze}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition"
              >
                <span>Waze</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href={ubs.rotasExternas.openStreetMap}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 transition"
              >
                <span>OpenStreetMap</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          )}
        </div>
      )}
    </article>
  );
};
