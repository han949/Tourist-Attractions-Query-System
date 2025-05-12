import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { Icon, Style, Circle, Fill, Stroke, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import axios from 'axios';
import { defaults as defaultControls, ScaleLine, FullScreen, ZoomToExtent, MousePosition } from 'ol/control';
import { createStringXY } from 'ol/coordinate';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom';
import Draw from 'ol/interaction/Draw';
import { transform } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import * as echarts from 'echarts';
import GeoJSON from 'ol/format/GeoJSON';



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

// 获取筛选相关的DOM元素
const filterPOIBtn = document.getElementById('filter-poi-btn');
const filterPOIModal = document.getElementById('filter-poi-modal');
const closeFilterModal = document.getElementById('close-filter-modal');
const filterPOIForm = document.getElementById('filter-poi-form');
const cancelFilterBtn = document.getElementById('cancel-filter-btn');
const resetFilterBtn = document.getElementById('reset-filter-btn');

let currentFilters = {
  type: '',
  minRating: 1
};

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

// 定义不同类型景点的颜色映射
const typeColors = {
  '自然景观': '#4CAF50', // 绿色
  '历史遗迹': '#FFC107', // 琥珀色
  '主题公园': '#2196F3', // 蓝色
  '文化场所': '#9C27B0', // 紫色
  '休闲娱乐': '#F44336'  // 红色
};

// 默认颜色（当类型不在上述映射中时使用）
const defaultColor = '#607D8B'; // 蓝灰色

// 根据景点类型获取颜色
function getColorByType(type) {
  return typeColors[type] || defaultColor;
}


// 为特定类型创建样式
function createPointStyle(type, name, zoom) {
  // 根据缩放级别调整点和文本的大小
  let radius = 8;
  let fontSize = '12px';
  let offsetY = -15;

  // 缩放级别越大，标记和文字也可以相应变大
  if (zoom >= 14) {
    radius = 10;
    fontSize = '14px';
    offsetY = -18;
  } else if (zoom >= 12) {
    radius = 9;
    fontSize = '13px';
    offsetY = -16;
  }

  return new Style({
    image: new Circle({
      radius: radius,
      fill: new Fill({
        color: getColorByType(type)
      }),
      stroke: new Stroke({
        color: '#FFFFFF',
        width: 2
      })
    }),
    text: name ? new Text({
      text: name,
      font: `${fontSize} Calibri,sans-serif`,
      fill: new Fill({
        color: '#000'
      }),
      stroke: new Stroke({
        color: '#fff',
        width: 2
      }),
      offsetY: offsetY,
      textAlign: 'center',
      textBaseline: 'bottom'
    }) : undefined
  });
}

// 创建矢量图层用于展示景点
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: function (feature) {
    const zoom = map.getView().getZoom();
    // 根据缩放级别决定是否显示名称
    const showLabel = zoom > 11;
    return createPointStyle(feature.get('type'), showLabel ? feature.get('name') : null, zoom);
  },
  zIndex: 10
});


// 创建比例尺和坐标显示的DOM容器
const scaleLineElement = document.createElement('div');
scaleLineElement.className = 'ol-scale-line-container';
document.body.appendChild(scaleLineElement);

const mousePositionElement = document.createElement('div');
mousePositionElement.className = 'ol-mouse-position-container';
document.body.appendChild(mousePositionElement);

// 保存地图初始视图状态
const initialView = {
  center: [117.856425, 30.964859], // 铜陵市中心坐标，根据您的需求调整
  zoom: 10 // 初始缩放级别
};
// 天地图密钥
const tdtKey = '8497ab2e9d309d60b93398a1bfa25f10';


// 创建底图组 - 放在初始化地图之前
const baseMaps = {
  vector: new TileLayer({
    title: '矢量底图',
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/vec_w/wmts?layer=vec&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=${tdtKey}`,
    }),
    visible: true,
    type: 'base'
  }),
  
  image: new TileLayer({
    title: '影像底图',
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/img_w/wmts?layer=img&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=${tdtKey}`,
    }),
    visible: false,
    type: 'base'
  }),
  
  terrain: new TileLayer({
    title: '地形底图',
    source: new XYZ({
      url: `http://t0.tianditu.gov.cn/ter_w/wmts?layer=ter&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=${tdtKey}`,
    }),
    visible: false,
    type: 'base'
  })
};

// 创建标注图层 - 这个图层会叠加在底图上显示地名
const annotationLayer = new TileLayer({
  title: '地名标注',
  source: new XYZ({
    url: `http://t0.tianditu.gov.cn/cva_w/wmts?layer=cva&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=${tdtKey}`,
  }),
  visible: true
});

