/**
 * Background Service Worker - 后台服务脚本
 *
 * 在浏览器后台运行，不依赖任何网页
 * 可以监听浏览器事件、处理跨页面通信等
 */

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
  console.log('[Chrome Utils] Message received:', message, 'from:', sender)

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

