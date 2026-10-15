import React from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, EyeOff, Server } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          aria-label="Fechar janela de aviso de privacidade"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 id="privacy-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Aviso de Privacidade e Conformidade com a LGPD
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            A plataforma <strong>UBS Perto de Você</strong> foi concebida sob os princípios de{' '}
            <em>Privacy by Design</em> e <em>Secure by Design</em>. Abaixo detalhamos como tratamos
            suas informações com transparência:
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Localização Voluntária
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O acesso à localização só ocorre quando você clica deliberadamente em "Usar minha
                localização". O uso manual por Município, Bairro ou CEP está sempre disponível.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                <EyeOff className="w-4 h-4 text-emerald-500" />
                Sem Rastreamento de Trajeto
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Não criamos perfis comportamentais, não rastreamos rotas e não vinculamos sua
                localização a contas de usuário ou cookies persistentes.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                <Server className="w-4 h-4 text-emerald-500" />
                Redação em Logs do Servidor
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Os logs operacionais de nossa infraestrutura sanitizam e redigem automaticamente as
                coordenadas geográficas das requisições para evitar a retenção de dados pessoais.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-1">
                <Lock className="w-4 h-4 text-emerald-500" />
                Sem Coleta de Dados Médicos
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esta aplicação não solicita prontuários, sintomas, laudos ou diagnósticos. O único
                propósito é a consulta pública à infraestrutura do SUS.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Origem e Limitações dos Dados Cartográficos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Os dados de unidades de saúde exibidos são de domínio público, providos pelo{' '}
              <strong>Ministério da Saúde / CNES</strong>. As rotas para serviços externos (Google
              Maps, Waze e OpenStreetMap) são iniciadas pelo navegador somente quando o usuário clica
              no botão correspondente.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-sm"
          >
            Entendi e concordo
          </button>
        </div>
      </div>
    </div>
  );
};
