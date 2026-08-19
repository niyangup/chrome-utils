import { sendToBackground } from '../utils/message.ts'
import { get, remove, set } from '../utils/storage.ts'
import { parseSubscriptionUsageResponse } from './subscriptionUsageModel.ts'
import type { SubscriptionUsageData } from './subscriptionUsageModel.ts'

export {
  createSubscriptionUsageViewModel,
  getSubscriptionUsageErrorMessage,
  parseSubscriptionUsageResponse,
} from './subscriptionUsageModel.ts'

const ACCESS_TOKEN_STORAGE_KEY = 'subscriptionUsage.accessToken'
const USAGE_CACHE_STORAGE_KEY = 'subscriptionUsage.cachedSnapshot'

export interface CachedSubscriptionUsageSnapshot {
  data: SubscriptionUsageData
  queriedAt: number
}

interface SubscriptionUsageMessageResponse {
  success: boolean
  data?: unknown
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const loadAccessToken = async (): Promise<string> => {
  const storedToken = await get<string>(ACCESS_TOKEN_STORAGE_KEY, '', 'local')
  return storedToken?.trim() ?? ''
}

export const saveAccessToken = async (accessToken: string): Promise<string> => {
  const normalizedToken = accessToken.trim()
  if (!normalizedToken) throw new Error('Access token is required')

  await set(ACCESS_TOKEN_STORAGE_KEY, normalizedToken, 'local')
  await remove(USAGE_CACHE_STORAGE_KEY, 'local')
  return normalizedToken
}

export const loadCachedSubscriptionUsage = async (): Promise<
  CachedSubscriptionUsageSnapshot | undefined
> => {
  const cached = await get<unknown>(USAGE_CACHE_STORAGE_KEY, undefined, 'local')
  if (!isRecord(cached) || !isNonNegativeNumber(cached.queriedAt)) return undefined

  try {
    return {
      data: parseSubscriptionUsageResponse({ usage: cached.data }),
      queriedAt: cached.queriedAt,
    }
  } catch {
    return undefined
  }
}

export const querySubscriptionUsage = async (
  accessToken: string
): Promise<CachedSubscriptionUsageSnapshot> => {
  const response = await sendToBackground<
    { accessToken: string },
    SubscriptionUsageMessageResponse
  >({
    type: 'GET_SUBSCRIPTION_USAGE',
    payload: { accessToken },
  })

  if (!response.success) {
    throw new Error(response.error || 'Subscription usage request failed')
  }

  return {
    data: parseSubscriptionUsageResponse(response.data),
    queriedAt: Date.now(),
  }
}

export const cacheSubscriptionUsage = async (
  snapshot: CachedSubscriptionUsageSnapshot
): Promise<void> => {
  await set(USAGE_CACHE_STORAGE_KEY, snapshot, 'local')
}
