## Context

当前 `general-server` 只有 `siteMenu` 模块完成了较完整的后端分层实现，而用户相关能力仍然缺失。按照现有后端约束，新增业务能力时必须一次性补齐 `entity/controller/dto/repository/router/service` 六层、数据库实体继承 `BaseEntity`、中文返回、动作式接口命名以及 `src/index.ts` 业务前缀挂载。

这意味着“新增一个用户功能”不能只增加几个接口，而是要以一个完整的 `user` 业务模块落地，作为后续用户资料、登录、权限等能力的基础模块。

## Goals / Non-Goals

**Goals:**

- 新增 `user` 业务模块，并补齐六层文件结构
- 为用户模块建立数据库实体和对应表结构
- 提供用户的增删改查接口，遵循 `/user/getUser`、`/user/getUser/:id`、`/user/createUser`、`/user/updateUser/:id`、`/user/deleteUser/:id` 约定
- 在 `src/index.ts` 中以业务前缀 `/user` 挂载模块 router
- 提供与用户模块匹配的单元测试和集成测试

**Non-Goals:**

- 不在本次变更中实现登录、注册、鉴权、角色权限
- 不在本次变更中接入密码散列、短信、邮箱、验证码等能力
- 不实现复杂用户状态流转或批量操作

## Decisions

### 决策 1：用户模块按完整六层结构落地

新增目录 `general-server/src/user/`，包含：

- `user.entity.ts`
- `user.controller.ts`
- `user.dto.ts`
- `user.repository.ts`
- `user.router.ts`
- `user.service.ts`

这样做优于只加部分文件的原因：

- 完全符合当前 skill 的强约束
- 能为后续用户能力扩展保留清晰边界
- 避免把业务逻辑直接塞到 controller 或 router

### 决策 2：用户实体使用基础资料字段并继承 BaseEntity

用户表默认采用基础资料字段：

- `id`
- `username`
- `nickname`
- `email`
- `phone`
- `status`

并继承公共 `BaseEntity` 审计字段。

选择这组字段的原因：

- 足够支持当前 CRUD 需求
- 不引入密码等高风险字段，降低本次设计复杂度
- 能为后续认证与权限模块留下扩展空间

### 决策 3：接口命名遵循动作式路径 + 业务前缀

用户接口采用：

- `GET /api/user/getUser`
- `GET /api/user/getUser/:id`
- `POST /api/user/createUser`
- `PUT /api/user/updateUser/:id`
- `DELETE /api/user/deleteUser/:id`

这样做优于 REST 资源式路径的原因：

- 与当前仓库最新 skill 约束保持一致
- 与现有 `siteMenu` 的动作式接口设计一致，减少风格分裂
- 便于后续在同一业务前缀下继续扩展功能接口

## Risks / Trade-offs

- [风险] 用户模块字段设计过少，后续可能需要补字段
  → Mitigation：本次只保留最基础 CRUD 字段，后续通过增量变更扩展

- [风险] 动作式接口命名与常见 REST 风格不同，外部集成需要适配
  → Mitigation：遵循当前仓库已经确定的统一规范，保持风格一致

- [风险] 新增实体后会触发 TypeORM 自动同步表结构
  → Mitigation：沿用当前仓库 `synchronize: true` 的现状，仅在当前开发流程下落地

## Migration Plan

1. 创建 `user` 模块六层文件
2. 新增用户实体并接入数据库实体注册
3. 在 `src/index.ts` 以 `/user` 前缀挂载 `userRouter`
4. 增加用户 CRUD 测试并执行验证

回滚策略：

- 若用户模块实现异常，可回滚 `general-server/src/user/*` 与 `src/index.ts` 中用户路由挂载改动
- 若表结构已自动创建但未投入使用，可保留空表或在后续人工清理

## Open Questions

- 用户是否需要唯一约束到 `username` 与 `email`；本次默认建议至少对 `username` 做唯一约束，但实现时可结合仓库现状确定
