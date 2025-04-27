import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { Icon, Style } from 'ol/style';
import Overlay from 'ol/Overlay';
import axios from 'axios';
import { defaults as defaultControls, ScaleLine, FullScreen, ZoomToExtent, MousePosition } from 'ol/control';
import {createStringXY} from 'ol/coordinate';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom';
import Draw from 'ol/interaction/Draw';
import {transform} from 'ol/proj';

// 后端 API 基础 URL
const API_BASE_URL = 'http://localhost:3000';

// DOM 元素
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const appContainer = document.getElementById('app');
const addPOIBtn = document.getElementById('add-poi-btn');
const addPOIModal = document.getElementById('add-poi-modal');
const closePOIModal = document.getElementById('close-poi-modal');
const addPOIForm = document.getElementById('add-poi-form');
const cancelPOIBtn = document.getElementById('cancel-poi-btn');
const selectLocationBtn = document.getElementById('select-location-btn');
const logoutBtn = document.getElementById('logout-btn');

// 创建弹出框元素
const popupElement = document.createElement('div');
popupElement.className = 'ol-popup';
const popupContent = document.createElement('div');
popupContent.className = 'ol-popup-content';
popupElement.appendChild(popupContent);

const popupCloser = document.createElement('a');
popupCloser.className = 'ol-popup-closer';
popupCloser.href = '#';
popupCloser.innerHTML = '&times;';
popupElement.appendChild(popupCloser);

// 创建矢量图层用于展示景点
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: new Style({
    image: new Icon({
      src: 'https://openlayers.org/en/latest/examples/data/icon.png',
      scale: 0.05,
    }),
  }),
});

// 初始化地图，添加控件
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vectorLayer
  ],
  view: new View({
    center: [12118909.300259633, 4086043.1079806107], // 中国中心位置
    zoom: 5,
    maxZoom: 19,
  }),
  controls: defaultControls().extend([
    new ScaleLine(),
    new FullScreen(),
    new MousePosition({
      coordinateFormat: createStringXY(6),
      projection: 'EPSG:4326'
    }),
    new ZoomToExtent({
      extent: [
        10000000, 3000000,
        14000000, 5000000
      ]
    })
  ]),
});

// 添加旋转和缩放交互
map.addInteraction(new DragRotateAndZoom());

// 创建弹出框
const popup = new Overlay({
  element: popupElement,
  autoPan: true,
  positioning: 'bottom-center',
  stopEvent: false,
  offset: [0, -10],
});
map.addOverlay(popup);

// 关闭弹出框
popupCloser.addEventListener('click', (event) => {
  popup.setPosition(undefined);
  event.preventDefault();
});

// 点击地图显示景点详情
map.on('singleclick', (event) => {
  // 隐藏任何打开的坐标选择器
  if (window.draw) {
    map.removeInteraction(window.draw);
    delete window.draw;
  }

  // 检查是否点击了要素
  const features = map.getFeaturesAtPixel(event.pixel);
  if (features && features.length > 0) {
    const feature = features[0];
    const properties = feature.getProperties();
    
    if (properties.name) {
      const content = `
        <h4>${properties.name}</h4>
        <p>${properties.description || ''}</p>
        <p><strong>类型：</strong>${properties.type || '未知'}</p>
        <p><strong>地址：</strong>${properties.address || '未知'}</p>
        <p><strong>评分：</strong>${properties.rating || '无评分'}</p>
      `;
      
      popupContent.innerHTML = content;
      popup.setPosition(event.coordinate);
    }
  } else {
    popup.setPosition(undefined);
  }
});

// 加载景点数据
async function loadPOIs() {
  try {
    const response = await axios.get(`${API_BASE_URL}/pois`);
    const pois = response.data;
    
    // 清空现有数据
    vectorSource.clear();

    pois.forEach((poi) => {
      const feature = new Feature({
        geometry: new Point([parseFloat(poi.longitude), parseFloat(poi.latitude)]),
        name: poi.name,
        description: poi.description,
        type: poi.type,
        address: poi.address,
        rating: poi.rating,
        id: poi.id
      });
      vectorSource.addFeature(feature);
    });
  } catch (err) {
    console.error('加载景点数据失败', err);
  }
}

