// Upstash Redis client for Deno via ESM
// Supports envs:
// - UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN
// - UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (fallback)
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.4'

const UPSTASH_REDIS_URL =
  Deno.env.get('UPSTASH_REDIS_URL') || Deno.env.get('UPSTASH_REDIS_REST_URL')
const UPSTASH_REDIS_TOKEN =
  Deno.env.get('UPSTASH_REDIS_TOKEN') || Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

let redis: Redis | null = null
if (UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN) {
  redis = new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN })
} else {
  console.warn('UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not set. Redis cache will be disabled.')
}

export async function redisSetEx(key: string, value: unknown, ttlSeconds: number) {
  if (!redis) return { result: null, error: 'NO_REDIS' }
  const payload = typeof value === 'string' ? value : JSON.stringify(value)
  await redis.set(key, payload, { ex: ttlSeconds })
  return { result: 'OK', error: null }
}

export async function redisGet<T = unknown>(key: string): Promise<T | null> {
  if (!redis) return null
  const raw = await redis.get<string>(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return raw as unknown as T }
}

export async function redisDel(key: string) {
  if (!redis) return { result: 0, error: 'NO_REDIS' }
  const res = await redis.del(key)
  return { result: res, error: null }
}

export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12h
export function sessKey(token: string) { return `sessao:${token}` }

// Additional helpers for counters/locks
export function redisAvailable() { return !!redis }

export async function redisIncr(key: string): Promise<number | null> {
  if (!redis) return null
  const res = await redis.incr(key)
  return typeof res === 'number' ? res : Number(res ?? 0)
}

export async function redisExpire(key: string, seconds: number) {
  if (!redis) return { result: 0, error: 'NO_REDIS' }
  const res = await redis.expire(key, seconds)
  return { result: res, error: null }
}

export async function redisSet(key: string, value: string) {
  if (!redis) return { result: null, error: 'NO_REDIS' }
  const res = await redis.set(key, value)
  return { result: res, error: null }
}
