# 架构规范

本仓库是一个模块化的 pnpm workspace。推荐演进方向是：在 monorepo 中保持高可维护性和高可扩展性，通过共享基础设施支撑多个独立业务应用，并用明确的前后端契约约束边界。

## 目标

- 让业务应用只关注业务差异。
- 把稳定的横切能力沉淀到 shared 包中。
- 让新增前端、后端、模块和 contracts 的方式可预测、可复制。
- 避免服务之间复制粘贴基础设施代码。
- 明确 API、配置、数据库、UI 的边界。

## 仓库分层

```text
super-pro/
  *-front/                 # 业务前端应用
  *-server/                # 业务后端服务
  *-template/              # 可复用模板应用
  packages/
    shared-types/          # 跨应用 DTO、类型、枚举
    shared-constants/      # 跨应用常量和 key
    shared-web/            # 浏览器侧共享能力
    shared-server/         # 服务端共享基础设施
    shared-ui/             # 与业务无关的 UI 基础组件
    *-contracts/           # 某业务域的 API 契约
    *-config/              # 某业务域的静态配置
```

## Shared 包职责

### shared-types

适合放：

- DTO 和 API 请求/响应类型
- 业务枚举类型
- 通用泛型类型

不适合放：

- React、Express、TypeORM、axios
- 浏览器或服务端运行时逻辑
- 某个具体功能的实现细节

### shared-constants

适合放：

- storage key
- 路由名和路径常量
- 错误码
- 稳定的枚举值
- 默认常量值

不适合放：

- 环境变量加载
- API 请求
- 业务流程逻辑

### shared-web

适合放：

- 浏览器请求客户端基础封装
- auth session 相关工具
- URL 工具
- 浏览器存储工具
- 登录跳转工具

不适合放：

- 仅服务端可用的逻辑
- 具体业务页面状态
- 功能专属业务流程

### shared-server

适合放：

- env/profile 加载
- typed server config 加载
- logger 创建
- Express app 工厂
- response / error middleware
- DataSource / 数据库管理器工厂
- 可复用的鉴权 middleware 基础能力

不适合放：

- 具体业务 service
- 具体业务 repository
- 某个应用专属路由

### shared-ui

适合放：

- Button、Dialog、Form、Sidebar、Avatar、Table、布局原语
- 与业务无关的通用组件

不适合放：

- API 调用
- token / session 读取
- 具体业务流程
- 应用专属状态管理

### domain contracts

`*-contracts` 包适合承载：

- API 路由常量
- 请求/响应 schema
- 请求/响应类型
- 错误码

contracts 不应该依赖具体前端或后端应用包。

## 依赖方向

允许：

```text
front -> shared-ui/shared-web/shared-types/shared-constants/contracts
server -> shared-server/shared-types/shared-constants/contracts
shared-ui -> shared-types/shared-constants
shared-web -> shared-types/shared-constants
shared-server -> shared-types/shared-constants
contracts -> shared-types/shared-constants
```

禁止：

```text
shared-types -> shared-web/shared-server/shared-ui
shared-ui -> 具体前端应用
shared-server -> 具体后端服务
server -> front 源码
front -> server 源码
contracts -> 具体应用包
```

## 后端架构

后端服务统一遵循以下模块边界：

```text
router -> service -> repository -> entity
```

职责划分：

- `router`：处理 HTTP 输入输出、middleware、鉴权和 service 调用
- `service`：处理业务规则、流程编排和事务边界
- `repository`：处理持久化和查询细节
- `entity`：处理数据库 schema / entity 定义
- `contracts`：处理跨前后端共享的请求和响应定义

推荐服务结构：

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

现有服务可以继续保留 `src/<domain>/` 结构，但新服务优先使用 `src/modules/<domain>/`，让边界更清晰。

## 后端规则

- 不要在 router 中直接访问数据库。
- 不要在 repository 中处理 HTTP response。
- 不要在 entity 中承载业务流程。
- 不要在业务代码中散落读取 `process.env`。
- 不要使用 `{ [key: string]: any }` 这种无类型配置对象。
- 不要在每个服务里重复 app/db/logger/config 基础设施。
- 生产环境的数据库 schema 变更必须可审计、可追踪，应该通过 migration 管理。
- 生产环境不能依赖 TypeORM 的 `synchronize: true`。

