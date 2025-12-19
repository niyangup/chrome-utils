/**
 * 钉钉文档批量下载 - UI 组件
 */

import { Icons } from './icons'
import { DRAG_THRESHOLD } from './config'
import { getSavedButtonPosition, saveButtonPosition, convertFileName } from './utils'
import type { DownloadTask, BatchDownloadState, DownloadTaskStatus } from './types'

// ==================== 状态显示辅助 ====================

const STATUS_CONFIG: Record<DownloadTaskStatus, { icon: string; class: string; text: string }> = {
  pending: { icon: Icons.file, class: 'pending', text: '等待中' },
  fetching_info: { icon: Icons.spinner, class: 'processing', text: '获取文件信息...' },
  exporting: { icon: Icons.spinner, class: 'processing', text: '导出中...' },
  downloading: { icon: Icons.spinner, class: 'processing', text: '下载中...' },
  completed: { icon: Icons.success, class: 'completed', text: '已完成' },
  error: { icon: Icons.error, class: 'error', text: '下载失败' },
}

const getStatusConfig = (task: DownloadTask) => {
  const config = STATUS_CONFIG[task.status]
  return {
    ...config,
    text: task.status === 'error' && task.error ? task.error : config.text,
  }
}

// ==================== UI 组件 ====================

/** 创建批量下载按钮 */
export const createDownloadButton = (onClick: () => void): HTMLButtonElement => {
  const btn = document.createElement('button')
  btn.className = 'dd-batch-download-btn'
  btn.innerHTML = `${Icons.download}<span>批量下载</span>`
  btn.style.cursor = 'grab'

  // 恢复保存的位置
  const savedPos = getSavedButtonPosition()
  if (savedPos) {
    btn.style.right = 'auto'
    btn.style.bottom = 'auto'
    btn.style.left = `${savedPos.x}px`
    btn.style.top = `${savedPos.y}px`
  }

  // 拖动状态
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

    const rect = btn.getBoundingClientRect()
    initialLeft = rect.left
    initialTop = rect.top

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

    if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
      hasMoved = true
    }

    const maxLeft = window.innerWidth - btn.offsetWidth
    const maxTop = window.innerHeight - btn.offsetHeight
    const newLeft = Math.max(0, Math.min(initialLeft + deltaX, maxLeft))
    const newTop = Math.max(0, Math.min(initialTop + deltaY, maxTop))

    btn.style.left = `${newLeft}px`
    btn.style.top = `${newTop}px`
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    isDragging = false
    btn.style.cursor = 'grab'

    const rect = btn.getBoundingClientRect()
    saveButtonPosition(rect.left, rect.top)
  }

  const handleClick = (e: MouseEvent) => {
    if (hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick()
  }

  btn.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  btn.addEventListener('click', handleClick)

  return btn
}

/** 创建下载进度面板 */
export const createDownloadPanel = (
  onClose: () => void,
  onCancel: () => void,
  onStart: () => void
): HTMLDivElement => {
  const panel = document.createElement('div')
  panel.className = 'dd-download-panel'
  panel.innerHTML = `
    <div class="dd-panel-header">
      <span class="dd-panel-title">批量下载</span>
      <button class="dd-panel-close">${Icons.close}</button>
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
        ${Icons.file}
        <div>点击"开始下载"按钮开始批量下载</div>
      </div>
    </div>
    <div class="dd-panel-actions">
      <button class="dd-action-btn secondary" id="dd-cancel-btn">取消</button>
      <button class="dd-action-btn primary" id="dd-start-btn">开始下载</button>
    </div>
  `

  panel.querySelector('.dd-panel-close')?.addEventListener('click', onClose)
  panel.querySelector('#dd-cancel-btn')?.addEventListener('click', onCancel)
  panel.querySelector('#dd-start-btn')?.addEventListener('click', onStart)

  return panel
}

/** 更新面板 UI */
export const updatePanelUI = (panel: HTMLDivElement, state: BatchDownloadState): void => {
  // 更新统计
  const setText = (id: string, value: number) => {
    const el = panel.querySelector(id)
    if (el) el.textContent = String(value)
  }

  setText('#dd-total-count', state.totalCount)
  setText('#dd-completed-count', state.completedCount)
  setText('#dd-error-count', state.errorCount)

  // 更新进度条
  const progressContainer = panel.querySelector('#dd-progress-container') as HTMLDivElement
  const progressFill = panel.querySelector('#dd-progress-fill') as HTMLDivElement
  const progressText = panel.querySelector('#dd-progress-text') as HTMLDivElement

  if (progressContainer && progressFill && progressText) {
    if (state.isRunning && state.totalCount > 0) {
      progressContainer.style.display = 'block'
      const progress = Math.round(((state.completedCount + state.errorCount) / state.totalCount) * 100)
      progressFill.style.width = `${progress}%`
      progressText.textContent = `${progress}%`
    } else {
      progressContainer.style.display = 'none'
    }
  }

  // 更新任务列表
  const taskListEl = panel.querySelector('#dd-task-list')
  if (taskListEl && state.tasks.length > 0) {
    taskListEl.innerHTML = state.tasks
      .map((task) => {
        const config = getStatusConfig(task)
        return `
          <div class="dd-task-item">
            <div class="dd-task-icon ${config.class}">${config.icon}</div>
            <div class="dd-task-info">
              <div class="dd-task-name" title="${task.file.name}">${convertFileName(task.file.name)}</div>
              <div class="dd-task-status ${task.status === 'error' ? 'error' : ''}">${config.text}</div>
            </div>
          </div>
        `
      })
      .join('')
  }

  // 更新按钮
  const startBtn = panel.querySelector('#dd-start-btn') as HTMLButtonElement
  const cancelBtn = panel.querySelector('#dd-cancel-btn') as HTMLButtonElement

  if (startBtn) {
    startBtn.disabled = state.isRunning
    startBtn.textContent = state.isRunning ? '下载中...' : '开始下载'
  }

  if (cancelBtn) {
    cancelBtn.textContent = state.isRunning ? '停止' : '关闭'
  }
}

/** 更新按钮状态 */
export const updateButtonState = (
  btn: HTMLButtonElement,
  isLoading: boolean
): void => {
  btn.disabled = isLoading
  btn.innerHTML = isLoading
    ? `${Icons.spinner}<span>加载中...</span>`
    : `${Icons.download}<span>批量下载</span>`
}
