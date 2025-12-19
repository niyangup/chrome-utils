/**
 * 钉钉文档批量下载 Content Script
 */

import './dingtalk.css'
import JSZip from 'jszip'
import type { DownloadTask, BatchDownloadState } from './types'
import { getFolderUuidFromUrl, fetchDentryList, exportFile } from './api'

console.log('[Chrome Utils] DingTalk Docs script loaded')

// 全局状态
let state: BatchDownloadState = {
  isRunning: false,
  tasks: [],
  completedCount: 0,
  errorCount: 0,
  totalCount: 0,
}

// DOM 元素引用
let downloadBtn: HTMLButtonElement | null = null
let downloadPanel: HTMLDivElement | null = null

/**
 * 指定的文件夹 UUID（只在这个页面显示批量下载按钮）
 */
const TARGET_FOLDER_UUID = 'G1DKw2zgV2ylrBgrcDYQ30MoWB5r9YAn'

/**
 * 检查是否在目标文件夹页面
 */
const isFolderPage = (): boolean => {
  const folderUuid = getFolderUuidFromUrl()
  return folderUuid === TARGET_FOLDER_UUID
}

/**
 * 创建下载图标 SVG
 */
const createDownloadIcon = (): string => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
`

/**
 * 创建关闭图标 SVG
 */
const createCloseIcon = (): string => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
`

/**
 * 创建文件图标 SVG
 */
const createFileIcon = (): string => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
`

/**
 * 创建成功图标 SVG
 */
const createSuccessIcon = (): string => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
`

/**
 * 创建错误图标 SVG
 */
const createErrorIcon = (): string => `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
`

/**
 * 获取状态对应的图标
 */
const getStatusIcon = (status: DownloadTask['status']): string => {
  switch (status) {
    case 'pending':
      return createFileIcon()
    case 'fetching_info':
    case 'exporting':
    case 'downloading':
      return '<div class="dd-spinner"></div>'
    case 'completed':
      return createSuccessIcon()
    case 'error':
      return createErrorIcon()
    default:
      return createFileIcon()
  }
}

/**
 * 获取状态对应的类名
 */
const getStatusClass = (status: DownloadTask['status']): string => {
  switch (status) {
    case 'pending':
      return 'pending'
    case 'fetching_info':
    case 'exporting':
    case 'downloading':
      return 'processing'
    case 'completed':
      return 'completed'
    case 'error':
      return 'error'
    default:
      return 'pending'
  }
}

/**
 * 获取状态对应的文字
 */
const getStatusText = (task: DownloadTask): string => {
  switch (task.status) {
    case 'pending':
      return '等待中'
    case 'fetching_info':
      return '获取文件信息...'
    case 'exporting':
      return '导出中...'
    case 'downloading':
      return '下载中...'
    case 'completed':
      return '已完成'
    case 'error':
      return task.error || '下载失败'
    default:
      return ''
  }
}

/**
 * 按钮位置存储 key
 */
const BUTTON_POSITION_KEY = 'dd-batch-download-btn-position'

/**
 * 获取保存的按钮位置
 */
