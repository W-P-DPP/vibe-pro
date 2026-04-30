# Docker Production Layout

这份目录提供 `super-pro` 的一套生产环境 Docker 模板，目标是把当前公网入口迁移成一套 `nginx + static frontends + node apis + mysql + redis` 的容器编排。

## 包含内容

- `docker-compose.prod.yml`
  生产编排文件，包含 `nginx`、`general-server`、`agent-server`、`reimburse-server`、`mysql`、`redis`
- `Dockerfile.web`
  构建并打包所有静态前端，然后交给 `nginx` 提供
- `Dockerfile.server`
  通用 Node API 运行镜像，供三个后端复用
- `nginx/default.conf`
  生产路由规则，对应当前仓库的 `/zwpsite`、`/login`、`/agent`、`/reimburse`、`/summary-front`、`/resume`、`/file-server`、`/api`、`/agent-api`、`/reimburse-api`
- `env/*.env`
  三个后端的生产环境变量模板
- `config/*.config.json`
  三个后端挂载到容器内的 `config.json` 模板

## 使用方式

1. 先把 `docker/env/*.env` 里的占位值替换成真实生产值，尤其是：
   - `JWT_SECRET`
   - `MAILER_*`
   - `OPENAI_API_KEY`
   - `LOGIN_PASSWORD_PUBLIC_KEY`
   - `LOGIN_PASSWORD_PRIVATE_KEY`
   - `DB_PASSWORD`
2. 如果生产库不是容器内 `mysql`，修改：
   - `docker-compose.prod.yml` 中的 `mysql` 服务
   - `docker/env/*.env` 和 `docker/config/*.config.json` 中的数据库地址
3. 启动：

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

4. 查看合成配置：

```bash
docker compose -f docker/docker-compose.prod.yml config
```

5. 查看健康检查：

```bash
docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs -f nginx
docker compose -f docker/docker-compose.prod.yml logs -f general-server
```

## 当前约束

- `general-server` 的 `/public` 仍由 `general-server` 容器提供，`nginx` 只做反向代理。
- `reimburse-server` 的 `FILE_SERVER_API_BASE_URL` 已改成容器内地址 `http://general-server:30010/api`，避免走公网回环。
- `general-server` 的文件目录已经挂到 named volume：
  - `/data/file`
  - `/data/rubbish`
  - `/data/upload-chunks`
- 三个后端都使用 `/ready` 做容器健康检查。

## 更适合你后续补强的点

- 把 `mysql` 和 `redis` 改成外部托管服务。
- 为 `nginx` 增加 `443` 和证书挂载。
- 把敏感值改成 Docker secrets 或 CI/CD 注入。
- 给 `mysql` 增加初始化脚本和备份策略。
