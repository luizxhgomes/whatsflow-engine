/**
 * WhatsApp Status Message Builders
 * 
 * Builders for typing indicators and mark as read actions
 */

// =============================================================================
// TYPING INDICATOR
// =============================================================================

export interface TypingIndicatorPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  to: string
  type: 'typing'
  typing: {
    action: 'on' | 'off'
  }
}

export interface TypingIndicatorOptions {
  to: string
  action: 'on' | 'off'
}

/**
 * @deprecated DO NOT USE — This builds an invalid payload (`type: 'typing'`) that Meta's
 * Cloud API does not accept. Use `sendTypingIndicator()` from `lib/whatsapp-send.ts` instead,
 * which sends the correct `typing_indicator` field alongside a `status: 'read'` payload.
 * Kept only for backward compatibility with existing tests.
 */
export function buildTypingIndicator(options: TypingIndicatorOptions): TypingIndicatorPayload {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: options.to,
    type: 'typing',
    typing: {
      action: options.action,
    },
  }
}

// =============================================================================
// MARK AS READ
// =============================================================================

export interface MarkAsReadPayload {
  messaging_product: 'whatsapp'
  status: 'read'
  message_id: string
}

export interface MarkAsReadOptions {
  messageId: string
}

/**
 * Build a mark as read payload
 * 
 * POST /{phone_number_id}/messages
 * This marks a message as read (double blue checkmarks)
 */
export function buildMarkAsRead(options: MarkAsReadOptions): MarkAsReadPayload {
  return {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: options.messageId,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Send mark as read to WhatsApp
 * 
 * @param phoneNumberId - WhatsApp Business Phone Number ID
 * @param accessToken - WhatsApp Business Access Token
 * @param messageId - Message ID to mark as read
 */
export async function sendMarkAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const payload = buildMarkAsRead({ messageId })

    const response = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      console.error('Failed to mark as read:', await response.text())
      return false
    }

    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[mark-as-read] Request timed out after 10s')
    } else {
      console.error('Error marking as read:', error)
    }
    return false
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Simulates typing indicator by adding a delay before sending
 * 
 * WhatsApp doesn't support typing indicators directly, so we add
 * a small delay to simulate "thinking" time.
 * 
 * @param delayMs - Delay in milliseconds (default: 500-1500ms random)
 */
export async function simulateTypingDelay(delayMs?: number): Promise<void> {
  const delay = delayMs ?? (Math.random() * 1000 + 500) // 500-1500ms
  await new Promise(resolve => setTimeout(resolve, delay))
}
