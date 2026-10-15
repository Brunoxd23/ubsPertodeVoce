import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  ExternalLink, 
  Navigation, 
  ChevronDown, 
  CheckCircle2,
  Camera,
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

      {/* Imagem da Fachada da Unidade com Botão Direto para Street View */}
      <div className="relative rounded-lg overflow-hidden h-24 mb-2.5 shadow-inner group border border-slate-200 dark:border-slate-700">
        <img
          src="/assets/images/ubs-facade.jpg"
          alt={`Fachada da ${ubs.nomeOficial}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2 justify-between">
          <span className="text-[10px] font-bold text-white flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
            🏥 Fachada Oficial
          </span>
          {ubs.latitude && ubs.longitude && (
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ubs.latitude},${ubs.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md transition"
              title="Abrir Street View 360° desta UBS"
            >
              <Camera className="w-2.5 h-2.5" />
              <span>Street View 360°</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>

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

      {/* Ações: Botão Ver Fachada 360° e Como Chegar */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 relative">
        {ubs.latitude && ubs.longitude && (
          <a
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ubs.latitude},${ubs.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-semibold transition"
            title="Ver a fachada da UBS em 360° no Google Street View"
          >
            <Camera className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span>Ver Fachada</span>
            <ExternalLink className="w-3 h-3 text-red-500" />
          </a>
        )}

        {ubs.rotasExternas && (
          <div className="flex-1 relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRoutesMenu(!showRoutesMenu);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
              aria-expanded={showRoutesMenu}
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Rotas</span>
              <ChevronDown className="w-3.5 h-3.5" />
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
      </div>
    </article>
  );
};
