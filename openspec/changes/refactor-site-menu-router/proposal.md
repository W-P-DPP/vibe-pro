## Why

当前 `general-server/src/siteMenu/siteMenu.router.ts` 虽然已经收敛为相对路径，但路由组织还没有按照接口功能进行分组和命名，无法充分体现最新后端规范对 router 语义化命名的要求。现在需要把 `siteMenu.router.ts` 进一步重构为“按接口功能命名与组织”的形式，避免后续继续扩散无功能语义的 router 写法。

## What Changes

- 重构 `general-server/src/siteMenu/siteMenu.router.ts`，按接口功能拆分并命名路由分组
- 明确查询接口与写操作接口在 router 层的命名语义，避免继续使用泛化或难扩展的路由组织方式
- 在不破坏现有外部接口行为的前提下，收敛 `siteMenu` 模块 router 的命名和职责边界
- 补充与 router 重构匹配的接口测试，验证兼容路径和 CRUD 路径均无回归

## Capabilities

### New Capabilities
- `site-menu-router-functional-naming`: 规定 `siteMenu.router.ts` 必须按接口功能命名和组织路由分组，同时保持对外路径兼容

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/siteMenu.router.ts`、`general-server/src/index.ts`（如需微调挂载方式）、相关接口测试
- 影响路由组织：`siteMenu` 模块路由将按查询、详情、写操作等功能语义收敛命名
- 影响接口兼容：需要保持 `/api/site-menu` 与现有兼容入口的可用性
