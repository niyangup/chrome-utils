/**
 * 钉钉文档 API 调用封装
 */

import type {
  DentryInfo,
  DentryListResponse,
  UploadInfoResponse,
  SubmitExportJobResponse,
  QueryExportJobInfoResponse,
  OperationGuardResponse,
  DocumentDataResponse,
} from './types'

/**
 * 从当前页面获取认证信息
 */
export const getAuthInfo = () => {
  // 从 cookie 中获取 token
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  return {
    aToken: cookies['doc_atoken'] || '',
    xsrfToken: cookies['XSRF-TOKEN'] || '',
  }
}

/**
 * 从 URL 中提取文件夹的 dentryUuid
 */
export const getFolderUuidFromUrl = (): string | null => {
  const match = window.location.pathname.match(/\/i\/nodes\/([^/?]+)/)
  return match ? match[1] : null
}

/**
 * 获取文件夹内容列表
 */
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
    })

    if (loadMoreId) {
      params.set('loadMoreId', loadMoreId)
    }

    const response = await fetch(
      `https://alidocs.dingtalk.com/box/api/v2/dentry/list?${params}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'a-token': aToken,
          'x-xsrf-token': xsrfToken,
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error(`获取文件列表失败: ${response.status}`)
    }

    const result: DentryListResponse = await response.json()

    if (!result.isSuccess) {
      throw new Error('获取文件列表失败: API 返回错误')
    }

    // 只筛选文件类型（不包括文件夹）且是表格类型
    const files = result.data.children
      .filter(
        (item) => item.dentryType === 'file' && 
                  (item.extension === 'axls' || item.contentType === 'alidoc')
      )
      .map((item) => ({
        ...item,
        corpId: (item as any).corpId || '',
      }))
    allChildren.push(...files)

    loadMoreId = result.data.hasMore ? result.data.loadMoreId : undefined
  } while (loadMoreId)

  return allChildren
}

/**
 * 检查下载权限
 */
export const checkOperationGuard = async (
  dentryUuid: string,
  corpId: string
): Promise<boolean> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const response = await fetch(
    'https://alidocs.dingtalk.com/box/api/v1/dentry/operationGuard',
    {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'a-token': aToken,
        'x-xsrf-token': xsrfToken,
        'corp-id': corpId,
      },
      credentials: 'include',
      body: JSON.stringify({
        operationType: 'DOWNLOAD',
        resourceType: 0,
        resourceIdList: [dentryUuid],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`检查下载权限失败: ${response.status}`)
  }

  const result: OperationGuardResponse = await response.json()

  if (!result.isSuccess || result.data.isBlocked) {
    throw new Error('没有下载权限')
  }

  return true
}

/**
 * 获取文档内容数据
 */
export const fetchDocumentData = async (
  docKey: string,
  dentryKey: string
): Promise<string> => {
  const response = await fetch(
    'https://alidocs.dingtalk.com/api/document/data',
    {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'a-doc-key': docKey,
        'a-dentry-key': dentryKey,
      },
      credentials: 'include',
      body: JSON.stringify({
        pageMode: 2,
        orgGrayKeys: ['enable_notable_frontend'],
        enableSlice: true,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`获取文档数据失败: ${response.status}`)
  }

  const result: DocumentDataResponse = await response.json()

  if (!result.isSuccess) {
    throw new Error('获取文档数据失败: API 返回错误')
  }

  // 返回文档内容（JSON 字符串）
  return result.data.documentContent.checkpoint.content
}

/**
 * 获取文件的上传信息（storagePath 和 uploadUrl）
 */
export const fetchUploadInfo = async (
  docKey: string,
  fileName: string,
  contentSize: number
): Promise<{ storagePath: string; uploadUrl: string }> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const response = await fetch(
    'https://alidocs.dingtalk.com/core/api/resources/9/upload_info',
    {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'a-doc-key': docKey,
        'a-token': aToken,
        'x-xsrf-token': xsrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        size: contentSize,
        resourceName: fileName,
        contentType: '',
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`获取上传信息失败: ${response.status}`)
  }

  const result: UploadInfoResponse = await response.json()

  if (!result.isSuccess) {
    throw new Error('获取上传信息失败: API 返回错误')
  }

  return {
    storagePath: result.data.storagePath,
    uploadUrl: result.data.uploadUrl,
  }
}

/**
 * 上传文档内容到 OSS
 */
export const uploadToOss = async (
  uploadUrl: string,
  content: string
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': '', // OSS 签名要求 Content-Type 为空
    },
    body: content,
  })

  if (!response.ok) {
    throw new Error(`上传到 OSS 失败: ${response.status}`)
  }
}

/**
 * 提交导出任务
 */
export const submitExportJob = async (
  docKey: string,
  dentryKey: string,
  storagePath: string
): Promise<string> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const response = await fetch(
    'https://alidocs.dingtalk.com/core/api/document/submitExportJob',
    {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'a-doc-key': docKey,
        'a-dentry-key': dentryKey,
        'a-token': aToken,
        'x-xsrf-token': xsrfToken,
        'source_doc_app': 'spreadsheet',
      },
      credentials: 'include',
      body: JSON.stringify({
        exportType: 'dingTalksheetToxlsx',
        storagePath,
        extra: { imgCnt: 0 },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`提交导出任务失败: ${response.status}`)
  }

  const result: SubmitExportJobResponse = await response.json()

  if (!result.isSuccess) {
    throw new Error('提交导出任务失败: API 返回错误')
  }

  return result.data.jobId
}

/**
 * 查询导出任务状态
 */
export const queryExportJobInfo = async (
  jobId: string,
  docKey: string,
  dentryKey: string
): Promise<QueryExportJobInfoResponse['data']> => {
  const { aToken, xsrfToken } = getAuthInfo()

  const response = await fetch(
    `https://alidocs.dingtalk.com/core/api/document/queryExportJobInfo?jobId=${jobId}`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'a-doc-key': docKey,
        'a-dentry-key': dentryKey,
        'a-token': aToken,
        'x-xsrf-token': xsrfToken,
      },
      credentials: 'include',
    }
  )

  if (!response.ok) {
    throw new Error(`查询导出任务状态失败: ${response.status}`)
  }

  const result: QueryExportJobInfoResponse = await response.json()

  if (!result.isSuccess) {
    throw new Error('查询导出任务状态失败: API 返回错误')
  }

  return result.data
}

