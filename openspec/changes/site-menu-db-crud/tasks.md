## 1. 表结构与实体建模

- [x] 1.1 重构 `siteMenu.entity.ts`，让 `SiteMenuEntity` 继承 `BaseEntity` 并映射 `sys_site_menu` 表字段
- [x] 1.2 按 `siteMenu.json` 的字段语义定义表结构，包括 `parent_id`、`name`、`path`、`icon`、`is_top`、`sort` 和基础审计字段
- [x] 1.3 实现 `siteMenu.json` 到数据库表的递归导入逻辑，并保证表为空时才导入

## 2. 数据访问与业务规则

- [x] 2.1 将 `siteMenu.repository.ts` 从 JSON 文件读写重构为基于 TypeORM/DataSource 的数据库读写
- [x] 2.2 在 repository 中实现菜单列表查询、详情查询、插入、更新、删除及树组装逻辑
- [x] 2.3 在 `siteMenu.service.ts` 中实现父节点校验、节点不存在校验、树形 CRUD 编排和中文异常映射

## 3. 接口与路由接入

- [x] 3.1 在 `siteMenu.controller.ts` 中将查询和写操作切换为数据库版 service，并保证所有对外返回文案为中文
- [x] 3.2 在 `siteMenu.router.ts` 中保留 `/api/getMenu` 与 `/api/site-menu` 查询兼容能力，同时接入数据库版 CRUD 路由
- [x] 3.3 在模块初始化或应用启动链路中接入菜单表初始化导入流程

## 4. 测试与回归验证

- [x] 4.1 补充单元测试，覆盖导入、父节点不存在、节点不存在、树组装和中文错误返回
- [x] 4.2 补充集成测试，覆盖数据库版 siteMenu 的查询、新增、修改、删除和初始化导入行为
- [x] 4.3 运行相关测试并修复回归，确认 `siteMenu` 已以数据库表为主数据源完成 CRUD
