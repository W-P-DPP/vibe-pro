# 开发规范

本文档说明如何在本仓库中新增和演进代码，同时保持 monorepo 的可维护性和可扩展性。

## 默认工作流

1. 先识别目标 package 或应用。
2. 在新增基础设施之前，先确认是否可以复用现有 shared 包。
3. 保持依赖方向符合 `docs/architecture.md`。
4. 对可能回归的行为补充或更新测试。
5. 运行当前改动所需的最小有效验证命令。

## 常用命令

按 package 过滤执行：

```bash
pnpm --filter @super-pro/agent-front dev
pnpm --filter @super-pro/agent-server test
pnpm --filter @super-pro/shared-web build
```

在仓库根目录执行全局检查：

```bash
pnpm build
pnpm test
pnpm lint
```

## 新增前端应用

1. 创建 `xxx-front`，或基于现有 frontend/template 复制。
2. 如果路径未被覆盖，更新 `pnpm-workspace.yaml`。
3. 包名优先使用 `@super-pro/<domain>-front`，除非已有明确例外。
4. 通过 `workspace:*` 依赖 shared 包。
5. 应用专属 API 模块放在 `src/api/modules/*`。
6. 通用 UI 基础组件应沉淀到 `shared-ui`，不要只留在应用内部。
7. 补齐 `dev`、`build`、`test`、`lint` 等脚本（如果适用）。

推荐结构：

```text
xxx-front/
  src/
    App.tsx
    main.tsx
    api/
      client.ts
      modules/
    components/
      layout/
      common/
    features/
    hooks/
    lib/
    pages/
    stores/
```

## 新增后端服务

1. 创建 `xxx-server`，至少包含 `app.ts`、`main.ts`、`src/index.ts`。
2. 如果路径未被覆盖，更新 `pnpm-workspace.yaml`。
3. 包名优先使用 `@super-pro/<domain>-server`，除非已有明确例外。
4. 通过 `workspace:*` 依赖 `@super-pro/shared-server`、`@super-pro/shared-types` 和相关 contracts。
5. 一旦 shared config/db/app factory 准备好，优先复用，而不是再复制一套基础设施。
6. 补齐 `dev`、`build`、`start`、`test`、`test:unit`、`test:integration` 等脚本（如果适用）。

推荐结构：

```text
xxx-server/
  app.ts
  main.ts
  src/
    index.ts
    config.ts
    modules/
      <domain>/
        <domain>.router.ts
        <domain>.service.ts
        <domain>.repository.ts
        <domain>.entity.ts
        <domain>.types.ts
  __tests__/
    unit/
    integration/
```

## 新增后端模块

1. 如果接口会被前端或其他服务消费，优先先定义 request/response contracts。
2. 如果模块需要持久化数据，先补 entity 和 migration。
3. 在 repository 中新增持久化方法。
4. 在 service 中新增业务流程。
5. 在 router 中新增 HTTP 入口。
6. 在服务路由聚合入口挂载 router。
7. 为核心 service 逻辑补单元测试。
8. 为关键 API 流程补集成测试。

不要因为第一版功能很小就跳过分层。即便是很薄的一层 service/repository，也能保证后续扩展时结构稳定。

## 新增前端功能

1. 在 `App.tsx` 或相应路由模块中新增/调整路由。
2. 在 `src/api/modules/<domain>.ts` 中新增 API 封装。
3. 共享请求/响应类型放到 `shared-types` 或 contracts 包。
4. 可复用的数据加载和 mutation 逻辑收敛到 hooks。
5. 页面组件只负责布局和路由级组合。
6. 当某个业务域超出单页规模时，把专属组件移动到 `features/<domain>/components`。
7. 明确处理 loading / empty / error 状态。

## API Contracts

当前后端都依赖同一份 API 定义时，应使用 contracts 包。

推荐结构：

```text
packages/<domain>-contracts/
  src/
    index.ts
    routes.ts
    errors.ts
    schemas/
    types/
```

contracts 应暴露：

- 路由常量
- 请求 schema
- 响应 schema
- 尽可能由 schema 推导出的 TypeScript 类型
- 前后端共同使用的错误码

## 配置规范

规则：

- 不要提交本地 secrets 配置文件。
- 提交 `.env.example` 或 `config.example.json` 之类的示例文件。
- 通过 shared server 工具提供的 typed config 读取配置。
- 避免在业务代码中直接读取 `process.env`。
- 启动时校验必填配置。
- 在生产环境中，危险配置必须被修正为安全值。

当新增一个配置项时：

```text
[ ] 把它加入 typed config schema。
[ ] 如果可能，提供安全默认值。
[ ] 如果使用者必须提供它，把它加入示例 env/config 文件。
[ ] 在业务代码中通过 typed config 对象读取它。
[ ] 如果配置会影响不同 profile 下的行为，补对应测试。
```

## 数据库变更规范

当 schema 发生变更时：

1. 先更新 entity。
2. 生成或手写 migration。
3. 在提交前 review migration。
4. 补充或更新依赖该 schema 的测试。
5. 运行 migration 测试或相关集成测试。

规则：

- 生产环境 schema 变更不能依赖 TypeORM 自动同步。
- 生产环境必须关闭 `synchronize`。
- migration 文件应尽量靠近拥有该数据的服务。
- 如果可行，优先保留显式回滚能力。

## 测试要求

后端：

- 为 service 逻辑写单测。
- 为重要路由写集成测试。
- 覆盖鉴权和权限敏感流程。
- 当配置/profile 会影响运行时行为时，补相关测试。

前端：

- 测试可复用 hooks 和工具函数。
- 测试 request/session/url 辅助逻辑。
- 测试复杂 UI 状态流转。
- 避免只依赖脆弱的 snapshot 测试来保障业务行为。

Shared 包：

- 测试对外导出的公共能力。
- 把 shared 包测试视为所有消费者的兼容性保障。

## 重构规则

- 重构优先朝现有 shared 包收敛，而不是新增更多抽象。
- 当相同基础设施在第二个实际场景中重复出现时，就可以考虑抽取。
- 不要为一次性逻辑新增泛化 helper。
- 除非行为变更必须依赖顺手清理，否则不要把无关整理和业务变更混在一起。
- 除非需求明确要求改变行为，否则默认保持原有行为不变。

## 命名规则

包名：

```text
@super-pro/<domain>-front
@super-pro/<domain>-server
@super-pro/<domain>-contracts
@super-pro/shared-*
```

后端文件：

```text
<domain>.router.ts
<domain>.service.ts
<domain>.repository.ts
<domain>.entity.ts
<domain>.types.ts
```

前端文件：

```text
<Domain>Page.tsx
<Domain>Form.tsx
<Domain>List.tsx
use<Domain>.ts
<domain>.types.ts
```

避免使用含义模糊的命名，例如 `utils2.ts`、`helper.ts`、职责混杂的 `common.ts`、`new.ts`、`test2.ts`。

## Pull Request 检查清单

```text
[ ] 变更符合依赖方向规则。
[ ] 业务应用没有重复现有 shared 基础设施。
[ ] 被多方消费的新 API 类型/contracts 已共享。
[ ] 配置值已类型化，并配有示例说明。
[ ] 数据库变更在需要时附带 migration。
[ ] 行为变更已补充或更新测试。
[ ] 已运行当前改动所需的最小有效 build/test 命令。
```
