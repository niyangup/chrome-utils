/**
 * 钉钉文档批量下载 - 类型定义
 */

// ==================== 文件信息 ====================

/** 文件条目信息 */
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

// ==================== API 响应 ====================

/** 通用 API 响应结构 */
interface BaseResponse {
  status: number
  isSuccess: boolean
}

/** 文件列表响应 */
export interface DentryListResponse extends BaseResponse {
  data: {
    children: DentryInfo[]
    hasMore: boolean
    loadMoreId?: string
  }
}

/** 权限检查响应 */
export interface OperationGuardResponse extends BaseResponse {
  data: { isBlocked: boolean }
}

/** 文档数据响应 */
export interface DocumentDataResponse extends BaseResponse {
  data: {
    documentContent: {
      checkpoint: { content: string; cpOssSize: number }
    }
  }
}

/** 上传信息响应 */
export interface UploadInfoResponse extends BaseResponse {
  data: {
    resourceId: string
    resourceUrl: string
    storagePath: string
    uploadUrl: string
  }
}

/** 导出任务状态 */
export type ExportJobStatus = 'init' | 'processing' | 'success' | 'error' | 'failed'

/** 提交导出任务响应 */
export interface SubmitExportJobResponse extends BaseResponse {
  data: { jobId: string; status: string }
}

/** 查询导出任务响应 */
export interface QueryExportJobInfoResponse extends BaseResponse {
  data: { jobId: string; status: ExportJobStatus; ossUrl?: string }
}

// ==================== 下载状态 ====================

/** 下载任务状态 */
export type DownloadTaskStatus = 
  | 'pending' 
  | 'fetching_info' 
  | 'exporting' 
  | 'downloading' 
  | 'completed' 
  | 'error'

/** 下载任务 */
export interface DownloadTask {
  id: string
  file: DentryInfo
  status: DownloadTaskStatus
  error?: string
  ossUrl?: string
}

/** 批量下载状态 */
export interface BatchDownloadState {
  isRunning: boolean
  tasks: DownloadTask[]
  completedCount: number
  errorCount: number
  totalCount: number
}

/** 初始状态 */
export const createInitialState = (): BatchDownloadState => ({
  isRunning: false,
  tasks: [],
  completedCount: 0,
  errorCount: 0,
  totalCount: 0,
})
