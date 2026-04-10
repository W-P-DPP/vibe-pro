## 1. 实体与契约重构

- [x] 1.1 恢复并实现 `siteMenu.entity.ts`，让 `SiteMenuEntity` 继承 `BaseEntity` 并定义菜单节点实体字段
- [x] 1.2 重构 `siteMenu.dto.ts`，拆分查询、新增、修改、响应 DTO，明确 `parentId`、`children`、排序和中文错误上下文
- [x] 1.3 调整 `siteMenu.json` 的读取模型，使其可以作为 `SiteMenuEntity` 树的持久化来源

## 2. JSON 持久化与业务规则

- [x] 2.1 在 `siteMenu.repository.ts` 中实现菜单实体树的读取、整体写回、递归查找、插入、更新、删除能力
- [x] 2.2 在 repository 中加入串行化写入策略，避免并发写请求覆盖 `siteMenu.json`
- [x] 2.3 在 `siteMenu.service.ts` 中实现 CRUD 编排、ID 分配、父子关系校验、删除子树语义和中文异常映射

## 3. 接口与路由接入

- [x] 3.1 在 `siteMenu.controller.ts` 中增加菜单列表、详情、新增、修改、删除接口处理，所有对外返回文案统一为中文
- [x] 3.2 在 `siteMenu.router.ts` 中注册 CRUD 路由，并保留 `/api/getMenu` 与 `/api/site-menu` 查询兼容能力
- [x] 3.3 在 `src/index.ts` 中确认 `siteMenu` 模块以完整 router 接入，不再保留散落的菜单接口实现

## 4. 测试与回归验证

- [x] 4.1 为实体树校验、ID 分配、父节点不存在、节点不存在、删除子树等规则补充单元测试
- [x] 4.2 为菜单 CRUD 接口补充集成测试，覆盖查询、新增、修改、删除和中文错误返回
- [x] 4.3 运行相关测试并修复回归，确认 `siteMenu` 满足完整分层、中文返回和 CRUD 行为要求
