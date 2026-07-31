import { sendToBackground } from '../utils/message'
import { get, remove, set } from '../utils/storage'
import { parseUsageResponse } from './apiUsageModel'
import type { ApiUsageData } from './apiUsageModel'

export {
  createUsageViewModel,
  getUsageErrorMessage,
  parseUsageResponse,
} from './apiUsageModel'

const API_KEY_STORAGE_KEY = 'apiUsage.apiKey'
const USAGE_CACHE_STORAGE_KEY = 'apiUsage.cachedSnapshot'

export interface CachedUsageSnapshot {
  data: ApiUsageData
  queriedAt: number
}

interface ApiUsageMessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const loadApiKey = async (): Promise<string> => {
  const storedKey = await get<string>(API_KEY_STORAGE_KEY, '', 'local')
  return storedKey?.trim() ?? ''
}

export const saveApiKey = async (apiKey: string): Promise<string> => {
  const normalizedKey = apiKey.trim()
  if (!normalizedKey) throw new Error('API key is required')

  await set(API_KEY_STORAGE_KEY, normalizedKey, 'local')
  await remove(USAGE_CACHE_STORAGE_KEY, 'local')
  return normalizedKey
}

export const loadCachedUsage = async (): Promise<CachedUsageSnapshot | undefined> => {
  const cached = await get<unknown>(USAGE_CACHE_STORAGE_KEY, undefined, 'local')
  if (!isRecord(cached) || !isNonNegativeNumber(cached.queriedAt)) return undefined

  try {
    return {
      data: parseUsageResponse({ code: true, data: cached.data }),
      queriedAt: cached.queriedAt,
    }
  } catch {
    return undefined
  }
}

export const queryApiUsage = async (apiKey: string): Promise<CachedUsageSnapshot> => {
  const response = await sendToBackground<
    { apiKey: string },
    ApiUsageMessageResponse
  >({
    type: 'GET_API_USAGE',
    payload: { apiKey },
  })

  if (!response.success) {
    throw new Error(response.error || 'Usage request failed')
  }

  return {
    data: parseUsageResponse(response.data),
    queriedAt: Date.now(),
  }
}

export const cacheUsage = async (snapshot: CachedUsageSnapshot): Promise<void> => {
  await set(USAGE_CACHE_STORAGE_KEY, snapshot, 'local')
}
