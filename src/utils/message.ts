/**
 * 消息通信工具函数
 *
 * 封装 chrome.runtime 和 chrome.tabs 的消息传递 API
 */

/**
 * 消息类型定义
 */
export interface Message<T = unknown> {
  type: string
  payload?: T
}

/**
 * 响应类型定义
 */
export interface Response<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 发送消息到 Background Script
 * @param message 消息对象
 */
export const sendToBackground = async <T = unknown, R = unknown>(
  message: Message<T>
): Promise<R> => {
  return await chrome.runtime.sendMessage(message)
}

/**
 * 发送消息到指定标签页的 Content Script
 * @param tabId 标签页 ID
 * @param message 消息对象
 */
export const sendToTab = async <T = unknown, R = unknown>(
  tabId: number,
  message: Message<T>
): Promise<R> => {
  return await chrome.tabs.sendMessage(tabId, message)
}

/**
 * 发送消息到当前活动标签页的 Content Script
 * @param message 消息对象
 */
export const sendToActiveTab = async <T = unknown, R = unknown>(
  message: Message<T>
): Promise<R | undefined> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    return await sendToTab(tab.id, message)
  }
  return undefined
}

/**
 * 发送消息到所有标签页的 Content Script
 * @param message 消息对象
 */
export const sendToAllTabs = async <T = unknown>(
  message: Message<T>
): Promise<void> => {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await sendToTab(tab.id, message)
      } catch {
        // 忽略无法接收消息的标签页（如 chrome:// 页面）
      }
    }
  }
}

/**
 * 监听消息
 * @param handler 消息处理函数
 */
export const onMessage = <T = unknown, R = unknown>(
  handler: (
    message: Message<T>,
    sender: chrome.runtime.MessageSender
  ) => Promise<R> | R
): void => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const result = handler(message as Message<T>, sender)

    if (result instanceof Promise) {
      result.then(sendResponse).catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
      return true // 表示异步响应
    }

    sendResponse(result)
    return false
  })
}

/**
 * 创建一个带类型的消息发送器
 * @param type 消息类型
 */
export const createMessageSender = <T = unknown, R = unknown>(type: string) => {
  return async (payload?: T): Promise<R> => {
    return await sendToBackground({ type, payload })
  }
}

