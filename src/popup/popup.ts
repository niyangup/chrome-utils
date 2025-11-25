/**
 * Popup 页面脚本
 *
 * 点击插件图标时显示的弹窗页面
 */

// 获取当前标签页信息
const getCurrentTab = async (): Promise<chrome.tabs.Tab | undefined> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

// 初始化
const init = async (): Promise<void> => {
  // 显示当前页面 URL
  const currentUrlEl = document.getElementById('currentUrl')
  const tab = await getCurrentTab()

  if (currentUrlEl && tab?.url) {
    const url = new URL(tab.url)
    currentUrlEl.textContent = url.hostname || tab.url
    currentUrlEl.title = tab.url
  }

  // 测试连接按钮
  const btnTest = document.getElementById('btnTest')
  btnTest?.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'PING' })
    console.log('[Popup] Ping response:', response)
    alert(`连接成功！时间戳: ${response.timestamp}`)
  })

  // 打开设置按钮
  const btnOptions = document.getElementById('btnOptions')
  btnOptions?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init)

