---
name: backend-dev-guard
description: 提供通用后端开发强约束规范。用于接口设计、模块分层、controller、service、repository、entity、dto、数据库、缓存、配置、日志、异常处理、测试、重构和后端代码评审等场景。触发后先读取代码库现状，再读取本 skill 的通用规范，按强约束分层和统一契约实现后端功能。
---

# 后端开发守卫

## 概述

这个 skill 用于通用后端开发，不绑定单一项目或框架。目标是把后端开发中的常见随意性收紧成一套可执行的强约束规范，默认要求完整分层、统一命名、统一契约、统一异常处理、统一日志和统一测试策略。

读完本文件后，继续读取 `references/backend-conventions.md`，把它当作详细规范来源。

## 默认立场

- 强约束优先，不使用“差不多就行”的实现方式
- 完整分层优先，不允许 controller 直接承载业务和数据访问
- 统一契约优先，不允许接口、异常、日志、数据结构各写各的
- 先服从现有仓库的明确规范；如果仓库没有明确规范，则按本 skill 的默认规范落地
- 如果现有仓库规范明显更差、且当前任务直接触达该区域，则按本 skill 收敛实现

## 必走流程

1. 先确认任务属于后端开发或后端重构。
2. 先读取代码库的入口、模块、配置、日志、异常、测试结构，确认当前技术栈和既有约束。
3. 再读取 `references/backend-conventions.md`，只提炼与当前任务相关的规则。
4. 先判断当前任务属于哪一类：
   - 新增模块
   - 现有模块扩展
   - 基础设施调整
   - 接口契约调整
   - 数据库或缓存调整
   - 异常、日志、测试治理
5. 设计时先明确分层边界、输入输出 DTO、错误模型、日志字段、测试范围，再开始编码。
6. 实现后至少完成与改动匹配的测试和验证。
7. 结束时明确说明用了哪些规范、哪些地方与仓库现状存在偏差、哪些地方被收敛了。

## 硬性规则

- 每一个功能模块都必须包含 `entity`、`controller`、`dto`、`repository`、`router`、`service` 六个文件，禁止缺失任一层
- 已有功能模块中的 `entity`、`controller`、`dto`、`repository`、`router`、`service` 文件禁止删除，只允许在其职责范围内重构和完善
- 不允许 controller 直接写业务逻辑、SQL、ORM 查询、缓存读写、第三方调用
- 不允许 service 直接依赖 HTTP 对象，例如 `req`、`res`
- 不允许 repository 处理 HTTP 语义、状态码、响应包裹
- 不允许跳过 DTO 直接用裸 `any`、裸对象在多层之间传递
- 不允许 `*.entity.ts` 脱离项目公共 `base.entity` 单独定义；所有实体文件必须继承 `C:\Users\admin\Desktop\my\super-pro\general-server\utils\entities\base.entity.ts` 中的 `BaseEntity`
- 不允许接口地址使用无语义或过度抽象的命名；增删改查接口必须按功能命名，例如获取 `xxx` 使用 `/getXxx`，获取 `xxx` 详情使用 `/getXxx/:id`，新增使用 `/createXxx`，更新使用 `/updateXxx/:id`，删除使用 `/deleteXxx/:id`
- 不允许在 `src/index.ts` 直接裸挂载业务 router；必须显式增加业务前缀，例如 `router.use('/site-menu', siteMenuRouter)`
- 当接口采用 `/getXxx`、`/createXxx`、`/updateXxx/:id`、`/deleteXxx/:id` 这类功能命名时，对外完整地址应为 `业务前缀 + 动作路径`，例如 `/site-menu/getMenu`、`/site-menu/getMenu/:id`、`/site-menu/createMenu`
- 一个业务域默认只允许保留一个 router 实例，不允许为了查询、写操作等再拆出多个子 router；除非存在独立中间件或明确的协议差异
- 不允许生成无语义的 router 命名；业务域 router 必须使用业务名命名，例如菜单域使用 `siteMenuRouter`
- 不允许把密钥、令牌、数据库凭据写入受版本控制的配置文件
- 不允许在运行时请求链路里随意使用 `console.log`
- 不允许直接把底层异常原样暴露给客户端
- 不允许向调用方返回英文成功消息、英文错误消息或中英混杂消息；所有正常返回与异常返回的文案默认必须为中文
- 不允许修改接口行为后不补测试
- 不允许为了满足“完整分层”而提交无意义空文件；即使某层逻辑很轻，也必须保留最小但明确的职责实现

## 完整分层定义

### `router`

负责声明路由、绑定 controller、挂载鉴权或路由级中间件。不写业务逻辑。
模块路由接入 `src/index.ts` 时，必须由入口层统一增加业务前缀。
一个业务域默认只保留一个业务 router，在这个 router 内按接口功能声明 `/getXxx`、`/createXxx`、`/updateXxx/:id`、`/deleteXxx/:id`。
生成 router 时，命名必须贴合业务域，不允许使用 `tempRouter`、`router1`、`crudRouter` 这类脱离业务语义的名字。

### `controller`

负责处理协议层输入输出：

- 接收参数
- 调用 DTO 校验或转换
- 调用 service
- 返回统一响应
- 把领域异常交给统一异常层

### `service`

负责业务规则、流程编排、事务边界、跨资源协调。它是模块行为的主入口。

### `repository`

负责数据库、缓存、外部存储、第三方持久化接口等访问细节。对上暴露明确方法，不泄露底层实现细节。

### `dto`

负责请求、响应、查询条件、分页结构、命令对象、视图对象等契约定义。跨层传递的数据必须优先通过 DTO 明确类型和字段语义。

### `entity`

每一个功能模块都必须提供 `entity` 文件，负责表结构、持久化模型、领域对象承载或至少作为该功能的数据模型收口点。所有 `*.entity.ts` 必须继承 `C:\Users\admin\Desktop\my\super-pro\general-server\utils\entities\base.entity.ts` 中的 `BaseEntity`。如果仓库尚未提供 `base.entity`，先补齐公共基类，再实现具体实体。不允许因为当前功能暂时未落库就省略 `entity` 文件。

## 执行原则

- 先建边界，再写实现
- 先定契约，再写接口
- 先定错误模型，再写异常分支
- 先定日志字段，再写日志
- 先定测试范围，再写测试

## 何时收敛旧代码

- 如果当前任务只是小修小补，不强行全仓改造
- 如果当前任务直接触达混乱模块，应在改动范围内把分层、命名、异常、日志、测试一起收敛
- 如果旧代码明显违反本 skill 的硬规则，至少在当前改动区域修正，不继续复制坏模式