const getSavedButtonPosition = (): { x: number; y: number } | null => {
  try {
    const saved = localStorage.getItem(BUTTON_POSITION_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('[Chrome Utils] 读取按钮位置失败:', e)
  }
  return null
}

/**
 * 保存按钮位置
 */
const saveButtonPosition = (x: number, y: number) => {
  try {
    localStorage.setItem(BUTTON_POSITION_KEY, JSON.stringify({ x, y }))
  } catch (e) {
    console.error('[Chrome Utils] 保存按钮位置失败:', e)
  }
}

/**
 * 创建批量下载按钮
 */
const createDownloadButton = (): HTMLButtonElement => {
  const btn = document.createElement('button')
  btn.className = 'dd-batch-download-btn'
  btn.innerHTML = `${createDownloadIcon()}<span>批量下载</span>`

  // 恢复保存的位置
  const savedPos = getSavedButtonPosition()
  if (savedPos) {
    btn.style.right = 'auto'
    btn.style.bottom = 'auto'
    btn.style.left = `${savedPos.x}px`
    btn.style.top = `${savedPos.y}px`
  }

  // 拖动相关变量
  let isDragging = false
  let hasMoved = false
  let startX = 0
  let startY = 0
  let initialLeft = 0
  let initialTop = 0

  const handleMouseDown = (e: MouseEvent) => {
    isDragging = true
    hasMoved = false
    startX = e.clientX
    startY = e.clientY

    // 获取当前位置
    const rect = btn.getBoundingClientRect()
    initialLeft = rect.left
    initialTop = rect.top

    // 切换到 left/top 定位
    btn.style.right = 'auto'
    btn.style.bottom = 'auto'
    btn.style.left = `${initialLeft}px`
    btn.style.top = `${initialTop}px`
    btn.style.cursor = 'grabbing'

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    // 判断是否真的移动了（超过 5px 才算拖动）
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasMoved = true
    }

    let newLeft = initialLeft + deltaX
    let newTop = initialTop + deltaY

    // 限制在窗口范围内
    const maxLeft = window.innerWidth - btn.offsetWidth
    const maxTop = window.innerHeight - btn.offsetHeight
    newLeft = Math.max(0, Math.min(newLeft, maxLeft))
    newTop = Math.max(0, Math.min(newTop, maxTop))

    btn.style.left = `${newLeft}px`
    btn.style.top = `${newTop}px`
  }

  const handleMouseUp = () => {
    if (!isDragging) return

    isDragging = false
    btn.style.cursor = 'grab'

    // 保存位置
    const rect = btn.getBoundingClientRect()
    saveButtonPosition(rect.left, rect.top)
  }

  // 点击事件处理（只有没有拖动时才触发）
  const handleClick = (e: MouseEvent) => {
    if (hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    handleDownloadClick()
  }

  btn.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  btn.addEventListener('click', handleClick)

  btn.style.cursor = 'grab'

  return btn
}

/**
 * 创建下载进度面板
 */
const createDownloadPanel = (): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'dd-download-panel'
  panel.innerHTML = `
    <div class="dd-panel-header">
      <span class="dd-panel-title">批量下载</span>
      <button class="dd-panel-close">${createCloseIcon()}</button>
    </div>
    <div class="dd-progress-stats">
      <div class="dd-stat-item">
        <div class="dd-stat-value" id="dd-total-count">0</div>
        <div class="dd-stat-label">总数</div>
      </div>
      <div class="dd-stat-item">
        <div class="dd-stat-value success" id="dd-completed-count">0</div>
        <div class="dd-stat-label">已完成</div>
      </div>
      <div class="dd-stat-item">
        <div class="dd-stat-value error" id="dd-error-count">0</div>
        <div class="dd-stat-label">失败</div>
      </div>
    </div>
    <div class="dd-progress-bar-container" id="dd-progress-container" style="display: none;">
      <div class="dd-progress-bar">
        <div class="dd-progress-bar-fill" id="dd-progress-fill" style="width: 0%;"></div>
      </div>
      <div class="dd-progress-text" id="dd-progress-text">0%</div>
    </div>
    <div class="dd-task-list" id="dd-task-list">
      <div class="dd-empty-state">
        ${createFileIcon()}
        <div>点击"开始下载"按钮开始批量下载</div>
      </div>
    </div>
    <div class="dd-panel-actions">
      <button class="dd-action-btn secondary" id="dd-cancel-btn">取消</button>
      <button class="dd-action-btn primary" id="dd-start-btn">开始下载</button>
    </div>
  `

  // 绑定事件
  panel.querySelector('.dd-panel-close')?.addEventListener('click', () => {
    panel.classList.remove('show')
  })

  panel.querySelector('#dd-cancel-btn')?.addEventListener('click', handleCancel)
  panel.querySelector('#dd-start-btn')?.addEventListener('click', handleStartDownload)

  return panel
}

/**
 * 更新面板 UI
 */
const updatePanelUI = () => {
  if (!downloadPanel) return

  // 更新统计数据
  const totalEl = downloadPanel.querySelector('#dd-total-count')
  const completedEl = downloadPanel.querySelector('#dd-completed-count')
  const errorEl = downloadPanel.querySelector('#dd-error-count')

  if (totalEl) totalEl.textContent = String(state.totalCount)
  if (completedEl) completedEl.textContent = String(state.completedCount)
  if (errorEl) errorEl.textContent = String(state.errorCount)

  // 更新进度条
  const progressContainer = downloadPanel.querySelector('#dd-progress-container') as HTMLDivElement
  const progressFill = downloadPanel.querySelector('#dd-progress-fill') as HTMLDivElement
  const progressText = downloadPanel.querySelector('#dd-progress-text') as HTMLDivElement

  if (progressContainer && progressFill && progressText) {
    if (state.isRunning && state.totalCount > 0) {
      progressContainer.style.display = 'block'
      const progress = Math.round(((state.completedCount + state.errorCount) / state.totalCount) * 100)
      progressFill.style.width = `${progress}%`
      progressText.textContent = `${progress}%`
    } else if (!state.isRunning) {
      // 下载完成后隐藏进度条
      progressContainer.style.display = 'none'
    }
  }

  // 更新任务列表
  const taskListEl = downloadPanel.querySelector('#dd-task-list')
  if (taskListEl && state.tasks.length > 0) {
    taskListEl.innerHTML = state.tasks
      .map(
        (task) => `
        <div class="dd-task-item">
          <div class="dd-task-icon ${getStatusClass(task.status)}">
            ${getStatusIcon(task.status)}
          </div>
          <div class="dd-task-info">
            <div class="dd-task-name" title="${task.file.name}">${task.file.name.replace('.axls', '.xlsx')}</div>
            <div class="dd-task-status ${task.status === 'error' ? 'error' : ''}">${getStatusText(task)}</div>
          </div>
        </div>
      `
      )
      .join('')
  }

  // 更新按钮状态
  const startBtn = downloadPanel.querySelector('#dd-start-btn') as HTMLButtonElement
  const cancelBtn = downloadPanel.querySelector('#dd-cancel-btn') as HTMLButtonElement

  if (startBtn) {
    startBtn.disabled = state.isRunning
    startBtn.textContent = state.isRunning ? '下载中...' : '开始下载'
  }

  if (cancelBtn) {
    cancelBtn.textContent = state.isRunning ? '停止' : '关闭'
  }
}

