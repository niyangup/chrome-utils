const RAW_QUOTA_PER_DOLLAR = 500000

export interface ApiUsageData {
  total_available: number
  total_granted: number
  total_used: number
}

export interface UsageViewModel {
  available: string
  used: string
  granted: string
  usedPercentage: number
  progressPercentage: number
  level: 'healthy' | 'warning' | 'critical'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isQuotaValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const parseUsageResponse = (response: unknown): ApiUsageData => {
  if (!isRecord(response)) throw new Error('Invalid usage response')

  if (response.code !== true) {
    throw new Error(
      typeof response.message === 'string' && response.message
        ? response.message
        : 'Usage request failed'
    )
  }

  const data = response.data
  if (
    !isRecord(data) ||
    !isQuotaValue(data.total_available) ||
    !isQuotaValue(data.total_granted) ||
    !isQuotaValue(data.total_used)
  ) {
    throw new Error('Invalid usage response')
  }

  return {
    total_available: data.total_available,
    total_granted: data.total_granted,
    total_used: data.total_used,
  }
}

const formatDollars = (rawQuota: number): string =>
  `$${(rawQuota / RAW_QUOTA_PER_DOLLAR).toFixed(2)}`

export const createUsageViewModel = (data: ApiUsageData): UsageViewModel => {
  const rawPercentage = data.total_granted === 0
    ? 0
    : (data.total_used / data.total_granted) * 100
  const usedPercentage = Math.round(rawPercentage * 10) / 10
  const progressPercentage = Math.min(usedPercentage, 100)
  const level = rawPercentage > 90
    ? 'critical'
    : rawPercentage >= 70
      ? 'warning'
      : 'healthy'

  return {
    available: formatDollars(data.total_available),
    used: formatDollars(data.total_used),
    granted: formatDollars(data.total_granted),
    usedPercentage,
    progressPercentage,
    level,
  }
}

export const getUsageErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : ''
  return /\b(401|403)\b|unauthorized|invalid api key/i.test(message)
    ? 'API key 无效'
    : '查询失败'
}
