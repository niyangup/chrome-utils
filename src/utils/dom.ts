/**
 * DOM 操作工具函数
 *
 * Content Script 中常用的 DOM 操作封装
 */

/**
 * 等待元素出现
 * @param selector CSS 选择器
 * @param timeout 超时时间 (ms)
 * @param parent 父元素
 */
export const waitForElement = <T extends Element = Element>(
  selector: string,
  timeout = 10000,
  parent: ParentNode = document
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // 先检查元素是否已存在
    const element = parent.querySelector<T>(selector)
    if (element) {
      resolve(element)
      return
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(() => {
      const element = parent.querySelector<T>(selector)
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(parent === document ? document.body : parent, {
      childList: true,
      subtree: true,
    })

    // 超时处理
    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Timeout waiting for element: ${selector}`))
    }, timeout)
  })
}

/**
 * 创建元素
 * @param tag 标签名
 * @param attrs 属性
 * @param children 子元素
 */
export const createElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag)

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        element.className = value
      } else if (key === 'style' && typeof value === 'string') {
        element.style.cssText = value
      } else {
        element.setAttribute(key, value)
      }
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child))
      } else {
        element.appendChild(child)
      }
    }
  }

  return element
}

/**
 * 插入 CSS 样式
 * @param css CSS 字符串
 * @param id 样式标签 ID（用于避免重复插入）
 */
export const injectStyle = (css: string, id?: string): HTMLStyleElement => {
  // 如果指定了 ID，先检查是否已存在
  if (id) {
    const existing = document.getElementById(id) as HTMLStyleElement
    if (existing) {
      existing.textContent = css
      return existing
    }
  }

  const style = document.createElement('style')
  if (id) style.id = id
  style.textContent = css
  document.head.appendChild(style)
  return style
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}

/**
 * 获取元素的绝对位置
 * @param element 目标元素
 */
export const getAbsolutePosition = (
  element: Element
): { top: number; left: number; width: number; height: number } => {
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  }
}

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间 (ms)
 */
export const debounce = <T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param limit 时间间隔 (ms)
 */
export const throttle = <T extends (...args: Parameters<T>) => void>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

