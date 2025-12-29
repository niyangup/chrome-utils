/**
 * 钉钉文档批量下载 - 主入口
 */

import './dingtalk.css'
import JSZip from 'jszip'
import { TARGET_FOLDER_UUID, DOWNLOAD_DELAY } from './config'
import { getFolderUuidFromUrl, formatDate, convertFileName, delay, downloadBlob } from './utils'
import { fetchDentryList, exportFile } from './api'
import { createDownloadButton, createDownloadPanel, updatePanelUI, updateButtonState } from './ui'
import { createInitialState, type BatchDownloadState, type DownloadTask } from './types'

console.log('[DingTalk] 批量下载脚本已加载')

// ==================== 状态管理 ====================

let state: BatchDownloadState = createInitialState()
let downloadBtn: HTMLButtonElement | null = null
let downloadPanel: HTMLDivElement | null = null

const updateUI = () => {
  if (downloadPanel) {
    updatePanelUI(downloadPanel, state)
  }
}

const resetState = () => {
  state = createInitialState()
}

// ==================== 页面检测 ====================

const isTargetPage = (): boolean => {
  return getFolderUuidFromUrl() === TARGET_FOLDER_UUID
}

/** 检查是否需要自动下载 */
const shouldAutoDownload = (): boolean => {
  const params = new URLSearchParams(window.location.search)
  return params.get('auto_download') === '1'
}

/** 清除 URL 中的自动下载参数 */
const clearAutoDownloadParam = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('auto_download')
  window.history.replaceState({}, '', url.toString())
}

// ==================== 事件处理 ====================

/** 处理按钮点击 */
const handleButtonClick = async () => {
  if (!downloadPanel) return

  downloadPanel.classList.add('show')

  if (state.isRunning) return

  try {
    if (downloadBtn) updateButtonState(downloadBtn, true)

    const folderUuid = getFolderUuidFromUrl()
    if (!folderUuid) throw new Error('无法获取文件夹 ID')

    const files = await fetchDentryList(folderUuid)
    if (files.length === 0) throw new Error('文件夹中没有可下载的表格文件')

    state = {
      ...createInitialState(),
      tasks: files.map((file): DownloadTask => ({
        id: file.dentryUuid,
        file,
        status: 'pending',
      })),
      totalCount: files.length,
    }

    updateUI()
  } catch (error) {
    console.error('[DingTalk] 获取文件列表失败:', error)
    alert(`获取文件列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    if (downloadBtn) updateButtonState(downloadBtn, false)
  }
}

/** 处理开始下载 */
const handleStartDownload = async () => {
  if (state.isRunning || state.tasks.length === 0) return

  state.isRunning = true
  updateUI()

  const zip = new JSZip()
  const successFiles: { name: string; blob: Blob }[] = []

  for (const task of state.tasks) {
    if (!state.isRunning) break
    if (task.status === 'completed') continue

    try {
      // 导出流程
      task.status = 'exporting'
      updateUI()

      const ossUrl = await exportFile(task.file, task.file.corpId || '')
      task.ossUrl = ossUrl

      // 下载文件
      task.status = 'downloading'
      updateUI()

      const response = await fetch(ossUrl)
      if (!response.ok) throw new Error(`下载失败: ${response.status}`)

      const blob = await response.blob()
      const fileName = convertFileName(task.file.name)
      successFiles.push({ name: fileName, blob })

      // 完成
      task.status = 'completed'
      state.completedCount++
      updateUI()

      await delay(DOWNLOAD_DELAY)
    } catch (error) {
      console.error(`[DingTalk] 下载失败: ${task.file.name}`, error)
      task.status = 'error'
      task.error = error instanceof Error ? error.message : '下载失败'
      state.errorCount++
      updateUI()
    }
  }

  // 打包 ZIP
  if (successFiles.length > 0) {
    try {
      console.log(`[DingTalk] 打包 ${successFiles.length} 个文件到 ZIP`)

      successFiles.forEach(({ name, blob }) => zip.file(name, blob))

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, `待发布__${formatDate()}.zip`)

      console.log('[DingTalk] ZIP 下载完成')
    } catch (error) {
      console.error('[DingTalk] 打包 ZIP 失败:', error)
      alert('打包 ZIP 失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  state.isRunning = false
  updateUI()
}

/** 处理取消/关闭 */
const handleCancel = () => {
  if (state.isRunning) {
    state.isRunning = false
    updateUI()
  } else {
    downloadPanel?.classList.remove('show')
  }
}

/** 处理面板关闭 */
const handleClose = () => {
  downloadPanel?.classList.remove('show')
}

// ==================== 生命周期 ====================

/** 初始化 */
const init = async () => {
  if (!isTargetPage()) {
    console.log('[DingTalk] 非目标页面，跳过初始化')
    return
  }

  console.log('[DingTalk] 初始化批量下载功能')

  downloadBtn = createDownloadButton(handleButtonClick)
  downloadPanel = createDownloadPanel(handleClose, handleCancel, handleStartDownload)

  document.body.appendChild(downloadBtn)
  document.body.appendChild(downloadPanel)

  // 检查是否需要自动下载
  if (shouldAutoDownload()) {
    console.log('[DingTalk] 检测到自动下载参数，开始自动下载')
    clearAutoDownloadParam()

    // 等待页面稳定后自动开始
    await delay(1000)
    await handleButtonClick() // 先获取文件列表
    await delay(500)
    handleStartDownload() // 然后开始下载
  }
}

/** 清理 */
const cleanup = () => {
  downloadBtn?.remove()
  downloadPanel?.remove()
  downloadBtn = null
  downloadPanel = null
  resetState()
}

// ==================== 启动 ====================

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 监听 SPA 路由变化
let lastUrl = window.location.href

const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    cleanup()
    setTimeout(init, 500)
  }
})

urlObserver.observe(document.body, { childList: true, subtree: true })
