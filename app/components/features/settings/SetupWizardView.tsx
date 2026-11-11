import React from 'react';
import { 
  Database, 
  Zap, 
  MessageSquare, 
  ExternalLink, 
  Check, 
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export interface SetupStep {
  id: 'qstash' | 'whatsapp';
  title: string;
  description: string;
  status: 'pending' | 'configured' | 'error';
  icon: React.ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  errorMessage?: string;
  isRequired: boolean;
}

interface SetupWizardViewProps {
  steps: SetupStep[];
  isLoading: boolean;
  onRefresh: () => void;
  onContinueToSettings?: () => void;
  allConfigured: boolean;
}

export const SetupWizardView: React.FC<SetupWizardViewProps> = ({
  steps,
  isLoading,
  onRefresh,
  onContinueToSettings,
  allConfigured,
}) => {
  const completedSteps = steps.filter(s => s.status === 'configured').length;
  const requiredSteps = steps.filter(s => s.isRequired);
  const requiredCompleted = requiredSteps.filter(s => s.status === 'configured').length;
  const progressPercent = (completedSteps / steps.length) * 100;

  // Check if minimum infrastructure (QStash) is ready
  const infrastructureReady = steps
    .filter(s => s.id === 'qstash')
    .every(s => s.status === 'configured');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="ds-icon-tile mb-4" data-size="hero" aria-hidden="true">
          <Sparkles className="size-1/2" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--ds-text-primary)] tracking-tight mb-2">
          Configuração Inicial
        </h1>
        <p className="text-[var(--ds-text-secondary)] max-w-md mx-auto">
          Para usar o WhatsFlow, você precisa configurar alguns serviços. 
          Siga os passos abaixo na ordem indicada.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm mb-2">
          <span className="text-[var(--ds-text-secondary)]">
            Progresso: {completedSteps}/{steps.length} configurados
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Verificar novamente
          </button>
        </div>
        <div className="h-2 bg-[var(--ds-bg-surface)] rounded-full overflow-hidden">
          <div 
            className="ds-progress-fill h-full"
            style={{ transform: `scaleX(${progressPercent / 100})` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isPending = step.status === 'pending';
          const isConfigured = step.status === 'configured';
          const isError = step.status === 'error';
          
          // Determine if step should be highlighted (next to do)
          const previousStepsConfigured = steps
            .slice(0, index)
            .filter(s => s.isRequired)
            .every(s => s.status === 'configured');
          const isNextStep = isPending && previousStepsConfigured;

          return (
            <div
              key={step.id}
              className={`relative rounded-2xl border transition-colors duration-300 overflow-hidden ${
                isConfigured
                  ? 'bg-[var(--ds-status-success-bg)] border-[var(--ds-status-success)]/30'
                  : isError
                    ? 'bg-red-500/5 border-red-500/30'
                    : isNextStep
                      ? 'bg-primary/5 border-ring/30 ring-2 ring-ring/20'
                      : 'bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] opacity-60'
              }`}
            >
              {/* Step number badge */}
              <div className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isConfigured
                  ? 'bg-primary text-primary-foreground'
                  : isError
                    ? 'bg-red-500 text-white'
                    : isNextStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)]'
              }`}>
                {isConfigured ? <Check size={16} /> : index + 1}
              </div>

              <div className="pl-16 pr-6 py-5">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${
                        isConfigured ? 'text-[var(--ds-status-success-text)]' : isError ? 'text-red-400' : 'text-[var(--ds-text-primary)]'
                      }`}>
                        {step.title}
                      </h3>
                      {step.isRequired && (
                        <span className="px-1.5 py-0.5 bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] text-[10px] font-medium rounded">
                          OBRIGATÓRIO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--ds-text-secondary)] mb-3">
                      {step.description}
                    </p>

                    {/* Error message */}
                    {isError && step.errorMessage && (
                      <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{step.errorMessage}</span>
                      </div>
                    )}

                    {/* Success message */}
                    {isConfigured && (
                      <div className="flex items-center gap-2 text-sm text-[var(--ds-status-success-text)]">
                        <Check size={14} />
                        <span>Configurado com sucesso</span>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  {isPending && step.actionUrl && (
                    <a
                      href={step.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                        isNextStep
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        if (!isNextStep) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {step.actionLabel}
                      <ExternalLink size={14} />
                    </a>
                  )}

                  {/* Icon for configured state */}
                  {isConfigured && (
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/15 text-primary [&_svg]:text-current flex items-center justify-center">
                      {step.icon}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="absolute -bottom-4 left-7 z-10">
                  <div className={`w-0.5 h-8 ${isConfigured ? 'bg-primary/30' : 'bg-[var(--ds-bg-hover)]'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      {allConfigured ? (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success)]/30 rounded-xl text-[var(--ds-status-success-text)] mb-4">
            <Check size={20} />
            <span className="font-medium">Tudo configurado!</span>
          </div>
          {onContinueToSettings && (
            <button
              onClick={onContinueToSettings}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Ir para Configurações
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : infrastructureReady ? (
        <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <MessageSquare size={20} className="text-amber-400" />
            </div>
            <div>
              <h4 className="font-medium text-amber-300 mb-1">
                Infraestrutura pronta!
              </h4>
              <p className="text-sm text-amber-200/70">
                QStash está configurado. Agora você pode adicionar suas credenciais 
                do WhatsApp diretamente na tela de configurações acima.
              </p>
              {onContinueToSettings && (
                <button
                  onClick={onContinueToSettings}
                  className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  Configurar WhatsApp
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 p-4 bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl text-center">
          <p className="text-[var(--ds-text-secondary)] text-sm">
            Complete os passos acima para liberar as configurações do WhatsApp.
          </p>
          <p className="text-[var(--ds-text-muted)] text-xs mt-2">
            Após configurar o QStash no Vercel, clique em "Verificar novamente" para atualizar.
          </p>
        </div>
      )}

      {/* Help section */}
      <div className="mt-8 pt-6 border-t border-[var(--ds-border-subtle)]">
        <h4 className="text-sm font-medium text-[var(--ds-text-secondary)] mb-3">Precisa de ajuda?</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://vercel.com/docs/storage/upstash"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-[var(--ds-bg-surface)] hover:bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl text-sm text-[var(--ds-text-secondary)] transition-colors"
          >
            <Database size={16} className="text-primary" />
            Docs: Upstash no Vercel
            <ExternalLink size={12} className="text-[var(--ds-text-muted)] ml-auto" />
          </a>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-[var(--ds-bg-surface)] hover:bg-[var(--ds-bg-surface)] border border-[var(--ds-border-default)] rounded-xl text-sm text-[var(--ds-text-secondary)] transition-colors"
          >
            <MessageSquare size={16} className="text-green-400" />
            Docs: WhatsApp Cloud API
            <ExternalLink size={12} className="text-[var(--ds-text-muted)] ml-auto" />
          </a>
        </div>
      </div>
    </div>
  );
};
