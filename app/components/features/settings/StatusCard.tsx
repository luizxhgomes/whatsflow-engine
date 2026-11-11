'use client';

import React, { forwardRef } from 'react';
import { Wifi, Link2, RefreshCw, AlertCircle, Shield, Edit2 } from 'lucide-react';
import { AccountLimits } from '../../../lib/meta-limits';
import { Container } from '@/components/ui/container';

export interface StatusCardProps {
  settings: {
    isConnected: boolean;
    businessAccountId?: string | null;
    displayPhoneNumber?: string | null;
    phoneNumberId?: string | null;
  };
  limitsLoading?: boolean;
  limitsError?: boolean;
  limitsErrorMessage?: string | null;
  accountLimits?: AccountLimits | null;
  onRefreshLimits?: () => void;
  onDisconnect?: () => void;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

export const StatusCard = forwardRef<HTMLDivElement, StatusCardProps>(function StatusCard(
  {
    settings,
    limitsLoading,
    limitsError,
    limitsErrorMessage,
    accountLimits,
    onRefreshLimits,
    onDisconnect,
    isEditing,
    onToggleEdit,
  },
  ref
) {
  const ConnectionIcon = settings.isConnected ? Wifi : Link2;

  return (
    <div ref={ref}>
      <Container
        variant="glass"
        padding="lg"
        className={`flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:gap-6 transition-colors duration-200 ${settings.isConnected ? 'border-[var(--ds-status-success)]/30' : 'border-[var(--ds-border-default)]'}`}
      >
      <div className="ds-icon-tile" data-tone={settings.isConnected ? 'brand' : 'neutral'} aria-hidden="true">
        <ConnectionIcon className="size-1/2" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xl font-bold text-[var(--ds-text-primary)]">
          {settings.isConnected ? 'Sistema Online' : 'Desconectado'}
        </h3>

        <div className="mt-3 space-y-1.5 text-sm text-[var(--ds-text-secondary)]">
          {settings.isConnected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--ds-text-muted)]">Conta Comercial:</span>
                <span className="font-mono break-all text-[var(--ds-status-success-text)] bg-[var(--ds-status-success-bg)] px-1.5 py-0.5 rounded">{settings.businessAccountId}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--ds-text-muted)]">Telefone Verificado:</span>
                <span className="font-mono break-all text-[var(--ds-status-success-text)] bg-[var(--ds-status-success-bg)] px-1.5 py-0.5 rounded">
                  {settings.displayPhoneNumber || settings.phoneNumberId}
                </span>
              </div>
            </>
          ) : (
            <p>Conecte sua conta Meta quando quiser habilitar o envio e o recebimento de mensagens.</p>
          )}
        </div>

        {settings.isConnected && (
          <div className="mt-5 flex flex-wrap gap-3">
            {/* Limits Status */}
            {limitsLoading ? (
              <span className="px-3 py-1.5 bg-[var(--ds-bg-elevated)] rounded-lg text-xs font-medium text-[var(--ds-text-secondary)] border border-[var(--ds-border-default)] flex items-center gap-1.5 animate-pulse">
                <RefreshCw size={12} className="animate-spin" />
                Verificando limites...
              </span>
            ) : limitsError ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={onRefreshLimits}
                  className="min-h-11 sm:min-h-10 px-3 py-2 bg-[var(--ds-status-error-bg)] rounded-lg text-xs font-medium text-[var(--ds-status-error-text)] border border-[var(--ds-status-error)]/20 flex items-center gap-1.5 hover:bg-[var(--ds-status-error)]/20 transition-colors focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                  aria-label="Tentar buscar limites da conta novamente"
                >
                  <AlertCircle size={12} aria-hidden="true" />
                  {limitsErrorMessage || 'Erro ao conectar com a API da Meta'}
                  <RefreshCw size={10} className="ml-1" aria-hidden="true" />
                </button>
                <p className="text-xs text-[var(--ds-text-muted)]">
                  O token pode ter expirado. Clique em <strong className="text-[var(--ds-text-primary)]">Editar</strong> para atualizar.
                </p>
              </div>
            ) : (
              <span className="px-3 py-1.5 bg-[var(--ds-bg-elevated)] rounded-lg text-xs font-medium text-[var(--ds-status-success-text)] border border-[var(--ds-status-success)]/20 flex items-center gap-1.5">
                <Wifi size={12} />
                Limite: {accountLimits?.maxUniqueUsersPerDay?.toLocaleString('pt-BR')} msgs/dia
              </span>
            )}

            {/* Quality Status */}
            {!limitsError && !limitsLoading && (
              <span className={`px-3 py-1.5 bg-[var(--ds-bg-elevated)] rounded-lg text-xs font-medium border flex items-center gap-1.5 ${accountLimits?.qualityScore === 'GREEN'
                ? 'text-[var(--ds-status-success-text)] border-[var(--ds-status-success)]/20'
                : accountLimits?.qualityScore === 'YELLOW'
                  ? 'text-[var(--ds-status-warning-text)] border-[var(--ds-status-warning)]/20'
                  : accountLimits?.qualityScore === 'RED'
                    ? 'text-[var(--ds-status-error-text)] border-[var(--ds-status-error)]/20'
                    : 'text-[var(--ds-text-secondary)] border-[var(--ds-border-default)]'
                }`}>
                <Shield size={12} />
                Qualidade: {accountLimits?.qualityScore === 'GREEN' ? 'Alta' : accountLimits?.qualityScore === 'YELLOW' ? 'Média' : accountLimits?.qualityScore === 'RED' ? 'Baixa' : '---'}
              </span>
            )}
          </div>
        )}
      </div>

      {settings.isConnected && (
        <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:min-w-35 sm:flex-col">
          <button
            onClick={onToggleEdit}
            className={`group relative overflow-hidden rounded-xl min-h-11 sm:min-h-10 px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2
              ${isEditing
                ? 'bg-primary-600 text-white shadow-lg hover:bg-primary-500 dark:bg-white dark:text-black dark:hover:bg-neutral-100'
                : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] hover:border-[var(--ds-border-strong)]'
              }`}
            aria-label={isEditing ? 'Cancelar edição das configurações' : 'Editar configurações'}
            aria-pressed={isEditing}
          >
            <Edit2 size={14} className={`transition-transform duration-500 ${isEditing ? 'rotate-45' : 'group-hover:scale-110'}`} aria-hidden="true" />
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>

          <button
            onClick={onDisconnect}
            className="text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/5 min-h-11 sm:min-h-10 px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
            aria-label="Desconectar conta do WhatsApp"
          >
            Desconectar
          </button>
        </div>
      )}
      </Container>
    </div>
  );
});
