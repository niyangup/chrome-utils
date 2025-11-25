/**
 * Content Script - 全局脚本（匹配所有网页）
 *
 * 这个脚本会在所有网页加载完成后执行
 * 可以访问和操作网页 DOM
 */

import './content.css'

// 等待 DOM 完全加载
const init = (): void => {
  console.log('[Chrome Utils] Content script loaded (all)')

  // TODO: 在这里添加你的功能代码
  // 例如：监听页面事件、修改 DOM、注入 UI 等
}

// 确保 DOM 已准备就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 导出供其他模块使用（如果需要）
export {}

