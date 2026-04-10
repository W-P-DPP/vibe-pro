## 1. 模块收敛

- [x] 1.1 清理 `siteMenu` 模块中的错误或空置文件内容，明确 `router`、`controller`、`service`、`repository`、`dto` 的职责边界
- [x] 1.2 在 `siteMenu.dto.ts` 中定义递归菜单节点、菜单列表和必要的错误上下文 DTO
- [x] 1.3 在 `siteMenu.repository.ts` 中实现 `siteMenu.json` 的读取与解析能力
- [x] 1.4 在 `siteMenu.service.ts` 中实现菜单树递归校验、标准化输出和受控错误处理

## 2. 接口接入

- [x] 2.1 在 `siteMenu.controller.ts` 中改为通过 service 返回统一响应，不再直接读取 JSON 文件
- [x] 2.2 在 `siteMenu.router.ts` 中定义菜单查询路由，并由 `src/index.ts` 统一注册
- [x] 2.3 保持现有 `/api/getMenu` 查询能力可用，并在需要时兼容更语义化的菜单路由入口

## 3. 测试与验证

- [x] 3.1 为菜单结构标准化与非法菜单数据处理补充单元测试
- [x] 3.2 为菜单查询接口补充集成测试，覆盖状态码、统一响应结构和菜单树字段
- [x] 3.3 运行相关测试命令并修正回归问题，确认 `siteMenu` 模块达到可实现状态
