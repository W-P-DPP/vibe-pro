## Context

当前 `siteMenu` 模块已经完成了只读查询收敛，但仍然不满足新的后端强约束要求和业务诉求：

- `siteMenu` 只有查询能力，没有新增、修改、删除接口
- `siteMenu.entity.ts` 当前缺失，不满足每个功能模块都必须包含 `entity/controller/dto/repository/router/service` 六文件的约束
- `siteMenu.json` 目前只是静态读取源，没有被当作实体持久化源管理
- 当前实现中的错误消息和成功消息仍存在英文文案，不符合“所有对外返回必须为中文”的规则
- 菜单节点缺少统一的写入约束，例如父子关系、ID 分配、删除子树语义、审计字段补齐

这次变更需要把 `siteMenu` 升级为一个以 `siteMenu.json` 为实体存储源的完整 CRUD 模块，同时恢复 `entity` 层并保持现有查询接口兼容。

## Goals / Non-Goals

**Goals:**

- 恢复 `siteMenu.entity.ts`，并让菜单实体继承 `general-server/utils/entities/base.entity.ts` 中的 `BaseEntity`
- 将 `siteMenu.json` 明确为 `SiteMenuEntity` 的持久化文件，而不是临时静态配置
- 提供菜单节点的增删改查能力，包括菜单列表查询、单节点详情查询、新增节点、修改节点、删除节点
- 继续保留现有 `/api/getMenu` 查询能力，并增加更完整的 CRUD 路由
- 对所有外部返回文案统一改为中文
- 为 CRUD 行为补齐 DTO、验证逻辑、中文异常和自动化测试

**Non-Goals:**

- 不引入数据库表或 ORM 持久化迁移
- 不实现菜单权限控制或审计后台
- 不提供批量导入导出
- 不在本次变更中改造全局响应中间件，只收敛 `siteMenu` 模块的对外文案

## Decisions

### 决策 1：恢复 `siteMenu.entity.ts`，用实体类承载 JSON 节点

`siteMenu.entity.ts` 将定义 `SiteMenuEntity extends BaseEntity`，每个菜单节点都是一个实体对象。实体至少包含：

- `id`
- `parentId`
- `name`
- `path`
- `icon`
- `isTop`
- `sort`
- `children`
- 来自 `BaseEntity` 的基础字段

不继续只用 DTO 表示菜单节点的原因：

- 当前项目规则已明确每个功能模块必须保留 `entity` 文件
- CRUD 场景需要稳定的数据模型承载持久化字段和层间语义
- 使用实体类可以把 `siteMenu.json` 从“临时配置”提升为“实体存储”

### 决策 2：保留 `siteMenu.json` 的树形结构，作为实体持久化文件整体读写

`siteMenu.json` 继续保存树形菜单，而不是改为扁平表结构。repository 负责把整份 JSON 读入为实体树，并在修改后整体写回文件。

不改成扁平 JSON 的原因：

- 当前文件已经是树结构，直接延续能减少迁移成本
- 菜单天然是树形关系，读取和前端消费都更直观
- 当前数据规模较小，整文件重写的复杂度可控

为支持 CRUD，service 将使用 `parentId` 和递归遍历定位节点；repository 负责最终持久化。

### 决策 3：新增完整 CRUD 路由，同时保留旧查询入口

接口设计采用以下策略：

- 保留：`GET /api/getMenu`
- 保留：`GET /api/site-menu`
- 新增：`GET /api/site-menu/:id`
- 新增：`POST /api/site-menu`
- 新增：`PUT /api/site-menu/:id`
- 新增：`DELETE /api/site-menu/:id`

其中：

- 创建节点通过请求 DTO 提供 `parentId`，`null` 或缺省表示顶级菜单
- 更新节点通过 `id` 定位
- 删除节点默认删除该节点及其整个子树

这样做的原因是：

- 保持旧接口兼容
- 路由语义更清晰
- 满足标准 CRUD 需求

### 决策 4：service 层负责实体校验、ID 生成和中文异常映射

service 将负责：

- 校验创建和更新 DTO
- 校验父节点是否存在
- 校验 ID 唯一性
- 生成新节点 ID
- 规范 `isTop` 与 `parentId` 关系
- 将所有异常映射为中文可读消息

repository 不承担这些规则，原因是：

- repository 只负责存取，不负责业务判定
- 规则集中在 service 更利于测试和维护

### 决策 5：写入采用串行化策略，避免并发修改损坏 JSON

由于 `siteMenu.json` 是整文件持久化，多个写请求并发时可能相互覆盖。实现时应在 repository 内使用单进程串行写入策略，保证一次只处理一个写操作。

不忽略并发写风险的原因：

- CRUD 一旦开放写接口，就不能再按纯本地脚本思维处理
- 即使当前流量不大，也应该避免明显的数据覆盖问题

## Risks / Trade-offs

- [风险] 整文件重写在高并发下存在覆盖风险
  → Mitigation：在 repository 内串行化写入，避免并发落盘

- [风险] `siteMenu.json` 现有节点没有 `BaseEntity` 的基础字段
  → Mitigation：读取时兼容缺省字段，写入时补齐必要字段

- [风险] 删除节点会连带删除整个子树，属于高影响操作
  → Mitigation：在设计和接口文档中明确删除语义，并为删除行为补测试

- [风险] JSON 持久化不具备数据库级事务和并发能力
  → Mitigation：接受其作为当前轻量菜单配置管理方案的限制，不在本次变更中扩展到数据库

## Migration Plan

1. 恢复并实现 `siteMenu.entity.ts`
2. 重构 repository，使其支持 JSON 实体树的读写与递归查找
3. 扩展 service，实现 CRUD、校验、ID 分配和中文错误映射
4. 扩展 controller 与 router，开放 CRUD 路由并保留旧查询路由
5. 增加 CRUD 单元测试和集成测试
6. 兼容现有 `siteMenu.json` 数据，必要时在首次写入时补齐基础字段

回滚策略：

- 如果 CRUD 版本出现问题，可回退为只读查询版本
- 数据仍然保存在同一份 `siteMenu.json` 中，不涉及数据库回滚

## Open Questions

- 创建顶级节点时，`isTop` 是否完全由请求方传入，还是由 `parentId` 自动推导
- 删除节点是否需要后续补充“仅删除当前节点并提升子节点”的高级策略；本次设计默认不支持
