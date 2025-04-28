# 旅游地图查询系统

基于OpenLayers + Vite + Express + PostgreSQL构建的旅游地图查询系统。

## 功能特点

- 🗺️ 基于OpenLayers的交互式地图展示
- 🔍 景点搜索功能 
- 📍 添加新的景点标记
- 🖱️ 地图点击显示景点详情
- 🔐 用户登录认证
- 📱 响应式界面设计

## 技术栈

- 前端:
  - OpenLayers - 地图引擎
  - Vite - 构建工具
  - Axios - HTTP 客户端
  - Material UI - UI组件库

- 后端:
  - Express - Web服务器框架
  - PostgreSQL - 数据库
  - Node.js - 运行环境

## 快速开始

### 前置要求

- Node.js 14+
- PostgreSQL 数据库

### 数据库配置

创建景点表:

```sql
CREATE TABLE pois (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL, 
  description TEXT,
  type VARCHAR(100),
  address VARCHAR(255),
  rating NUMERIC(2, 1),
  longitude NUMERIC(9, 6) NOT NULL,
  latitude NUMERIC(9, 6) NOT NULL
);
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
# 启动前端服务
npm start

# 启动后端服务
node server/index.js
```

前端访问地址: http://localhost:5173
后端服务地址: http://localhost:3000

### 生产环境构建

```bash
npm run build
```

构建产物将生成在 `dist` 目录下。

## 目录结构

```
├── .github/          # GitHub工作流配置
├── server/           # 后端服务
├── public/           # 静态资源
├── src/             # 源代码
├── index.html       # HTML模板
├── main.js          # 前端入口
├── style.css        # 全局样式
├── vite.config.js   # Vite配置
└── package.json     # 项目配置
```

## 默认账号

- 用户名: admin
- 密码: admin

## 许可证

[MIT](LICENSE)


