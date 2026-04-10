## Why

当前首页和内容容器仍然保留明显的外边距、圆角和阴影，页面整体更接近卡片化布局，而不是更直接的结构化工作台。现在需要把内容区收敛为更平、更贴边的呈现方式，减少装饰性包装并提升信息扫描效率。

## What Changes

- 移除首页主内容区与内容分组容器的外边距约束，让内容区更直接地占据可用空间。
- 移除内容区主要容器、分组区块和入口卡片上的圆角与阴影样式。
- 将页面视觉重点从卡片装饰转回到边界、分组标题、文字层级和排列结构。
- 保持现有搜索、侧栏目录、分类分组和入口行为不变，只调整布局与表面样式。
- 统一浅色和深色主题下的平面化容器表现，避免一套主题更“扁平”、另一套仍然卡片化。

## Capabilities

### New Capabilities
- `flat-content-layout`: 定义首页内容区和分组容器采用无外边距、无圆角、无阴影的平面化布局规范

### Modified Capabilities

## Impact

- Affected code:
  - `frontend-template/src/pages/HomePage.tsx`
  - `frontend-template/src/components/AppLayout.tsx`
  - `frontend-template/src/index.css`
- Affected UI systems:
  - 首页搜索区
  - 内容分组容器
  - 工具入口卡片
  - 侧栏与主内容区的衔接方式
- No API or dependency changes.
