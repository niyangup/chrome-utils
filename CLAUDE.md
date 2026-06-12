# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

- 安装依赖：`pnpm install`
- 开发模式：`pnpm dev`
- 生产构建：`pnpm build`
- 预览构建产物：`pnpm preview`
- TypeScript 类型检查：`pnpm exec tsc --noEmit`

当前 `package.json` 没有配置 lint、test 或单测运行脚本；如果需要验证改动，至少运行 `pnpm build` 和/或 `pnpm exec tsc --noEmit`。开发调试 Chrome 扩展时，在 `chrome://extensions/` 开启开发者模式并加载 `dist` 目录。

## 项目架构

这是一个 Manifest V3 Chrome 扩展，使用 Vite、TypeScript 和 `@crxjs/vite-plugin` 构建。源码入口由根目录 `manifest.json` 声明，`vite.config.ts` 通过 CRXJS 读取该 manifest，并额外把 `src/popup/popup.html`、`src/options/options.html` 作为 Rollup 输入。

主要运行环境分为：

- `src/background/background.ts`：MV3 Service Worker。负责安装/更新事件、跨页面消息处理，以及下载、跨域 fetch 等后台能力。Service Worker 不能访问 DOM，持久状态应放入 Chrome storage。
- `src/content/<site>/`：Content Scripts，按站点拆分并由 `manifest.json` 的 `content_scripts` 显式注册。当前包括全站脚本 `all`、Cursor、知乎和钉钉文档功能。
- `src/popup/`：点击扩展图标后的弹窗页面，目前维护快捷入口列表并打开目标页面或带 `auto_download=1` 参数的自动下载页面。
- `src/options/`：扩展设置页入口，目前只有基础初始化。
- `src/utils/`：Chrome API 和 DOM 常用封装，包括 storage、message、DOM helper。

钉钉批量下载是当前最完整的站点功能，位于 `src/content/dingtalk/`：

- `dingtalk.ts` 是主入口，负责目标页面识别、状态管理、按钮/面板挂载、自动下载参数处理、SPA URL 变化后的清理和重新初始化。
- `api.ts` 封装 alidocs 接口调用、导出任务提交和轮询。
- `ui.ts` 创建和更新下载按钮、进度面板及任务列表。
- `config.ts` 存放目标文件夹 UUID、API endpoint、轮询间隔等常量。
- `types.ts` 定义 API 响应和下载状态类型。
- `utils.ts` 处理 cookie 认证信息、URL 解析、文件名转换、延迟、Blob 下载和按钮位置存储。

## 项目约定

来自 `.cursor/guide.mdc` 的重要规则：

- 所有逻辑使用 TypeScript，项目开启 strict TypeScript 配置。
- 不要直接使用 `chrome.runtime.sendMessage` 发送消息；使用 `src/utils/message.ts` 中的 `sendToBackground`、`sendToTab`、`sendToActiveTab` 等封装。
- 不要直接使用 `chrome.storage`；使用 `src/utils/storage.ts` 的 `get`、`set`、`remove`、`clear` 等封装，默认使用 `sync`，需要本地存储时显式传 `'local'`。
- Content Script 做 DOM 操作前优先检查 `src/utils/dom.ts` 是否已有可复用工具，并避免新增 `innerHTML` 拼接。
- 新增站点功能时，在 `src/content/<site>/` 下创建同名文件：`<site>.ts` 和 `<site>.css`，TS 中用 `import './<site>.css'` 引入样式。
- 新增 Content Script 后必须同步更新根目录 `manifest.json` 的 `content_scripts`，`js` 路径应指向 `src/content/<site>/<site>.ts`。
- 只有确实需要作用于所有网页的功能才放入 `src/content/all/`。
