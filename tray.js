import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SLIDE_MS = 220;
const FLY_ARC = 1.5;
const smooth = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

// 收纳槽:3D 收纳条 + 槽位凹坑 + 槽内的整张牌。所有飞入、碰撞、消除动画都在这里。
export function createTray(scene, params, playTone) {
  const group = new THREE.Group();
  scene.add(group);

  const baseMat = new THREE.MeshStandardMaterial({ color: params.trayColor, roughness: 0.5, metalness: 0.1 });
  const pocketMat = new THREE.MeshStandardMaterial({ color: params.slotColor, roughness: 0.8 });
  const particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const flashGeo = new THREE.SphereGeometry(0.5, 16, 12);
  const ringGeo = new THREE.RingGeometry(0.4, 0.5, 40);

  const items = []; // 按槽位顺序排列:{ type, mesh }
  const tweens = [];
  const fx = []; // { objs, life, age, step }
  let baseMesh = null;
  let pocketGeo = null;
  const pockets = [];
  let slotCount = params.trayCapacity;
  let slotStep = 1;

  const tileScale = () => params.trayTileScale * slotStep / params.tileWidth;
  const slotX = (i) => params.trayX + (i - (slotCount - 1) / 2) * slotStep;
  const restPos = (i, out = new THREE.Vector3()) =>
    out.set(slotX(i), params.trayY + params.trayThickness + (params.tileThickness * tileScale()) / 2, params.trayZ);

  function tween(dur, update, done) {
    tweens.push({ t0: performance.now(), dur: Math.max(1, dur), update, done });
  }

  function snapAll() {
    items.forEach((it, i) => {
      restPos(i, it.mesh.position);
      it.mesh.scale.setScalar(tileScale());
      it.mesh.rotation.set(0, 0, 0);
    });
  }

  function rebuild() {
    slotCount = params.trayCapacity;
    slotStep = (params.trayWidth - 2 * params.trayPadding) / slotCount;

    if (baseMesh) {
      group.remove(baseMesh);
      baseMesh.geometry.dispose();
    }
    for (const p of pockets) group.remove(p);
    pockets.length = 0;
    pocketGeo?.dispose();

    const r = Math.max(0.001, Math.min(params.trayRound, params.trayThickness * 0.45, params.trayDepth * 0.45));
    baseMesh = new THREE.Mesh(
      new RoundedBoxGeometry(params.trayWidth, params.trayThickness, params.trayDepth, 3, r),
      baseMat
    );
    baseMesh.position.set(params.trayX, params.trayY + params.trayThickness / 2, params.trayZ);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    pocketGeo = new THREE.BoxGeometry(slotStep * 0.9, 0.04, params.trayDepth * 0.7);
    for (let i = 0; i < slotCount; i++) {
      const p = new THREE.Mesh(pocketGeo, pocketMat);
      p.position.set(slotX(i), params.trayY + params.trayThickness - 0.015, params.trayZ);
      p.receiveShadow = true;
      group.add(p);
      pockets.push(p);
    }
    snapAll();
  }

  // 牌的几何和材质由 game.js 管理(受 rebuildMeshes 影响),这里同步到槽内的牌。
  function setAssets(geo, side, tops) {
    for (const it of items) {
      it.mesh.geometry = geo;
      it.mesh.material = [side, side, tops[it.type], side, side, side];
    }
  }

  function fly(mesh, type, onArrive) {
    items.push({ type, mesh });
    const from = mesh.position.clone();
    const fromScale = mesh.scale.x;
    const to = restPos(items.length - 1);
    const toScale = tileScale();
    tween(
      params.moveDuration,
      (k) => {
        const e = smooth(k);
        mesh.position.lerpVectors(from, to, e);
        mesh.position.y += Math.sin(Math.PI * e) * FLY_ARC;
        mesh.scale.setScalar(fromScale + (toScale - fromScale) * e);
      },
      onArrive
    );
  }

  function addFx(objs, life, step) {
    fx.push({ objs, life, age: 0, step });
  }

  function spawnBurst(center, type) {
    const count = params.matchEffect ? params.particleCount : 0;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL((type * 0.37 + Math.random() * 0.1) % 1, 0.8, 0.6),
        transparent: true,
      });
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.position.copy(center);
      scene.add(mesh);
      const v = new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6).multiplyScalar(params.effectSize);
      addFx([mesh], 0.9, (k, dt) => {
        v.y -= 9 * dt;
        mesh.position.addScaledVector(v, dt);
        mesh.rotation.x += dt * 6;
        mesh.material.opacity = 1 - k;
      });
    }
  }

  function spawnFlash(center) {
    if (!params.matchEffect) return;
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, depthWrite: false });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    flash.position.copy(center);
    ring.position.copy(center);
    scene.add(flash, ring);
    addFx([flash, ring], 0.4, (k) => {
      const s = params.effectSize;
      flash.scale.setScalar((0.6 + k * 2.2) * s);
      flash.material.opacity = 0.95 * (1 - k);
      ring.scale.setScalar((0.5 + k * 2.5) * s);
      ring.material.opacity = 0.9 * (1 - k);
    });
  }

  // 槽内同图案凑到 3 张时:三张牌跳起,在中间位置碰到一起,出现特效后消失,其余牌滑动补位。
  function matchTriple(type, onDone) {
    const idx = [];
    items.forEach((it, i) => {
      if (it.type === type) idx.push(i);
    });
    const trio = idx.map((i) => items[i]);
    const center = restPos(idx[1]);
    const foot = params.trayTileScale * slotStep;
    const meetY = center.y + params.hopHeight;
    const xs = [center.x - foot / 2, center.x, center.x + foot / 2];
    const d1 = params.matchDuration * 0.5;
    const d2 = params.matchDuration * 0.5;

    let pending = trio.length;
    trio.forEach((it, j) => {
      const m = it.mesh;
      const from = m.position.clone();
      const to = new THREE.Vector3(xs[j], meetY, center.z);
      tween(d1, (k) => m.position.lerpVectors(from, to, easeOut(k)), () => {
        if (--pending === 0) impact();
      });
    });

    function impact() {
      const at = new THREE.Vector3(center.x, meetY, center.z);
      spawnFlash(at);
      spawnBurst(at, type);
      playTone(880, 0.18, 1.2);
      pending = trio.length;
      for (const it of trio) {
        const m = it.mesh;
        const s = m.scale.x;
        tween(
          d2,
          (k) => {
            m.scale.setScalar(s * (1 - easeIn(k)));
            m.rotation.y = k * Math.PI;
          },
          () => {
            if (--pending === 0) finish();
          }
        );
      }
    }

    function finish() {
      for (const it of trio) {
        scene.remove(it.mesh);
        items.splice(items.indexOf(it), 1);
      }
      items.forEach((it, i) => {
        const from = it.mesh.position.clone();
        const to = restPos(i);
        const s0 = it.mesh.scale.x;
        const s1 = tileScale();
        tween(SLIDE_MS, (k) => {
          it.mesh.position.lerpVectors(from, to, smooth(k));
          it.mesh.scale.setScalar(s0 + (s1 - s0) * k);
        });
      });
      onDone();
    }
  }

  function count() {
    return items.length;
  }

  function countOf(type) {
    return items.filter((it) => it.type === type).length;
  }

  function update(now, dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const t = tweens[i];
      const k = Math.min(1, Math.max(0, (now - t.t0) / t.dur));
      t.update(k);
      if (k >= 1) {
        tweens.splice(i, 1);
        t.done?.();
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.age += dt;
      if (f.age >= f.life) {
        for (const o of f.objs) {
          scene.remove(o);
          o.material.dispose();
        }
        fx.splice(i, 1);
      } else {
        f.step(f.age / f.life, dt);
      }
    }
  }

  function clear() {
    tweens.length = 0;
    for (const it of items) scene.remove(it.mesh);
    items.length = 0;
    for (const f of fx) {
      for (const o of f.objs) {
        scene.remove(o);
        o.material.dispose();
      }
    }
    fx.length = 0;
  }

  function applyColors() {
    baseMat.color.set(params.trayColor);
    pocketMat.color.set(params.slotColor);
  }

  return { rebuild, setAssets, fly, matchTriple, count, countOf, update, clear, applyColors, snapAll };
}
