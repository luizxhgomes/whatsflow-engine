'use client';

import React from 'react';
import { FormInput, ArrowUpRight, Users, Percent } from 'lucide-react';
import { PrefetchLink } from '@/components/ui/PrefetchLink';
import type { Campaign } from '@/types';

interface CampaignFlowPanelProps {
  campaign: Campaign;
}

/**
 * Painel de métricas do Flow/MiniApp
 * Exibe informações sobre submissões de formulário quando a campanha usa um Flow
 * O contador acompanha a campanha atualizada pela API.
 */
export const CampaignFlowPanel: React.FC<CampaignFlowPanelProps> = ({ campaign }) => {
  const submissionsCount = campaign.submissionsCount ?? 0;

  // Só exibe se a campanha tem Flow
  if (!campaign.flowId) return null;

  const recipients = campaign.recipients ?? 0;

  // Calcula taxa de conversão (submissões / destinatários)
  const conversionRate = recipients > 0
    ? ((submissionsCount / recipients) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <FormInput size={20} className="text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">MiniApp / Flow</h3>
            </div>
            <p className="text-sm text-gray-400">{campaign.flowName || 'Formulário interativo'}</p>
          </div>
        </div>

        <PrefetchLink
          href={`/submissions?campaignId=${encodeURIComponent(campaign.id)}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
        >
          Ver Submissões <ArrowUpRight size={14} />
        </PrefetchLink>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Submissões */}
        <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
            <Users size={14} />
            Respostas
          </div>
          <div className="text-2xl font-bold text-white">
            {submissionsCount.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {submissionsCount === 1 ? 'pessoa respondeu' : 'pessoas responderam'}
          </p>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-zinc-800/50 border border-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide mb-2">
            <Percent size={14} />
            Taxa de Resposta
          </div>
          <div className="text-2xl font-bold text-white">
            {conversionRate}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            de {recipients.toLocaleString('pt-BR')} destinatários
          </p>
        </div>
      </div>

      {/* Dica quando não há submissões */}
      {submissionsCount === 0 && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          Aguardando respostas do formulário...
        </p>
      )}
    </div>
  );
};
