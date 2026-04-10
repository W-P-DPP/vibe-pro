## Context

当前 `general-server/src/siteMenu/siteMenu.router.ts` 已经在路径层面使用相对路径，但 router 文件内部仍然只有一个 `siteMenuRouter` 实例，查询、详情、写操作都直接平铺在同一个路由对象上。按照最新后端规范，生成 router 时不仅路径要语义化，router 实例名、子路由分组名和兼容接口名也必须根据接口功能命名，不能继续停留在“只有一个通用 router”的写法上。

当前还存在这些约束：

- `src/index.ts` 已要求通过业务名前缀 `/site-menu` 挂载模块路由
- `GET /api/getMenu` 作为历史兼容查询入口仍需保留
- 对外接口行为不能因为 router 内部命名重构而被破坏

因此本次设计的重点是，在不改变业务逻辑的前提下，让 `siteMenu.router.ts` 的结构本身具备清晰的功能命名和职责边界。

## Goals / Non-Goals

**Goals:**

- 让 `siteMenu.router.ts` 的路由组织按接口功能命名
- 区分菜单查询入口与菜单写操作入口的 router 语义
- 保持 `GET /api/site-menu`、`GET /api/site-menu/:id`、写操作接口和兼容入口 `GET /api/getMenu` 可用
- 为后续其他模块提供 router 命名样例

**Non-Goals:**

- 不修改 controller、service、repository 的业务实现
- 不调整数据库结构、DTO 结构和响应结构
- 不删除现有兼容接口
- 不在本次变更中扩展新的菜单接口能力

## Decisions

### 决策 1：按接口功能拆分 router 分组

`siteMenu.router.ts` 将不再只保留一个平铺 router，而是根据接口功能组织命名，例如：

- 查询能力使用具备查询语义的 router 名称
- 写操作能力使用具备写操作语义的 router 名称
- 对外导出模块级 router 时，名称仍保持业务语义一致

这样做优于继续平铺在单一 router 上的原因：

- router 本身的结构就能体现接口功能
- 后续新增列表筛选、批量操作或兼容入口时更容易放置
- 更符合当前 skill 对“router 按功能命名”的硬性约束

### 决策 2：兼容入口显式命名并独立声明

历史兼容入口 `GET /api/getMenu` 不应混入通用 CRUD 路径定义中，而应在 router 层以明确的查询语义单独声明。

这样做优于将兼容入口与模块 CRUD 平铺混写的原因：

- 一眼可见哪些是兼容路由，哪些是模块主路由
- 后续如果清理兼容接口，修改范围更可控
- 能避免兼容入口和业务主挂载点之间职责模糊

### 决策 3：保持外部路径不变，仅重构内部组织和命名

本次重构只调整 router 的内部结构和命名，不改变对外接口地址：

- `/api/getMenu`
- `/api/site-menu`
- `/api/site-menu/:id`

选择保留路径不变的原因：

- 用户已经明确要求 router 命名按功能收敛，而不是接口行为重做
- 可以降低回归风险
- 可以把本次变更严格限定在 router 层

## Risks / Trade-offs

- [风险] 按功能拆分 router 后，若挂载关系处理错误，可能导致路径重复或遗漏
  → Mitigation：保持入口前缀与模块相对路径边界不变，并通过集成测试覆盖

- [风险] 仅改命名和结构，可能被误解为价值不大
  → Mitigation：在设计中明确这次变更的目标是收敛 router 规范，为后续模块提供统一样例

- [风险] 兼容入口若未独立声明，仍可能在后续重构中再次变得模糊
  → Mitigation：将兼容入口作为显式设计对象纳入 router 结构

## Migration Plan

1. 重构 `siteMenu.router.ts`，按查询/写操作等接口功能拆分并命名 router
2. 保持 `src/index.ts` 入口挂载方式不变，仅对必要的兼容路由声明做适配
3. 更新接口测试，确认外部路径未变化

回滚策略：

- 若 router 结构重构引发路径异常，可回滚 `siteMenu.router.ts` 的组织方式
- 由于本次不涉及业务逻辑和数据层，回滚范围只在路由层

## Open Questions

- 当前是否需要把 `GET /api/site-menu` 与 `GET /api/getMenu` 在 router 层拆成两个不同命名的查询入口；本次默认会以“主查询入口 + 兼容查询入口”方式组织
