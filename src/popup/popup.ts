/**
 * Chrome Utils Popup
 */

import {
  cacheUsage,
  createUsageViewModel,
  getUsageErrorMessage,
  loadApiKey,
  loadCachedUsage,
  queryApiUsage,
  saveApiKey,
} from './apiUsage'
import type { CachedUsageSnapshot } from './apiUsage'
import {
  cacheSubscriptionUsage,
  createSubscriptionUsageViewModel,
  getSubscriptionUsageErrorMessage,
  loadAccessToken,
  loadCachedSubscriptionUsage,
  querySubscriptionUsage,
  saveAccessToken,
} from './subscriptionUsage'
import type { CachedSubscriptionUsageSnapshot } from './subscriptionUsage'

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

// ==================== API 用量 ====================

type UsagePanelState = 'empty' | 'loading' | 'summary' | 'error' | 'form'

const getRequiredElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing popup element: ${id}`)
  return element as T
}

const formatUpdatedAt = (queriedAt: number): string => {
  const elapsed = Math.max(Date.now() - queriedAt, 0)
  if (elapsed < 60000) return '刚刚更新'
  if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)} 分钟前更新`

  return `${new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(queriedAt)} 更新`
}

interface UsagePanelController {
  refresh: () => Promise<void>
}

type ConfigurationChangeHandler = (isConfigured: boolean) => void

const initializeUsagePanel = async (
  onConfigurationChange: ConfigurationChangeHandler
): Promise<UsagePanelController> => {
  const elements = {
    section: getRequiredElement<HTMLElement>('usage-section'),
    edit: getRequiredElement<HTMLButtonElement>('usage-edit'),
    empty: getRequiredElement<HTMLElement>('usage-empty'),
    configure: getRequiredElement<HTMLButtonElement>('usage-configure'),
    loading: getRequiredElement<HTMLElement>('usage-loading'),
    summary: getRequiredElement<HTMLElement>('usage-summary'),
    available: getRequiredElement<HTMLElement>('usage-available'),
    progress: getRequiredElement<HTMLElement>('usage-progress'),
    progressFill: getRequiredElement<HTMLElement>('usage-progress-fill'),
    percentage: getRequiredElement<HTMLElement>('usage-percentage'),
    used: getRequiredElement<HTMLElement>('usage-used'),
    granted: getRequiredElement<HTMLElement>('usage-granted'),
    updatedAt: getRequiredElement<HTMLElement>('usage-updated-at'),
    error: getRequiredElement<HTMLElement>('usage-error'),
    form: getRequiredElement<HTMLFormElement>('usage-form'),
    input: getRequiredElement<HTMLInputElement>('api-key-input'),
    visibility: getRequiredElement<HTMLButtonElement>('api-key-visibility'),
    cancel: getRequiredElement<HTMLButtonElement>('api-key-cancel'),
    save: getRequiredElement<HTMLButtonElement>('api-key-save'),
  }

  let apiKey = ''
  let currentSnapshot: CachedUsageSnapshot | undefined
  let lastError = ''
  let requestVersion = 0

  const setState = (state: UsagePanelState): void => {
    elements.empty.hidden = state !== 'empty'
    elements.loading.hidden = state !== 'loading'
    elements.summary.hidden = state !== 'summary'
    elements.error.hidden = state !== 'error'
    elements.form.hidden = state !== 'form'

    const hasConfiguredKey = Boolean(apiKey) && state !== 'form'
    onConfigurationChange(hasConfiguredKey)
    elements.edit.hidden = !hasConfiguredKey
  }

  const setRefreshing = (isRefreshing: boolean): void => {
    elements.section.classList.toggle('is-loading', isRefreshing)
  }

  const renderSummary = (snapshot: CachedUsageSnapshot, statusMessage = ''): void => {
    const viewModel = createUsageViewModel(snapshot.data)
    elements.section.dataset.level = viewModel.level
    elements.available.textContent = viewModel.available
    elements.used.textContent = viewModel.used
    elements.granted.textContent = viewModel.granted
    elements.percentage.textContent = `已用 ${viewModel.usedPercentage.toFixed(1)}%`
    elements.progress.setAttribute('aria-valuenow', String(viewModel.usedPercentage))
    elements.progressFill.style.width = `${viewModel.progressPercentage}%`
    elements.updatedAt.textContent = statusMessage
      ? `${statusMessage} · ${formatUpdatedAt(snapshot.queriedAt)}`
      : formatUpdatedAt(snapshot.queriedAt)
    elements.updatedAt.classList.toggle('is-error', Boolean(statusMessage))
    setState('summary')
  }

  const showError = (message: string): void => {
    lastError = message
    if (currentSnapshot) {
      renderSummary(currentSnapshot, message)
      return
    }

    elements.error.textContent = message
    setState('error')
  }

  const refreshUsage = async (): Promise<void> => {
    if (!apiKey) {
      setState('empty')
      return
    }

    const currentRequest = ++requestVersion
    setRefreshing(true)
    if (currentSnapshot) {
      renderSummary(currentSnapshot)
    } else {
      setState('loading')
    }

    try {
      const snapshot = await queryApiUsage(apiKey)
      if (currentRequest !== requestVersion) return

      await cacheUsage(snapshot)
      currentSnapshot = snapshot
      lastError = ''
      renderSummary(snapshot)
    } catch (error) {
      if (currentRequest !== requestVersion) return
      showError(getUsageErrorMessage(error))
    } finally {
      if (currentRequest === requestVersion) setRefreshing(false)
    }
  }

  const openEditor = (): void => {
    requestVersion += 1
    setRefreshing(false)
    elements.input.value = apiKey
    elements.input.type = 'password'
    elements.visibility.textContent = '显示'
    setState('form')
    elements.input.focus()
  }

  const closeEditor = (): void => {
    if (currentSnapshot) {
      renderSummary(currentSnapshot, lastError)
    } else if (lastError) {
      showError(lastError)
    } else if (apiKey) {
      void refreshUsage()
    } else {
      setState('empty')
    }
  }

  elements.configure.addEventListener('click', openEditor)
  elements.edit.addEventListener('click', openEditor)
  elements.cancel.addEventListener('click', closeEditor)

  elements.visibility.addEventListener('click', () => {
    const shouldShow = elements.input.type === 'password'
    elements.input.type = shouldShow ? 'text' : 'password'
    elements.visibility.textContent = shouldShow ? '隐藏' : '显示'
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    const nextKey = elements.input.value.trim()
    if (!nextKey) {
      elements.input.setCustomValidity('请输入 API key')
      elements.input.reportValidity()
      return
    }

    elements.input.setCustomValidity('')
    elements.save.disabled = true
    void saveApiKey(nextKey)
      .then((savedKey) => {
        apiKey = savedKey
        currentSnapshot = undefined
        lastError = ''
        return refreshUsage()
      })
      .catch((error) => showError(getUsageErrorMessage(error)))
      .finally(() => {
        elements.save.disabled = false
      })
  })

  ;[apiKey, currentSnapshot] = await Promise.all([
    loadApiKey(),
    loadCachedUsage(),
  ])

  if (!apiKey) {
    currentSnapshot = undefined
    setState('empty')
    return { refresh: refreshUsage }
  }

  if (currentSnapshot) renderSummary(currentSnapshot)
  return { refresh: refreshUsage }
}

