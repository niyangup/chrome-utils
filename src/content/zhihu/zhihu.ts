import './zhihu.css'

console.log('[Chrome Utils] Zhihu script loaded')

// 针对一些强行移除 DOM 后可能导致的问题进行修复，或者处理 CSS 无法覆盖的动态弹窗
const removeLoginModal = () => {
  // 解除知乎可能对滚动条的锁定
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'

  // 尝试查找并点击关闭按钮（如果有的话），有时候直接隐藏会导致页面状态不对
  const closeBtn = document.querySelector('.Modal-closeButton') as HTMLButtonElement
  if (closeBtn) {
    closeBtn.click()
  }
}

// 监听 DOM 变化，防止弹窗动态插入
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      // 检查是否有弹窗相关的类名出现
      const target = mutation.target as HTMLElement
      if (document.querySelector('.Modal-wrapper')) {
        removeLoginModal()
      }
    }
  }
})

// 开始监听
observer.observe(document.body, {
  childList: true,
  subtree: true
})

// 初始执行一次
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', removeLoginModal)
} else {
  removeLoginModal()
}


