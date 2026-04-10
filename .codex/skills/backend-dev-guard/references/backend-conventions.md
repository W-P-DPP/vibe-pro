# 通用后端开发规范

## 目录

1. 适用范围
2. 架构与分层规范
3. 命名规范
4. API 与 DTO 规范
5. 返回码与响应规范
6. 数据库与实体规范
7. 缓存与仓储规范
8. 异常处理规范
9. 日志规范
10. 配置与安全规范
11. 测试与验证规范
12. 重构与评审关注点

## 1. 适用范围

用于绝大多数后端项目，包括但不限于：

- REST API
- 管理后台服务端
- 微服务
- 网关后的业务服务
- 定时任务服务
- 带数据库和缓存的通用业务后端

如果仓库已有成熟规范，优先兼容；如果仓库规范缺失、冲突或明显劣化，按本文收敛。

## 2. 架构与分层规范

### 2.1 强制分层

每一个功能模块都必须采用以下结构：

- `xxx.router`
- `xxx.controller`
- `xxx.service`
- `xxx.repository`
- `xxx.dto`
- `xxx.entity`

### 2.2 各层职责

`router`

- 声明路由
- 挂载中间件
- 绑定 controller

`controller`

- 接收请求
- 解析参数
- 调用 DTO 校验和转换
- 调用 service
- 返回统一响应

`service`

- 编排业务流程
- 控制事务边界
- 协调 repository、缓存、第三方服务
- 处理领域规则

`repository`

- 封装数据库读写
- 封装缓存读写
- 封装外部持久化访问

`dto`

- 定义请求体
- 定义查询参数
- 定义响应体
- 定义分页结构
- 定义命令对象和视图对象

`entity`

- 定义数据库实体
- 定义字段约束
- 定义索引与主键策略
- 必须继承项目公共 `base.entity`
- 当前项目已明确公共基类路径为 `C:\Users\admin\Desktop\my\super-pro\general-server\utils\entities\base.entity.ts`
- 即使当前功能逻辑较轻，也必须保留该文件，作为该功能的数据模型收口点

### 2.3 禁止事项

- 禁止 controller 直接写业务逻辑
- 禁止 controller 直接访问 ORM、SQL、Redis、消息队列、第三方 SDK
- 禁止 service 直接耦合 HTTP 框架对象
- 禁止 repository 返回不透明的动态结构
- 禁止跨层使用 `any` 逃避类型约束
- 禁止模块缺层后继续复制坏模式
- 禁止删除模块既有的 `entity`、`controller`、`dto`、`repository`、`router`、`service` 文件
- 禁止以空文件方式敷衍完整分层要求

## 3. 命名规范

### 3.1 文件命名

- 文件名统一使用 `kebab-case` 或仓库既有稳定风格
- 同一仓库内不得混用多套文件命名策略
- 模块文件推荐：
  - `user.router.ts`
  - `user.controller.ts`
  - `user.service.ts`
  - `user.repository.ts`
  - `user.dto.ts`
  - `user.entity.ts`

### 3.2 类与接口命名

- controller 以 `XxxController` 命名
- service 以 `XxxService` 命名
- repository 以 `XxxRepository` 命名
- entity 以 `XxxEntity` 命名
- DTO 使用明确后缀：
  - `CreateUserRequestDto`
  - `UpdateUserRequestDto`
  - `UserQueryDto`
  - `UserResponseDto`
  - `PageResponseDto`

### 3.3 方法命名

- 查询类方法使用 `get`、`list`、`find`、`count`
- 新增类方法使用 `create`
- 更新类方法使用 `update`
- 删除类方法使用 `remove` 或 `delete`
- 禁止使用 `doThing`、`handleData`、`process` 这类无语义名称，除非上下文极其明确

### 3.4 路由命名

- 路由优先使用名词和资源语义
- 路径统一小写，必要时用 `kebab-case`
- 增删改查接口必须按动作加业务对象命名：
  - 获取列表或数据：`/getXxx`
  - 获取详情：`/getXxx/:id`
  - 新增：`/createXxx`
  - 更新：`/updateXxx/:id`
  - 删除：`/deleteXxx/:id`
