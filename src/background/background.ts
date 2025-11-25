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

    default:
      sendResponse({ error: 'Unknown message type' })
  }

  // 返回 true 表示会异步发送响应
  return true
})

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('[Chrome Utils] Tab updated:', tabId, tab.url)
  }
})

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'chrome-utils-menu',
    title: 'Chrome Utils',
    contexts: ['all'],
  })
})

// 右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('[Chrome Utils] Context menu clicked:', info.menuItemId, tab?.url)
})

// 导出空对象以确保这是一个模块
export {}

