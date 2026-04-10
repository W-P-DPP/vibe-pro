## Context

当前 `siteMenu` 已经被做成了 JSON 文件驱动的 CRUD，但这和最新要求冲突。新的目标不是继续操作 `siteMenu.json`，而是要“根据 `siteMenu.json` 的数据结构建表”，然后让 `siteMenu` 的查询、新增、修改、删除全部落在数据库表上。

仓库当前已有这些约束和现状：

- `general-server` 已接入 `TypeORM` 与 `MySQL`
- `utils/mysql.ts` 已统一管理 `DataSource`
- `siteMenu` 模块必须保留 `entity/controller/dto/repository/router/service` 六文件
- 所有 `*.entity.ts` 必须继承 `general-server/utils/entities/base.entity.ts` 中的 `BaseEntity`
- 对外返回文案必须为中文
- `siteMenu.json` 当前仍保存着既有菜单树数据，可以作为首批菜单数据来源

因此这次变更的核心不是“再做一套 JSON CRUD”，而是“把 JSON 结构映射成表结构，并完成数据库版 CRUD 与初始化导入”。

## Goals / Non-Goals

**Goals:**

- 按 `siteMenu.json` 的字段语义设计 `siteMenu` 数据库表
- 让 `siteMenu.entity.ts` 继承 `BaseEntity` 并映射数据库表
- 将 `siteMenu` 的主数据源从 JSON 切换到数据库
- 提供数据库版菜单列表查询、详情查询、新增、修改、删除
- 保留现有查询接口兼容能力
- 提供 `siteMenu.json` 到数据库表的初始化导入能力
- 所有成功与失败返回文案统一为中文

**Non-Goals:**

- 不在本次变更中保留 JSON 作为运行时主数据源
- 不引入菜单权限、角色绑定、按钮级资源控制
- 不在本次变更中实现复杂树重排算法
- 不提供批量导入导出管理界面

## Decisions

### 决策 1：使用邻接表建模菜单树

`siteMenu.json` 是树结构，但数据库表不直接保存 `children` 字段。表结构改为邻接表模型，核心字段包括：

- `id`
- `parent_id`
- `name`
- `path`
- `icon`
- `is_top`
- `sort`
- `create_by`
- `create_time`
- `update_by`
- `update_time`
- `remark`

运行时由 repository 或 service 把平铺记录组装成树返回。

选择邻接表而不是直接存 JSON 字段的原因：

- 关系型数据库天然适合父子外键模式
- CRUD 更容易实现
- 后续支持排序、筛选、单节点查询、父子节点校验更直接

### 决策 2：`siteMenu.json` 只作为初始化导入源

`siteMenu.json` 不再作为运行时主数据源。它只承担以下职责：

- 首次建表后的种子数据来源
- 本地开发和初始化时的菜单导入参考

运行时查询和写操作全部使用数据库表。

不继续双写 JSON 和数据库的原因：

- 双写会引入一致性问题
- 需求已经明确要求“建表后做 CRUD”
- 继续保留 JSON 主写入会偏离这次目标

### 决策 3：恢复数据库实体并沿用现有 TypeORM 风格

`siteMenu.entity.ts` 需要满足两件事：

- 实体语义上继承 `BaseEntity`
- 可被当前 TypeORM 初始化方式识别

实现上优先采用与当前仓库一致的 `EntitySchema` 风格，同时让领域实体类型或基类关系符合 `BaseEntity` 约束，并复用 `BaseSchemaColumns` 收敛通用字段。

表名建议使用 `sys_site_menu`，与当前 `sys_operation_log` 风格保持一致。

### 决策 4：数据库初始化采用“建表 + 幂等导入”策略

建表完成后，需要提供一次性或幂等的初始化导入逻辑：

- 如果表为空，则把 `siteMenu.json` 的数据导入数据库
- 如果表已有数据，则默认不覆盖

这样做的原因：

- 避免每次启动都覆盖线上或开发环境已有菜单
- 能保留 `siteMenu.json` 作为初始化源的价值
- 实现简单且可预测

### 决策 5：CRUD 路由继续兼容旧查询接口

接口策略继续保持：

- 保留 `GET /api/getMenu`
- 保留 `GET /api/site-menu`
- 新增 `GET /api/site-menu/:id`
- 新增 `POST /api/site-menu`
- 新增 `PUT /api/site-menu/:id`
- 新增 `DELETE /api/site-menu/:id`

所有查询和写操作都改为访问数据库。

### 决策 6：中文错误与业务校验收口到 service

service 负责：

- 父节点存在性校验
- 自身不能挂到自身或非法父级下
- 排序值和字段合法性校验
- 节点不存在、父节点不存在等中文错误映射

repository 只负责数据库访问，不负责 HTTP 语义和中文文案。

## Risks / Trade-offs

- [风险] `siteMenu.json` 与数据库表结构并不完全一一对应，尤其是 `children`
  → Mitigation：明确 `children` 仅用于导入时递归展开，落库后用 `parent_id` 表达层级

- [风险] 首次导入可能和表内已有数据冲突
  → Mitigation：只在表为空时导入，并保持导入逻辑幂等

- [风险] 当前仓库的实体写法和 `BaseEntity` 继承规则存在风格张力
  → Mitigation：在设计中明确以当前 TypeORM 可识别方式实现，同时保留 `BaseEntity` 继承约束

- [风险] `synchronize: true` 会在开发环境自动同步结构，但不适合作为长期生产迁移方案
  → Mitigation：本次变更只描述当前仓库下的落地方式，同时保持后续可迁移到显式 migration

## Migration Plan

1. 设计并实现 `sys_site_menu` 表对应的 `siteMenu.entity.ts`
2. 在启动或模块初始化时检测表是否为空
3. 若为空，则递归读取 `siteMenu.json` 并导入表中
4. 将 repository 从 JSON 文件读写切换为 TypeORM 查询
5. 将 service/controller/router 收敛为数据库版 CRUD
6. 增补数据库版 CRUD 测试

回滚策略：

- 如果数据库版实现异常，可暂时回滚到上一个 JSON 版 `siteMenu` 方案
- 由于 `siteMenu.json` 仍保留，可以作为回退基准数据

## Open Questions

- 是否需要在本次设计中增加 `status`、`visible` 之类菜单管理字段；当前用户只要求按现有 JSON 结构建表，默认先不扩展
- 初始化导入应放在应用启动阶段，还是作为显式的模块初始化逻辑；当前更倾向于模块级幂等导入
