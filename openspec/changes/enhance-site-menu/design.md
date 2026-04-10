## Context

当前 `general-server` 中的 `siteMenu` 功能只是在 controller 中直接读取 `siteMenu.json` 并返回，没有形成真正的后端模块。现状问题包括：

- `siteMenu` 模块的 `service`、`repository`、`dto`、`router` 基本为空
- `siteMenu.entity.ts` 误放了操作日志实体，模块职责错误
- 控制器直接依赖 JSON 数据文件，缺少结构校验和统一错误处理
- 路由聚合仍通过 `src/index.ts` 直接暴露 `getMenu`，没有模块级 router
- 现有测试只覆盖了 `/api/getMenu` 的基础返回，没有覆盖菜单结构约束与异常路径

本次变更需要在不引入数据库的前提下，把 `siteMenu.json` 明确为菜单结构来源，并把当前临时实现收敛为可维护的后端模块。

## Goals / Non-Goals

**Goals:**

- 以 `siteMenu.json` 作为 `siteMenu` 的唯一菜单结构来源
- 补齐 `siteMenu` 模块的完整分层：`router`、`controller`、`service`、`repository`、`dto`
- 定义菜单节点的统一契约，并对菜单树做结构校验与标准化输出
- 保持现有菜单查询能力可继续使用，同时收敛为模块化路由实现
- 补齐成功路径与异常路径测试

**Non-Goals:**

- 不引入菜单数据库表或后台管理写接口
- 不在本次变更中实现菜单增删改
- 不修改前端菜单展示样式或前端消费方式
- 不在本次变更中推进全仓的统一异常框架重构

## Decisions

### 决策 1：继续使用 `siteMenu.json` 作为只读数据源

`siteMenu.json` 已经承载了当前菜单结构，且当前需求只要求“根据该文件完善菜单功能”，没有提出动态维护需求。因此本次实现继续以该 JSON 文件为唯一数据源，由 repository 负责读取与解析。

不选择数据库表方案的原因：

- 当前需求是补全现有能力，不是引入菜单管理后台
- 数据库方案会引入迁移、实体建模、写接口、权限控制等额外复杂度
- 现有菜单体量较小，静态 JSON 足够支撑读取场景

### 决策 2：以模块化只读菜单服务替换 controller 直读文件

实现结构定为：

- `siteMenu.router.ts`：承载菜单查询路由
- `siteMenu.controller.ts`：处理 HTTP 层输入输出
- `siteMenu.service.ts`：编排菜单读取、校验、标准化
- `siteMenu.repository.ts`：读取并解析 `siteMenu.json`
- `siteMenu.dto.ts`：定义菜单节点、菜单列表、错误上下文等 DTO

不继续保留 controller 直读文件的原因：

- 破坏分层边界
- 不利于后续引入缓存、鉴权、菜单过滤等能力
- 无法单独测试读取、校验、标准化逻辑

### 决策 3：定义递归菜单 DTO，并在 service 层完成结构校验

菜单节点至少包含以下语义字段：

- `id`
- `name`
- `path`
- `icon`
- `isTop`
- `children`

其中：

- 顶级节点必须是数组元素
- `children` 必须为数组，可为空
- 子节点沿用同一递归节点结构，但 `isTop` 可在标准化输出中保持布尔值或按默认值补齐

校验放在 service 层而非 controller 或 repository 的原因：

- repository 只负责读取原始数据，不负责业务语义判定
- controller 只负责协议转换，不承担数据域规则
- service 最适合承载“菜单结构是否合法”的业务判断

### 决策 4：保留现有 `/api/getMenu` 能力，并引入模块路由收口

现有测试和调用方都使用 `/api/getMenu`。为了避免无必要破坏，本次实现应至少保持该能力可用，同时将其收口到 `siteMenu.router.ts` 中，由 `src/index.ts` 注册。

可选方案：

- 仅保留 `/api/getMenu`
- 兼容 `/api/getMenu` 并增加更语义化的 `/api/site-menu`

本次设计倾向于“兼容旧路由并预留新语义路由”，实现阶段可根据代码影响面决定是否同时暴露两个只读入口，但不能破坏现有 `/api/getMenu`。

### 决策 5：清理错误文件并补齐测试

`siteMenu.entity.ts` 当前误放了 `OperationLogEntity`，这会误导后续开发。由于本模块此次不引入持久化实体，应移除该错误内容，并避免再保留无职责文件。

测试策略：

- unit test：校验菜单结构标准化与非法数据处理
- integration test：覆盖菜单接口的成功响应、结构字段和异常分支

## Risks / Trade-offs

- [风险] `siteMenu.json` 未来可能继续被手工编辑，导致结构漂移
  → Mitigation：在 service 层加入严格校验，接口只输出标准化结构

- [风险] 新增更语义化路由时可能影响现有调用方预期
  → Mitigation：保留 `/api/getMenu` 兼容路径，新增路由只作为扩展而非替换

- [风险] 模块分层后代码量上升，看起来比当前“直接返回 JSON”更重
  → Mitigation：本次分层是为了换取后续扩展性、可测性和强约束一致性，且每层职责都明确

- [风险] 当前仓库尚未建立统一校验框架，DTO 校验实现方式可能较轻量
  → Mitigation：先通过显式类型和 service 校验函数完成约束，后续再视需要升级到统一校验库

## Migration Plan

1. 新建 `siteMenu` 模块完整分层文件并接管菜单读取流程
2. 将 `src/index.ts` 的菜单路由改为模块 router 接入
3. 保留 `/api/getMenu` 行为兼容
4. 删除或修正 `siteMenu.entity.ts` 的错误内容
5. 增补 `siteMenu` 单元测试与集成测试

回滚策略：

- 如新实现异常，可临时恢复为 controller 直读 JSON 的旧方式
- 由于数据源仍是同一份 `siteMenu.json`，回滚不会涉及数据迁移

## Open Questions

- 是否在本次实现中同时暴露 `/api/site-menu` 新路由，还是仅保留兼容的 `/api/getMenu`
- 菜单结构校验失败时，是否统一返回 500，还是返回更明确的配置错误业务码
