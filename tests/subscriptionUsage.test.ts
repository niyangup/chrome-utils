import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSubscriptionUsageViewModel,
  getSubscriptionUsageErrorMessage,
  parseSubscriptionUsageResponse,
} from '../src/popup/subscriptionUsageModel.ts'

const usageResponse = {
  usage: {
    rolling: {
      status: 'ok',
      percent: 59,
      resetsAt: '2026-08-19T13:03:46.364Z',
    },
    weekly: {
      status: 'ok',
      percent: 23,
      resetsAt: '2026-08-24T00:00:00.364Z',
    },
    monthly: {
      status: 'ok',
      percent: 11,
      resetsAt: '2026-09-19T07:58:14.364Z',
    },
  },
}

test('parses the rolling and weekly subscription windows', () => {
  assert.deepEqual(parseSubscriptionUsageResponse(usageResponse), {
    rolling: { status: 'ok', percent: 59 },
    weekly: { status: 'ok', percent: 23 },
  })
})

test('uses rolling usage for the progress bar and exposes remaining windows', () => {
  const data = parseSubscriptionUsageResponse(usageResponse)

  assert.deepEqual(createSubscriptionUsageViewModel(data), {
    usedPercentage: 59,
    progressPercentage: 59,
    remainingFiveHourPercentage: 41,
    remainingWeeklyPercentage: 23,
    level: 'healthy',
    hasStatusError: false,
  })
})

test('uses the same warning and critical thresholds as the API usage panel', () => {
  const baseData = parseSubscriptionUsageResponse(usageResponse)

  assert.equal(
    createSubscriptionUsageViewModel({
      ...baseData,
      rolling: { ...baseData.rolling, percent: 91 },
    }).level,
    'warning'
  )
  assert.equal(
    createSubscriptionUsageViewModel({
      ...baseData,
      rolling: { ...baseData.rolling, percent: 96 },
    }).level,
    'critical'
  )
})

test('marks non-ok windows as an error without discarding percentages', () => {
  const baseData = parseSubscriptionUsageResponse(usageResponse)
  const viewModel = createSubscriptionUsageViewModel({
    ...baseData,
    rolling: { status: 'degraded', percent: 59 },
    weekly: { status: 'limited', percent: 23 },
  })

  assert.equal(viewModel.level, 'error')
  assert.equal(viewModel.hasStatusError, true)
  assert.equal(viewModel.usedPercentage, 59)
  assert.equal(viewModel.remainingFiveHourPercentage, 41)
  assert.equal(viewModel.remainingWeeklyPercentage, 23)
})

test('caps progress and remaining values to the percentage range', () => {
  const data = {
    rolling: { status: 'ok', percent: 110 },
    weekly: { status: 'ok', percent: -10 },
  }

  assert.deepEqual(createSubscriptionUsageViewModel(data), {
    usedPercentage: 110,
    progressPercentage: 100,
    remainingFiveHourPercentage: 0,
    remainingWeeklyPercentage: 0,
    level: 'critical',
    hasStatusError: false,
  })
})

test('rejects malformed subscription usage responses', () => {
  assert.throws(
    () => parseSubscriptionUsageResponse({ usage: { rolling: {}, weekly: {} } }),
    /invalid subscription usage response/i
  )
  assert.throws(
    () => parseSubscriptionUsageResponse({ usage: { rolling: { status: 'ok', percent: 1 } } }),
    /invalid subscription usage response/i
  )
})

test('uses subscription-specific credential errors', () => {
  assert.equal(
    getSubscriptionUsageErrorMessage(new Error('HTTP 401: Unauthorized')),
    '订阅 Token 无效'
  )
})
