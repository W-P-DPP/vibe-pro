## Why

当前 `siteMenu` 只支持只读查询，且模块仍不满足新的强约束规范：缺少 `siteMenu.entity.ts`，也没有菜单新增、修改、删除能力。现在需要把 `siteMenu.json` 明确为 `siteMenu` 的实体存储源，补齐完整分层和 CRUD，避免菜单只能靠手工改 JSON 维护。

## What Changes

- 重构 `siteMenu` 模块，使 `siteMenu.json` 成为 `siteMenu` 的持久化实体来源
- 恢复并实现 `siteMenu.entity.ts`，让菜单节点实体继承 `BaseEntity`
- 补齐 `siteMenu` 的新增、查询、修改、删除接口，覆盖顶级菜单和子菜单节点
- 在 repository 中实现对 `siteMenu.json` 的读取、写入、递归查找、节点插入、节点更新、节点删除
- 在 service 中实现菜单实体校验、ID 管理、父子关系约束、中文错误返回和受控异常处理
- 为 CRUD 接口补充 DTO、测试和兼容性约束，保留现有菜单查询能力

## Capabilities

### New Capabilities
- `site-menu-crud`: 提供以 `siteMenu.json` 为实体存储源的站点菜单增删改查能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/src/index.ts`、`general-server/src/siteMenu.ts`、相关测试文件
- 影响接口：新增菜单管理接口，同时保留现有菜单查询接口
- 影响数据源：`general-server/siteMenu.json` 从静态读取文件提升为 JSON 实体存储源
- 影响规范：`siteMenu` 模块需重新满足 `entity/controller/dto/repository/router/service` 六文件完整分层要求
