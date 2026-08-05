/**
 * Webhook Event Handlers — processa eventos Meta que não são messages/statuses.
 *
 * Cada handler é best-effort (nunca falha o webhook).
 * Usa o mesmo padrão de account_alerts do webhook route principal.
 */

import { supabase } from '@/lib/supabase'

// ============================================================================
// Generic Event Logger
// ============================================================================

export async function logWebhookEvent(params: {
  eventType: string
  field: string
  wabaId: string | null
  payload: unknown
  metadata?: Record<string, unknown>
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_type: params.eventType,
        field: params.field,
        waba_id: params.wabaId,
        payload: params.payload ?? {},
        metadata: params.metadata ?? null,
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) throw error
    return data?.id ?? null
  } catch (e) {
    console.warn('[WebhookEvents] Falha ao registrar evento (best-effort):', e)
    return null
  }
}

// ============================================================================
// Template Quality Update
// Meta sends: { message_template_id, message_template_name, new_quality_score }
// ============================================================================

export async function handleTemplateQualityUpdate(value: any): Promise<void> {
  const update = value?.message_template_quality_update ?? value
  if (!update) return

  const templateId = String(update.message_template_id || update.id || '').trim()
  const templateName = String(update.message_template_name || update.name || '').trim()
  const newQuality = String(update.new_quality_score || update.quality_score || '').toUpperCase()

  if (!templateId && !templateName) return

  console.log(`📊 Template quality update: ${templateName || templateId} → ${newQuality}`)

  // Update templates table
  try {
    if (templateId) {
      await supabase
        .from('templates')
        .update({ quality_score: newQuality, updated_at: new Date().toISOString() })
        .eq('meta_id', templateId)
    } else if (templateName) {
      await supabase
        .from('templates')
        .update({ quality_score: newQuality, updated_at: new Date().toISOString() })
        .eq('name', templateName)
    }
  } catch (e) {
    console.warn('[WebhookEvents] Falha ao atualizar quality_score:', e)
  }

  // Create alert if quality drops to RED
  if (newQuality === 'RED') {
    try {
      await supabase.from('account_alerts').upsert({
        id: `alert_tpl_quality_${templateId || templateName}_${Date.now()}`,
        type: 'template',
        code: 0,
        message: `Template "${templateName || templateId}" com qualidade RED — risco de pausa automática pela Meta e redução de limites de envio.`,
        details: JSON.stringify({
          title: 'Qualidade de Template Degradada',
          details: `O template ${templateName} teve sua qualidade rebaixada para RED pela Meta. Isso pode resultar em pausa automática do template e redução do tier de envio.`,
          action: 'Revise o conteúdo do template e reduza a frequência de envio. Considere pausar campanhas com este template.',
          template_name: templateName,
          template_id: templateId,
          quality_score: newQuality,
        }),
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[WebhookEvents] Falha ao criar alerta de qualidade:', e)
    }
  }

  // Alert for YELLOW too (warning)
  if (newQuality === 'YELLOW') {
    try {
      await supabase.from('account_alerts').upsert({
        id: `alert_tpl_quality_${templateId || templateName}_${Date.now()}`,
        type: 'template',
        code: 0,
        message: `Template "${templateName || templateId}" com qualidade YELLOW — monitore para evitar degradação para RED.`,
        details: JSON.stringify({
          title: 'Qualidade de Template em Alerta',
          details: `O template ${templateName} está com qualidade YELLOW. Se continuar recebendo feedback negativo, pode ser rebaixado para RED e pausado.`,
          action: 'Monitore as métricas deste template. Considere reduzir a frequência de envio.',
          template_name: templateName,
          template_id: templateId,
          quality_score: newQuality,
        }),
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[WebhookEvents] Falha ao criar alerta de qualidade:', e)
    }
  }
}

// ============================================================================
// Template Components Update
// Meta sends component changes — informational only
// ============================================================================

export async function handleTemplateComponentsUpdate(value: any): Promise<void> {
  const update = value?.message_template_components_update ?? value
  if (!update) return

  const templateName = String(update.message_template_name || update.name || '').trim()
  console.log(`🧩 Template components update: ${templateName || 'unknown'}`)
}

// ============================================================================
// Template Category Update
// Meta sends: { message_template_id, message_template_name, previous_category, new_category }
// ============================================================================

export async function handleTemplateCategoryUpdate(value: any): Promise<void> {
  const update = value?.template_category_update ?? value
  if (!update) return

  const templateId = String(update.message_template_id || update.id || '').trim()
  const templateName = String(update.message_template_name || update.name || '').trim()
  const previousCategory = String(update.previous_category || '').toUpperCase()
  const newCategory = String(update.new_category || '').toUpperCase()

  if (!templateId && !templateName) return

  console.log(`🏷️ Template category update: ${templateName || templateId} ${previousCategory} → ${newCategory}`)

  // Update templates table
  try {
    if (templateId) {
      await supabase
        .from('templates')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .eq('meta_id', templateId)
    } else if (templateName) {
      await supabase
        .from('templates')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .eq('name', templateName)
    }
  } catch (e) {
    console.warn('[WebhookEvents] Falha ao atualizar categoria:', e)
  }

  // Alert — category change affects pricing
  if (previousCategory && newCategory && previousCategory !== newCategory) {
    try {
      await supabase.from('account_alerts').upsert({
        id: `alert_tpl_category_${templateId || templateName}_${Date.now()}`,
        type: 'template',
        code: 0,
        message: `Template "${templateName || templateId}" reclassificado: ${previousCategory} → ${newCategory}. Isso pode impactar o custo por conversa.`,
        details: JSON.stringify({
          title: 'Categoria de Template Alterada pela Meta',
          details: `A Meta reclassificou o template ${templateName} de ${previousCategory} para ${newCategory}. Categorias diferentes têm custos diferentes (Marketing ~R$0,47, Utility ~R$0,15, Authentication ~R$0,12).`,
          action: 'Verifique se a nova categoria está correta. Se não, edite o template e reenvie para aprovação.',
          template_name: templateName,
          template_id: templateId,
          previous_category: previousCategory,
          new_category: newCategory,
        }),
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[WebhookEvents] Falha ao criar alerta de categoria:', e)
    }
  }
}

// ============================================================================
// Phone Number Quality Update
// Meta sends: { display_phone_number, current_limit, event: 'FLAGGED'|'UNFLAGGED' }
// ============================================================================

export async function handlePhoneNumberQualityUpdate(value: any): Promise<void> {
  const update = value?.phone_number_quality_update ?? value
  if (!update) return

  const phoneNumber = String(update.display_phone_number || '').trim()
  const currentLimit = String(update.current_limit || '').trim()
  const event = String(update.event || '').toUpperCase()

  console.log(`📱 Phone number quality update: ${phoneNumber} event=${event} limit=${currentLimit}`)

  if (event === 'FLAGGED') {
    try {
      await supabase.from('account_alerts').upsert({
        id: `alert_phone_quality_${Date.now()}`,
        type: 'system',
        code: 0,
        message: `Número ${phoneNumber} sinalizado pela Meta — risco de redução do tier de envio (atual: ${currentLimit}).`,
        details: JSON.stringify({
          title: 'Número de Telefone Sinalizado',
          details: `O número ${phoneNumber} foi sinalizado pela Meta por baixa qualidade. O limite atual é ${currentLimit}. Se a qualidade não melhorar, o tier pode ser rebaixado.`,
          action: 'Reduza o volume de envio, melhore a segmentação e evite enviar para contatos inativos. Monitore a qualidade no Meta Business Manager.',
          phone_number: phoneNumber,
          current_limit: currentLimit,
          event,
        }),
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[WebhookEvents] Falha ao criar alerta de qualidade telefone:', e)
    }
  }
}

// ============================================================================
// Business Capability Update
// Meta sends capability changes for the business account
// ============================================================================

export async function handleBusinessCapabilityUpdate(value: any): Promise<void> {
  const update = value?.business_capability_update ?? value
  if (!update) return

  const maxPhoneLimit = update.max_daily_conversation_per_phone
  const maxBizLimit = update.max_phone_numbers_per_business

  console.log(`🏢 Business capability update:`, JSON.stringify(update).slice(0, 200))

  try {
    await supabase.from('account_alerts').upsert({
      id: `alert_biz_capability_${Date.now()}`,
      type: 'system',
      code: 0,
      message: `Capacidades da conta WhatsApp Business foram atualizadas pela Meta.`,
      details: JSON.stringify({
        title: 'Atualização de Capacidades da Conta',
        details: `A Meta atualizou as capacidades da sua conta. Limites podem ter sido alterados.`,
        action: 'Verifique as novas capacidades no Meta Business Manager.',
        max_daily_conversation_per_phone: maxPhoneLimit,
        max_phone_numbers_per_business: maxBizLimit,
        raw: update,
      }),
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[WebhookEvents] Falha ao criar alerta de capacidade:', e)
  }
}

// ============================================================================
// Tracking Events (CTA URL click tracking)
// Meta sends click tracking data — analytics only, no alert
// ============================================================================

export async function handleTrackingEvents(value: any): Promise<void> {
  const events = value?.tracking_events ?? (Array.isArray(value) ? value : [value])
  if (!events || !Array.isArray(events)) return

  for (const event of events) {
    if (!event) continue
    console.log(`📈 Tracking event: ${event.event || 'unknown'} url=${event.url_clicked || 'N/A'}`)
  }
}
