## Why

`frontend-template` 的内容区头部右侧目前只有静态搜索图标，无法帮助用户在菜单较多时快速定位功能入口；同时 `siteMenu` 也缺少正式的隐藏字段，导致“常规不展示、通过彩蛋临时解锁”的菜单能力没有稳定的数据契约。

现在需要把菜单搜索、隐藏菜单解锁和后端 `hide` 字段建模一起收口，避免前端临时硬编码隐藏逻辑，后端接口又无法稳定返回和维护该状态。

## What Changes

- 为 `frontend-template` 的内容区头部搜索图标补齐交互，点击后展开搜索框，并在输入过程中以前端模糊匹配的方式展示菜单匹配结果
- 前端默认隐藏 `hide=true` 的菜单节点，但在搜索框输入命中的彩蛋口令后展示隐藏菜单匹配结果
- 将彩蛋口令改为环境变量配置，默认值为 `dpp`，方便后续通过前端环境文件调整
- 为 `general-server` 的 `siteMenu` 模块新增布尔字段 `hide`，并扩展实体、DTO、查询接口、创建接口以及更新链路的字段透传能力
- 保持现有菜单路由命名、前端菜单数据加载方式和前端本地搜索策略不变，不引入后端搜索接口

## Capabilities

### New Capabilities
- `frontend-site-menu-search`: 提供头部菜单搜索框、前端模糊匹配结果展示，以及基于环境变量彩蛋口令的隐藏菜单解锁能力
- `site-menu-hide-field`: 为 `siteMenu` 数据模型和接口契约新增 `hide` 布尔字段，使菜单隐藏状态可被查询、创建、更新和前端消费

### Modified Capabilities

## Impact

- 影响前端代码：`frontend-template/src/components/AppLayout.tsx`、`frontend-template/src/api/modules/site-menu.ts`、`frontend-template/src/data/tool-directory.ts` 及相关环境变量文件/测试
- 影响后端代码：`general-server/src/siteMenu/*`、`general-server/siteMenu.json` 及 `siteMenu` 相关单元测试与集成测试
- 影响接口契约：`GET /api/site-menu/getMenu`、`GET /api/site-menu/getMenu/:id`、`POST /api/site-menu/createMenu`，并建议同步覆盖 `PUT /api/site-menu/updateMenu/:id`
- 影响配置：前端新增用于控制隐藏菜单彩蛋口令的 `VITE_` 环境变量
