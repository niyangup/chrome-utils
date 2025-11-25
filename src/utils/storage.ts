/**
 * 存储工具函数
 *
 * 封装 chrome.storage API，提供更方便的存取方法
 */

/**
 * 获取存储数据
 * @param key 键名
 * @param defaultValue 默认值
 * @param area 存储区域 (sync | local)
 */
export const get = async <T>(
  key: string,
  defaultValue?: T,
  area: 'sync' | 'local' = 'sync'
): Promise<T | undefined> => {
  const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
  const result = await storage.get(key)
  return (result[key] as T) ?? defaultValue
}

/**
 * 设置存储数据
 * @param key 键名
 * @param value 值
 * @param area 存储区域 (sync | local)
 */
export const set = async <T>(
  key: string,
  value: T,
  area: 'sync' | 'local' = 'sync'
): Promise<void> => {
  const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
  await storage.set({ [key]: value })
}

/**
 * 删除存储数据
 * @param keys 要删除的键名或键名数组
 * @param area 存储区域 (sync | local)
 */
export const remove = async (
  keys: string | string[],
  area: 'sync' | 'local' = 'sync'
): Promise<void> => {
  const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
  await storage.remove(keys)
}

/**
 * 清空存储数据
 * @param area 存储区域 (sync | local)
 */
export const clear = async (area: 'sync' | 'local' = 'sync'): Promise<void> => {
  const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
  await storage.clear()
}

/**
 * 获取所有存储数据
 * @param area 存储区域 (sync | local)
 */
export const getAll = async (
  area: 'sync' | 'local' = 'sync'
): Promise<Record<string, unknown>> => {
  const storage = area === 'sync' ? chrome.storage.sync : chrome.storage.local
  return await storage.get(null)
}

/**
 * 监听存储变化
 * @param callback 回调函数
 * @param area 存储区域 (sync | local)，不传则监听所有
 */
export const onChanged = (
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void,
  area?: 'sync' | 'local'
): void => {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (!area || areaName === area) {
      callback(changes)
    }
  })
}

