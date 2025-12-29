/**
 * Chrome Utils Popup
 */

// ==================== 快捷入口配置 ====================

interface ShortcutItem {
  id: string
  name: string
  description: string
  url: string
  icon: 'dingtalk' | 'default'
}

/** 快捷入口列表 - 在这里添加新入口 */
const SHORTCUTS: ShortcutItem[] = [
  {
    id: 'dingtalk-batch-download',
    name: '场景页批量下载',
    description: '待发布文档文件夹',
    url: 'https://alidocs.dingtalk.com/i/nodes/G1DKw2zgV2ylrBgrcDYQ30MoWB5r9YAn',
    icon: 'dingtalk',
  },
  // 后续可以在这里添加更多入口
]

// ==================== 图标 ====================

const Icons = {
  dingtalk: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
    </svg>
  `,
  default: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  `,
  arrow: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9,18 15,12 9,6"/>
    </svg>
  `,
  download: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `,
}

// ==================== 渲染 ====================

/** 渲染快捷入口列表 */
const renderShortcuts = () => {
  const listEl = document.getElementById('shortcut-list')
  if (!listEl) return

  if (SHORTCUTS.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
        </svg>
        <div>暂无快捷入口</div>
      </div>
    `
    return
  }

  listEl.innerHTML = SHORTCUTS.map(
    (item) => `
      <div class="shortcut-item" data-url="${item.url}">
        <div class="shortcut-icon ${item.icon}">
          ${Icons[item.icon]}
        </div>
        <div class="shortcut-info">
          <div class="shortcut-name">${item.name}</div>
          <div class="shortcut-desc">${item.description}</div>
        </div>
        <div class="shortcut-actions">
          <button class="shortcut-btn open" data-url="${item.url}" title="打开页面">
            ${Icons.arrow}
          </button>
          <button class="shortcut-btn download" data-url="${item.url}?auto_download=1" title="直接下载">
            ${Icons.download}
          </button>
        </div>
      </div>
    `
  ).join('')

  // 绑定点击事件 - 打开页面
  listEl.querySelectorAll('.shortcut-btn.open').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const url = btn.getAttribute('data-url')
      if (url) chrome.tabs.create({ url })
    })
  })

  // 绑定点击事件 - 直接下载
  listEl.querySelectorAll('.shortcut-btn.download').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const url = btn.getAttribute('data-url')
      if (url) chrome.tabs.create({ url })
    })
  })

  // 点击整个条目默认打开页面
  listEl.querySelectorAll('.shortcut-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      // 如果点击的是按钮，则不处理
      if ((e.target as HTMLElement).closest('.shortcut-btn')) return
      const url = item.getAttribute('data-url')
      if (url) chrome.tabs.create({ url })
    })
  })
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Chrome Utils] Popup loaded')
  renderShortcuts()

  // 设置链接
  document.getElementById('settings-link')?.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
})
