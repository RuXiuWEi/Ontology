# 企业本体管理平台（华曦）

本仓库包含两部分：

1. 早期静态原型（`index.html` + `demo/` + `html/`）
2. MVP 功能化版本（`backend/` + `frontend/` + `infra/`）

> 当前建议主要维护 MVP 版本；静态原型保留用于对照与历史参考。

## 一、MVP 技术栈

- 前端：React + TypeScript + Vite + Axios + React Router
- 后端：Spring Boot 3 + Spring Security + JPA + Flyway + JWT
- 数据库：PostgreSQL

## 二、MVP 功能范围

- 登录（JWT）
- 对象类型 CRUD
- 对象实例 CRUD（支持按类型筛选）
- 数据持久化（PostgreSQL）
- 基础审计日志（写操作）

## 三、本地启动

### 1) 启动 PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2) 启动后端

```bash
cd backend
./mvnw spring-boot:run
```

默认地址：`http://localhost:8080`

默认管理员（首次启动自动创建）：

- 用户名：`admin`
- 密码：`admin123`

### 3) 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：`http://localhost:5173`

可通过环境变量覆盖 API：

```bash
VITE_API_BASE_URL=http://localhost:8080
```

## 四、测试与质量检查

### 后端测试

```bash
cd backend
./mvnw test
```

### 前端检查与构建

```bash
cd frontend
npm run lint
npm run build
```

## 五、目录说明

- `backend/`：Spring Boot 后端
- `frontend/`：React 前端
- `infra/`：基础设施编排（PostgreSQL）
- `docs/`：MVP范围与开发约定
- `index.html`、`demo/`、`html/`：早期静态原型

## 六、历史静态原型预览（可选）

```bash
python3 -m http.server 8080
```

打开：`http://127.0.0.1:8080/index.html`
