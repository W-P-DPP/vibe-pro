## 1. 用户模块建模

- [x] 1.1 新建 `general-server/src/user/` 目录，并补齐 `entity/controller/dto/repository/router/service` 六层文件
- [x] 1.2 实现 `user.entity.ts`，定义用户实体字段并继承 `BaseEntity`

## 2. 用户 CRUD 实现

- [x] 2.1 实现 `user.repository.ts`，提供用户列表、详情、新增、更新、删除的数据访问能力
- [x] 2.2 实现 `user.service.ts`、`user.controller.ts`、`user.dto.ts`，补齐用户 CRUD 业务校验与中文返回
- [x] 2.3 实现 `user.router.ts`，提供 `/getUser`、`/getUser/:id`、`/createUser`、`/updateUser/:id`、`/deleteUser/:id` 接口

## 3. 路由接入与验证

- [x] 3.1 修改 `general-server/src/index.ts`，以 `/user` 业务前缀挂载 `userRouter`
- [x] 3.2 补充用户模块单元测试和集成测试，覆盖成功与失败路径
- [x] 3.3 运行相关测试并修复回归，确认用户功能可用
