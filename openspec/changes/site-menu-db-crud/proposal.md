## Why

当前 `siteMenu` 已经做成了 JSON 持久化 CRUD，但这不是你要求的最终方案。现在需要把 `siteMenu.json` 的数据结构正式落库建表，并以数据库表为数据源实现 `siteMenu` 的增删改查，避免继续依赖整文件读写。

## What Changes

- 以 `siteMenu.json` 的字段结构为基础，为 `siteMenu` 设计并落地数据库表结构
- 重构 `siteMenu.entity.ts`，让菜单实体映射到数据库表，并继承 `BaseEntity`
- 将 `siteMenu.repository.ts` 从 JSON 文件读写改为基于 TypeORM/DataSource 的数据库读写
- 保留并重构 `siteMenu` 的 `controller`、`service`、`dto`、`router`，实现数据库版 CRUD
- 增加 `siteMenu.json` 到数据库表的初始化导入或同步策略，避免已有菜单数据丢失
- 保持查询接口兼容，并为新增、修改、删除接口补齐测试和中文返回约束

## Capabilities

### New Capabilities
- `site-menu-db-crud`: 提供基于数据库表而非 JSON 文件的站点菜单建表、初始化导入和增删改查能力

### Modified Capabilities

## Impact

- 影响代码：`general-server/src/siteMenu/*`、`general-server/utils/mysql.ts`、`general-server/src/index.ts`、相关测试文件
- 影响数据源：`siteMenu` 的主数据源将从 `siteMenu.json` 切换到数据库表
- 影响初始化流程：需要定义 `siteMenu.json` 首次导入数据库或启动时同步策略
- 影响接口：保留原有查询能力，同时以数据库数据实现完整 CRUD