// 创建影像标注图层 - 与影像底图配合使用
const imageAnnotationLayer = new TileLayer({
  title: '影像标注',
  source: new XYZ({
    url: `http://t0.tianditu.gov.cn/cia_w/wmts?layer=cia&style=default&tilematrixset=w&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=${tdtKey}`,
  }),
  visible: false
});
// 初始化地图，使用经纬度坐标系
const map = new Map({
  target: 'map',
  
  layers: [
    // 添加所有底图图层
    baseMaps.vector,
    baseMaps.image,
    baseMaps.terrain,
    
    // 添加标注图层
    annotationLayer,
    imageAnnotationLayer,
    
    // 添加矢量图层
    vectorLayer
  ],

  view: new View({
    center: initialView.center,
    zoom: initialView.zoom,
    maxZoom: 19,
    projection: 'EPSG:4326' // 使用经纬度坐标系
  }),
  controls: defaultControls().extend([
    // 比例尺移到左下角
    new ScaleLine({
      className: 'ol-scale-line',
      target: scaleLineElement,
      units: 'metric',
      bar: true,
      steps: 4,
      text: true,
      minWidth: 140
    }),
    new FullScreen(),
    // 坐标显示移到右下角
    new MousePosition({
      className: 'ol-mouse-position',
      coordinateFormat: createStringXY(6),
      projection: 'EPSG:4326', // 显示经纬度坐标
      target: mousePositionElement
    })


  ]),

});
// 回到初始视图按钮功能
document.getElementById('reset-view-btn').addEventListener('click', function () {
  // 使用动画效果回到初始视图
  map.getView().animate({
    center: initialView.center,
    zoom: initialView.zoom,
    duration: 1000 // 动画持续1秒
  });
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

// 获取景点图片路径的函数
function getPOIImagePath(poi) {
  // 尝试多种可能的图片命名方式
  const possibleNames = [
    `./public/image/${poi.id}.jpg`,                        // 使用ID直接匹配
    `./public/image/poi_${poi.id}.jpg`,                    // 使用poi_ID格式
    `./public/image/${encodeURIComponent(poi.name)}.jpg`   // 使用名称匹配
  ];

  return possibleNames[0]; // 默认使用第一种命名方式
}

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
      const ratingStars = '★'.repeat(Math.floor(properties.rating)) +
        (properties.rating % 1 >= 0.5 ? '½' : '') +
        '☆'.repeat(5 - Math.ceil(properties.rating));
      // 获取图片路径
      const imagePath = getPOIImagePath({
        id: properties.id,
        name: properties.name
      });


      const content = `
        <div class="popup-header">
          <h4>${properties.name}</h4>
          <div class="rating" title="${properties.rating}分">${ratingStars}</div>
        </div>
        <div class="popup-image">
          <img src="${imagePath}" 
               alt="${properties.name}" 
               onerror="this.src='./public/image/default.jpg'; console.log('图片加载失败，ID: ${properties.id}, 名称: ${properties.name}');">
        </div>
        <div class="popup-body">
          <p class="description">${properties.description || ''}</p>
          <div class="info-grid">
            <div class="info-item">
              <i class="fas fa-tag"></i>
              <span>${properties.type || '未知'}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${properties.address || '未知'}</span>
            </div>
          </div>
          <div class="popup-actions">
            <button onclick="editPOI(${properties.id})" class="action-btn">
              <i class="fas fa-edit"></i> 编辑
            </button>
          </div>
        </div>
      `;

      console.log("尝试加载景点图片:", imagePath, "景点ID:", properties.id);
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
      // 直接使用经纬度坐标，不需要转换
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

    // 加载数据后更新图例
    createLegend();

    // 更新图表数据
    if (typeDistChart && typeRatingChart) {
      updateCharts();
    }
    initializeSearchDropdown();
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

    // 坐标已经是经纬度格式，不需要转换
    document.getElementById('poi-lon').value = coordinates[0].toFixed(6);
    document.getElementById('poi-lat').value = coordinates[1].toFixed(6);

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
    // 注意：这里不手动指定id，让数据库自动生成
    // 提交数据到服务器
    await axios.post(`${API_BASE_URL}/pois`, {
      name,
      description,
      type,
      address,
      rating,
      longitude,
      latitude
    });

    // 重新加载所有景点数据
    await loadPOIs();

    // 关闭表单并提示成功
    addPOIModal.classList.add('hidden');
    alert('景点添加成功！');
  } catch (err) {
    console.error('添加景点失败', err);
    if (err.response && err.response.data && err.response.data.error) {
      if (err.response.data.error.includes('pois_pkey')) {
        alert('添加景点失败：该ID已存在，系统将自动分配ID');
        // 尝试不指定ID重新提交
        try {
          await axios.post(`${API_BASE_URL}/pois`, {
            name,
            description,
            type,
            address,
            rating,
            longitude,
            latitude
          });
          await loadPOIs();
          addPOIModal.classList.add('hidden');
          alert('景点添加成功！');
        } catch (retryErr) {
          alert(`添加景点失败：${retryErr.message}`);
        }
      } else {
        alert(`添加景点失败：${err.response.data.error}`);
      }
    } else {
      alert(`添加景点失败：${err.message}`);
    }
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

// 搜索功能增强 - 添加下拉提示
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');

// 当用户在搜索框中输入时，显示匹配的景点
searchInput.addEventListener('input', () => {
  const searchTerm = searchInput.value.toLowerCase().trim();

  // 如果搜索词为空，隐藏下拉菜单
  if (!searchTerm) {
    searchResults.style.display = 'none';
    return;
  }

  // 获取所有景点并筛选匹配项
  const features = vectorSource.getFeatures();
  const matchingFeatures = features.filter(feature => {
    const props = feature.getProperties();
    return props.name && props.name.toLowerCase().includes(searchTerm) ||
      props.description && props.description.toLowerCase().includes(searchTerm) ||
      props.type && props.type.toLowerCase().includes(searchTerm) ||
      props.address && props.address.toLowerCase().includes(searchTerm);
  });

  // 如果没有匹配项，隐藏下拉菜单
  if (matchingFeatures.length === 0) {
    searchResults.style.display = 'none';
    return;
  }

  // 生成下拉菜单内容
  searchResults.innerHTML = '';
  matchingFeatures.slice(0, 5).forEach(feature => {
    const props = feature.getProperties();

    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.innerHTML = `
      <div class="search-result-name">${props.name}</div>
      <div class="search-result-info">
        <span class="search-result-type">${props.type || '未分类'}</span>
        <span class="search-result-rating">★ ${props.rating || 'N/A'}</span>
      </div>
    `;

    // 点击结果项时，跳转到该景点
    resultItem.addEventListener('click', () => {
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates();

      // 跳转到该景点
      map.getView().animate({
        center: coordinates,
        zoom: 12,
        duration: 1000
      });
      // 获取图片路径
      const imagePath = getPOIImagePath({
        id: props.id,
        name: props.name
      });

      // 显示弹出框
      const ratingStars = '★'.repeat(Math.floor(props.rating)) +
        (props.rating % 1 >= 0.5 ? '½' : '') +
        '☆'.repeat(5 - Math.ceil(props.rating));


      const content = `
    <div class="popup-header">
      <h4>${props.name}</h4>
      <div class="rating" title="${props.rating}分">${ratingStars}</div>
    </div>
    <div class="popup-image">
      <img src="${imagePath}" 
           alt="${props.name}" 
           onerror="this.src='./public/image/default.jpg'; console.log('图片加载失败，ID: ${props.id}, 名称: ${props.name}');">
    </div>
        <div class="popup-body">
          <p class="description">${props.description || ''}</p>
          <div class="info-grid">
            <div class="info-item">
              <i class="fas fa-tag"></i>
              <span>${props.type || '未知'}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${props.address || '未知'}</span>
            </div>
          </div>
          <div class="popup-actions">
            <button onclick="editPOI(${props.id})" class="action-btn">
              <i class="fas fa-edit"></i> 编辑
            </button>
          </div>
        </div>
      `;

      popupContent.innerHTML = content;
      popup.setPosition(coordinates);


      // 隐藏下拉菜单并清空搜索框
      searchResults.style.display = 'none';
      searchInput.value = '';
    });

    searchResults.appendChild(resultItem);
  });

  // 显示下拉菜单
  searchResults.style.display = 'block';
});

// 点击搜索按钮时，查找并跳转到第一个匹配的景点
searchButton.addEventListener('click', () => {
  const searchTerm = searchInput.value.toLowerCase().trim();
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
    const ratingStars = '★'.repeat(Math.floor(properties.rating)) +
      (properties.rating % 1 >= 0.5 ? '½' : '') +
      '☆'.repeat(5 - Math.ceil(properties.rating));

    const content = `
      <div class="popup-header">
        <h4>${properties.name}</h4>
        <div class="rating" title="${properties.rating}分">${ratingStars}</div>
      </div>
      <div class="popup-body">
        <p class="description">${properties.description || ''}</p>
        <div class="info-grid">
          <div class="info-item">
            <i class="fas fa-tag"></i>
            <span>${properties.type || '未知'}</span>
          </div>
          <div class="info-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${properties.address || '未知'}</span>
          </div>
        </div>
        <div class="popup-actions">
          <button onclick="editPOI(${properties.id})" class="action-btn">
            <i class="fas fa-edit"></i> 编辑
          </button>
        </div>
      </div>
    `;

    popupContent.innerHTML = content;
    popup.setPosition(coordinates);

    // 隐藏下拉菜单
    searchResults.style.display = 'none';
  } else {
    alert('未找到匹配的景点');
  }
});

// 点击页面其他区域时隐藏搜索结果下拉菜单
document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-container')) {
    searchResults.style.display = 'none';
  }
});