- `src/index.ts` 必须使用业务名前缀挂载模块 router，例如 `router.use('/site-menu', siteMenuRouter)`
- 当模块内部已采用动作式路径时，对外完整地址应为 `业务前缀 + 动作路径`，例如 `/site-menu/getMenu`、`/site-menu/createMenu`、`/site-menu/updateMenu/:id`
- 一个业务域默认只保留一个 router 实例，在同一个业务 router 中直接声明该业务域的查询、新增、更新、删除接口
- 生成 router 时，业务域 router 名必须根据业务名命名
- 优先使用 `siteMenuRouter`、`userRouter`、`orderRouter`、`getMenu`、`createMenu` 这类功能清晰的名字
- 禁止使用 `tempRouter`、`router2`、`commonRouter`、`crudRouter` 这类无法直接体现接口功能的命名，除非仓库已有稳定且更清晰的业务语义
- 版本化接口优先使用 `/api/v1/...`

## 4. API 与 DTO 规范

### 4.1 DTO 强制规则

- controller 输入必须经过 DTO 或等价契约对象约束
- service 与 controller 之间的输入输出优先使用 DTO
- repository 的输入输出也应使用清晰类型，不传递裸字典对象
- DTO 不承担业务逻辑，只承担结构、字段语义、校验承载

### 4.2 DTO 拆分规则

至少区分：

- 创建 DTO
- 更新 DTO
- 查询 DTO
- 响应 DTO

不要用一个全能 DTO 兼容所有请求。

### 4.3 分页规范

分页请求至少包含：

- `page`
- `pageSize`

分页响应至少包含：

- `list`
- `total`
- `page`
- `pageSize`

## 5. 返回码与响应规范

### 5.1 响应原则

- HTTP status 表达协议语义
- 响应体表达业务语义
- 成功与失败结构保持稳定，不随接口各自漂移
- 面向调用方的响应文案默认统一使用中文，包括成功消息、失败消息、校验提示和异常提示

### 5.2 默认响应结构

当仓库没有既有标准时，默认使用：

```json
{
  "code": 0,
  "message": "成功",
  "data": {},
  "requestId": "xxx",
  "timestamp": 1710000000000
}
```

失败时：

```json
{
  "code": 10001,
  "message": "参数校验失败",
  "data": null,
  "requestId": "xxx",
  "timestamp": 1710000000000
}
```

### 5.3 返回码规则

- `0` 表示成功
- 非 `0` 表示业务失败
- 业务码必须稳定、可文档化、可追踪
- HTTP status 与业务码不得互相打架

### 5.4 常见状态映射

- 参数错误：`400`
- 未认证：`401`
- 无权限：`403`
- 资源不存在：`404`
- 资源冲突：`409`
- 语义校验失败：`422`
- 频率限制：`429`
- 服务内部错误：`500`
- 下游不可用：`503`

## 6. 数据库与实体规范

### 6.1 表与字段命名

- 表名优先使用 `snake_case`
- 字段名优先使用 `snake_case`
- 避免使用保留字、模糊缩写、无业务语义的字段名

### 6.0 实体继承规则

- 所有 `*.entity.ts` 必须继承 `C:\Users\admin\Desktop\my\super-pro\general-server\utils\entities\base.entity.ts` 中的 `BaseEntity`
- 如果仓库还没有 `base.entity`，必须先创建公共基类，再创建具体实体
- 通用审计字段、备注字段、创建更新人和创建更新时间应优先沉淀在 `base.entity` 中，而不是在每个实体里重复声明
- 不允许绕过 `base.entity` 直接在单个实体中各自维护一套重复基础字段
- 不允许因为“当前没有数据库表”而删除或省略 `*.entity.ts`

### 6.2 通用字段

业务主表默认优先考虑：

