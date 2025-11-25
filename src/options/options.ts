/**
 * Options 设置页面脚本
 *
 * 插件的配置页面，用于管理用户设置
 */

// 默认设置
const DEFAULT_SETTINGS = {
  enableContentScript: true,
  enableNotifications: true,
  logLevel: 'info',
}

type Settings = typeof DEFAULT_SETTINGS

// 加载设置
const loadSettings = async (): Promise<Settings> => {
  const result = await chrome.storage.sync.get(DEFAULT_SETTINGS)
  return result as Settings
}

// 保存设置
const saveSettings = async (settings: Settings): Promise<void> => {
  await chrome.storage.sync.set(settings)
}

// 获取当前表单值
const getFormValues = (): Settings => {
  const enableContentScript = (document.getElementById('enableContentScript') as HTMLInputElement)?.checked ?? true
  const enableNotifications = (document.getElementById('enableNotifications') as HTMLInputElement)?.checked ?? true
  const logLevel = (document.getElementById('logLevel') as HTMLSelectElement)?.value ?? 'info'

  return {
    enableContentScript,
    enableNotifications,
    logLevel,
  }
}

// 设置表单值
const setFormValues = (settings: Settings): void => {
  const enableContentScriptEl = document.getElementById('enableContentScript') as HTMLInputElement
  const enableNotificationsEl = document.getElementById('enableNotifications') as HTMLInputElement
  const logLevelEl = document.getElementById('logLevel') as HTMLSelectElement

  if (enableContentScriptEl) enableContentScriptEl.checked = settings.enableContentScript
  if (enableNotificationsEl) enableNotificationsEl.checked = settings.enableNotifications
  if (logLevelEl) logLevelEl.value = settings.logLevel
}

// 显示提示信息
const showMessage = (message: string, type: 'success' | 'error' = 'success'): void => {
  // 简单的提示实现
  const color = type === 'success' ? '#4caf50' : '#f44336'
  const toast = document.createElement('div')
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${color};
    color: white;
    border-radius: 6px;
    font-size: 14px;
    z-index: 10000;
    animation: fadeIn 0.3s;
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2000)
}

// 初始化
const init = async (): Promise<void> => {
  // 加载已保存的设置
  const settings = await loadSettings()
  setFormValues(settings)

  // 保存按钮
  const btnSave = document.getElementById('btnSave')
  btnSave?.addEventListener('click', async () => {
    const newSettings = getFormValues()
    await saveSettings(newSettings)
    showMessage('设置已保存')
  })

  // 重置按钮
  const btnReset = document.getElementById('btnReset')
  btnReset?.addEventListener('click', async () => {
    setFormValues(DEFAULT_SETTINGS)
    await saveSettings(DEFAULT_SETTINGS)
    showMessage('已重置为默认设置')
  })
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', init)