## 前端架构

前端应用统一遵循以下依赖流向：

```text
page -> feature component -> hook -> api module -> shared/contracts
```

推荐应用结构：

```text
xxx-front/
  src/
    App.tsx
    main.tsx
    api/
      client.ts
      modules/
        <domain>.ts
    components/
      layout/
      common/
    features/
      <domain>/
        components/
        hooks/
        pages/
        <domain>.types.ts
    hooks/
    lib/
    pages/
    stores/
```

小型应用可以直接使用 `pages/`、`components/` 和 `api/`。当某个业务域逐渐长大，超过少量页面/组件时，应迁移到 `features/<domain>` 下。

## 前端规则

- 页面负责组合 UI 和路由级状态，不直接调用 axios/fetch。
- API 调用统一放在 `src/api/modules/*`。
- 可复用的业务副作用统一收敛到 hooks。
- Layout 组件不应持续堆积功能型业务流程。
- `shared-ui` 必须保持与业务无关。
- 全局 store 只存放真正全局的状态。
- 当组件同时承担布局、数据加载、状态管理、数据变更等多种职责时，应尽早拆分。

## 配置策略

推荐配置解析顺序：

```text
默认值 -> 可选 config.json -> profile env 文件 -> process.env
```

规则：

- 服务应通过统一的 typed config API 读取配置。
- 业务模块不应直接读取原始环境变量。
- 启动时应校验必填配置。
- 生产环境应强制把危险配置修正为安全值，例如数据库 `synchronize: false`。
- 本地 secrets 不进入 git，应提交 `.env.example` 或 `config.example.json` 之类的示例文件。

## 数据库策略

- 生产环境 schema 变更应使用 migration。
- 生成后的 migration 在合并前应人工 review。
- 部署前应测试 migration。
- entity 变更和 migration 文件应在同一个变更中提交。
- 集成测试应使用测试数据库准备流程，而不是依赖接近生产的自动同步行为。

## 测试策略

最低要求：

- shared 包应为稳定的公共行为提供单元测试。
- 后端服务应覆盖 service 逻辑和关键 API 流程。
- 前端应用应覆盖可复用 hook、请求辅助工具和关键 UI 状态逻辑。
- contracts 在跨进程边界上应被校验。

## 新增 Package 规范

在新增 package 之前，先确认：

- 该职责是否真的无法放进现有 shared 包。
- 它的依赖方向是否清晰。
- 它的命名和对外导出是否稳定。
- 它不会引入循环依赖。
- 如果包含源码，是否有基本的 build/test 脚本。

## 新增后端模块规范

检查清单：

```text
[ ] Router 已在 src/index.ts 或服务路由聚合入口挂载。
[ ] Router 没有直接访问数据库。
[ ] Service 承担业务规则和流程编排。
[ ] Repository 承担持久化细节。
[ ] 跨应用共享的请求/响应类型来自 shared-types 或 contracts。
[ ] 新环境变量统一走 typed config。
[ ] 数据库 schema 变更包含 migration（如果需要）。
[ ] 核心 service 逻辑有单测。
[ ] 关键 API 流程有集成测试覆盖。
```

## 新增前端功能规范

检查清单：

```text
[ ] 路由入口清晰可定位。
[ ] API 调用已封装在 src/api/modules/*。
[ ] 共享请求/响应类型来自 shared-types 或 contracts。
[ ] 复杂副作用已抽到 hooks。
[ ] 仅功能内使用的组件留在 feature 目录。
[ ] shared UI 仍然保持无业务属性。
[ ] loading / empty / error 状态已明确处理。
[ ] 可独立回归的复用逻辑已补测试。
```

## 当前重构优先级

1. 把 typed server config 收敛到 `shared-server`。
2. 在生产环境禁用 TypeORM `synchronize`，并逐步切换到 migration 管理 schema 变更。
3. 把通用 Express app 初始化抽到 `shared-server`。
4. 把通用数据库初始化抽到 `shared-server`。
5. 把大的前端 layout 组件拆成 layout、hook 和聚焦子组件。
6. 把 API 路由、类型和 schema 定义沉淀到 contracts 包，让前后端共同依赖。
