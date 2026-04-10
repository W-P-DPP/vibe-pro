## 1. 变更准备

- [ ] 1.1 为 `siteMenu` 上传导入能力补齐 proposal、design、spec 所需实现上下文并确认路由命名
- [ ] 1.2 引入后端文件上传解析依赖，并保持现有后端模块结构不变

## 2. siteMenu 上传导入实现

- [ ] 2.1 扩展 `siteMenu` 的 dto、controller、service、repository，支持菜单 JSON 文件上传导入
- [ ] 2.2 在 `siteMenu.router.ts` 中新增 `POST /uploadMenuFile` 接口，并保持单一业务 router
- [ ] 2.3 实现导入后同步更新数据库菜单与 `general-server/siteMenu.json`

## 3. 验证

- [ ] 3.1 补充单元测试与集成测试，覆盖导入成功、缺少文件、非法 JSON/非法节点结构
- [ ] 3.2 运行后端测试并修复回归，确认上传导入后 `getMenu` 返回更新结果
