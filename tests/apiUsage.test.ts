import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createUsageViewModel,
  getUsageErrorMessage,
  parseUsageResponse,
} from '../src/popup/apiUsageModel.ts'

const usageResponse = {
  code: true,
  data: {
    expires_at: 0,
    model_limits: {},
    model_limits_enabled: false,
    name: 'poper-key',
    object: 'token_usage',
    total_available: 61720357,
    total_granted: 136753761,
    total_used: 75033404,
    unlimited_quota: false,
  },
  message: 'ok',
}

test('converts raw quota into the agreed dollar usage summary', () => {
  const data = parseUsageResponse(usageResponse)

  assert.deepEqual(createUsageViewModel(data), {
    available: '$123.44',
    used: '$150.07',
    granted: '$273.51',
    usedPercentage: 54.9,
    progressPercentage: 54.9,
    level: 'healthy',
  })
})

test('uses warning and critical levels at the agreed thresholds', () => {
  const baseData = usageResponse.data

  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 90, total_granted: 100 }).level,
    'healthy'
  )
  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 91, total_granted: 100 }).level,
    'warning'
  )
  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 95, total_granted: 100 }).level,
    'warning'
  )
  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 96, total_granted: 100 }).level,
    'critical'
  )
})

test('classifies thresholds before rounding the displayed percentage', () => {
  const baseData = usageResponse.data

  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 8496, total_granted: 10000 }).level,
    'healthy'
  )
  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 9096, total_granted: 10000 }).level,
    'warning'
  )
  assert.equal(
    createUsageViewModel({ ...baseData, total_used: 9504, total_granted: 10000 }).level,
    'critical'
  )
})

test('reports overuse while capping only the progress bar width', () => {
  const viewModel = createUsageViewModel({
    ...usageResponse.data,
    total_used: 110,
    total_granted: 100,
  })

  assert.equal(viewModel.usedPercentage, 110)
  assert.equal(viewModel.progressPercentage, 100)
})

test('rejects unsuccessful or malformed usage responses', () => {
  assert.throws(
    () => parseUsageResponse({ code: false, message: 'unauthorized' }),
    /unauthorized/
  )
  assert.throws(
    () => parseUsageResponse({ code: true, data: { total_granted: 1 } }),
    /invalid usage response/i
  )
})

test('turns authorization failures into an actionable key error', () => {
  assert.equal(getUsageErrorMessage(new Error('HTTP 401: Unauthorized')), 'API key 无效')
  assert.equal(getUsageErrorMessage(new Error('invalid api key')), 'API key 无效')
})

test('classifies rate-limit, server, network, and response errors', () => {
  assert.equal(
    getUsageErrorMessage(new Error('HTTP 429: Too Many Requests')),
    '请求过于频繁，请稍后重试（429）'
  )
  assert.equal(
    getUsageErrorMessage(new Error('HTTP 503: Service Unavailable')),
    '服务暂时不可用，请稍后重试（503）'
  )
  assert.equal(
    getUsageErrorMessage(new Error('Failed to fetch')),
    '网络连接失败，请检查网络'
  )
  assert.equal(
    getUsageErrorMessage(new Error('Could not establish connection. Receiving end does not exist.')),
    '扩展后台未响应，请重新加载扩展'
  )
  assert.equal(
    getUsageErrorMessage(new Error('Invalid usage response')),
    '接口响应异常，请稍后重试'
  )
})

test('keeps a concise fallback for unknown failures', () => {
  assert.equal(getUsageErrorMessage('unknown'), '查询失败')
})