const initializeSubscriptionPanel = async (
  onConfigurationChange: ConfigurationChangeHandler
): Promise<UsagePanelController> => {
  const elements = {
    section: getRequiredElement<HTMLElement>('subscription-section'),
    edit: getRequiredElement<HTMLButtonElement>('subscription-edit'),
    empty: getRequiredElement<HTMLElement>('subscription-empty'),
    configure: getRequiredElement<HTMLButtonElement>('subscription-configure'),
    loading: getRequiredElement<HTMLElement>('subscription-loading'),
    summary: getRequiredElement<HTMLElement>('subscription-summary'),
    progress: getRequiredElement<HTMLElement>('subscription-progress'),
    progressFill: getRequiredElement<HTMLElement>('subscription-progress-fill'),
    percentage: getRequiredElement<HTMLElement>('subscription-percentage'),
    fiveHourRemaining: getRequiredElement<HTMLElement>('subscription-five-hour-remaining'),
    weeklyRemaining: getRequiredElement<HTMLElement>('subscription-weekly-remaining'),
    status: getRequiredElement<HTMLElement>('subscription-status'),
    error: getRequiredElement<HTMLElement>('subscription-error'),
    form: getRequiredElement<HTMLFormElement>('subscription-form'),
    input: getRequiredElement<HTMLInputElement>('subscription-token-input'),
    visibility: getRequiredElement<HTMLButtonElement>('subscription-token-visibility'),
    cancel: getRequiredElement<HTMLButtonElement>('subscription-token-cancel'),
    save: getRequiredElement<HTMLButtonElement>('subscription-token-save'),
  }

  let accessToken = ''
  let currentSnapshot: CachedSubscriptionUsageSnapshot | undefined
  let lastError = ''
  let requestVersion = 0

  const setState = (state: UsagePanelState): void => {
    elements.empty.hidden = state !== 'empty'
    elements.loading.hidden = state !== 'loading'
    elements.summary.hidden = state !== 'summary'
    elements.error.hidden = state !== 'error'
    elements.form.hidden = state !== 'form'

    const hasConfiguredToken = Boolean(accessToken) && state !== 'form'
    onConfigurationChange(hasConfiguredToken)
    elements.edit.hidden = !hasConfiguredToken
  }

  const renderSummary = (
    snapshot: CachedSubscriptionUsageSnapshot,
    statusMessage = ''
  ): void => {
    const viewModel = createSubscriptionUsageViewModel(snapshot.data)
    const displayStatus = statusMessage || (viewModel.hasStatusError ? '状态异常' : '')

    elements.section.dataset.level = viewModel.level
    elements.percentage.textContent = `已用 ${viewModel.usedPercentage.toFixed(1)}%`
    elements.progress.setAttribute('aria-valuenow', String(viewModel.usedPercentage))
    elements.progressFill.style.width = `${viewModel.progressPercentage}%`
    elements.fiveHourRemaining.textContent = `${viewModel.remainingFiveHourPercentage}%`
    elements.weeklyRemaining.textContent = `${viewModel.remainingWeeklyPercentage}%`
    elements.status.textContent = displayStatus
      ? `${displayStatus} · ${formatUpdatedAt(snapshot.queriedAt)}`
      : formatUpdatedAt(snapshot.queriedAt)
    elements.status.classList.toggle('is-error', Boolean(displayStatus))
    setState('summary')
  }

  const showError = (message: string): void => {
    lastError = message
    if (currentSnapshot) {
      renderSummary(currentSnapshot, message)
      return
    }

    elements.error.textContent = message
    setState('error')
  }

  const refreshSubscription = async (): Promise<void> => {
    if (!accessToken) {
      setState('empty')
      return
    }

    const currentRequest = ++requestVersion
    elements.section.classList.add('is-loading')
    if (currentSnapshot) {
      renderSummary(currentSnapshot)
    } else {
      setState('loading')
    }

    try {
      const snapshot = await querySubscriptionUsage(accessToken)
      if (currentRequest !== requestVersion) return

      await cacheSubscriptionUsage(snapshot)
      currentSnapshot = snapshot
      lastError = ''
      renderSummary(snapshot)
    } catch (error) {
      if (currentRequest !== requestVersion) return
      showError(getSubscriptionUsageErrorMessage(error))
    } finally {
      if (currentRequest === requestVersion) {
        elements.section.classList.remove('is-loading')
      }
    }
  }

  const openEditor = (): void => {
    requestVersion += 1
    elements.section.classList.remove('is-loading')
    elements.input.value = accessToken
    elements.input.type = 'password'
    elements.visibility.textContent = '显示'
    setState('form')
    elements.input.focus()
  }

  const closeEditor = (): void => {
    if (currentSnapshot) {
      renderSummary(currentSnapshot, lastError)
    } else if (lastError) {
      showError(lastError)
    } else if (accessToken) {
      void refreshSubscription()
    } else {
      setState('empty')
    }
  }

  elements.configure.addEventListener('click', openEditor)
  elements.edit.addEventListener('click', openEditor)
  elements.cancel.addEventListener('click', closeEditor)

  elements.visibility.addEventListener('click', () => {
    const shouldShow = elements.input.type === 'password'
    elements.input.type = shouldShow ? 'text' : 'password'
    elements.visibility.textContent = shouldShow ? '隐藏' : '显示'
  })

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    const nextToken = elements.input.value.trim()
    if (!nextToken) {
      elements.input.setCustomValidity('请输入订阅 Token')
      elements.input.reportValidity()
      return
    }

    elements.input.setCustomValidity('')
    elements.save.disabled = true
    void saveAccessToken(nextToken)
      .then((savedToken) => {
        accessToken = savedToken
        currentSnapshot = undefined
        lastError = ''
        return refreshSubscription()
      })
      .catch((error) => showError(getSubscriptionUsageErrorMessage(error)))
      .finally(() => {
        elements.save.disabled = false
      })
  })

  ;[accessToken, currentSnapshot] = await Promise.all([
    loadAccessToken(),
    loadCachedSubscriptionUsage(),
  ])

  if (!accessToken) {
    currentSnapshot = undefined
    setState('empty')
    return { refresh: refreshSubscription }
  }

  if (currentSnapshot) renderSummary(currentSnapshot)
  return { refresh: refreshSubscription }
}

