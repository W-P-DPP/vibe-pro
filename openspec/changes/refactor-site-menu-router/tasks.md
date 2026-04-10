## 1. Router 命名收敛

- [x] 1.1 重构 `general-server/src/siteMenu/siteMenu.router.ts`，按查询功能和写操作功能拆分并命名 router 分组
- [x] 1.2 移除 `siteMenu.router.ts` 中不体现接口功能的平铺式路由组织方式

## 2. 兼容入口与挂载整理

- [x] 2.1 在 router 结构中显式保留 `GET /api/getMenu` 的查询语义入口
- [x] 2.2 保持 `GET /api/site-menu`、详情接口和 CRUD 接口的外部路径不变

## 3. 验证与回归

- [x] 3.1 补充或更新接口测试，覆盖 router 功能命名重构后的主路径与兼容路径
- [x] 3.2 运行相关测试，确认 `siteMenu.router.ts` 重构后无回归
