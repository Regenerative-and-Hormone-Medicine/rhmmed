// @ts-nocheck
// 3D book for /cheating-death, ported from the live page's custom code (three.js r169).
// Mount point: [data-book3d][data-cover]. Ends the intro started by the inline script in BookHero.astro.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const W = 1, H = 1.491, BOARD = 0.03, PAGES = 0.19, LIP = 0.022;
const BASE_Y = 0.42;              // resting turn: spine toward the viewer
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const intro = !reduced && root.classList.contains('book-intro');
const easeOutBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
const easeOutCubic = p => 1 - Math.pow(1 - p, 3);
// Ends the intro: the head script hides the hero copy, form and nav until the book lands.
function reveal() { if (!root.classList.contains('book-intro')) return; root.classList.remove('book-intro'); root.classList.add('book-revealed'); }

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function pagesTex(vertical) {
  return canvasTex(vertical ? 512 : 64, vertical ? 64 : 512, (g, w, h) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
    const n = vertical ? w : h;
    for (let i = 0; i < n; i += 2) {
      g.fillStyle = `rgba(120,100,70,${0.05 + Math.random() * 0.12})`;
      vertical ? g.fillRect(i, 0, 1, h) : g.fillRect(0, i, w, 1);
    }
  });
}

function spineTex(bg) {
  return canvasTex(160, 1200, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const sheen = g.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0, 'rgba(0,0,0,.35)'); sheen.addColorStop(.5, 'rgba(255,255,255,.06)'); sheen.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = sheen; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, 0); g.rotate(Math.PI / 2); g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.font = '700 74px "Arial Narrow","Helvetica Neue",Arial,sans-serif';
    g.save(); g.scale(0.82, 1); g.fillText('CHEATING DEATH', 70 / 0.82, 4); g.restore();
    g.fillStyle = '#f0a43a'; g.font = '600 40px "Arial Narrow","Helvetica Neue",Arial,sans-serif';
    g.save(); g.scale(0.85, 1); g.fillText('DR. RAND McCLAIN', 760 / 0.85, 4); g.restore();
    g.restore();
  });
}

function backTex(bg) {
  return canvasTex(700, 1044, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.font = '700 58px "Arial Narrow","Helvetica Neue",Arial,sans-serif';
    g.fillText('CHEATING DEATH', w / 2, h * .42);
    g.fillStyle = '#f0a43a'; g.fillRect(w / 2 - 40, h * .46, 80, 3);
    g.font = '600 30px "Arial Narrow","Helvetica Neue",Arial,sans-serif';
    g.fillText('DR. RAND McCLAIN', w / 2, h * .53);
  });
}

