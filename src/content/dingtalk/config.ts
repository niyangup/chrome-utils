/**
 * 钉钉文档批量下载 - 配置常量
 */

/** 目标文件夹 UUID（只在这个页面显示批量下载按钮） */
export const TARGET_FOLDER_UUID = 'G1DKw2zgV2ylrBgrcDYQ30MoWB5r9YAn'

/** 按钮位置存储 key */
export const BUTTON_POSITION_KEY = 'dd-batch-download-btn-position'

/** API 基础路径 */
export const API_BASE = 'https://alidocs.dingtalk.com'

/** API 端点 */
export const API_ENDPOINTS = {
  DENTRY_LIST: '/box/api/v2/dentry/list',
  OPERATION_GUARD: '/box/api/v1/dentry/operationGuard',
  DOCUMENT_DATA: '/api/document/data',
  UPLOAD_INFO: '/core/api/resources/9/upload_info',
  SUBMIT_EXPORT: '/core/api/document/submitExportJob',
  QUERY_EXPORT: '/core/api/document/queryExportJobInfo',
} as const

/** 导出任务轮询配置 */
export const EXPORT_POLLING = {
  MAX_RETRIES: 60,
  INTERVAL: 1000,
} as const

/** 下载间隔（毫秒） */
export const DOWNLOAD_DELAY = 500

/** 拖动阈值（像素） */
export const DRAG_THRESHOLD = 5
