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

本文档将指导您如何部署和运行铜陵市旅游地图查询系统项目。请按照以下步骤操作，确保系统能够正常运行。

## 前提条件

在开始部署之前，请确保您的系统已安装以下软件：

- Node.js (v14.0.0 或更高版本)
- npm (v6.0.0 或更高版本)
- PostgreSQL 数据库 (v12.0 或更高版本)
- Git (可选，用于克隆项目)

## 部署步骤

### 1. 获取项目代码

通过以下方式获取项目代码：

```bash
# 使用Git克隆项目
git clone <项目仓库地址>

# 或者解压您收到的项目压缩包
```

### 2. 安装项目依赖

进入项目目录，安装所需依赖：

```bash
cd my-app
npm install
```

特别注意需要安装以下依赖：

```bash
# 安装OpenLayers
npm install ol --save

# 安装Axios用于HTTP请求
npm install axios --save

# 安装ECharts用于图表展示
npm install echarts --save
```

### 3. 配置数据库

#### 3.1 创建PostgreSQL数据库

登录PostgreSQL并创建名为`tourism_map`的数据库：

```sql
CREATE DATABASE tourism_map;
```

#### 3.2 创建数据表

连接到新创建的数据库，执行项目中的`public/database.sql`脚本：

```bash
psql -U <用户名> -d tourism_map -a -f public/database.sql
```

或者在PostgreSQL客户端工具中执行SQL脚本。

### 4. 配置后端API

#### 4.1 修改API配置

在项目的`server.js`文件中，检查并修改数据库连接配置：

```javascript
const pool = new Pool({
  user: 'postgres',  // 修改为您的数据库用户名
  host: 'localhost',
  database: 'tourism_map',
  password: 'your_password',  // 修改为您的数据库密码
  port: 5432,
});
```

#### 4.2 启动后端服务

```bash
node server.js
```

服务成功启动后，控制台会显示"服务器运行在 http://localhost:3000"。

### 5. 配置前端

#### 5.1 修改API地址

在`main.js`文件中，确认API地址与后端服务一致：

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

如果您的后端服务运行在不同的端口或地址，请相应修改。

### 6. 运行项目

有两种方式启动前端项目：

#### 6.1 使用简单的HTTP服务器

```bash
# 安装http-server
npm install -g http-server

# 在项目根目录运行
http-server -p 8080
```

#### 6.2 使用Node.js集成服务器

如果您的`server.js`已配置为同时提供静态文件服务，则可以直接访问：

```
http://localhost:3000
```

### 7. 访问系统

在浏览器中打开以下地址：

```
http://localhost:8080
```

或者后端服务提供的地址。

系统登录凭据：
- 用户名：admin
- 密码：admin

## 常见问题

### 1. 无法连接到数据库

- 检查PostgreSQL服务是否正在运行
- 验证数据库凭据是否正确
- 确认数据库名称为`tourism_map`

### 2. 地图无法显示

- 确保网络可以访问OpenStreetMap服务
- 检查控制台是否有JavaScript错误

### 3. 无法看到景点数据

- 确认数据库中的POI数据已正确导入
- 检查API请求是否成功返回数据
- 查看浏览器控制台中是否有错误信息

### 4. 图表不显示

- 确认已正确安装ECharts
- 检查控制台是否有JavaScript错误
- 验证是否正确调用了initCharts()函数

## 特殊配置说明

如果需要在公网访问或修改默认配置，请参考以下指南：

- 修改`server.js`中的监听地址，将`localhost`改为`0.0.0.0`以允许外部访问
- 在生产环境中，建议配置HTTPS和适当的安全措施
- 对于大量数据，可能需要优化PostgreSQL查询和索引

## 技术支持

如有任何问题，请联系项目维护者：

- 邮箱：[z3311285612@outlook.com]
- GitHub Issues：[项目仓库地址]/issues

---

祝您使用愉快！


