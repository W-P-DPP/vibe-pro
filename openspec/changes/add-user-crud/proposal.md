## Why

当前 `general-server` 只有 `siteMenu` 等基础能力，还没有独立的用户业务模块，无法承载用户信息的新增、查询、修改和删除。现在需要补齐一个符合现有后端约束的用户功能，作为后续账号、权限或用户资料能力的基础。

## What Changes

- 新增 `user` 业务模块，按 `entity/controller/dto/repository/router/service` 六层完整落地
- 为用户数据新增数据库实体与表结构，并继承项目公共 `BaseEntity`
- 提供用户的增删改查接口，接口地址遵循 `业务前缀 + 动作路径` 约定
- 在 `src/index.ts` 中按业务名前缀挂载用户模块路由
- 补充用户模块的单元测试和集成测试，确保中文返回与接口契约稳定

## Capabilities

### New Capabilities
- `user-crud-management`: 提供用户模块建模、用户数据持久化以及用户增删改查接口能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/user/*`、`general-server/src/index.ts`、相关测试文件
- 影响数据库：新增用户实体和对应表结构
- 影响接口：新增 `/api/user/getUser`、`/api/user/getUser/:id`、`/api/user/createUser`、`/api/user/updateUser/:id`、`/api/user/deleteUser/:id`
