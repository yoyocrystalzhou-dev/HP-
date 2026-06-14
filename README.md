# AI Chat

功能完整的 AI 聊天前端，支持 DeepSeek / Anthropic / OpenAI 兼容 API，带角色卡、世界书（含文件自动解析导入）和长期记忆。

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:5173，在「配置」中填写 API Key 即可使用。

## 功能

- **多 API 支持**：DeepSeek（默认）、Anthropic Claude、任意 OpenAI 兼容接口
- **角色卡**：每张卡独立人设、开场白、对话历史、长期记忆，互不影响
- **世界书**：关键词触发自动注入，支持上传 TXT/MD/JSON 由 AI 自动提取条目
- **长期记忆**：每轮对话后 AI 静默提取用户信息，下次对话自动携带
- **文件附件**：Anthropic 模式支持上传图片和 PDF
- **流式输出**：SSE 实时打字机效果

## 数据持久化

所有数据存储在浏览器 `localStorage`，key 前缀为 `ai-chat:`。
刷新或关闭页面后数据保持不变，清除浏览器数据才会丢失。

## 项目结构

```
src/
  lib/
    storage.js     # localStorage 封装（async API）
    api.js         # Anthropic / OpenAI-compatible 流式调用
    utils.js       # 工具函数
  hooks/
    usePersist.js  # localStorage-backed useState hook
  components/
    Icons.jsx
    UI.jsx         # 基础组件：Toggle, Btn, Field, Input
    SettingsPanel.jsx
    CharacterPanel.jsx
    MemoryPanel.jsx
    WorldBookPanel.jsx
  App.jsx
  main.jsx
```

## 部署

```bash
npm run build   # 输出到 dist/
```

`dist/` 目录可直接部署到任何静态托管服务（Vercel、Netlify、GitHub Pages 等）。

> **注意**：直接在浏览器调用 Anthropic API 需要 CORS 支持。DeepSeek 和大多数 OpenAI 兼容服务默认允许跨域。如遇跨域问题，可在本地通过 Vite 代理或自行搭建中间层。
