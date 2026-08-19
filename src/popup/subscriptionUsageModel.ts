import {
  clampPercentage,
  getUsageErrorMessage,
  getUsageLevel,
} from './apiUsageModel.ts'
import type { UsageLevel } from './apiUsageModel.ts'

export interface SubscriptionWindowUsage {
  status: string
  percent: number
}

export interface SubscriptionUsageData {
  rolling: SubscriptionWindowUsage
  weekly: SubscriptionWindowUsage
}

export interface SubscriptionUsageViewModel {
  usedPercentage: number
  progressPercentage: number
  remainingFiveHourPercentage: number
  remainingWeeklyPercentage: number
  level: UsageLevel
  hasStatusError: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isPercentage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const parseWindow = (value: unknown): SubscriptionWindowUsage | undefined => {
  if (!isRecord(value) || typeof value.status !== 'string' || !isPercentage(value.percent)) {
    return undefined
  }

  return {
    status: value.status,
    percent: value.percent,
  }
}

export const parseSubscriptionUsageResponse = (response: unknown): SubscriptionUsageData => {
  if (!isRecord(response) || !isRecord(response.usage)) {
    throw new Error('Invalid subscription usage response')
  }

  const rolling = parseWindow(response.usage.rolling)
  const weekly = parseWindow(response.usage.weekly)
  if (!rolling || !weekly) throw new Error('Invalid subscription usage response')

  return { rolling, weekly }
}

const roundToOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10

export const createSubscriptionUsageViewModel = (
  data: SubscriptionUsageData
): SubscriptionUsageViewModel => {
  const usedPercentage = roundToOneDecimal(data.rolling.percent)
  const hasStatusError = data.rolling.status !== 'ok' || data.weekly.status !== 'ok'

  return {
    usedPercentage,
    progressPercentage: clampPercentage(usedPercentage),
    remainingFiveHourPercentage: Math.round(clampPercentage(100 - data.rolling.percent)),
    remainingWeeklyPercentage: Math.round(clampPercentage(data.weekly.percent)),
    level: hasStatusError ? 'error' : getUsageLevel(data.rolling.percent),
    hasStatusError,
  }
}

export const getSubscriptionUsageErrorMessage = (error: unknown): string =>
  getUsageErrorMessage(error, '订阅 Token')
