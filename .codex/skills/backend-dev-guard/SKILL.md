---
name: backend-dev-guard
description: 约束本仓库的后端工程开发规则。适用于 super-pro 中的 Node/Express 后端开发、API 设计、模块分层、controller/service/repository/entity/dto 变更、数据库/缓存/配置/日志/错误处理、shared-server 基础设施、可观测性、异常告警、优雅退出、开发环境测试入口、测试、重构以及后端代码评审。开始设计或修改前，必须先检查现有实现，再按本 skill 的分层架构、共享基础设施、类型化配置、安全日志和验证要求执行。
---

# 后端开发守卫

这个 skill 用于本仓库中的后端工作。目标不是只让代码“能跑”，而是保证结构、可观测性、运维可用性、安全性和可测试性一起成立。

本仓库把 `packages/shared-server` 视为后端共享基础设施的唯一归属地。服务包应优先做薄适配，不要把新的通用能力散落到 `general-server`、`agent-server`、`reimburse-server` 各自实现。

开始工作前，先读当前实现；当任务涉及分层、共享基础设施、配置、日志、鉴权、可观测性或测试约束时，再读 `references/backend-conventions.md`。

## 必要流程

1. 先检查当前实现和现有 shared primitive，不要直接新写一套。
2. 识别改动类别：业务逻辑、HTTP 契约、持久化、配置、日志、可观测性、运行时生命周期、开发测试入口。
3. 除非用户明确要求变更行为，否则保持对外兼容。
4. 通用能力优先进入 `packages/shared-server`，服务包只保留本地适配。
5. 先补齐分层边界和 DTO，再写实现。
6. 变更 shared 能力时，同步补 shared 单测；变更服务行为时，同步补服务级测试。
7. 先跑最小且有意义的验证，再补构建和集成测试。
8. 最终说明里明确：复用了哪些 shared 能力、哪些行为保持兼容、实际跑了哪些验证。

## 分层规则

- 后端模块优先遵循 `router -> controller -> service -> repository -> entity`。
- `req`、`res` 只留在 router/controller。
- ORM、SQL、Redis、文件系统、第三方 SDK 细节不要进入 controller。
- repository 返回强类型结果，不在层之间传裸字典。
- request/response/query/command/view-model 使用 DTO 文件定义。
- 不为了“分层好看”创建空层；每一层都必须有清晰职责。

## Shared-Server 优先

修改后端基础设施前，优先检查并复用：

- HTTP：`createHttpApp`、`createResponseMiddleware`、`createErrorMiddleware`、`createRequestLoggerMiddleware`
- 运行时：`createServiceRuntime`
- 请求上下文：`createRequestContextMiddleware`、`getRequestContext`
- 指标：`renderMetrics` 与 shared metrics registry
- 邮件告警：`createExceptionEmailReporterFromEnv`
- 开发测试入口：`createDevExceptionTestRouter`
- 配置：`loadProfileEnv`、`loadServerConfig`、`getDatabaseConfig`
- 基础设施：`SharedRedisService`、`SharedAxiosService`、`BatchProcessor`、`sanitizeLogValue`

规则：

- 新的通用运行时、可观测性、告警、开发测试能力必须先进 `packages/shared-server`。
- 服务的 `app.ts`、`main.ts` 应尽量只做路由编排、本地依赖注入和 runtime 接线。
- 不要在每个服务里复制健康检查、优雅退出、异常上报、测试调试路由。

## 运行时与可观测性

- 后端服务默认接入 `createServiceRuntime`，由 shared runtime 统一承载：
  - 生命周期状态
  - 优雅退出
  - 进程级异常上报
  - 健康检查
  - 指标导出
- 标准内部探针为 `/live`、`/ready`、`/metrics`，默认只作为内网或本机探针，不应默认暴露到公网 nginx。
- 请求链路默认使用 `x-request-id`，没有上游值时由服务生成，并写回响应头。
- request metrics、dependency metrics、uptime metrics 优先复用 shared metrics，不要在服务里各写一版。
- shutdown task 要显式注册顺序和超时，不要把资源释放逻辑散在 `process.on(...)` 回调里。

## 异常上报与告警

- 异常上报统一走 `runtime.reportException(...)`，不要在业务代码里直接散落多套告警逻辑。
- 默认异常来源至少覆盖：
  - `request_error`
  - `bootstrap_error`
  - `unhandled_rejection`
  - `uncaught_exception`
  - `shutdown_error`
- 邮件告不能阻断警是 reporter，不是新的错误处理主干；告警失败主流程。
- 告警按严重级别过滤：
  - `P0`: `bootstrap_error`、`uncaught_exception`
  - `P1`: `unhandled_rejection`、`shutdown_error`
  - `P2`: `request_error`
- 默认只发 `P0` 邮件，避免邮箱被普通请求异常刷屏。
- 邮件模板、返回给调用方的消息、开发测试接口文案默认使用简体中文。

## 配置规则

- `.env.*` 需要在创建 runtime、logger、reporter 前加载；不要先创建 reporter 再加载 profile env。
- 配置解析顺序保持稳定：安全默认值 -> 可选配置文件 -> profile env -> process env override。
- 不要在随机业务文件里直接读大量 `process.env`；集中在入口或配置层解析。
- 不要把真实生产 secrets 写进 skill、文档、示例或代码模板。

## API 与鉴权

- 新接口默认启用 JWT 保护。
- 匿名接口必须在路由编排层显式可见，不能靠鉴权中间件里的隐式白名单。
- 开发环境测试路由如果需要绕过 JWT，必须同时满足：
  - 仅 `NODE_ENV=development`
  - 路径显式集中，例如 `/api/__dev__/...`
  - 不能在生产环境挂载
- 保持统一响应包结构：`code`、`msg`、`data`、`timestamp`。

## 日志与安全

- 日志必须脱敏，禁止打印密码、token、cookie、授权头、私钥、完整大 payload。
- 请求/响应/异常元数据在记录前先过 `sanitizeLogValue` 或等价脱敏逻辑。
- 不要把 stack、SQL 错误、SDK 内部错误原样返回给前端。
- 运行时路径中避免 `console.log`，统一走共享 logger。

## 测试与验证

- shared 基础设施改动：
  - 补 `packages/shared-server` 单测
  - 跑 `pnpm --filter @super-pro/shared-server build`
  - 跑最相关的 `vitest`
- 服务行为改动：
  - 补对应服务的单测或集成测试
  - 跑对应服务 build
- 涉及可观测性、健康检查、开发测试入口时，至少验证：
  - `/live`
  - `/ready`
  - `/metrics`
  - 开发环境测试异常接口

## 评审清单

- 是否把本该进入 `packages/shared-server` 的能力错误地下沉到某个服务内？
- 是否在入口处先加载 env，再初始化 runtime / reporter / app？
- 是否保持 health、metrics、graceful shutdown、exception reporting 一致？
- 是否把开发测试路由限制在 `development`，并避免生产暴露？
- 是否让 JWT 绕过仅作用于显式的开发测试入口，而不是放大全局白名单？
- 是否默认按严重级别过滤告警，避免普通请求异常刷屏？
- 是否补了 shared 单测和服务级验证？