const initializeUsagePanels = async (): Promise<void> => {
  const refreshButton = getRequiredElement<HTMLButtonElement>('usage-refresh')
  let hasApiKey = false
  let hasSubscriptionToken = false

  const updateRefreshVisibility = (): void => {
    refreshButton.hidden = !(hasApiKey || hasSubscriptionToken)
  }

  const [usagePanel, subscriptionPanel] = await Promise.all([
    initializeUsagePanel((isConfigured) => {
      hasApiKey = isConfigured
      updateRefreshVisibility()
    }),
    initializeSubscriptionPanel((isConfigured) => {
      hasSubscriptionToken = isConfigured
      updateRefreshVisibility()
    }),
  ])

  let isRefreshing = false
  const refreshAllUsage = async (): Promise<void> => {
    if (isRefreshing) return

    isRefreshing = true
    refreshButton.disabled = true
    try {
      await Promise.all([usagePanel.refresh(), subscriptionPanel.refresh()])
    } finally {
      isRefreshing = false
      refreshButton.disabled = false
      updateRefreshVisibility()
    }
  }

  refreshButton.addEventListener('click', () => void refreshAllUsage())

  await refreshAllUsage()
}

// ==================== 渲染 ====================

/** 渲染快捷入口列表 */
const renderShortcuts = (): void => {
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
  void initializeUsagePanels().catch((error) => {
    console.error('[Chrome Utils] Failed to initialize usage panels:', error)
  })

  // 设置链接
  document.getElementById('settings-link')?.addEventListener('click', (e) => {
    e.preventDefault()
    chrome.runtime.openOptionsPage()
  })
})