// 打开筛选窗口
filterPOIBtn.addEventListener('click', () => {
  filterPOIModal.classList.remove('hidden');
});

// 关闭筛选窗口
closeFilterModal.addEventListener('click', () => {
  filterPOIModal.classList.add('hidden');
});

cancelFilterBtn.addEventListener('click', () => {
  filterPOIModal.classList.add('hidden');
});

// 重置筛选条件
resetFilterBtn.addEventListener('click', () => {
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-rating').value = '1';
  currentFilters = {
    type: '',
    minRating: 1
  };
  applyFilters();
  filterPOIModal.classList.add('hidden');
});

// 提交筛选表单
filterPOIForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const type = document.getElementById('filter-type').value;
  const minRating = parseFloat(document.getElementById('filter-rating').value);

  currentFilters = {
    type,
    minRating
  };

  applyFilters();
  filterPOIModal.classList.add('hidden');
});

// 应用筛选条件
function applyFilters() {
  const features = vectorSource.getFeatures();
  features.forEach(feature => {
    const properties = feature.getProperties();
    const visible = (!currentFilters.type || properties.type === currentFilters.type) &&
      (!currentFilters.minRating || properties.rating >= currentFilters.minRating);

    feature.setStyle(visible ? null : new Style({}));
  });
}

