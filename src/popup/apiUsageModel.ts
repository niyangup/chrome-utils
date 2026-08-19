const RAW_QUOTA_PER_DOLLAR = 500000

export interface ApiUsageData {
  total_available: number
  total_granted: number
  total_used: number
}

export type UsageLevel = 'healthy' | 'warning' | 'critical' | 'error'

export interface UsageViewModel {
  available: string
  used: string
  granted: string
  usedPercentage: number
  progressPercentage: number
  level: UsageLevel
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

export const clampPercentage = (percentage: number): number =>
  Math.min(Math.max(percentage, 0), 100)

export const getUsageLevel = (rawPercentage: number): Exclude<UsageLevel, 'error'> =>
  rawPercentage > 95
    ? 'critical'
    : rawPercentage > 90
      ? 'warning'
      : 'healthy'

export const createUsageViewModel = (data: ApiUsageData): UsageViewModel => {
  const rawPercentage = data.total_granted === 0
    ? 0
    : (data.total_used / data.total_granted) * 100
  const usedPercentage = Math.round(rawPercentage * 10) / 10
  const progressPercentage = clampPercentage(usedPercentage)
  const level = getUsageLevel(rawPercentage)

  return {
    available: formatDollars(data.total_available),
    used: formatDollars(data.total_used),
    granted: formatDollars(data.total_granted),
    usedPercentage,
    progressPercentage,
    level,
  }
}

export const getUsageErrorMessage = (
  error: unknown,
  credentialLabel = 'API key'
): string => {
  const message = error instanceof Error ? error.message : ''
  const statusCode = message.match(/\bHTTP\s+(\d{3})\b/i)?.[1]
  const withStatus = (text: string): string =>
    statusCode ? `${text}（${statusCode}）` : text

  if (/\b(401|403)\b|unauthorized|invalid api key|invalid token/i.test(message)) {
    return `${credentialLabel} 无效`
  }

  if (/\b429\b|too many requests|rate[- ]?limit/i.test(message)) {
    return withStatus('请求过于频繁，请稍后重试')
  }

  if (/\b(?:408|5\d{2})\b|bad gateway|service unavailable|gateway timeout|timed out|timeout/i.test(message)) {
    return withStatus('服务暂时不可用，请稍后重试')
  }

  if (/receiving end does not exist|message port closed|extension context invalidated|could not establish connection/i.test(message)) {
    return '扩展后台未响应，请重新加载扩展'
  }

  if (/failed to fetch|network error|networkerror|connection|dns|name not resolved/i.test(message)) {
    return '网络连接失败，请检查网络'
  }

  if (/invalid usage response|usage request failed|unexpected token|json/i.test(message)) {
    return '接口响应异常，请稍后重试'
  }

  return '查询失败'
}
