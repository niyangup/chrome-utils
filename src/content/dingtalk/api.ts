/**
 * 钉钉文档批量下载 - API 调用
 */

import { API_BASE, API_ENDPOINTS, EXPORT_POLLING } from './config'
import { getAuthInfo, delay } from './utils'
import type {
  DentryInfo,
  DentryListResponse,
  OperationGuardResponse,
  DocumentDataResponse,
  UploadInfoResponse,
  SubmitExportJobResponse,
  QueryExportJobInfoResponse,
} from './types'

// ==================== 通用请求封装 ====================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  headers?: Record<string, string>
  body?: unknown
  credentials?: RequestCredentials
}

/** 发起 API 请求 */
const request = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = 'GET', headers = {}, body, credentials = 'include' } = options

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      ...headers,
    },
    credentials,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`)
  }

  const result = await response.json()

  if (!result.isSuccess) {
    throw new Error('API 返回错误')
  }

  return result
}

// ==================== API 方法 ====================

/** 获取文件夹内容列表 */
export const fetchDentryList = async (folderUuid: string): Promise<DentryInfo[]> => {
  const { aToken, xsrfToken } = getAuthInfo()
  const allChildren: DentryInfo[] = []
  let loadMoreId: string | undefined

  do {
    const params = new URLSearchParams({
      dentryUuid: folderUuid,
      orderType: 'SORT_KEY',
      sortType: 'desc',
      listDentrySource: '2',
      pageSize: '100',
      ...(loadMoreId && { loadMoreId }),
    })

    const result = await request<DentryListResponse>(
      `${API_ENDPOINTS.DENTRY_LIST}?${params}`,
      {
        headers: { 'a-token': aToken, 'x-xsrf-token': xsrfToken },
      }
    )

    // 筛选表格文件
    const files = result.data.children
      .filter((item) => 
        item.dentryType === 'file' && 
        (item.extension === 'axls' || item.contentType === 'alidoc')
      )
      .map((item) => ({ ...item, corpId: (item as any).corpId || '' }))

    allChildren.push(...files)
    loadMoreId = result.data.hasMore ? result.data.loadMoreId : undefined
  } while (loadMoreId)

  return allChildren
}

/** 检查下载权限 */
const checkOperationGuard = async (dentryUuid: string, corpId: string): Promise<void> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const result = await request<OperationGuardResponse>(API_ENDPOINTS.OPERATION_GUARD, {
    method: 'POST',
    headers: { 'a-token': aToken, 'x-xsrf-token': xsrfToken, 'corp-id': corpId },
    body: { operationType: 'DOWNLOAD', resourceType: 0, resourceIdList: [dentryUuid] },
  })

  if (result.data.isBlocked) {
    throw new Error('没有下载权限')
  }
}

/** 获取文档内容数据 */
const fetchDocumentData = async (docKey: string, dentryKey: string): Promise<string> => {
  const result = await request<DocumentDataResponse>(API_ENDPOINTS.DOCUMENT_DATA, {
    method: 'POST',
    headers: { 'a-doc-key': docKey, 'a-dentry-key': dentryKey },
    body: { pageMode: 2, orgGrayKeys: ['enable_notable_frontend'], enableSlice: true },
  })

  return result.data.documentContent.checkpoint.content
}

/** 获取上传信息 */
const fetchUploadInfo = async (
  docKey: string,
  fileName: string,
  contentSize: number
): Promise<{ storagePath: string; uploadUrl: string }> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const result = await request<UploadInfoResponse>(API_ENDPOINTS.UPLOAD_INFO, {
    method: 'POST',
    headers: { 'a-doc-key': docKey, 'a-token': aToken, 'x-xsrf-token': xsrfToken },
    body: { size: contentSize, resourceName: fileName, contentType: '' },
  })

  return { storagePath: result.data.storagePath, uploadUrl: result.data.uploadUrl }
}

/** 上传文档内容到 OSS */
const uploadToOss = async (uploadUrl: string, content: string): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Accept': 'application/json, text/plain, */*', 'Content-Type': '' },
    body: content,
  })

  if (!response.ok) {
    throw new Error(`上传到 OSS 失败: ${response.status}`)
  }
}

/** 提交导出任务 */
const submitExportJob = async (
  docKey: string,
  dentryKey: string,
  storagePath: string
): Promise<string> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const result = await request<SubmitExportJobResponse>(API_ENDPOINTS.SUBMIT_EXPORT, {
    method: 'POST',
    headers: {
      'a-doc-key': docKey,
      'a-dentry-key': dentryKey,
      'a-token': aToken,
      'x-xsrf-token': xsrfToken,
      'source_doc_app': 'spreadsheet',
    },
    body: { exportType: 'dingTalksheetToxlsx', storagePath, extra: { imgCnt: 0 } },
  })

  return result.data.jobId
}

/** 查询导出任务状态 */
const queryExportJobInfo = async (
  jobId: string,
  docKey: string,
  dentryKey: string
): Promise<QueryExportJobInfoResponse['data']> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const result = await request<QueryExportJobInfoResponse>(
    `${API_ENDPOINTS.QUERY_EXPORT}?jobId=${jobId}`,
    {
      headers: {
        'a-doc-key': docKey,
        'a-dentry-key': dentryKey,
        'a-token': aToken,
        'x-xsrf-token': xsrfToken,
      },
    }
  )

  return result.data
}

/** 轮询等待导出完成 */
const waitForExportComplete = async (
  jobId: string,
  docKey: string,
  dentryKey: string
): Promise<string> => {
  const { MAX_RETRIES, INTERVAL } = EXPORT_POLLING

  for (let i = 0; i < MAX_RETRIES; i++) {
    const result = await queryExportJobInfo(jobId, docKey, dentryKey)

    if (result.status === 'success' && result.ossUrl) {
      return result.ossUrl
    }

    if (result.status === 'error' || result.status === 'failed') {
      throw new Error('导出任务失败，请确保文件可正常打开')
    }

    await delay(INTERVAL)
  }

  throw new Error('导出任务超时')
}

// ==================== 导出流程 ====================

/** 导出单个文件并获取下载链接 */
export const exportFile = async (file: DentryInfo, corpId: string): Promise<string> => {
  console.log(`[DingTalk] 开始导出: ${file.name}`)

  // 1. 检查权限
  await checkOperationGuard(file.dentryUuid, corpId)

  // 2. 获取文档数据
  const content = await fetchDocumentData(file.docKey, file.dentryKey)

  // 3. 获取上传信息
  const { storagePath, uploadUrl } = await fetchUploadInfo(file.docKey, file.name, content.length)

  // 4. 上传到 OSS
  await uploadToOss(uploadUrl, content)

  // 5. 提交导出任务
  const jobId = await submitExportJob(file.docKey, file.dentryKey, storagePath)

  // 6. 等待导出完成
  const ossUrl = await waitForExportComplete(jobId, file.docKey, file.dentryKey)

  console.log(`[DingTalk] 导出完成: ${file.name}`)
  return ossUrl
}
