## Why

当前 `siteMenu` 只能通过初始化种子文件或逐条 CRUD 维护，无法一次性用菜单文件批量更新整套目录结构。对于菜单迁移、环境同步和后台批量维护场景，这种方式效率低且容易出错，因此需要补充一个文件上传导入能力。

## What Changes

- 为 `siteMenu` 模块新增菜单文件上传导入接口，用上传的文件内容批量更新菜单数据。
- 上传成功后同时更新数据库中的 `sys_site_menu` 和本地 `siteMenu.json`，保证运行态与初始化种子一致。
- 为菜单文件导入补充格式校验、中文错误返回和导入后的菜单结构查询验证。
- 补充单元测试和集成测试，覆盖文件导入成功、文件格式错误和导入结果可读场景。

## Capabilities

### New Capabilities
- `site-menu-file-import`: 支持上传菜单文件并据此批量更新 siteMenu 数据。

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/src/siteMenu.ts`、`general-server/__tests__/*`
- 影响接口：新增 `POST /api/site-menu/uploadMenuFile`
- 影响依赖：后端需要引入 multipart 文件上传解析能力
- 影响数据：导入操作会覆盖当前 `sys_site_menu` 和 `general-server/siteMenu.json`
