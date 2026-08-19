/**
 * Background Service Worker - 后台服务脚本
 *
 * 在浏览器后台运行，不依赖任何网页
 * 可以监听浏览器事件、处理跨页面通信等
 */

const API_USAGE_URL = 'https://5spiritual.com/api/usage/token/'
const SUBSCRIPTION_USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown API usage error'

interface BearerFetchResult {
  success: true
  status: number
  data: unknown
}

// 插件安装时触发
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Chrome Utils] Extension installed', details.reason)

  if (details.reason === 'install') {
    // 首次安装
    console.log('[Chrome Utils] First install')
  } else if (details.reason === 'update') {
    // 更新
    console.log('[Chrome Utils] Updated from', details.previousVersion)
  }
})

// 监听来自 Content Script 或 Popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Chrome Utils] Message received:', message.type, 'from:', sender)

  // 处理不同类型的消息
  switch (message.type) {
    case 'GET_TAB_INFO':
      // 获取当前标签页信息
      if (sender.tab) {
        sendResponse({ tabId: sender.tab.id, url: sender.tab.url })
      }
      break

    case 'PING':
      // 简单的 ping-pong 测试
      sendResponse({ pong: true, timestamp: Date.now() })
      break

    case 'DOWNLOAD_FILE':
      // 处理文件下载请求
      handleDownloadFile(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true // 异步响应

    case 'FETCH_REQUEST':
      // 处理跨域 fetch 请求（用于绕过 CORS）
      handleFetchRequest(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true // 异步响应

    case 'GET_API_USAGE':
      handleApiUsageRequest(message.payload)
        .then((result) => sendResponse(result))
        .catch((error: unknown) => {
          const errorMessage = getErrorMessage(error)
          console.error('[Chrome Utils] API usage request failed:', errorMessage)
          sendResponse({ success: false, error: errorMessage })
        })
      return true

    case 'GET_SUBSCRIPTION_USAGE':
      handleSubscriptionUsageRequest(message.payload)
        .then((result) => sendResponse(result))
        .catch((error: unknown) => {
          const errorMessage = getErrorMessage(error)
          console.error('[Chrome Utils] Subscription usage request failed:', errorMessage)
          sendResponse({ success: false, error: errorMessage })
        })
      return true

    default:
      sendResponse({ error: 'Unknown message type' })
  }

  // 返回 true 表示会异步发送响应
  return true
})

/**
 * 处理文件下载请求
 */
async function handleDownloadFile(payload: { url: string; filename: string }) {
  try {
    const { url, filename } = payload
    console.log('[Chrome Utils] Downloading file:', filename, 'from:', url)

    const downloadId = await chrome.downloads.download({
      url,
      filename,
      saveAs: false,
    })

    console.log('[Chrome Utils] Download started, id:', downloadId)
    return { success: true, downloadId }
  } catch (error) {
    console.error('[Chrome Utils] Download failed:', error)
    throw error
  }
}

/**
 * 查询固定账号接口，避免调用方传入任意认证请求地址。
 */
async function handleApiUsageRequest(payload: { apiKey?: string }): Promise<BearerFetchResult> {
  const apiKey = payload?.apiKey?.trim()
  if (!apiKey) throw new Error('API key is required')

  return await fetchBearerJson(API_USAGE_URL, apiKey)
}

/**
 * 查询 OpenCode 订阅接口，避免调用方传入任意认证请求地址。
 */
async function handleSubscriptionUsageRequest(
  payload: { accessToken?: string }
): Promise<BearerFetchResult> {
  const accessToken = payload?.accessToken?.trim()
  if (!accessToken) throw new Error('Access token is required')

  return await fetchBearerJson(SUBSCRIPTION_USAGE_URL, accessToken)
}

const fetchBearerJson = async (
  url: string,
  token: string
): Promise<BearerFetchResult> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return {
    success: true,
    status: response.status,
    data: await response.json(),
  }
}

/**
 * 处理跨域 fetch 请求
 */
async function handleFetchRequest(payload: {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
}) {
  try {
    const { url, method, headers, body } = payload
    console.log('[Chrome Utils] Fetch request:', method, url)

    const response = await fetch(url, {
      method,
      headers: headers || {},
      body: body || undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // 尝试解析响应
    const contentType = response.headers.get('content-type')
    let data: unknown = null

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    console.log('[Chrome Utils] Fetch success:', response.status)
    return { success: true, status: response.status, data }
  } catch (error) {
    console.error('[Chrome Utils] Fetch failed:', error)
    throw error
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[Chrome Utils] Tab updated:', tabId, tab.url)
  }
})


// 导出空对象以确保这是一个模块
export {}