// 按ESC键关闭下拉菜单
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    searchResults.style.display = 'none';
  } else if (event.key === 'Enter') {
    // 按回车键触发搜索按钮点击
    searchButton.click();
    event.preventDefault();
  }
});

// 编辑景点功能
window.editPOI = function (id) {
  const feature = vectorSource.getFeatures().find(f => f.get('id') === id);
  if (!feature) return;

  const properties = feature.getProperties();
  const geometry = feature.getGeometry();
  const coordinates = geometry.getCoordinates();

  // 坐标已经是经纬度格式，不需要转换
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-name').value = properties.name;
  document.getElementById('edit-description').value = properties.description;
  document.getElementById('edit-type').value = properties.type;
  document.getElementById('edit-address').value = properties.address;
  document.getElementById('edit-rating').value = properties.rating;
  document.getElementById('edit-lon').value = coordinates[0].toFixed(6);
  document.getElementById('edit-lat').value = coordinates[1].toFixed(6);

  // 显示编辑窗口
  document.getElementById('edit-poi-modal').classList.remove('hidden');
};

//
// 获取编辑相关的DOM元素
const editPOIModal = document.getElementById('edit-poi-modal');
const closeEditModal = document.getElementById('close-edit-modal');
const editPOIForm = document.getElementById('edit-poi-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editSelectLocationBtn = document.getElementById('edit-select-location-btn');
// 关闭编辑窗口
closeEditModal.addEventListener('click', () => {
  editPOIModal.classList.add('hidden');
});

// 取消编辑
cancelEditBtn.addEventListener('click', () => {
  editPOIModal.classList.add('hidden');
});
// 在地图上选择位置（编辑时）
editSelectLocationBtn.addEventListener('click', () => {
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

    // 坐标已经是经纬度格式，不需要转换
    document.getElementById('edit-lon').value = coordinates[0].toFixed(6);
    document.getElementById('edit-lat').value = coordinates[1].toFixed(6);

    // 移除绘制交互
    map.removeInteraction(window.draw);
    delete window.draw;
  });

  map.addInteraction(window.draw);
});
// 提交编辑表单
editPOIForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // 获取表单数据
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value;
  const description = document.getElementById('edit-description').value;
  const type = document.getElementById('edit-type').value;
  const address = document.getElementById('edit-address').value;
  const rating = parseFloat(document.getElementById('edit-rating').value);
  const longitude = parseFloat(document.getElementById('edit-lon').value);
  const latitude = parseFloat(document.getElementById('edit-lat').value);

  // 验证数据
  if (!name || isNaN(longitude) || isNaN(latitude)) {
    alert('请填写完整的信息，包括名称和坐标位置。');
    return;
  }

  try {
    // 提交数据到服务器
    await axios.put(`${API_BASE_URL}/pois/${id}`, {
      name,
      description,
      type,
      address,
      rating,
      longitude,
      latitude
    });

    // 重新加载所有景点数据
    await loadPOIs();

    // 关闭表单并提示成功
    editPOIModal.classList.add('hidden');
    alert('景点编辑成功！');
  } catch (err) {
    console.error('编辑景点失败', err);
    if (err.response && err.response.data && err.response.data.error) {
      alert(`编辑景点失败：${err.response.data.error}`);
    } else {
      alert(`编辑景点失败：${err.message}`);
    }
  }
});

// 删除景点
document.getElementById('delete-poi-btn').addEventListener('click', async () => {
  if (!confirm('确定要删除此景点吗？此操作不可撤销。')) {
    return;
  }

  const id = document.getElementById('edit-id').value;

  try {
    await axios.delete(`${API_BASE_URL}/pois/${id}`);

    // 重新加载所有景点数据
    await loadPOIs();

    // 关闭编辑窗口
    editPOIModal.classList.add('hidden');
    alert('景点已成功删除！');
  } catch (err) {
    console.error('删除景点失败', err);
    if (err.response && err.response.data && err.response.data.error) {
      alert(`删除景点失败：${err.response.data.error}`);
    } else {
      alert(`删除景点失败：${err.message}`);
    }
  }
});