/**
 * 处理下载按钮点击
 */
const handleDownloadClick = async () => {
  if (!downloadPanel) return

  // 显示面板
  downloadPanel.classList.add('show')

  // 如果正在下载，不重新获取文件列表
  if (state.isRunning) return

  try {
    // 获取文件列表
    if (downloadBtn) {
      downloadBtn.disabled = true
      downloadBtn.innerHTML = `<div class="dd-spinner"></div><span>加载中...</span>`
    }

    const folderUuid = getFolderUuidFromUrl()
    if (!folderUuid) {
      throw new Error('无法获取文件夹 ID')
    }

    const files = await fetchDentryList(folderUuid)

    if (files.length === 0) {
      throw new Error('文件夹中没有可下载的表格文件')
    }

    // 初始化状态
    state = {
      isRunning: false,
      tasks: files.map((file) => ({
        id: file.dentryUuid,
        file,
        status: 'pending',
        progress: 0,
      })),
      completedCount: 0,
      errorCount: 0,
      totalCount: files.length,
    }

    updatePanelUI()
  } catch (error) {
    console.error('[Chrome Utils] 获取文件列表失败:', error)
    alert(`获取文件列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false
      downloadBtn.innerHTML = `${createDownloadIcon()}<span>批量下载</span>`
    }
  }
}

/**
 * 处理开始下载
 */
const handleStartDownload = async () => {
  if (state.isRunning || state.tasks.length === 0) return

  state.isRunning = true
  updatePanelUI()

  const zip = new JSZip()
  const successFiles: { name: string; blob: Blob }[] = []

  // 逐个导出文件
  for (const task of state.tasks) {
    if (!state.isRunning) break // 检查是否被取消
    if (task.status === 'completed') continue // 跳过已完成的

    try {
      // 更新状态：获取文件信息
      task.status = 'fetching_info'
      updatePanelUI()

      // 更新状态：导出中
      task.status = 'exporting'
      updatePanelUI()

      // 获取下载链接
      const ossUrl = await exportFile(task.file, task.file.corpId || '')
      task.ossUrl = ossUrl

      // 更新状态：下载中
      task.status = 'downloading'
      updatePanelUI()

      // 下载文件内容
      const response = await fetch(ossUrl)
      if (!response.ok) {
        throw new Error(`下载文件失败: ${response.status}`)
      }
      const blob = await response.blob()

      // 保存到成功列表
      const fileName = task.file.name.replace('.axls', '.xlsx')
      successFiles.push({ name: fileName, blob })

      // 更新状态：已完成
      task.status = 'completed'
      state.completedCount++
      updatePanelUI()

      // 添加延迟避免请求过快
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`[Chrome Utils] 下载失败: ${task.file.name}`, error)
      task.status = 'error'
      task.error = error instanceof Error ? error.message : '下载失败'
      state.errorCount++
      updatePanelUI()
    }
  }

  // 如果有成功的文件，打包成 zip 下载
  if (successFiles.length > 0) {
    try {
      console.log(`[Chrome Utils] 开始打包 ${successFiles.length} 个文件到 ZIP`)

      // 将所有文件添加到 zip
      for (const file of successFiles) {
        zip.file(file.name, file.blob)
      }

      // 生成 zip 文件
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // 创建下载链接
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
      a.download = `待发布__${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('[Chrome Utils] ZIP 下载完成')
    } catch (error) {
      console.error('[Chrome Utils] 打包 ZIP 失败:', error)
      alert('打包 ZIP 失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  state.isRunning = false
  updatePanelUI()
}

/**
 * 处理取消/关闭
 */
const handleCancel = () => {
  if (state.isRunning) {
    // 停止下载
    state.isRunning = false
    updatePanelUI()
  } else {
    // 关闭面板
    downloadPanel?.classList.remove('show')
  }
}

/**
 * 初始化
 */
const init = () => {
  // 只在文件夹页面显示按钮
  if (!isFolderPage()) {
    console.log('[Chrome Utils] 不是文件夹页面，跳过初始化')
    return
  }

  console.log('[Chrome Utils] 检测到文件夹页面，初始化批量下载功能')

  // 创建并添加 UI 元素
  downloadBtn = createDownloadButton()
  downloadPanel = createDownloadPanel()

  document.body.appendChild(downloadBtn)
  document.body.appendChild(downloadPanel)
}

// 等待页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 监听 URL 变化（SPA 路由）
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href

    // 移除旧的 UI
    downloadBtn?.remove()
    downloadPanel?.remove()
    downloadBtn = null
    downloadPanel = null

    // 重置状态
    state = {
      isRunning: false,
      tasks: [],
      completedCount: 0,
      errorCount: 0,
      totalCount: 0,
    }

    // 重新初始化
    setTimeout(init, 500)
  }
})

urlObserver.observe(document.body, { childList: true, subtree: true })