/**
 * 轮询等待导出完成
 */
export const waitForExportComplete = async (
  jobId: string,
  docKey: string,
  dentryKey: string,
  maxRetries = 60,
  interval = 1000
): Promise<string> => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await queryExportJobInfo(jobId, docKey, dentryKey)

    if (result.status === 'success' && result.ossUrl) {
      return result.ossUrl
    }

    if (result.status === 'error' || result.status === 'failed') {
      throw new Error('导出任务失败，请确保文件可正常打开')
    }

    // 等待一段时间后重试
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('导出任务超时')
}

/**
 * 导出单个文件并获取下载链接
 */
export const exportFile = async (file: DentryInfo, corpId: string): Promise<string> => {
  console.log(`[Chrome Utils] 开始导出: ${file.name}`)

  // 1. 检查下载权限
  await checkOperationGuard(file.dentryUuid, corpId)
  console.log(`[Chrome Utils] 权限检查通过`)

  // 2. 获取文档内容数据
  const documentContent = await fetchDocumentData(file.docKey, file.dentryKey)
  console.log(`[Chrome Utils] 获取文档数据成功，大小: ${documentContent.length}`)

  // 3. 获取上传信息（storagePath 和 uploadUrl）
  const { storagePath, uploadUrl } = await fetchUploadInfo(
    file.docKey,
    file.name,
    documentContent.length
  )
  console.log(`[Chrome Utils] 获取上传信息成功`)

  // 4. 上传文档内容到 OSS
  await uploadToOss(uploadUrl, documentContent)
  console.log(`[Chrome Utils] 上传到 OSS 成功`)

  // 5. 提交导出任务
  const jobId = await submitExportJob(file.docKey, file.dentryKey, storagePath)
  console.log(`[Chrome Utils] 提交导出任务成功，jobId: ${jobId}`)

  // 6. 轮询等待导出完成
  const ossUrl = await waitForExportComplete(jobId, file.docKey, file.dentryKey)
  console.log(`[Chrome Utils] 导出完成，ossUrl: ${ossUrl}`)

  return ossUrl
}
