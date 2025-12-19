/**
 * 钉钉文档批量下载 - 工具函数
 */

import { BUTTON_POSITION_KEY } from './config'

/** 从 cookie 中解析键值对 */
export const parseCookies = (): Record<string, string> => {
  return document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    if (key) acc[key] = value || ''
    return acc
  }, {} as Record<string, string>)
}

/** 获取认证信息 */
export const getAuthInfo = () => {
  const cookies = parseCookies()
  return {
    aToken: cookies['doc_atoken'] || '',
    xsrfToken: cookies['XSRF-TOKEN'] || '',
  }
}

/** 从 URL 中提取文件夹 UUID */
export const getFolderUuidFromUrl = (): string | null => {
  const match = window.location.pathname.match(/\/i\/nodes\/([^/?]+)/)
  return match ? match[1] : null
}

/** 格式化日期为 YYYY-M-D 格式 */
export const formatDate = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

/** 将文件名从 .axls 转换为 .xlsx */
export const convertFileName = (name: string): string => {
  return name.replace('.axls', '.xlsx')
}

/** 延迟函数 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 读取保存的按钮位置 */
export const getSavedButtonPosition = (): { x: number; y: number } | null => {
  try {
    const saved = localStorage.getItem(BUTTON_POSITION_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/** 保存按钮位置 */
export const saveButtonPosition = (x: number, y: number): void => {
  try {
    localStorage.setItem(BUTTON_POSITION_KEY, JSON.stringify({ x, y }))
  } catch {
    // 忽略存储错误
  }
}

/** 下载 Blob 文件 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