- `id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `deleted_at`，如果采用软删除

### 6.3 字段设计

- 明确 `null` 与空字符串的语义差异
- 能 `NOT NULL` 就不要默认可空
- 有默认值时明确写出，不依赖隐式行为
- 金额、计数、状态字段使用明确类型，不用字符串冒充数值
- 枚举值必须可追踪，不要散落魔法值

### 6.4 索引与唯一约束

- 查询条件涉及高频过滤字段时补索引
- 幂等键、业务唯一键必须有唯一约束
- 不要把唯一性只放在应用层判断

### 6.5 ORM 使用

- repository 中封装 ORM 细节
- 避免在 service 或 controller 中散落 ORM 调用
- 明确事务边界，避免隐式多次提交
- 避免无条件全表扫描和无分页大查询

## 7. 缓存与仓储规范

### 7.1 仓储边界

- repository 是数据访问边界，不是第二个 service
- repository 方法名必须表达数据语义，而不是底层实现细节

### 7.2 缓存规则

- key 命名必须具备前缀、业务域、主键语义
- TTL 必须显式，除非有充分理由永久保存
- 更新数据库后要明确处理缓存一致性
- 不要把缓存当真相源

缓存 key 示例：

- `user:profile:123`
- `order:detail:20240401`

## 8. 异常处理规范

### 8.1 总原则

- 只在合适层处理异常
- 统一异常出口
- 不把底层原始异常直接暴露给客户端
- 返回给调用方的异常消息必须是中文，且要可理解、可追踪，不得直接返回英文底层报错

### 8.2 分层处理

`controller`

- 只负责抛出或转交标准化异常

`service`

- 负责把业务违规映射为领域异常

`repository`

- 负责把底层数据库、缓存、第三方错误转换成可识别异常

### 8.3 异常类型

至少区分：

- 参数异常
- 认证异常
- 权限异常
- 资源不存在异常
- 资源冲突异常
- 限流异常
- 下游依赖异常
- 内部系统异常

### 8.4 禁止事项

- 禁止 `catch` 后什么都不做
- 禁止 `throw new Error('失败')` 这种无上下文异常在业务层泛滥
- 禁止把数据库错误、SQL、堆栈直接返回前端
- 禁止把英文运行时异常、英文下游报错、英文库报错直接透传给调用方

## 9. 日志规范

### 9.1 总原则

- 日志必须结构化
- 日志必须可检索
- 日志必须可关联请求链路
- 日志不得泄露敏感信息

### 9.2 推荐字段

请求日志或业务日志优先包含：

- `timestamp`
- `level`
- `service`
- `env`
- `requestId`
- `traceId`
- `userId`
- `module`
- `operation`
- `method`
- `path`
- `statusCode`
- `durationMs`

错误日志额外包含：

- `errorName`
- `errorCode`
- `errorMessage`
- `stack`

### 9.3 日志级别

- `debug`：本地调试或低级排查
- `info`：正常业务节点
- `warn`：可恢复异常、边界风险
- `error`：失败、异常、下游错误

### 9.4 禁止事项

- 禁止打印密码、token、cookie、密钥、完整身份证号、完整手机号
- 禁止在高频路径打印大量无结构日志
- 禁止把异常吞掉后只留一句模糊日志

## 10. 配置与安全规范

- 配置分层为：默认配置、环境配置、密钥配置
- 密钥只允许来自环境变量或受保护配置中心
- 不要把配置读取散落在各业务文件中
- 外部依赖地址、超时、重试、限流配置必须可配置
- 输入必须校验，输出必须脱敏
- 涉及鉴权时优先考虑：
  - 认证
  - 授权
  - 过期
  - 刷新
  - 审计

## 11. 测试与验证规范

### 11.1 最低要求

- 改 service，补 unit test
- 改 repository，补 repository 级测试或 integration test
- 改接口行为，补 integration test
- 改响应契约，补契约断言
- 改关键链路，补异常路径测试

### 11.2 测试类型

- unit：纯逻辑、工具函数、服务逻辑、异常映射
- integration：接口、数据库、缓存、模块协作
- contract：响应字段、错误码、分页结构、兼容性
- e2e：关键业务路径
- stress：吞吐、延迟、并发稳定性

### 11.3 断言要求

- 不只测成功路径，也测失败路径和边界条件
- 不只测 HTTP 状态，也测响应体结构和业务码
- 不只测结果，也测副作用，例如缓存、日志、持久化变化

## 12. 重构与评审关注点

评审或重构时优先检查：

- 是否破坏分层边界
- 是否引入裸 `any` 或裸对象穿透
- 是否把业务逻辑塞回 controller
- 是否引入了不稳定的响应结构
- 是否缺少错误码和异常映射
- 是否遗漏日志上下文字段
- 是否把敏感配置写入仓库
- 是否修改行为却没有对应测试
