/**
 * 钉钉文档相关类型定义
 */

/**
 * 文件条目信息
 */
export interface DentryInfo {
  dentryUuid: string
  dentryKey: string
  docKey: string
  name: string
  extension: string
  dentryType: 'file' | 'folder'
  contentType: string
  fileSize?: number
  corpId?: string
}

/**
 * 文件列表 API 响应
 */
export interface DentryListResponse {
  status: number
  isSuccess: boolean
  data: {
    children: DentryInfo[]
    hasMore: boolean
    loadMoreId?: string
  }
}

/**
 * 文件详情 API 响应
 */
export interface DentryInfoResponse {
  status: number
  isSuccess: boolean
  data: DentryInfo
}

/**
 * Upload Info API 响应
 */
export interface UploadInfoResponse {
  status: number
  isSuccess: boolean
  data: {
    resourceId: string
    resourceUrl: string
    storagePath: string
    uploadUrl: string
  }
}

/**
 * Operation Guard API 响应
 */
export interface OperationGuardResponse {
  status: number
  isSuccess: boolean
  data: {
    isBlocked: boolean
  }
}

/**
 * Document Data API 响应
 */
export interface DocumentDataResponse {
  status: number
  isSuccess: boolean
  data: {
    documentContent: {
      checkpoint: {
        content: string
        cpOssSize: number
      }
    }
  }
}

/**
 * Submit Export Job API 响应
 */
export interface SubmitExportJobResponse {
  status: number
  isSuccess: boolean
  data: {
    jobId: string
    status: string
  }
}

/**
 * Query Export Job Info API 响应
 */
export interface QueryExportJobInfoResponse {
  status: number
  isSuccess: boolean
  data: {
    jobId: string
    status: 'init' | 'processing' | 'success' | 'error' | 'failed'
    ossUrl?: string
  }
}

/**
 * 下载任务状态
 */
export type DownloadTaskStatus = 'pending' | 'fetching_info' | 'exporting' | 'downloading' | 'completed' | 'error'

/**
 * 下载任务
 */
export interface DownloadTask {
  id: string
  file: DentryInfo
  status: DownloadTaskStatus
  progress: number
  error?: string
  ossUrl?: string
}

/**
 * 批量下载状态
 */
export interface BatchDownloadState {
  isRunning: boolean
  tasks: DownloadTask[]
  completedCount: number
  errorCount: number
  totalCount: number
}
