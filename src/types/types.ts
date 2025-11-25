/**
 * 自定义类型定义
 *
 * 项目中使用的通用类型
 */

/**
 * 插件设置类型
 */
export interface Settings {
  /** 是否启用 Content Script */
  enableContentScript: boolean
  /** 是否启用通知 */
  enableNotifications: boolean
  /** 日志级别 */
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug'
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: Settings = {
  enableContentScript: true,
  enableNotifications: true,
  logLevel: 'info',
}

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** Ping 测试 */
  PING = 'PING',
  /** 获取标签页信息 */
  GET_TAB_INFO = 'GET_TAB_INFO',
  /** 获取设置 */
  GET_SETTINGS = 'GET_SETTINGS',
  /** 更新设置 */
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
}

/**
 * 标签页信息
 */
export interface TabInfo {
  id: number
  url: string
  title: string
  favIconUrl?: string
}

/**
 * 通用 API 响应
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

/**
 * 创建成功响应
 */
export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: Date.now(),
})

/**
 * 创建错误响应
 */
export const createErrorResponse = (error: string): ApiResponse => ({
  success: false,
  error,
  timestamp: Date.now(),
})

