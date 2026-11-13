import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { SCHEMA, DEFAULTS } from './config.js';

const ICONS = ['🏮', '💰', '🎭', '🐼', '🐉', '🏺', '🌸', '🦁', '🍵', '🏯', '🧧', '🎋', '🐟', '🎏', '🪭', '🀄'];
const LAYOUT_KEYS = new Set(['seed', 'tileTypes', 'tripletCount', 'layers', 'boardCols', 'boardRows', 'trayCapacity']);
const MESH_KEYS = new Set(['tileWidth', 'tileThickness', 'bevel', 'gap', 'layerOffset', 'jitter', 'iconScale', 'tileColor', 'sideColor', 'roughness', 'metalness', 'clearcoat']);
const LIGHT_KEYS = new Set(['ambient', 'sun', 'sunX', 'sunY', 'sunZ', 'shadows', 'shadowSoft']);
const CAMERA_KEYS = new Set(['fov', 'camHeight', 'camDistance', 'camTilt']);
const BG_KEYS = new Set(['skyTop', 'skyBottom', 'groundColor', 'trayColor', 'fogDensity']);
const NODE_LIMIT = 60000;
const SOLVE_LIMIT = Symbol('solve-limit');

const params = { ...DEFAULTS };
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const panelEl = document.getElementById('panel');

function setStatus(text) {
  statusEl.textContent = text;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// 布局:每个格子堆叠若干张牌,牌只能从栈顶取。
function buildLayout(p, seed) {
  const rnd = mulberry32(seed);
  const cols = p.boardCols;
  const rows = p.boardRows;
  const layers = p.layers;
  const cells = cols * rows;
  const capacity = cells * layers;
  const n = Math.min(p.tripletCount * 3, capacity - (capacity % 3));

  const heights = new Array(cells).fill(0);
  let total = 0;
  while (total < n) {
    const i = Math.floor(rnd() * cells);
    if (heights[i] < layers) {
      heights[i]++;
      total++;
    }
  }

  const types = [];
  const triplets = n / 3;
  for (let k = 0; k < triplets; k++) {
    const t = k % p.tileTypes;
    types.push(t, t, t);
  }
  shuffle(types, rnd);

  const stacks = Array.from({ length: cells }, () => []);
  const tiles = [];
  let ti = 0;
  for (let c = 0; c < cells; c++) {
    for (let l = 0; l < heights[c]; l++) {
      const tile = { id: tiles.length, cell: c, layer: l, type: types[ti++], rx: rnd() * 2 - 1, rz: rnd() * 2 - 1, mesh: null, removed: false };
      stacks[c].push(tile);
      tiles.push(tile);
    }
  }
  return { cols, rows, stacks, tiles };
}

// 深度优先搜索:模拟收纳规则(同图案凑够 3 张即消除,收纳槽超过容量失败)。
// 返回按顺序取牌的格子序列;找不到可解路径返回 null。
function solveLayout(stacks, cap, T) {
  const C = stacks.length;
  const heights = stacks.map((s) => s.length);
  const tray = new Array(T).fill(0);
  let trayLen = 0;
  let nodes = 0;
  const seen = new Set();
  const path = [];
  const total = heights.reduce((s, h) => s + h, 0);
  const types = stacks.map((s) => s.map((tile) => tile.type));

  function dfs(left) {
    if (left === 0) return true;
    if (++nodes > NODE_LIMIT) throw SOLVE_LIMIT;
    const key = String.fromCharCode(...heights) + '|' + tray.join(',');
    if (seen.has(key)) return false;
    seen.add(key);

    const cand = [];
    for (let c = 0; c < C; c++) {
      if (heights[c] > 0) cand.push([c, tray[types[c][heights[c] - 1]]]);
    }
    cand.sort((a, b) => b[1] - a[1]);

    for (const [c] of cand) {
      const t = types[c][heights[c] - 1];
      heights[c]--;
      tray[t]++;
      trayLen++;
      const matched = tray[t] === 3;
      if (matched) {
        tray[t] = 0;
        trayLen -= 3;
      }
      if (trayLen <= cap) {
        path.push(c);
        if (dfs(left - 1)) return true;
        path.pop();
      }
      if (matched) {
        tray[t] = 3;
        trayLen += 3;
      }
      tray[t]--;
      trayLen--;
      heights[c]++;
    }
    return false;
  }

  try {
    return dfs(total) ? path : null;
  } catch (e) {
    if (e === SOLVE_LIMIT) return null;
    throw e;
  }
}

// three.js 场景
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 300);

const ambient = new THREE.AmbientLight(0xffffff, 1);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
scene.add(ambient, sun, sun.target);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: params.groundColor })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tweens = [];
const particles = [];
let level = null;
let heights = [];
let tray = [];
let onBoard = 0;
let busy = false;
let autoRunning = false;
let gameOver = false;
let ownedRes = [];
let boardMeshes = [];
let audioCtx = null;

