import { PhoneNumber } from '../../../../hooks/useSettings';
import { WebhookStatus, WebhookFunnelLevel } from './types';

/**
 * Determina o status do webhook para um número de telefone
 * com base na hierarquia de configuração da Meta
 */
export function getWebhookStatus(
  phone: PhoneNumber,
  activeUrl: string | undefined
): WebhookStatus {
  const config = phone.webhook_configuration;

  // Level 1: Phone number override
  if (config?.phone_number) {
    const isWhatsFlow = config.phone_number === activeUrl;
    return {
      status: isWhatsFlow ? 'whatsflow' : 'other',
      url: config.phone_number,
      level: 1,
      levelName: 'NÚMERO',
      levelDescription: 'Override específico deste número',
    };
  }

  // Level 2: WABA override
  if (config?.whatsapp_business_account) {
    return {
      status: 'waba',
      url: config.whatsapp_business_account,
      level: 2,
      levelName: 'WABA',
      levelDescription: 'Override da conta comercial',
    };
  }

  // Level 3: App callback
  if (config?.application) {
    return {
      status: 'app',
      url: config.application,
      level: 3,
      levelName: 'APP',
      levelDescription: 'Padrão do Meta Developer Dashboard',
    };
  }

  return {
    status: 'none',
    url: null,
    level: 0,
    levelName: 'NENHUM',
    levelDescription: 'Nenhum webhook configurado',
  };
}

/**
 * Retorna os 3 níveis do funil de webhook para visualização
 */
export function getWebhookFunnelLevels(
  phone: PhoneNumber,
  activeUrl: string | undefined
): WebhookFunnelLevel[] {
  const config = phone.webhook_configuration;
  const activeStatus = getWebhookStatus(phone, activeUrl);

  return [
    {
      level: 1,
      name: 'NÚMERO',
      url: config?.phone_number || null,
      isActive: activeStatus.level === 1,
      isWhatsFlow: config?.phone_number === activeUrl,
      color: 'emerald',
      description: 'Override específico deste número',
    },
    {
      level: 2,
      name: 'WABA',
      url: config?.whatsapp_business_account || null,
      isActive: activeStatus.level === 2,
      isWhatsFlow: config?.whatsapp_business_account === activeUrl,
      color: 'blue',
      description: 'Override da conta comercial',
    },
    {
      level: 3,
      name: 'APP',
      url: config?.application || null,
      isActive: activeStatus.level === 3,
      isWhatsFlow: config?.application === activeUrl,
      color: 'zinc',
      description: 'Padrão do Meta Dashboard',
      isLocked: true,
    },
  ];
}

/**
 * Determina a cor do card baseado no status do webhook
 */
export function getCardColor(
  webhookStatus: WebhookStatus
): 'emerald' | 'amber' | 'blue' | 'zinc' {
  if (webhookStatus.status === 'whatsflow') return 'emerald';
  if (webhookStatus.status === 'other') return 'amber';
  if (webhookStatus.level === 2) return 'blue';
  return 'zinc';
}

/**
 * Retorna classes CSS para cor do card
 */
export function getCardColorClasses(color: 'emerald' | 'amber' | 'blue' | 'zinc'): {
  border: string;
  bg: string;
  icon: string;
  text: string;
} {
  const colorMap = {
    emerald: {
      border: 'border-red-500/20',
      bg: 'bg-red-500/5',
      icon: 'bg-red-500/20 text-red-400',
      text: 'text-red-400/80',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      icon: 'bg-amber-500/20 text-amber-400',
      text: 'text-amber-400/80',
    },
    blue: {
      border: 'border-orange-500/20',
      bg: 'bg-orange-500/5',
      icon: 'bg-orange-500/20 text-orange-400',
      text: 'text-orange-400/80',
    },
    zinc: {
      border: 'border-white/10',
      bg: 'bg-zinc-800/50',
      icon: 'bg-zinc-700 text-gray-400',
      text: 'text-gray-500',
    },
  };

  return colorMap[color];
}

/**
 * Retorna classes CSS para níveis do funil
 */
export function getFunnelLevelColorClasses(color: 'emerald' | 'blue' | 'zinc'): {
  active: string;
  inactive: string;
  arrow: string;
  ring: string;
} {
  const colorMap = {
    emerald: {
      active: 'bg-red-500/20 border-red-500/40 text-red-400',
      inactive: 'bg-red-500/5 border-red-500/10 text-red-400/50',
      arrow: 'text-red-500/30',
      ring: 'ring-red-500/30',
    },
    blue: {
      active: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
      inactive: 'bg-orange-500/5 border-orange-500/10 text-orange-400/50',
      arrow: 'text-orange-500/30',
      ring: 'ring-orange-500/30',
    },
    zinc: {
      active: 'bg-zinc-700 border-zinc-600 text-gray-300',
      inactive: 'bg-zinc-800/50 border-white/5 text-gray-500',
      arrow: 'text-zinc-600',
      ring: 'ring-zinc-500/30',
    },
  };

  return colorMap[color];
}
