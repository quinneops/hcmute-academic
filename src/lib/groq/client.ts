import Groq from 'groq-sdk'

/**
 * Groq AI Client for Academic Nexus
 *
 * Models available:
 * - llama-3.3-70b-versatile: Best for complex reasoning, grading, analysis
 * - llama-3.1-8b-instant: Fast & cheap for simple tasks like matching
 * - gemma2-9b-it: Good alternative for creative tasks
 *
 * Rate limits (free tier):
 * - 30 requests/minute
 * - 14,400 requests/day
 */

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
export const FAST_MODEL = 'llama-3.1-8b-instant'
export const TEMPERATURE = 0.7
export const MAX_TOKENS = 2048

/**
 * Token usage tracking for cost monitoring
 */
export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

const usageLog: Array<{ timestamp: number; tokens: TokenUsage; endpoint: string }> = []

export function getTokenUsage(): Array<{ timestamp: number; tokens: TokenUsage; endpoint: string }> {
  return usageLog
}

export function logTokenUsage(tokens: TokenUsage, endpoint: string): void {
  usageLog.push({
    timestamp: Date.now(),
    tokens,
    endpoint,
  })
  // Keep last 1000 entries
  if (usageLog.length > 1000) {
    usageLog.shift()
  }
}

/**
 * Rate limiting helper - track requests per minute
 */
const requestLog: number[] = []

export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000

  // Remove old entries
  while (requestLog.length > 0 && requestLog[0] < oneMinuteAgo) {
    requestLog.shift()
  }

  if (requestLog.length >= 30) {
    const retryAfter = Math.ceil((requestLog[0] + 60 * 1000 - now) / 1000)
    return { allowed: false, retryAfter }
  }

  requestLog.push(now)
  return { allowed: true }
}

/**
 * Cache for AI responses (in-memory, per-request)
 * Key: hash of input parameters
 * Value: { response, timestamp }
 */
const cache = new Map<string, { response: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached(key: string): any | null {
  const cached = cache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return cached.response
}

export function setCache(key: string, response: any): void {
  cache.set(key, { response, timestamp: Date.now() })
}

/**
 * Create a completion with Groq
 */
export interface CompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
}

export interface CompletionResult {
  content: string
  usage?: TokenUsage
}

export async function createCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const {
    model = DEFAULT_MODEL,
    temperature = TEMPERATURE,
    maxTokens = MAX_TOKENS,
    responseFormat = 'text',
  } = options

  const response = await groq.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    response_format: responseFormat === 'json_object'
      ? { type: 'json_object' }
      : { type: 'text' },
  })

  const usage = response.usage ? {
    prompt_tokens: response.usage.prompt_tokens,
    completion_tokens: response.usage.completion_tokens,
    total_tokens: response.usage.total_tokens,
  } : undefined

  return {
    content: response.choices[0]?.message?.content || '',
    usage,
  }
}