function applyLights() {
  ambient.intensity = params.ambient;
  sun.intensity = params.sun;
  sun.position.set(params.sunX, params.sunY, params.sunZ);
  sun.castShadow = params.shadows;
  sun.shadow.radius = params.shadowSoft;
  for (const tile of level?.tiles ?? []) {
    if (tile.mesh) tile.mesh.castShadow = params.shadows;
  }
}

function applyCamera() {
  camera.fov = params.fov;
  camera.aspect = window.innerWidth / window.innerHeight;
  const radius = Math.hypot(params.camHeight, params.camDistance);
  const elevation = Math.atan2(params.camHeight, params.camDistance) + THREE.MathUtils.degToRad(params.camTilt);
  camera.position.set(0, radius * Math.sin(elevation), radius * Math.cos(elevation));
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function applyBackground() {
  document.body.style.background = `linear-gradient(${params.skyTop}, ${params.skyBottom})`;
  ground.material.color.set(params.groundColor);
  trayEl.style.background = params.trayColor;
  scene.fog = new THREE.FogExp2(params.skyBottom, params.fogDensity);
}

function iconTexture(emoji, bg, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.font = `${Math.round(230 * scale)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 128, 136);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function clearBoard() {
  for (const mesh of boardMeshes) scene.remove(mesh);
  boardMeshes = [];
  for (const r of ownedRes) r.dispose();
  ownedRes = [];
}

function rebuildMeshes() {
  if (!level) return;
  clearBoard();

  const tw = params.tileWidth;
  const th = params.tileThickness;
  const step = tw + params.gap;
  const geo = new RoundedBoxGeometry(tw, th, tw, 3, Math.max(0.001, params.bevel * tw));
  const sideMat = new THREE.MeshPhysicalMaterial({
    color: params.sideColor,
    roughness: params.roughness,
    metalness: params.metalness,
    clearcoat: params.clearcoat,
  });
  const topMats = ICONS.slice(0, params.tileTypes).map(
    (emoji) =>
      new THREE.MeshPhysicalMaterial({
        map: iconTexture(emoji, params.tileColor, params.iconScale),
        roughness: params.roughness,
        metalness: params.metalness,
        clearcoat: params.clearcoat,
      })
  );
  ownedRes.push(geo, sideMat, ...topMats);

  for (const tile of level.tiles) {
    if (tile.removed) continue;
    const mesh = new THREE.Mesh(geo, [sideMat, sideMat, topMats[tile.type], sideMat, sideMat, sideMat]);
    const col = tile.cell % level.cols;
    const row = Math.floor(tile.cell / level.cols);
    const dir = tile.layer % 2 ? 1 : -1;
    mesh.position.set(
      (col - (level.cols - 1) / 2) * step + dir * params.layerOffset * tw * 0.5 + tile.rx * params.jitter * step * 0.5,
      tile.layer * th + th / 2,
      (row - (level.rows - 1) / 2) * step + tile.rz * params.jitter * step * 0.5
    );
    mesh.castShadow = params.shadows;
    mesh.receiveShadow = true;
    mesh.userData.tile = tile;
    tile.mesh = mesh;
    scene.add(mesh);
    boardMeshes.push(mesh);
  }
}

function playTone(freq, dur, vol = 1) {
  if (!params.soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  gain.gain.value = params.volume * 0.25 * vol;
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function spawnParticles(pos, type) {
  const count = params.matchEffect ? params.particleCount : 0;
  const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((type / ICONS.length + Math.random() * 0.1) % 1, 0.8, 0.6) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({
      mesh,
      v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6),
      life: 0.9,
    });
  }
}

function renderTray() {
  trayEl.innerHTML = '';
  for (let i = 0; i < params.trayCapacity; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (tray[i] !== undefined) slot.textContent = ICONS[tray[i]];
    trayEl.appendChild(slot);
  }
}

function topTile(cell) {
  return level.stacks[cell][heights[cell] - 1];
}

function resolveTray(pos, type) {
  if (tray.filter((t) => t === type).length === 3) {
    tray = tray.filter((t) => t !== type);
    spawnParticles(pos, type);
    playTone(880, 0.18, 1.2);
  }
  if (tray.length > params.trayCapacity) {
    gameOver = true;
    autoRunning = false;
    setStatus('收纳槽已满,失败。点"重新生成关卡"再来一局。');
  } else if (onBoard === 0 && tray.length === 0) {
    setStatus('通关!');
  }
  renderTray();
}

function takeTile(tile) {
  busy = true;
  heights[tile.cell]--;
  tile.removed = true;
  onBoard--;
  playTone(520, 0.08);
  const mesh = tile.mesh;
  const from = mesh.position.clone();
  const to = from.clone().add(new THREE.Vector3(0, 6, 0));
  tweens.push({
    mesh,
    from,
    to,
    t0: performance.now(),
    dur: Math.max(1, params.moveDuration),
    done: () => {
      scene.remove(mesh);
      tray.push(tile.type);
      busy = false;
      resolveTray(to, tile.type);
    },
  });
}

function onPointerDown(event) {
  if (!level || busy || autoRunning || gameOver) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = level.tiles.filter((t) => !t.removed && t.mesh).map((t) => t.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return;
  const tile = hits[0].object.userData.tile;
  if (heights[tile.cell] - 1 !== tile.layer) {
    setStatus('这张牌被压住了,先取上面的牌。');
    return;
  }
  takeTile(tile);
}

function newLevel() {
  autoRunning = false;
  gameOver = false;
  tray = [];
  let found = null;
  for (let k = 0; k < 30 && !found; k++) {
    const seed = params.seed + k;
    const layout = buildLayout(params, seed);
    const solution = solveLayout(layout.stacks, params.trayCapacity, params.tileTypes);
    if (solution) found = { layout, solution, seed };
  }
  if (!found) {
    level = null;
    clearBoard();
    setStatus('未找到可解布局。请增大收纳槽、减少层数或三连组数量后重试。');
    renderTray();
    return;
  }
  level = found.layout;
  level.solution = found.solution;
  heights = level.stacks.map((s) => s.length);
  onBoard = level.tiles.length;
  rebuildMeshes();
  applyLights();
  renderTray();
  const note = found.seed === params.seed ? '' : `(种子 ${params.seed} 不可解,改用 ${found.seed})`;
  setStatus(`关卡已生成${note},共 ${onBoard} 张牌,已验证可解。`);
}

function startAuto() {
  if (!level || gameOver) return;
  if (tray.length || onBoard !== level.tiles.length) {
    setStatus('自动解谜需要从头开始,请先点"重新生成关卡"。');
    return;
  }
  autoRunning = true;
  let i = 0;
  const step = () => {
    if (!autoRunning) return;
    if (busy) {
      setTimeout(step, 40);
      return;
    }
    if (gameOver) return;
    if (i >= level.solution.length) {
      autoRunning = false;
      if (!gameOver) setStatus('自动解谜完成,已通关。');
      return;
    }
    const tile = topTile(level.solution[i++]);
    takeTile(tile);
    setTimeout(step, params.autoSolveSpeed);
  };
  setStatus('自动解谜中…');
  step();
}

function exportParams() {
  const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tap-tile-3d-params.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importParams() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      for (const key of Object.keys(DEFAULTS)) {
        if (key in data && typeof data[key] === typeof DEFAULTS[key]) params[key] = data[key];
      }
      buildPanel();
      applyAll();
      newLevel();
    } catch (e) {
      setStatus('导入失败:不是有效的参数 JSON。');
    }
  };
  input.click();
}

function resetParams() {
  Object.assign(params, DEFAULTS);
  buildPanel();
  applyAll();
  newLevel();
}

const ACTIONS = {
  regenerate: () => newLevel(),
  autoSolve: () => startAuto(),
  exportJson: exportParams,
  importJson: importParams,
  resetDefaults: resetParams,
};

function applyAll() {
  applyBackground();
  applyCamera();
  applyLights();
  rebuildMeshes();
}

let layoutTimer = null;
function setParam(key, value) {
  params[key] = value;
  if (LAYOUT_KEYS.has(key)) {
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(newLevel, 250);
  } else if (MESH_KEYS.has(key)) {
    rebuildMeshes();
  } else if (LIGHT_KEYS.has(key)) {
    applyLights();
  } else if (CAMERA_KEYS.has(key)) {
    applyCamera();
  } else if (BG_KEYS.has(key)) {
    applyBackground();
  }
}

function buildPanel() {
  panelEl.innerHTML = '';
  for (const group of SCHEMA) {
    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.textContent = group.group;
    section.appendChild(title);
    for (const item of group.items) {
      const row = document.createElement('div');
      row.className = `row ${item.type}`;
      const label = document.createElement('span');
      label.textContent = item.label;
      row.appendChild(label);

      if (item.type === 'action') {
        const btn = document.createElement('button');
        btn.textContent = item.label;
        btn.onclick = ACTIONS[item.key];
        row.replaceChildren(btn);
      } else if (item.type === 'range') {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step;
        input.value = params[item.key];
        const out = document.createElement('output');
        out.textContent = params[item.key];
        input.oninput = () => {
          const v = Number(input.value);
          out.textContent = v;
          setParam(item.key, v);
        };
        row.append(input, out);
      } else if (item.type === 'color') {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = params[item.key];
        input.oninput = () => setParam(item.key, input.value);
        row.appendChild(input);
      } else if (item.type === 'bool') {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = params[item.key];
        input.onchange = () => setParam(item.key, input.checked);
        row.appendChild(input);
      }
      section.appendChild(row);
    }
    panelEl.appendChild(section);
  }
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
renderer.domElement.addEventListener('pointerdown', onPointerDown);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    const k = Math.min(1, (now - tw.t0) / tw.dur);
    const e = k * k * (3 - 2 * k);
    tw.mesh.position.lerpVectors(tw.from, tw.to, e);
    tw.mesh.scale.setScalar(1 - e * 0.9);
    if (k >= 1) {
      tweens.splice(i, 1);
      tw.done();
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.v.y -= 9 * dt;
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.rotation.x += dt * 6;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

applyBackground();
applyCamera();
applyLights();
buildPanel();
newLevel();
requestAnimationFrame(frame);
if (new URLSearchParams(location.search).has('autosolve')) setTimeout(startAuto, 500);