// 创建图例函数
function createLegend() {
  const legendContainer = document.getElementById('legend-items');
  legendContainer.innerHTML = ''; // 清空现有内容

  // 遍历颜色映射对象创建图例项
  for (const type in typeColors) {
    const color = typeColors[type];

    // 创建图例项
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';

    // 创建颜色标记
    const colorMark = document.createElement('span');
    colorMark.className = 'legend-color';
    colorMark.style.backgroundColor = color;

    // 创建文字标签
    const textLabel = document.createElement('span');
    textLabel.className = 'legend-text';
    textLabel.textContent = type;
    // 组装图例项
    legendItem.appendChild(colorMark);
    legendItem.appendChild(textLabel);

    // 添加到容器
    legendContainer.appendChild(legendItem);
  }

  // 添加默认类型的图例项
  const defaultItem = document.createElement('div');
  defaultItem.className = 'legend-item';

  const defaultMark = document.createElement('span');
  defaultMark.className = 'legend-color';
  defaultMark.style.backgroundColor = defaultColor;

  const defaultLabel = document.createElement('span');
  defaultLabel.className = 'legend-text';
  defaultLabel.textContent = '其他类型';

  defaultItem.appendChild(defaultMark);
  defaultItem.appendChild(defaultLabel);

  legendContainer.appendChild(defaultItem);
}

// 在页面加载后创建图例
createLegend();




// 声明图表变量
let typeDistChart = null;
let typeRatingChart = null;

// 初始化图表函数
function initCharts() {
  // 初始化类型分布图表
  typeDistChart = echarts.init(document.getElementById('type-dist-chart'));

  // 初始化类型评分雷达图
  typeRatingChart = echarts.init(document.getElementById('type-rating-chart'));

  // 设置图表响应式
  window.addEventListener('resize', function () {
    typeDistChart.resize();
    typeRatingChart.resize();
  });

  // 更新图表数据
  updateCharts();
}

// 更新所有图表
async function updateCharts() {
  try {
    // 从API获取数据
    const response = await axios.get(`${API_BASE_URL}/pois`);
    const pois = response.data;

    // 更新类型分布图
    updateTypeDistChart(pois);

    // 更新类型评分雷达图
    updateTypeRatingChart(pois);
  } catch (err) {
    console.error('获取图表数据失败', err);
  }
}

// 更新类型分布饼图
function updateTypeDistChart(pois) {
  // 统计各类型景点数量
  const typeCount = {};
  pois.forEach(poi => {
    const type = poi.type || '未分类';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  // 准备饼图数据
  const pieData = Object.keys(typeCount).map(type => ({
    value: typeCount[type],
    name: type
  }));

  // 饼图配置
  const option = {
    title: {
      text: '景点类型分布',
      left: 'center',
      top: 0,
      textStyle: {
        fontSize: 16,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        fontSize: 10
      }
    },
    series: [
      {
        name: '景点类型',
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData
      }
    ],
    color: Object.values(typeColors).concat(defaultColor)
  };

  // 设置图表选项
  typeDistChart.setOption(option);
}

// 更新类型评分雷达图
function updateTypeRatingChart(pois) {
  // 按类型分组并计算平均评分
  const typeRatings = {};
  const typeCounts = {};

  pois.forEach(poi => {
    if (!poi.type) return;

    if (!typeRatings[poi.type]) {
      typeRatings[poi.type] = 0;
      typeCounts[poi.type] = 0;
    }

    typeRatings[poi.type] += parseFloat(poi.rating) || 0;
    typeCounts[poi.type]++;
  });

  // 计算平均评分
  const types = Object.keys(typeRatings);
  const avgRatings = types.map(type => {
    return {
      type: type,
      avgRating: (typeRatings[type] / typeCounts[type]).toFixed(1)
    };
  });

  // 雷达图配置
  const option = {
    title: {
      text: '各类型景点平均评分',
      left: 'center',
      top: 0,
      textStyle: {
        fontSize: 16,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return params.name + ': ' + params.value + '分';
      }
    },
    radar: {
      shape: 'circle',
      radius: '60%',
      center: ['50%', '50%'],
      indicator: types.map(type => ({
        name: type,
        max: 5
      })),
      splitNumber: 5,
      axisName: {
        color: '#333',
        fontSize: 10
      },
      splitLine: {
        lineStyle: {
          color: ['#ddd']
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      }
    },
    series: [
      {
        name: '平均评分',
        type: 'radar',
        data: [
          {
            value: avgRatings.map(item => item.avgRating),
            name: '平均评分',
            symbolSize: 6,
            lineStyle: {
              width: 2
            },
            areaStyle: {
              opacity: 0.3
            }
          }
        ]
      }
    ],
    color: ['#3498db']
  };

  // 设置图表选项
  typeRatingChart.setOption(option);
}

// 添加图表面板控制逻辑
function setupChartControls() {
  const chartsPanel = document.getElementById('charts-panel');
  const toggleBtn = document.getElementById('toggle-charts-btn');
  const typeDistTabBtn = document.getElementById('type-dist-tab');
  const typeRatingTabBtn = document.getElementById('type-rating-tab');
  const typeDistChartDiv = document.getElementById('type-dist-chart');
  const typeRatingChartDiv = document.getElementById('type-rating-chart');

  // 切换图表面板展开/折叠
  toggleBtn.addEventListener('click', function () {
    chartsPanel.classList.toggle('collapsed');

    // 延迟调整图表大小，确保过渡效果完成后图表大小正确
    setTimeout(() => {
      if (typeDistChartDiv && !typeDistChartDiv.classList.contains('hidden')) {
        typeDistChart.resize();
      }
      if (typeRatingChartDiv && !typeRatingChartDiv.classList.contains('hidden')) {
        typeRatingChart.resize();
      }
    }, 300);
  });

  // 切换到类型分布图
  typeDistTabBtn.addEventListener('click', function () {
    typeDistTabBtn.classList.add('active');
    typeRatingTabBtn.classList.remove('active');
    typeDistChartDiv.classList.remove('hidden');
    typeRatingChartDiv.classList.add('hidden');
    typeDistChart.resize();
  });

  // 切换到类型评分图
  typeRatingTabBtn.addEventListener('click', function () {
    typeRatingTabBtn.classList.add('active');
    typeDistTabBtn.classList.remove('active');
    typeRatingChartDiv.classList.remove('hidden');
    typeDistChartDiv.classList.add('hidden');
    typeRatingChart.resize();
  });
}

// 在登录成功后初始化图表
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
    // 加载铜陵市边界
    loadBoundary();

    // 初始化并设置图表
    initCharts();
    setupChartControls();
    // 确保边界按钮可见
    const toggleBoundaryBtn = document.getElementById('toggle-boundary-btn');
    if (toggleBoundaryBtn) {
      toggleBoundaryBtn.style.display = 'flex';
    }
  } else {
    alert('用户名或密码错误！');
  }
});

