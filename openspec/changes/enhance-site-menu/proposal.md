## Why

当前 `siteMenu` 功能只是由 controller 直接读取 `siteMenu.json` 并返回，模块分层基本未完成，数据契约、校验、路由注册和测试也不完整。现在需要把 `siteMenu.json` 明确为菜单结构来源，并补齐一个可维护、可扩展的后端菜单模块，避免继续复制临时代码和空分层。

## What Changes

- 基于 `siteMenu.json` 定义 `siteMenu` 的标准菜单树契约，明确顶级菜单、子菜单、图标、路径和排序语义
- 完成 `siteMenu` 模块的完整分层实现，包括 `router`、`controller`、`service`、`repository`、`dto`，并清理当前错误或空置的模块文件
- 提供稳定的菜单查询接口，使调用方可以获取结构化、可校验的站点菜单数据
- 增加菜单结构校验与错误处理，避免非法 JSON 结构或脏数据直接透传
- 为 `siteMenu` 模块补齐集成测试和必要的单元测试，覆盖成功路径与异常路径

## Capabilities

### New Capabilities
- `site-menu-query`: 提供基于 `siteMenu.json` 的站点菜单加载、结构校验、标准化输出和查询接口能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/src/index.ts`、`general-server/src/siteMenu.ts`、相关测试文件
- 影响接口：现有菜单读取接口将被收敛为完整模块输出，但应尽量保持调用方可兼容
- 影响数据源：继续使用 `general-server/siteMenu.json` 作为菜单结构来源
- 影响质量保障：需要新增 `siteMenu` 模块的 DTO、校验逻辑和测试覆盖
