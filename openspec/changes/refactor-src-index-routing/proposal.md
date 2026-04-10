## Why

当前 `general-server/src/index.ts` 仍然直接使用 `router.use(siteMenuRouter)` 裸挂载模块路由，这和最新后端约束不一致，也会让业务入口边界变得不清晰。现在需要把入口路由重构为“按业务名前缀挂载”的模式，避免后续继续扩散无前缀路由接入方式。

## What Changes

- 重构 `general-server/src/index.ts`，把模块路由接入方式改为显式业务名前缀挂载
- 明确入口层与模块层的职责边界：`src/index.ts` 负责业务前缀，模块 `router` 负责模块内部相对路径
- 收敛现有 `siteMenu` 路由结构，避免入口层继续出现裸 `router.use(xxxRouter)` 的接入方式
- 补充与入口路由重构匹配的测试，确保现有接口兼容行为不回归

## Capabilities

### New Capabilities
- `src-index-routing-prefix`: 规定 `src/index.ts` 注册模块路由时必须使用业务名前缀，并保持模块路由职责清晰

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/index.ts`、相关模块 `*.router.ts`、接口测试
- 影响路由组织：模块路由必须通过业务名前缀接入应用入口
- 影响接口兼容：需要在保持现有可用接口的前提下完成入口重构
