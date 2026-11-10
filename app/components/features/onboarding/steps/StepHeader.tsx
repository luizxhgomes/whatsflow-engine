'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface StepHeaderProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
}

export function StepHeader({ stepNumber, totalSteps, title, onBack }: StepHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Progress indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex min-h-11 items-center gap-1 text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
        <span className="text-sm text-[var(--ds-text-muted)] ml-auto">
          Passo {stepNumber} de {totalSteps}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--ds-bg-surface)] rounded-full overflow-hidden">
        <div
          className="ds-progress-fill h-full rounded-full"
          style={{ transform: `scaleX(${stepNumber / totalSteps})` }}
        />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-[var(--ds-text-primary)] pt-2">{title}</h2>
    </div>
  );
}