// 获取DOM元素
const dropdownToggle = document.getElementById('dropdown-toggle');

// 点击下拉箭头时显示所有景点
dropdownToggle.addEventListener('click', () => {
  // 切换按钮样式
  dropdownToggle.classList.toggle('active');

  // 获取搜索结果容器的当前显示状态
  const isVisible = searchResults.style.display === 'block';

  if (isVisible) {
    // 如果已经显示，则隐藏
    searchResults.style.display = 'none';
  } else {
    // 如果隐藏，则显示所有景点
    displayAllPOIs();
  }
});

// 显示所有景点的函数
function displayAllPOIs() {
  // 获取所有景点
  const features = vectorSource.getFeatures();

  // 如果没有景点，不显示下拉菜单
  if (features.length === 0) {
    searchResults.style.display = 'none';
    return;
  }

  // 清空当前结果
  searchResults.innerHTML = '';

  // 按名称排序景点
  features.sort((a, b) => {
    const nameA = a.getProperties().name || '';
    const nameB = b.getProperties().name || '';
    return nameA.localeCompare(nameB, 'zh-CN');
  });

  // 生成景点列表
  features.forEach(feature => {
    const props = feature.getProperties();

    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.innerHTML = `
      <div class="search-result-name">${props.name}</div>
      <div class="search-result-info">
        <span class="search-result-type">${props.type || '未分类'}</span>
        <span class="search-result-rating">★ ${props.rating || 'N/A'}</span>
      </div>
    `;

    // 点击结果项时，跳转到该景点
    resultItem.addEventListener('click', () => {
      const geometry = feature.getGeometry();
      const coordinates = geometry.getCoordinates();
      // 获取图片路径
      const imagePath = getPOIImagePath({
        id: props.id,
        name: props.name
      });

      // 跳转到该景点
      map.getView().animate({
        center: coordinates,
        zoom: 12,
        duration: 1000
      });

      // 显示弹出框
      const ratingStars = '★'.repeat(Math.floor(props.rating)) +
        (props.rating % 1 >= 0.5 ? '½' : '') +
        '☆'.repeat(5 - Math.ceil(props.rating));


      const content = `
      <div class="popup-header">
        <h4>${props.name}</h4>
        <div class="rating" title="${props.rating}分">${ratingStars}</div>
      </div>
      <div class="popup-image">
        <img src="${imagePath}" 
             alt="${props.name}" 
             onerror="this.src='./public/image/default.jpg'; console.log('图片加载失败，ID: ${props.id}, 名称: ${props.name}');">
      </div>
        <div class="popup-body">
          <p class="description">${props.description || ''}</p>
          <div class="info-grid">
            <div class="info-item">
              <i class="fas fa-tag"></i>
              <span>${props.type || '未知'}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${props.address || '未知'}</span>
            </div>
          </div>
          <div class="popup-actions">
            <button onclick="editPOI(${props.id})" class="action-btn">
              <i class="fas fa-edit"></i> 编辑
            </button>
          </div>
        </div>
      `;

      function getPOIImagePath(poi) {
        // 尝试多种可能的图片命名方式
        const possibleNames = [
          `./public/image/${poi.id}.jpg`,                        // 使用ID直接匹配
          `./public/image/poi_${poi.id}.jpg`,                    // 使用poi_ID格式
          `./public/image/${encodeURIComponent(poi.name)}.jpg`   // 使用名称匹配
        ];

        return possibleNames[0]; // 默认使用第一种命名方式
      }


      popupContent.innerHTML = content;
      popup.setPosition(coordinates);

      // 隐藏下拉菜单
      searchResults.style.display = 'none';
      dropdownToggle.classList.remove('active');
    });

    searchResults.appendChild(resultItem);
  });

  // 显示下拉菜单
  searchResults.style.display = 'block';
}

