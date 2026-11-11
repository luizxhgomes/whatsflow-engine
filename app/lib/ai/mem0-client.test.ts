// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearMem0Cache, fetchRelevantMemories, saveInteractionMemory } from './mem0-client'

const settings = vi.hoisted(() => ({ enabled: 'true', key: 'synthetic-mem0-key' }))
vi.mock('@/lib/supabase-db', () => ({ settingsDb: { get: async (key: string) => key === 'mem0_enabled' ? settings.enabled : settings.key } }))
let calls: { url: string; init: RequestInit; body: Record<string, any> }[]
let reply: () => Promise<Response>
beforeEach(() => {
  vi.useFakeTimers()
  settings.enabled = 'true'; settings.key = 'synthetic-mem0-key'
  clearMem0Cache(); calls = []
  reply = async () => Response.json({ results: [{ id: 'memory-1', memory: 'Prefere atendimento pela manhã.' }] })
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(init.body as string) })
    return reply()
  })
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Mem0 REST contract and memory isolation', () => {
  it('scopes search to the contact, app and agent metadata together', async () => {
    const result = await fetchRelevantMemories('horário', { user_id: 'contact-a', app_id: 'app-a', agent_id: 'agent-a' })
    expect(calls[0].url).toBe('https://api.mem0.ai/v3/memories/search/')
    expect(calls[0].body).toEqual({ query: 'horário', top_k: 5, threshold: 0.3, filters: { AND: [
      { user_id: 'contact-a' }, { app_id: 'app-a' }, { metadata: { whatsflow_agent_id: 'agent-a' } },
    ] } })
    expect(new Headers(calls[0].init.headers).get('authorization')).toBe('Token synthetic-mem0-key')
    expect(result.memoryCount).toBe(1)
    expect(result.systemPromptAddition).toContain('• Prefere atendimento pela manhã.')
  })

  it('uses the default app while preserving contact isolation without an agent', async () => {
    await fetchRelevantMemories('consulta', { user_id: 'contact-b' })
    expect(calls[0].body.filters).toEqual({ AND: [{ user_id: 'contact-b' }, { app_id: 'whatsflow' }] })
  })

  it('adds plain role/content messages with matching metadata and user ownership', async () => {
    reply = async () => Response.json({ event_id: 'event-1', status: 'PENDING' }, { status: 202 })
    const messages = [{ role: 'user' as const, content: 'Prefiro manhã.' }, { role: 'assistant' as const, content: 'Anotado.' }]
    expect(await saveInteractionMemory(messages, { user_id: 'contact-a', app_id: 'app-a', agent_id: 'agent-a' })).toBe(true)
    expect(calls[0].url).toBe('https://api.mem0.ai/v3/memories/add/')
    expect(calls[0].body).toEqual({ messages, user_id: 'contact-a', app_id: 'app-a', metadata: { whatsflow_agent_id: 'agent-a' } })
    expect(calls[0].body).not.toHaveProperty('agent_id')
    expect(calls[0].body).not.toHaveProperty('mem0ApiKey')
  })

  it('rejects an empty contact scope before any search or write', async () => {
    expect(await fetchRelevantMemories('consulta', { user_id: '' })).toEqual({ systemPromptAddition: '', memoryCount: 0 })
    expect(await saveInteractionMemory([{ role: 'user', content: 'Oi' }], { user_id: '' })).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('does not call Mem0 while disabled', async () => {
    settings.enabled = 'false'
    expect(await fetchRelevantMemories('consulta', { user_id: 'contact-a' })).toEqual({ systemPromptAddition: '', memoryCount: 0 })
    expect(await saveInteractionMemory([], { user_id: 'contact-a' })).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it.each([401, 429, 500])('degrades safely for HTTP %s in search and add', async status => {
    reply = async () => new Response('provider failure', { status })
    expect(await fetchRelevantMemories('consulta', { user_id: 'contact-a' })).toEqual({ systemPromptAddition: '', memoryCount: 0 })
    expect(await saveInteractionMemory([], { user_id: 'contact-a' })).toBe(false)
  })

  it('degrades safely for malformed search responses', async () => {
    reply = async () => Response.json({ results: null })
    expect(await fetchRelevantMemories('consulta', { user_id: 'contact-a' })).toEqual({ systemPromptAddition: '', memoryCount: 0 })
  })

  it.each([{}, null, 42, 'unexpected', { memory: 42 }, { memory: null }, { memory: '' }, { memory: ' \n\t ' }])('ignores invalid memory entries: %j', async entry => {
    reply = async () => Response.json({ results: [entry] })
    expect(await fetchRelevantMemories('consulta', { user_id: 'contact-a' })).toEqual({ systemPromptAddition: '', memoryCount: 0 })
  })

  it('keeps valid memories in mixed responses without trimming their original text', async () => {
    reply = async () => Response.json({ results: [
      {}, null, { memory: '  Texto válido  ' }, 42, { memory: 42 }, { memory: '' }, { memory: ' \t ' }, { memory: 'Outro texto.' },
    ] })
    const result = await fetchRelevantMemories('consulta', { user_id: 'contact-a' })
    expect(result.memoryCount).toBe(2)
    expect(result.systemPromptAddition).toContain('•   Texto válido  \n• Outro texto.')
    expect(result.systemPromptAddition).not.toContain('undefined')
  })

  it('retains the three-second timeout for search and add', async () => {
    reply = () => new Promise(() => {})
    const search = fetchRelevantMemories('consulta', { user_id: 'contact-a' })
    const add = saveInteractionMemory([], { user_id: 'contact-a' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(await search).toEqual({ systemPromptAddition: '', memoryCount: 0 })
    expect(await add).toBe(false)
  })
})
