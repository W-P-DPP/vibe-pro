## Why

当前 `frontend-template` 的目录导航仍然依赖 `src/data/tool-directory.ts` 中的静态数据，而后端 `general-server` 已经提供了 `GET /api/site-menu/getMenu` 菜单接口。继续维护两套菜单源会导致前后端目录结构不一致，也无法支持后端统一维护菜单后前端自动生效。

## What Changes

- 前端目录数据源从本地静态 `toolSections` 改为后端 `siteMenu` 接口返回的数据。
- 新增前端菜单数据请求、类型定义、数据转换与错误兜底逻辑。
- 调整目录侧边栏和首页卡片区，使其使用同一份接口化菜单状态渲染。
- 为前端补充接口接入后的加载态、失败态和空态展示，避免接口异常时页面直接失效。

## Capabilities

### New Capabilities
- `frontend-site-menu-directory`: 前端目录页通过后端 `siteMenu` 接口加载、转换并渲染菜单结构。

### Modified Capabilities

## Impact

- 影响代码：`frontend-template/src/data/tool-directory.ts`、`frontend-template/src/components/AppLayout.tsx`、`frontend-template/src/pages/HomePage.tsx`、`frontend-template/src/api/*`
- 影响接口依赖：前端新增依赖 `GET /api/site-menu/getMenu`
- 影响运行配置：前端需要可配置后端基础地址或代理转发，以便开发环境访问 `general-server`
