const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// 中间件
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL 数据库连接
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'zhouhan2211141027',
  password: '123456',
  port: 5432,
});

// 测试数据库连接
pool.connect((err) => {
  if (err) {
    console.error('数据库连接失败', err);
  } else {
    console.log('成功连接到数据库');
  }
});

// API 路由
app.get('/', (req, res) => {
  res.send('旅游地图查询系统后端服务运行中');
});

// 获取所有景点数据
app.get('/pois', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pois');
    res.json(result.rows);
  } catch (err) {
    console.error('获取景点数据失败', err);
    res.status(500).send('服务器错误');
  }
});

// 添加新景点
app.post('/pois', async (req, res) => {
  const { name, description, type, address, rating, longitude, latitude } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pois (name, description, type, address, rating, longitude, latitude) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, type, address, rating, longitude, latitude]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('添加景点失败', err);
    res.status(500).send('服务器错误');
  }
});

// 更新景点信息
app.put('/pois/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, type, address, rating, longitude, latitude } = req.body;
  try {
    const result = await pool.query(
      'UPDATE pois SET name = $1, description = $2, type = $3, address = $4, rating = $5, longitude = $6, latitude = $7 WHERE id = $8 RETURNING *',
      [name, description, type, address, rating, longitude, latitude, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send('景点未找到');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('更新景点失败', err);
    res.status(500).send('服务器错误');
  }
});

// 删除景点
app.delete('/pois/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM pois WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('景点未找到');
    }
    res.send('景点已删除');
  } catch (err) {
    console.error('删除景点失败', err);
    res.status(500).send('服务器错误');
  }
});

// 启动服务
app.listen(port, () => {
  console.log(`后端服务已启动，访问地址：http://localhost:${port}`);
});