// 优化现有代码：点击页面其他地方时关闭下拉菜单
document.addEventListener('click', (event) => {
  // 如果点击的不是搜索相关元素，则关闭下拉菜单
  if (!event.target.closest('.search-container')) {
    searchResults.style.display = 'none';
    dropdownToggle.classList.remove('active');
  }
});

// 在初始加载景点后，可以调用这个函数以确保下拉功能正常工作
function initializeSearchDropdown() {
  // 确保dropdownToggle可用
  if (dropdownToggle && typeof displayAllPOIs === 'function') {
    // 已经在上面定义了事件监听器
    console.log('下拉搜索功能已初始化');
  }
}

// 创建铜陵市边界图层
let tlBoundarySource = null;
let tlBoundaryLayer = null;

// 加载铜陵市边界
async function loadBoundary() {
  try {
    // 从公共目录加载GeoJSON文件
    const response = await fetch('./public/tl.geojson');
    const geojsonData = await response.json();

    // 创建边界数据源
    tlBoundarySource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        // 确保坐标系正确
        dataProjection: 'EPSG:4490',  // GeoJSON使用的是EPSG:4490坐标系
        featureProjection: 'EPSG:4326' // 地图使用的是EPSG:4326坐标系
      })
    });

    // 创建边界图层
    tlBoundaryLayer = new VectorLayer({
      title: '铜陵市边界',
      source: tlBoundarySource,
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(52, 152, 219, 0.9)',
          width: 2.5,
          lineCap: 'round',
          lineJoin: 'round'
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 0, 0)' // 完全透明
        })
      }),
      zIndex: 1 // 确保边界在底图之上，但在POI图层之下
    });

    // 将边界图层添加到地图
    map.addLayer(tlBoundaryLayer);

    // 可选：调整视图到边界范围
    const extent = tlBoundarySource.getExtent();
    map.getView().fit(extent, {
      padding: [50, 50, 50, 50],
      duration: 1000
    });

  } catch (err) {
    console.error('加载铜陵市边界失败', err);
  }
}
// 在JavaScript中添加控制逻辑
// 在文件的适当位置添加以下代码
document.addEventListener('DOMContentLoaded', function () {
  // 确保元素存在
  const toggleBoundaryBtn = document.getElementById('toggle-boundary-btn');
  if (toggleBoundaryBtn) {
    toggleBoundaryBtn.addEventListener('click', () => {
      if (tlBoundaryLayer) {
        const visible = tlBoundaryLayer.getVisible();
        tlBoundaryLayer.setVisible(!visible);

        // 更新按钮样式
        if (!visible) {
          toggleBoundaryBtn.classList.add('active');
        } else {
          toggleBoundaryBtn.classList.remove('active');
        }
      }
    });
  } else {
    console.error('边界切换按钮未找到');
  }
});



// 在地图视图变化时更新标签
map.getView().on('change:resolution', function () {
  vectorLayer.changed();
});

// 底图切换逻辑 - 确保在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  const vectorMapBtn = document.getElementById('vector-map-btn');
  const imageMapBtn = document.getElementById('image-map-btn');
  const terrainMapBtn = document.getElementById('terrain-map-btn');
  
  // 切换到矢量地图
  vectorMapBtn.addEventListener('click', function() {
    // 激活当前按钮
    vectorMapBtn.classList.add('active');
    imageMapBtn.classList.remove('active');
    terrainMapBtn.classList.remove('active');
    
    // 显示矢量地图和对应标注
    baseMaps.vector.setVisible(true);
    baseMaps.image.setVisible(false);
    baseMaps.terrain.setVisible(false);
    
    // 切换标注图层
    annotationLayer.setVisible(true);
    imageAnnotationLayer.setVisible(false);
  });
  
  // 切换到影像地图
  imageMapBtn.addEventListener('click', function() {
    // 激活当前按钮
    vectorMapBtn.classList.remove('active');
    imageMapBtn.classList.add('active');
    terrainMapBtn.classList.remove('active');
    
    // 显示影像地图和对应标注
    baseMaps.vector.setVisible(false);
    baseMaps.image.setVisible(true);
    baseMaps.terrain.setVisible(false);
    
    // 切换标注图层
    annotationLayer.setVisible(false);
    imageAnnotationLayer.setVisible(true);
  });
  
  // 切换到地形地图
  terrainMapBtn.addEventListener('click', function() {
    // 激活当前按钮
    vectorMapBtn.classList.remove('active');
    imageMapBtn.classList.remove('active');
    terrainMapBtn.classList.add('active');
    
    // 显示地形地图和对应标注
    baseMaps.vector.setVisible(false);
    baseMaps.image.setVisible(false);
    baseMaps.terrain.setVisible(true);
    
    // 切换标注图层
    annotationLayer.setVisible(true); // 地形图使用普通标注
    imageAnnotationLayer.setVisible(false);
  });
});