// 在地图上选择位置
function enableLocationSelection() {
  // 移除现有的绘制交互
  if (window.draw) {
    map.removeInteraction(window.draw);
  }
  
  // 创建绘制交互
  window.draw = new Draw({
    source: vectorSource,
    type: 'Point'
  });
  
  // 监听绘制结束事件
  window.draw.on('drawend', (event) => {
    const geometry = event.feature.getGeometry();
    const coordinates = geometry.getCoordinates();
    const lonLat = transform(coordinates, 'EPSG:3857', 'EPSG:4326');
    
    document.getElementById('poi-lon').value = lonLat[0].toFixed(6);
    document.getElementById('poi-lat').value = lonLat[1].toFixed(6);
    
    // 移除绘制交互
    map.removeInteraction(window.draw);
    delete window.draw;
  });
  
  map.addInteraction(window.draw);
}

// 添加地点
selectLocationBtn.addEventListener('click', enableLocationSelection);

// 点击添加景点按钮，显示添加景点表单
addPOIBtn.addEventListener('click', () => {
  // 重置表单
  addPOIForm.reset();
  // 显示表单
  addPOIModal.classList.remove('hidden');
});

// 关闭添加景点表单
closePOIModal.addEventListener('click', () => {
  addPOIModal.classList.add('hidden');
});

// 取消添加景点
cancelPOIBtn.addEventListener('click', () => {
  addPOIModal.classList.add('hidden');
});

// 提交表单添加新景点
addPOIForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // 获取表单数据
  const name = document.getElementById('poi-name').value;
  const description = document.getElementById('poi-description').value;
  const type = document.getElementById('poi-type').value;
  const address = document.getElementById('poi-address').value;
  const rating = parseFloat(document.getElementById('poi-rating').value);
  const longitude = parseFloat(document.getElementById('poi-lon').value);
  const latitude = parseFloat(document.getElementById('poi-lat').value);

  // 验证数据
  if (!name || isNaN(longitude) || isNaN(latitude)) {
    alert('请填写完整的信息，包括名称和坐标位置。');
    return;
  }

  try {
    // 提交数据到服务器
    await axios.post(`${API_BASE_URL}/pois`, {
      name,
      description,
      type,
      address,
      rating,
      longitude,
      latitude,
    });
    
    // 重新加载所有景点数据
    await loadPOIs();
    
    // 关闭表单并提示成功
    addPOIModal.classList.add('hidden');
    alert('景点添加成功！');
  } catch (err) {
    console.error('添加景点失败', err);
    alert(`添加景点失败：${err.message}`);
  }
});

// 登录逻辑
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // 简单的用户验证
  if (username === 'admin' && password === 'admin') {
    loginModal.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // 加载景点数据
    loadPOIs();
  } else {
    alert('用户名或密码错误！');
  }
});

// 退出登录
logoutBtn.addEventListener('click', () => {
  loginModal.classList.remove('hidden');
  appContainer.classList.add('hidden');
});

// 搜索功能
document.getElementById('search-button').addEventListener('click', () => {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  if (!searchTerm) return;
  
  const features = vectorSource.getFeatures();
  const matchingFeature = features.find(feature => {
    const props = feature.getProperties();
    return props.name && props.name.toLowerCase().includes(searchTerm) ||
           props.description && props.description.toLowerCase().includes(searchTerm) ||
           props.type && props.type.toLowerCase().includes(searchTerm) ||
           props.address && props.address.toLowerCase().includes(searchTerm);
  });
  
  if (matchingFeature) {
    const geometry = matchingFeature.getGeometry();
    const coordinates = geometry.getCoordinates();
    
    // 跳转到该景点
    map.getView().animate({
      center: coordinates,
      zoom: 12,
      duration: 1000
    });
    
    // 显示弹出框
    const properties = matchingFeature.getProperties();
    const content = `
      <h4>${properties.name}</h4>
      <p>${properties.description || ''}</p>
      <p><strong>类型：</strong>${properties.type || '未知'}</p>
      <p><strong>地址：</strong>${properties.address || '未知'}</p>
      <p><strong>评分：</strong>${properties.rating || '无评分'}</p>
    `;
    
    popupContent.innerHTML = content;
    popup.setPosition(coordinates);
  } else {
    alert('未找到匹配的景点');
  }
});
