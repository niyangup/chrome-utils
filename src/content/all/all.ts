import './all.css'

// 等待 DOM 完全加载
const init = () => {
}

// 确保 DOM 已准备就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 导出供其他模块使用（如果需要）
export {}



