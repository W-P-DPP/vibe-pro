## 1. 后端 `siteMenu` hide 字段扩展

- [x] 1.1 扩展 `general-server/src/siteMenu/siteMenu.entity.ts`，为 `sys_site_menu`、种子节点模型和树构建逻辑新增 `hide` 布尔字段并保持缺省值为 `false`
- [x] 1.2 扩展 `general-server/src/siteMenu/siteMenu.dto.ts`，让查询响应、创建请求、更新请求和导入节点契约包含 `hide`
- [x] 1.3 调整 `general-server/src/siteMenu/siteMenu.repository.ts`、`siteMenu.service.ts`、`siteMenu.controller.ts`，让查询、创建、更新和导入链路完整读写并校验 `hide`
- [x] 1.4 更新 `general-server/siteMenu.json` 与相关导入兼容逻辑，保证旧数据缺失 `hide` 时按 `false` 处理

## 2. 前端菜单搜索与隐藏菜单解锁

- [x] 2.1 在 `frontend-template` 新增 `VITE_SITE_MENU_HIDDEN_KEYWORD` 环境变量及读取逻辑，默认值设为 `dpp`
- [x] 2.2 调整 `frontend-template/src/api/modules/site-menu.ts` 与 `frontend-template/src/data/tool-directory.ts`，保留 `hide` 字段并提供可见菜单/搜索菜单所需的归一化数据
- [x] 2.3 改造 `frontend-template/src/components/AppLayout.tsx`，让头部搜索图标点击后展开搜索框并在输入时展示前端模糊匹配结果列表
- [x] 2.4 让侧边栏和内容目录默认过滤 `hide=true` 的菜单，并在搜索输入精确命中彩蛋口令时把隐藏菜单加入结果列表且支持直接打开

## 3. 测试与验证

- [x] 3.1 为 `general-server` 的 `siteMenu` 单元测试和集成测试补充 `hide` 字段默认值、查询透传、创建更新和非法类型校验断言
- [x] 3.2 为 `frontend-template` 补充菜单搜索、结果展示、隐藏菜单过滤和彩蛋口令解锁的前端测试或等价验证
- [x] 3.3 执行本次变更涉及的前后端测试与本地验证，确认搜索交互、隐藏菜单解锁和 `hide` 字段契约在查询/创建/更新链路中一致
