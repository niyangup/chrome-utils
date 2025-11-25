# Chrome Utils

个人自用 Chrome 工具插件，基于 TypeScript + Vite + CRXJS 构建。

## 技术栈

- **Vite** - 构建工具
- **TypeScript** - 类型安全
- **CRXJS** - Chrome 插件 Vite 插件，支持 HMR

## 项目结构

```
chrome-utils/
├── src/
│   ├── content/         # Content Script - 注入网页
│   ├── background/      # Service Worker - 后台服务
│   ├── popup/           # Popup - 弹窗页面
│   ├── options/         # Options - 设置页面
│   ├── utils/           # 工具函数
│   └── types/           # 类型定义
├── public/
│   └── icons/           # 插件图标
├── manifest.json        # 插件配置
└── vite.config.ts       # Vite 配置
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 加载插件

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `dist` 目录

开发模式下修改代码会自动热更新。

### 生产构建

```bash
pnpm build
```

构建输出在 `dist` 目录。

## 功能模块

### Content Script

注入到所有网页中运行的脚本，可以操作页面 DOM。

文件：`src/content/content.ts`

### Background Service Worker

后台运行的服务，处理浏览器事件和跨页面通信。

文件：`src/background/background.ts`

### Popup

点击插件图标时显示的弹窗页面。

文件：`src/popup/`

### Options

插件的设置页面，右键插件图标 → 选项。

文件：`src/options/`

## 工具函数

### storage.ts

存储操作封装，支持 `sync` 和 `local` 两种存储区域。

```typescript
import { get, set } from '@/utils/storage'

await set('key', 'value')
const value = await get('key')
```

### message.ts

消息通信封装，简化 Content Script 和 Background 之间的通信。

```typescript
import { sendToBackground, onMessage } from '@/utils/message'

// 发送消息
const response = await sendToBackground({ type: 'PING' })

// 监听消息
onMessage((message, sender) => {
  console.log(message, sender)
})
```

### dom.ts

DOM 操作工具函数。

```typescript
import { waitForElement, createElement, debounce } from '@/utils/dom'

// 等待元素出现
const el = await waitForElement('.my-class')

// 创建元素
const div = createElement('div', { className: 'my-class' }, ['Hello'])

// 防抖
const debouncedFn = debounce(() => console.log('debounced'), 300)
```

## 权限说明

本插件声明了以下权限（自用，已开启全部常用权限）：

- `storage` - 存储数据
- `activeTab` - 当前标签页
- `tabs` - 标签页操作
- `scripting` - 动态注入脚本
- `cookies` - Cookie 操作
- `webRequest` - 网络请求监听
- `clipboardRead/Write` - 剪贴板读写
- `notifications` - 系统通知
- `contextMenus` - 右键菜单
- `downloads` - 下载管理
- `history` - 浏览历史
- `bookmarks` - 书签管理

## 图标

当前使用占位 SVG 图标，如需自定义：

1. 准备 16x16、48x48、128x128 三种尺寸的 PNG 图标
2. 替换 `public/icons/` 目录中的文件
3. 更新 `manifest.json` 中的图标路径（将 `.svg` 改为 `.png`）

## License

MIT