function shadowTex() {
  return canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(40,30,20,.55)'); r.addColorStop(.55, 'rgba(40,30,20,.18)'); r.addColorStop(1, 'rgba(40,30,20,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

function edgeColor(img) {
  try {
    const c = document.createElement('canvas'); c.width = 8; c.height = 64;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 64);
    const d = g.getImageData(1, 32, 1, 1).data;
    return `rgb(${d[0]},${d[1]},${d[2]})`;
  } catch { return '#101b33'; }
}

function buildBook(coverImg) {
  const cover = new THREE.Texture(coverImg);
  cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
  // The cover file has a ~9px white margin; crop it out of the texture.
  cover.repeat.set(1 - 2 * .0075, 1 - 2 * .005); cover.offset.set(.0075, .005); cover.needsUpdate = true;
  const navy = edgeColor(coverImg);

  const cloth = new THREE.MeshPhysicalMaterial({ color: navy, roughness: .8, envMapIntensity: .12 });
  const back = new THREE.MeshPhysicalMaterial({ map: backTex(navy), roughness: .8, envMapIntensity: .12 });
  const front = new THREE.MeshPhysicalMaterial({ map: cover, roughness: .42, clearcoat: .35, clearcoatRoughness: .35 });
  const spine = new THREE.MeshPhysicalMaterial({ map: spineTex(navy), roughness: .5, clearcoat: .3, clearcoatRoughness: .4 });
  const edgeSide = new THREE.MeshStandardMaterial({ map: pagesTex(true), roughness: .9 });
  const edgeTop = new THREE.MeshStandardMaterial({ map: pagesTex(false), roughness: .9 });

  const book = new THREE.Group();
  const zf = PAGES / 2 + BOARD / 2;
  // Box face order: +x, -x, +y, -y, +z, -z
  const frontBoard = new THREE.Mesh(new THREE.BoxGeometry(W, H, BOARD), [cloth, cloth, cloth, cloth, front, cloth]);
  frontBoard.position.z = zf;
  const backBoard = new THREE.Mesh(new THREE.BoxGeometry(W, H, BOARD), [cloth, cloth, cloth, cloth, cloth, back]);
  backBoard.position.z = -zf;
  const spineBox = new THREE.Mesh(new THREE.BoxGeometry(BOARD, H - .002, PAGES + BOARD * 2 - .003), [cloth, spine, cloth, cloth, cloth, cloth]);
  spineBox.position.x = -W / 2 - BOARD / 2 + .001;
  const block = new THREE.Mesh(new THREE.BoxGeometry(W - LIP - .006, H - LIP * 2, PAGES - .004),
    [edgeSide, cloth, edgeTop, edgeTop, edgeSide, edgeSide]);
  block.position.x = -LIP / 2 + .003;
  for (const m of [frontBoard, backBoard, spineBox, block]) { m.castShadow = true; book.add(m); }
  return book;
}

function mount(el) {
  const fallback = el.querySelector('.book3d__fallback');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement; canvas.className = 'book3d__canvas';
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xfff3e0, 1.6); key.position.set(2.5, 3, 4); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, .25));

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 50);
  camera.position.set(0, .05, 4.4);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .55), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H / 2 - .16;
  scene.add(shadow);

  const pivot = new THREE.Group(); scene.add(pivot);

  const s = { mx: 0, my: 0, tx: 0, ty: 0, spin: 0, vel: 0, drag: false, lastX: 0, scroll: 0, visible: true };

  function resize() {
    const r = el.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(el); resize();

  addEventListener('pointermove', e => {
    s.tx = (e.clientX / innerWidth - .5) * 2; s.ty = (e.clientY / innerHeight - .5) * 2;
    if (s.drag) { const dx = e.clientX - s.lastX; s.lastX = e.clientX; s.vel = dx * .012; s.spin += s.vel; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', e => { s.drag = true; s.lastX = e.clientX; s.vel = 0; canvas.setPointerCapture(e.pointerId); });
  const up = () => { s.drag = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  addEventListener('scroll', () => {
    const r = el.getBoundingClientRect();
    s.scroll = Math.min(1, Math.max(0, -r.top / (r.height + 200)));
  }, { passive: true });
  new IntersectionObserver(([en]) => { s.visible = en.isIntersecting; }).observe(el);

  const img = new Image(); img.crossOrigin = 'anonymous';
  img.onload = () => {
    pivot.add(buildBook(img));
    const clock = new THREE.Clock(); let first = true;
    renderer.setAnimationLoop(() => {
      if (!s.visible && !first) return;
      const t = clock.getElapsedTime();
      const motion = reduced ? 0 : 1;
      s.mx += (s.tx - s.mx) * .05; s.my += (s.ty - s.my) * .05;
      if (!s.drag) { s.spin += s.vel; s.vel *= .94; s.spin *= .97; }   // inertia, then settle back
      const float = Math.sin(t * 1.1) * .06 * motion;
      // Intro: the book pops in, spinning and rising into place, then the page reveals.
      const ip = intro ? Math.min(1, t / 1.3) : 1;
      const pop = intro ? Math.max(.001, easeOutBack(ip)) : 1;
      const settle = 1 - easeOutCubic(ip);
      if (intro && ip > .6) reveal();
      pivot.scale.setScalar(pop);
      pivot.position.y = float + s.scroll * .25 * motion - settle * .35;
      pivot.rotation.y = BASE_Y + s.spin + s.mx * .22 * motion + Math.sin(t * .5) * .05 * motion + s.scroll * .9 * motion - settle * 2.4;
      pivot.rotation.x = -.06 + s.my * .12 * motion + Math.sin(t * .8) * .02 * motion;
      pivot.rotation.z = Math.sin(t * .6) * .015 * motion;
      shadow.material.opacity = (.9 - (float + .06) * 2.5) * Math.min(1, ip * 1.6);
      shadow.scale.setScalar((1 - float * .8) * Math.min(1, pop));
      renderer.render(scene, camera);
      if (first) { first = false; el.classList.add('is-3d'); if (fallback) fallback.setAttribute('aria-hidden', 'true'); }
    });
  };
  img.onerror = reveal;
  img.src = el.dataset.cover;
}

function hasWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (hasWebGL()) document.querySelectorAll('[data-book3d]').forEach(mount);
else reveal();
