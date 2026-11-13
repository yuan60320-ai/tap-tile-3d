// 所有可调参数的单一来源。面板根据 SCHEMA 生成控件,渲染与玩法模块读取 DEFAULTS。
// type: range | color | bool | text(可加 multiline: true 显示多行) | action

export const SCHEMA = [
  {
    group: '关卡',
    items: [
      { key: 'seed', label: '随机种子', type: 'range', min: 1, max: 99999, step: 1, value: 2026 },
      { key: 'tileTypes', label: '图案种类数', type: 'range', min: 3, max: 16, step: 1, value: 8 },
      { key: 'tripletCount', label: '三连组数量', type: 'range', min: 4, max: 60, step: 1, value: 24 },
      { key: 'layers', label: '最大堆叠层数', type: 'range', min: 1, max: 6, step: 1, value: 4 },
      { key: 'boardCols', label: '牌堆列数', type: 'range', min: 4, max: 12, step: 1, value: 8 },
      { key: 'boardRows', label: '牌堆行数', type: 'range', min: 4, max: 12, step: 1, value: 7 },
      { key: 'gap', label: '牌间间隙', type: 'range', min: 0, max: 0.5, step: 0.01, value: 0.08 },
      { key: 'layerOffset', label: '层间错位', type: 'range', min: 0, max: 0.6, step: 0.01, value: 0.25 },
      { key: 'jitter', label: '随机抖动', type: 'range', min: 0, max: 0.3, step: 0.01, value: 0.05 },
      { key: 'regenerate', label: '重新生成关卡', type: 'action' },
    ],
  },
  {
    group: '收纳槽',
    items: [
      { key: 'trayCapacity', label: '槽位数量', type: 'range', min: 5, max: 9, step: 1, value: 7 },
      { key: 'trayX', label: '位置 X', type: 'range', min: -10, max: 10, step: 0.1, value: 0 },
      { key: 'trayY', label: '位置 Y(离地高度)', type: 'range', min: -1, max: 4, step: 0.05, value: 0 },
      { key: 'trayZ', label: '位置 Z(前后)', type: 'range', min: -4, max: 14, step: 0.1, value: 5 },
      { key: 'trayWidth', label: '宽度', type: 'range', min: 4, max: 24, step: 0.1, value: 12 },
      { key: 'trayDepth', label: '深度(前后尺寸)', type: 'range', min: 0.8, max: 6, step: 0.05, value: 2.4 },
      { key: 'trayThickness', label: '厚度', type: 'range', min: 0.05, max: 1.5, step: 0.01, value: 0.35 },
      { key: 'trayPadding', label: '两侧留白', type: 'range', min: 0, max: 1.5, step: 0.05, value: 0.3 },
      { key: 'trayRound', label: '圆角', type: 'range', min: 0, max: 0.5, step: 0.01, value: 0.15 },
      { key: 'trayTileScale', label: '槽内牌大小(占槽位比例)', type: 'range', min: 0.3, max: 1, step: 0.01, value: 0.62 },
      { key: 'trayColor', label: '收纳条颜色', type: 'color', value: '#b3262d' },
      { key: 'slotColor', label: '槽位凹坑颜色', type: 'color', value: '#7a1419' },
    ],
  },
  {
    group: '牌面材质',
    items: [
      { key: 'tileWidth', label: '牌宽', type: 'range', min: 0.5, max: 1.5, step: 0.01, value: 1 },
      { key: 'tileThickness', label: '牌厚度', type: 'range', min: 0.1, max: 0.8, step: 0.01, value: 0.42 },
      { key: 'bevel', label: '边缘圆角', type: 'range', min: 0, max: 0.3, step: 0.01, value: 0.12 },
      { key: 'tileColor', label: '牌底色', type: 'color', value: '#f5f2ea' },
      { key: 'sideColor', label: '侧边颜色', type: 'color', value: '#e9e2d0' },
      { key: 'roughness', label: '粗糙度', type: 'range', min: 0, max: 1, step: 0.01, value: 0.35 },
      { key: 'metalness', label: '金属度', type: 'range', min: 0, max: 1, step: 0.01, value: 0.05 },
      { key: 'clearcoat', label: '清漆光泽', type: 'range', min: 0, max: 1, step: 0.01, value: 0.6 },
      { key: 'iconScale', label: '图案大小', type: 'range', min: 0.3, max: 1, step: 0.01, value: 0.72 },
    ],
  },
  {
    group: '本地资源',
    items: [
      { key: 'bgImage', label: '背景图片路径或网址', type: 'text', value: '' },
      { key: 'iconPaths', label: '牌面图案(每行一个,按种类顺序)', type: 'text', multiline: true, value: '' },
      { key: 'pickBgFile', label: '选择本地背景图', type: 'action' },
      { key: 'pickIconFiles', label: '选择本地图案(多选,按顺序)', type: 'action' },
      { key: 'clearAssets', label: '清除图片设置(恢复默认)', type: 'action' },
    ],
  },
  {
    group: '光照与阴影',
    items: [
      { key: 'ambient', label: '环境光强度', type: 'range', min: 0, max: 3, step: 0.01, value: 1.1 },
      { key: 'sun', label: '主光强度', type: 'range', min: 0, max: 4, step: 0.01, value: 2.2 },
      { key: 'sunX', label: '主光方向 X', type: 'range', min: -10, max: 10, step: 0.1, value: 4 },
      { key: 'sunY', label: '主光方向 Y', type: 'range', min: 2, max: 20, step: 0.1, value: 10 },
      { key: 'sunZ', label: '主光方向 Z', type: 'range', min: -10, max: 10, step: 0.1, value: 6 },
      { key: 'shadows', label: '开启阴影', type: 'bool', value: true },
      { key: 'shadowSoft', label: '阴影模糊', type: 'range', min: 0, max: 8, step: 0.5, value: 3 },
    ],
  },
  {
    group: '背景',
    items: [
      { key: 'skyTop', label: '天空顶色', type: 'color', value: '#9cc9ec' },
      { key: 'skyBottom', label: '天空底色', type: 'color', value: '#f4f8ff' },
      { key: 'groundColor', label: '地面颜色', type: 'color', value: '#dfe8f3' },
      { key: 'fogDensity', label: '雾气浓度', type: 'range', min: 0, max: 0.1, step: 0.001, value: 0.012 },
    ],
  },
  {
    group: '镜头',
    items: [
      { key: 'fov', label: '视野角度', type: 'range', min: 20, max: 80, step: 1, value: 42 },
      { key: 'camHeight', label: '镜头高度', type: 'range', min: 6, max: 30, step: 0.1, value: 15 },
      { key: 'camDistance', label: '镜头距离', type: 'range', min: 6, max: 30, step: 0.1, value: 12 },
      { key: 'camTilt', label: '俯视倾角', type: 'range', min: 0, max: 45, step: 0.5, value: 12 },
    ],
  },
  {
    group: '动画与音效',
    items: [
      { key: 'moveDuration', label: '飞入收纳槽时长(ms)', type: 'range', min: 80, max: 800, step: 10, value: 320 },
      { key: 'hopHeight', label: '三张牌跳起高度', type: 'range', min: 0, max: 3, step: 0.05, value: 1.1 },
      { key: 'matchDuration', label: '碰撞消除总时长(ms)', type: 'range', min: 300, max: 1500, step: 10, value: 750 },
      { key: 'effectSize', label: '消除特效大小', type: 'range', min: 0.3, max: 3, step: 0.05, value: 1.2 },
      { key: 'matchEffect', label: '消除粒子特效', type: 'bool', value: true },
      { key: 'particleCount', label: '粒子数量', type: 'range', min: 0, max: 80, step: 1, value: 36 },
      { key: 'soundOn', label: '开启音效', type: 'bool', value: true },
      { key: 'volume', label: '音量', type: 'range', min: 0, max: 1, step: 0.01, value: 0.5 },
      { key: 'autoSolveSpeed', label: '自动解谜速度(ms/步)', type: 'range', min: 100, max: 2000, step: 50, value: 600 },
      { key: 'autoSolve', label: '自动解谜通关', type: 'action' },
    ],
  },
  {
    group: '存档',
    items: [
      { key: 'exportJson', label: '导出参数 JSON', type: 'action' },
      { key: 'importJson', label: '导入参数 JSON', type: 'action' },
      { key: 'resetDefaults', label: '恢复默认参数', type: 'action' },
    ],
  },
];

export const DEFAULTS = Object.fromEntries(
  SCHEMA.flatMap((g) => g.items.filter((i) => i.type !== 'action').map((i) => [i.key, i.value]))
);