// 创建全局变量
let is3DMode = false;
let viewer; // Cesium viewer

// 初始化Cesium
function initCesium() {
  // 配置Cesium访问令牌 (需要从 https://cesium.com/ion/ 获取)
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZTNkOTAzNS1iZTExLTQ2NmEtYjVlMy1kODM3NzM0NjEzZWYiLCJpZCI6MzAxNzg5LCJpYXQiOjE3NDcwNjI1NTZ9.q-qZS-9FS-T2XlQ5XpK1LNXKEY2vNGd9Bpk6200SLTQ';
  
  // 创建Cesium viewer
  viewer = new Cesium.Viewer('cesium-container', {
    terrainProvider: Cesium.createWorldTerrain(),
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false
  });
  
  // 默认飞到铜陵市位置
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      initialView.center[0], // 经度
      initialView.center[1], // 纬度
      15000 // 高度（米）
    ),
    orientation: {
      heading: 0.0,
      pitch: -Cesium.Math.PI_OVER_FOUR,
      roll: 0.0
    }
  });
  
  // 隐藏Cesium的Logo和动态帮助信息
  viewer._cesiumWidget._creditContainer.style.display = 'none';
}

// 将OpenLayers的POI数据添加到Cesium地图
function addPOIsToCesium(pois) {
  // 清除现有实体
  viewer.entities.removeAll();
  
  pois.forEach(poi => {
    // 添加景点标记
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat),
      billboard: {
        image: createPinForPOI(poi.type),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        scale: 0.8
      },
      label: {
        text: poi.name,
        font: '14px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -30)
      },
      // 存储POI数据用于点击事件
      properties: {
        id: poi.id,
        name: poi.name,
        type: poi.type,
        description: poi.description,
        rating: poi.rating,
        address: poi.address
      }
    });
  });
}

// 为景点类型生成不同的图标
function createPinForPOI(type) {
  // 创建一个Canvas元素来绘制自定义图标
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const context = canvas.getContext('2d');
  
  // 绘制圆形标记
  context.beginPath();
  context.arc(20, 20, 15, 0, 2 * Math.PI);
  context.fillStyle = getColorByType(type);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = '#FFFFFF';
  context.stroke();
  
  // 返回生成的图标URL
  return canvas.toDataURL();
}

// 添加二三维切换事件监听
function initDimensionToggle() {
  const toggleBtn = document.getElementById('toggle-dimension-btn');
  const mapContainer = document.getElementById('map');
  const cesiumContainer = document.getElementById('cesium-container');
  
  // 初始化Cesium
  initCesium();
  
  toggleBtn.addEventListener('click', function() {
    if (is3DMode) {
      // 切换到二维
      cesiumContainer.classList.add('fade-out');
      setTimeout(() => {
        cesiumContainer.classList.add('hidden');
        cesiumContainer.classList.remove('fade-out');
        mapContainer.classList.remove('hidden');
        mapContainer.classList.add('fade-in');
      }, 500);
      
      toggleBtn.innerHTML = '<i class="fas fa-cube"></i><span>3D</span>';
      toggleBtn.classList.remove('active');
      is3DMode = false;
    } else {
      // 切换到三维
      mapContainer.classList.add('fade-out');
      setTimeout(() => {
        mapContainer.classList.add('hidden');
        mapContainer.classList.remove('fade-out');
        cesiumContainer.classList.remove('hidden');
        cesiumContainer.classList.add('fade-in');
        
        // 更新三维地图中的POI数据
        updateCesiumPOIs();
      }, 500);
      
      toggleBtn.innerHTML = '<i class="fas fa-map"></i><span>2D</span>';
      toggleBtn.classList.add('active');
      is3DMode = true;
    }
  });
}

// 更新三维地图中的POI数据
function updateCesiumPOIs() {
  // 获取当前显示的POI数据
  const features = vectorSource.getFeatures();
  const pois = features.map(feature => {
    const coords = feature.getGeometry().getCoordinates();
    return {
      id: feature.get('id'),
      name: feature.get('name'),
      type: feature.get('type'),
      description: feature.get('description'),
      rating: feature.get('rating'),
      address: feature.get('address'),
      lon: coords[0],
      lat: coords[1]
    };
  });
  
  // 添加到Cesium地图
  addPOIsToCesium(pois);
}

// 在文档加载完成后初始化二三维切换功能
document.addEventListener('DOMContentLoaded', function() {
  // 在地图初始化之后调用
  initDimensionToggle();
});