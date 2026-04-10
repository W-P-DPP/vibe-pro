## 1. 入口路由收敛

- [x] 1.1 重构 `general-server/src/index.ts`，将模块路由改为按业务名前缀挂载
- [x] 1.2 移除入口层中的裸 `router.use(xxxRouter)` 接入方式，统一使用显式前缀

## 2. 模块路由调整

- [x] 2.1 重构 `general-server/src/siteMenu/siteMenu.router.ts`，使 CRUD 路由以相对路径声明
- [x] 2.2 显式保留 `GET /api/getMenu` 兼容入口，避免依赖入口裸挂载行为

## 3. 验证与回归

- [x] 3.1 补充或更新相关接口测试，覆盖业务前缀挂载与兼容路由行为
- [x] 3.2 运行相关测试，确认 `src/index.ts` 路由重构后接口无回归
