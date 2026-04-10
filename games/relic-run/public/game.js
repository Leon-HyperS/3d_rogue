import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';

const ui = {
  objective: document.getElementById('objective'),
  timer: document.getElementById('timer'),
  staminaLabel: document.getElementById('staminaLabel'),
  staminaBar: document.getElementById('staminaBar'),
  status: document.getElementById('status'),
  prompt: document.getElementById('prompt'),
  banner: document.getElementById('banner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerText: document.getElementById('bannerText')
};

const CONFIG = {
  arenaHalf: 18,
  floorColor: 0x24324c,
  wallColor: 0x364563,
  wallHeight: 3.2,
  timerSeconds: 90,
  player: {
    radius: 0.55,
    walkSpeed: 5.4,
    sprintSpeed: 8.4,
    maxStamina: 4.5,
    staminaDrain: 1.5,
    staminaRecharge: 0.9,
    targetHeight: 2.1,
    visualYawOffset: 0
  },
  enemy: {
    radius: 0.65,
    patrolSpeed: 2.1,
    chaseSpeed: 4.2,
    detectRadius: 7.2,
    loseRadius: 11.5,
    catchRadius: 1.1,
    fovDegrees: 65,
    targetHeight: 2.4,
    visualYawOffset: 0
  },
  interactionRadius: 1.9,
  cameraOffset: new THREE.Vector3(0, 12.5, 11.5),
  cameraLookOffset: new THREE.Vector3(0, 1.4, 0),
  ambientLight: 0.62,
  directionalLight: 1.45
};

const state = {
  ready: false,
  hasEnded: false,
  result: null,
  timeLeft: CONFIG.timerSeconds,
  stamina: CONFIG.player.maxStamina,
  keyCollected: false,
  leverActivated: false,
  gateOpen: false,
  objectiveText: 'Loading...',
  statusText: 'Loading assets'
};

window.__TEST__ = {
  ready: false,
  getState: () => ({
    ready: state.ready,
    hasEnded: state.hasEnded,
    result: state.result,
    timeLeft: Number(state.timeLeft.toFixed(2)),
    keyCollected: state.keyCollected,
    leverActivated: state.leverActivated,
    gateOpen: state.gateOpen,
    objective: state.objectiveText,
    player: player
      ? {
          x: Number(player.group.position.x.toFixed(2)),
          z: Number(player.group.position.z.toFixed(2))
        }
      : null
  }),
  restart: () => window.location.reload()
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c1222);
scene.fog = new THREE.Fog(0x0c1222, 24, 50);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const loader = new GLTFLoader();
const mixers = [];
const colliders = [];
const transientMessages = [];
const up = new THREE.Vector3(0, 1, 0);

let player = null;
let enemies = [];
let interactables = {};
let gateBlocker = null;
let assets = new Map();
let assetCache = new Map();

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false
};

function lerpAngle(current, target, alpha) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * alpha;
}

function setStatus(text, duration = 0) {
  state.statusText = text;
  if (duration > 0) {
    transientMessages.push({ text, expiresAt: performance.now() + duration * 1000 });
  }
}

function consumeTransientStatus(now) {
  if (transientMessages.length === 0) return;
  while (transientMessages.length && transientMessages[0].expiresAt <= now) {
    transientMessages.shift();
  }
  if (transientMessages.length > 0) {
    state.statusText = transientMessages[0].text;
  } else if (!state.hasEnded) {
    state.statusText = state.gateOpen
      ? 'Gate open. Reach the chest.'
      : state.keyCollected
        ? 'Find the lever to open the gate.'
        : 'Sneak through the ruins and find the key.';
  }
}

function updateObjectiveText() {
  if (state.hasEnded) {
    state.objectiveText = state.result === 'win' ? 'Relic secured' : 'Run failed';
    return;
  }
  if (!state.keyCollected) {
    state.objectiveText = 'Find the key';
  } else if (!state.leverActivated) {
    state.objectiveText = 'Pull the lever';
  } else if (!state.gateOpen) {
    state.objectiveText = 'Wait for the gate';
  } else {
    state.objectiveText = 'Open the chest';
  }
}

function showPrompt(text) {
  if (!text) {
    ui.prompt.classList.remove('visible');
    ui.prompt.textContent = '';
    return;
  }
  ui.prompt.textContent = text;
  ui.prompt.classList.add('visible');
}

function showBanner(title, text) {
  ui.bannerTitle.textContent = title;
  ui.bannerText.textContent = text;
  ui.banner.classList.add('visible');
}

function hideBanner() {
  ui.banner.classList.remove('visible');
}

function updateHud() {
  ui.objective.textContent = state.objectiveText;
  ui.timer.textContent = `${Math.max(0, state.timeLeft).toFixed(1)}s`;
  ui.staminaLabel.textContent = `${Math.round((state.stamina / CONFIG.player.maxStamina) * 100)}%`;
  ui.staminaBar.style.transform = `scaleX(${Math.max(0, state.stamina / CONFIG.player.maxStamina)})`;
  ui.status.textContent = state.statusText;
}

function createTextSprite(label, color = '#ffcf5a', scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 88px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1a1020';
  ctx.lineWidth = 10;
  ctx.strokeText(label, 64, 64);
  ctx.fillText(label, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

function computeVisibleBounds(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      const meshBox = child.geometry.boundingBox.clone();
      meshBox.applyMatrix4(child.matrixWorld);
      box.union(meshBox);
    }
  });
  if (box.isEmpty()) {
    box.setFromObject(root);
  }
  return box;
}

function normalizeToTargetHeight(root, targetHeight, anchor = 'minY') {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);

  const initialBox = computeVisibleBounds(root);
  const size = initialBox.getSize(new THREE.Vector3());
  const safeHeight = Math.max(size.y, size.x, size.z, 0.001);
  const scale = targetHeight / safeHeight;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBox = computeVisibleBounds(root);
  root.position.y += anchor === 'maxY' ? -scaledBox.max.y : -scaledBox.min.y;
  root.updateMatrixWorld(true);
}

function enableShadows(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createFallbackAsset(entry) {
  const group = new THREE.Group();
  let mesh;

  switch (entry.category) {
    case 'character':
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.85, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9f2ff, roughness: 0.75 })
      );
      break;
    case 'enemy':
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.58, 1.4, 5),
        new THREE.MeshStandardMaterial({ color: 0xd46b68, roughness: 0.8 })
      );
      break;
    case 'pickup':
      mesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.22, 0.08, 48, 10),
        new THREE.MeshStandardMaterial({ color: 0xffd86b, metalness: 0.25, roughness: 0.45 })
      );
      break;
    case 'mechanic':
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x8ec07c, roughness: 0.7 })
      );
      break;
    default:
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x95a6c6, roughness: 0.8 })
      );
      break;
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

async function fetchAssetCatalog() {
  const response = await fetch('./assets/assets_index.json');
  const json = await response.json();
  for (const entry of json.assets) {
    assets.set(entry.id, entry);
  }
}

async function loadAsset(id) {
  if (assetCache.has(id)) {
    return assetCache.get(id);
  }

  const entry = assets.get(id);
  const promise = new Promise((resolve) => {
    loader.load(
      `./assets/${entry.path}`,
      (gltf) => {
        enableShadows(gltf.scene);
        console.log(`[asset] ${id} animations:`, gltf.animations.map((clip) => clip.name));
        resolve({
          id,
          scene: gltf.scene,
          animations: gltf.animations || [],
          isFallback: false
        });
      },
      undefined,
      (error) => {
        console.warn(`[asset] fallback for ${id}`, error);
        resolve({
          id,
          scene: createFallbackAsset(entry),
          animations: [],
          isFallback: true
        });
      }
    );
  });

  assetCache.set(id, promise);
  return promise;
}

async function instantiateAsset(id, options = {}) {
  const asset = await loadAsset(id);
  const visual = asset.animations.length > 0
    ? SkeletonUtils.clone(asset.scene)
    : asset.scene.clone(true);

  enableShadows(visual);
  normalizeToTargetHeight(
    visual,
    options.targetHeight ?? 1.5,
    options.anchor ?? 'minY'
  );

  const wrapper = new THREE.Group();
  wrapper.add(visual);
  visual.rotation.y += options.visualYawOffset ?? 0;

  let animation = null;
  if (asset.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(visual);
    mixers.push(mixer);
    const actions = {};
    for (const clip of asset.animations) {
      actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
    }
    animation = {
      mixer,
      actions,
      currentAction: null,
      label: id
    };
  }

  return {
    group: wrapper,
    visual,
    animation,
    isFallback: asset.isFallback
  };
}

function selectAnimationAction(controller, desiredName) {
  if (!controller) return null;
  const desired = desiredName.toLowerCase();
  const keys = Object.keys(controller.actions);
  let key = keys.find((name) => name === desired);
  if (!key) {
    key = keys.find((name) => name.includes(desired));
  }
  if (!key) {
    const alternatives = {
      idle: ['stand', 'wait', 'breathe', 'walk'],
      walk: ['run', 'move', 'jog'],
      run: ['walk', 'move', 'jog'],
      attack: ['hit', 'bite', 'strike'],
      death: ['die', 'dead']
    };
    for (const alt of alternatives[desired] || []) {
      key = keys.find((name) => name.includes(alt));
      if (key) break;
    }
  }
  if (!key) {
    key = keys.find((name) => !name.includes('death') && !name.includes('die'));
  }
  return key ? controller.actions[key] : null;
}

function switchAnimation(controller, desiredName, { loop = true, fadeTime = 0.16, timeScale = 1 } = {}) {
  if (!controller) return;
  const action = selectAnimationAction(controller, desiredName);
  if (!action) return;

  if (controller.currentAction === action) {
    action.timeScale = timeScale;
    if (!action.isRunning()) {
      action.play();
    }
    return;
  }

  if (controller.currentAction) {
    controller.currentAction.fadeOut(fadeTime);
  }

  action.reset();
  action.enabled = true;
  action.paused = false;
  action.timeScale = timeScale;
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  action.clampWhenFinished = !loop;
  action.fadeIn(fadeTime).play();
  controller.currentAction = action;
}

function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, CONFIG.ambientLight);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff1d0, CONFIG.directionalLight);
  sun.position.set(8, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 60;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x7aa7ff, 0.35);
  fill.position.set(-12, 8, -6);
  scene.add(fill);
}

function createGround() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 42),
    new THREE.MeshStandardMaterial({
      color: CONFIG.floorColor,
      roughness: 0.95,
      metalness: 0.03
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const accent = new THREE.Mesh(
    new THREE.RingGeometry(8.5, 14.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x1b2236,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    })
  );
  accent.rotation.x = -Math.PI / 2;
  accent.position.y = 0.02;
  scene.add(accent);
}

function addWall(x, z, width, depth, height = CONFIG.wallHeight) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: CONFIG.wallColor,
      roughness: 0.9,
      metalness: 0.06
    })
  );
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2
  });
}

function addBoundaryWalls() {
  const h = CONFIG.arenaHalf;
  addWall(0, -h, h * 2 + 2, 1.6);
  addWall(0, h, h * 2 + 2, 1.6);
  addWall(-h, 0, 1.6, h * 2 + 2);
  addWall(h, 0, 1.6, h * 2 + 2);
}

function addMazeWalls() {
  addWall(-6.5, 1, 1.8, 17);
  addWall(1, -8.5, 13, 1.8);
  addWall(6.5, -1.5, 1.8, 13);
  addWall(4.5, 9.5, 11, 1.8);
  addWall(-0.5, 5, 8, 1.8);
}

function pointCollidesXZ(position, radius, box) {
  const nearestX = Math.max(box.minX, Math.min(position.x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
  const dx = position.x - nearestX;
  const dz = position.z - nearestZ;
  return (dx * dx + dz * dz) < radius * radius;
}

function getActiveColliders() {
  const active = [...colliders];
  if (gateBlocker && !state.gateOpen) {
    active.push(gateBlocker.collider);
  }
  return active;
}

function moveWithCollisions(group, deltaMove, radius) {
  const nextX = group.position.clone();
  nextX.x += deltaMove.x;
  const nextZ = group.position.clone();
  nextZ.z += deltaMove.z;

  for (const box of getActiveColliders()) {
    if (pointCollidesXZ(nextX, radius, box)) {
      deltaMove.x = 0;
      break;
    }
  }

  for (const box of getActiveColliders()) {
    if (pointCollidesXZ(nextZ, radius, box)) {
      deltaMove.z = 0;
      break;
    }
  }

  group.position.x += deltaMove.x;
  group.position.z += deltaMove.z;
}

function createGateBlocker(x, z, width, depth) {
  const collider = {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2
  };

  const debugMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 2.2, depth),
    new THREE.MeshStandardMaterial({
      color: 0x5779ff,
      transparent: true,
      opacity: DEBUG ? 0.25 : 0
    })
  );
  debugMesh.position.set(x, 1.1, z);
  debugMesh.visible = DEBUG;
  scene.add(debugMesh);

  return { collider, debugMesh };
}

async function placeDecorations() {
  const placements = [
    { id: 'env_fence_straight', pos: [-15, 0, -4], scale: 1.5 },
    { id: 'env_fence_corner', pos: [-14, 0, -14], scale: 1.5 },
    { id: 'env_fence_middle', pos: [-14, 0, 13], scale: 1.5 },
    { id: 'env_rock_small', pos: [-11, 0, 6], scale: 1.6 },
    { id: 'env_rock_large', pos: [-1, 0, -12], scale: 1.8 },
    { id: 'env_rock_platform_medium', pos: [10, 0, -10], scale: 1.6 },
    { id: 'env_rock_platform_large', pos: [11, 0, 2], scale: 1.7 },
    { id: 'env_plant_small', pos: [14, 0, -12], scale: 1.5 },
    { id: 'env_plant_large', pos: [13, 0, 13], scale: 1.7 },
    { id: 'env_plant_small', pos: [-10, 0, 12], scale: 1.4 },
    { id: 'env_rock_small', pos: [2, 0, 6], scale: 1.4 }
  ];

  for (const placement of placements) {
    const targetHeight = placement.scale;
    const instance = await instantiateAsset(placement.id, {
      targetHeight,
      anchor: 'minY',
      visualYawOffset: placement.yaw ?? 0
    });
    instance.group.position.set(...placement.pos);
    if (placement.rotationY) {
      instance.group.rotation.y = placement.rotationY;
    }
    scene.add(instance.group);
  }
}

async function spawnPlayer() {
  const instance = await instantiateAsset('player_character', {
    targetHeight: CONFIG.player.targetHeight,
    anchor: 'minY',
    visualYawOffset: CONFIG.player.visualYawOffset
  });

  instance.group.position.set(-14, 0, -12);
  scene.add(instance.group);

  if (DEBUG) {
    instance.group.add(new THREE.AxesHelper(1.1));
  }

  return {
    ...instance,
    radius: CONFIG.player.radius,
    heading: 0,
    velocity: new THREE.Vector3()
  };
}

async function spawnEnemy(id, position, patrolPoints, tint) {
  const instance = await instantiateAsset(id, {
    targetHeight: CONFIG.enemy.targetHeight,
    anchor: 'minY',
    visualYawOffset: CONFIG.enemy.visualYawOffset
  });
  instance.group.position.copy(position);
  scene.add(instance.group);

  const alertSprite = createTextSprite('!', tint, 0.95);
  alertSprite.position.set(0, 2.8, 0);
  alertSprite.visible = false;
  instance.group.add(alertSprite);

  return {
    ...instance,
    radius: CONFIG.enemy.radius,
    patrolPoints,
    patrolIndex: 0,
    mode: 'patrol',
    heading: 0,
    alertSprite,
    lastKnownPlayer: position.clone(),
    fovCos: Math.cos(THREE.MathUtils.degToRad(CONFIG.enemy.fovDegrees))
  };
}

async function placeInteractables() {
  const key = await instantiateAsset('pickup_key', {
    targetHeight: 1.25,
    anchor: 'minY',
    visualYawOffset: 0
  });
  key.group.position.set(-12.5, 0, 10.5);
  scene.add(key.group);

  const lever = await instantiateAsset('mechanic_lever', {
    targetHeight: 1.5,
    anchor: 'minY',
    visualYawOffset: 0
  });
  lever.group.position.set(-1.5, 0, 10.4);
  scene.add(lever.group);

  const door = await instantiateAsset('mechanic_door', {
    targetHeight: 2.6,
    anchor: 'minY',
    visualYawOffset: Math.PI / 2
  });
  door.group.position.set(7.9, 0, 6.0);
  scene.add(door.group);

  const chest = await instantiateAsset('mechanic_chest', {
    targetHeight: 1.65,
    anchor: 'minY',
    visualYawOffset: 0
  });
  chest.group.position.set(12.8, 0, 11.2);
  scene.add(chest.group);

  return { key, lever, door, chest };
}

function buildLevel() {
  createGround();
  createLights();
  addBoundaryWalls();
  addMazeWalls();
  gateBlocker = createGateBlocker(7.9, 6.0, 1.6, 3.8);

  if (DEBUG) {
    scene.add(new THREE.GridHelper(42, 42, 0x4c6cb6, 0x25314d));
    scene.add(new THREE.AxesHelper(2.5));
  }
}

function updateDoorVisual(dt) {
  if (!interactables.door) return;
  const targetY = state.gateOpen ? -2.5 : 0;
  interactables.door.group.position.y = THREE.MathUtils.lerp(
    interactables.door.group.position.y,
    targetY,
    Math.min(1, dt * 3.5)
  );
}

function updateFloatingProps(elapsedTime) {
  if (interactables.key && !state.keyCollected) {
    interactables.key.group.position.y = 0.35 + Math.sin(elapsedTime * 2.3) * 0.18;
    interactables.key.group.rotation.y += 0.015;
  }
  if (interactables.chest) {
    interactables.chest.group.rotation.y += 0.002;
  }
}

function updatePlayer(dt) {
  const move = new THREE.Vector3(
    Number(input.right) - Number(input.left),
    0,
    Number(input.down) - Number(input.up)
  );

  const hasInput = move.lengthSq() > 0;
  if (hasInput) {
    move.normalize();
  }

  const cameraForward = new THREE.Vector3();
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;
  cameraForward.normalize();

  const right = new THREE.Vector3().crossVectors(cameraForward, up).normalize();
  const forward = cameraForward.negate();

  const worldMove = new THREE.Vector3();
  worldMove.addScaledVector(right, move.x);
  worldMove.addScaledVector(forward, move.z);
  if (worldMove.lengthSq() > 0) {
    worldMove.normalize();
  }

  const sprinting = input.sprint && hasInput && state.stamina > 0.05;
  const speed = sprinting ? CONFIG.player.sprintSpeed : CONFIG.player.walkSpeed;

  if (!state.hasEnded) {
    if (sprinting) {
      state.stamina = Math.max(0, state.stamina - CONFIG.player.staminaDrain * dt);
    } else {
      state.stamina = Math.min(
        CONFIG.player.maxStamina,
        state.stamina + CONFIG.player.staminaRecharge * dt
      );
    }
  }

  const deltaMove = worldMove.multiplyScalar(speed * dt);
  moveWithCollisions(player.group, deltaMove, player.radius);

  if (hasInput) {
    player.heading = Math.atan2(worldMove.x, worldMove.z);
  }
  player.group.rotation.y = lerpAngle(
    player.group.rotation.y,
    player.heading,
    Math.min(1, dt * 12)
  );

  if (player.animation) {
    if (!hasInput) {
      switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
    } else if (sprinting) {
      switchAnimation(player.animation, 'run', { loop: true, timeScale: 1.35 });
    } else {
      switchAnimation(player.animation, 'walk', { loop: true, timeScale: 1.0 });
    }
  }
}

function updateCamera(dt) {
  const desired = player.group.position.clone().add(CONFIG.cameraOffset);
  camera.position.lerp(desired, Math.min(1, dt * 3.2));
  const lookTarget = player.group.position.clone().add(CONFIG.cameraLookOffset);
  camera.lookAt(lookTarget);
}

function detectPlayer(enemy, toPlayer, distance) {
  if (distance > CONFIG.enemy.detectRadius) {
    return false;
  }
  const facing = new THREE.Vector3(Math.sin(enemy.heading), 0, Math.cos(enemy.heading)).normalize();
  const towardPlayer = toPlayer.clone().normalize();
  return facing.dot(towardPlayer) >= enemy.fovCos;
}

function updateEnemy(enemy, dt) {
  const targetPoint = enemy.mode === 'patrol'
    ? enemy.patrolPoints[enemy.patrolIndex]
    : player.group.position;

  const toTarget = targetPoint.clone().sub(enemy.group.position);
  toTarget.y = 0;
  const distanceToTarget = toTarget.length();
  const moveDir = distanceToTarget > 0.001 ? toTarget.normalize() : new THREE.Vector3();

  const speed = enemy.mode === 'chase' ? CONFIG.enemy.chaseSpeed : CONFIG.enemy.patrolSpeed;
  moveWithCollisions(enemy.group, moveDir.multiplyScalar(speed * dt), enemy.radius);

  if (distanceToTarget > 0.05) {
    enemy.heading = Math.atan2(toTarget.x, toTarget.z);
  }
  enemy.group.rotation.y = lerpAngle(
    enemy.group.rotation.y,
    enemy.heading,
    Math.min(1, dt * 8)
  );

  const toPlayer = player.group.position.clone().sub(enemy.group.position);
  toPlayer.y = 0;
  const playerDistance = toPlayer.length();

  if (enemy.mode === 'patrol' && detectPlayer(enemy, toPlayer, playerDistance)) {
    enemy.mode = 'chase';
    setStatus('You have been spotted.', 1.4);
  }

  if (enemy.mode === 'patrol' && distanceToTarget < 0.6) {
    enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
  }

  if (enemy.mode === 'chase' && playerDistance > CONFIG.enemy.loseRadius) {
    enemy.mode = 'patrol';
  }

  if (enemy.mode === 'chase' && playerDistance <= CONFIG.enemy.catchRadius) {
    endGame('lose', 'A monster caught you. Press R to try again.');
  }

  enemy.alertSprite.visible = enemy.mode === 'chase';
  if (enemy.animation) {
    switchAnimation(enemy.animation, enemy.mode === 'chase' ? 'run' : 'walk', {
      loop: true,
      timeScale: enemy.mode === 'chase' ? 1.2 : 0.9
    });
  }
}

function nearestInteraction() {
  const options = [];

  if (interactables.key && !state.keyCollected) {
    options.push({
      type: 'key',
      distance: interactables.key.group.position.distanceTo(player.group.position)
    });
  }

  if (interactables.lever && state.keyCollected && !state.leverActivated) {
    options.push({
      type: 'lever',
      distance: interactables.lever.group.position.distanceTo(player.group.position)
    });
  }

  if (interactables.chest && state.gateOpen) {
    options.push({
      type: 'chest',
      distance: interactables.chest.group.position.distanceTo(player.group.position)
    });
  }

  options.sort((a, b) => a.distance - b.distance);
  return options[0] || null;
}

function updateInteractions() {
  if (!interactables.key || state.hasEnded) {
    return;
  }

  if (!state.keyCollected) {
    const keyDist = interactables.key.group.position.distanceTo(player.group.position);
    if (keyDist <= CONFIG.interactionRadius) {
      state.keyCollected = true;
      interactables.key.group.visible = false;
      setStatus('Key collected. Find the lever.', 1.8);
      updateObjectiveText();
    }
  }

  const nearest = nearestInteraction();
  if (!nearest || nearest.distance > CONFIG.interactionRadius) {
    showPrompt('');
    return;
  }

  if (nearest.type === 'lever') {
    showPrompt('Press E to pull the lever');
  } else if (nearest.type === 'chest') {
    showPrompt('Press E to open the chest');
  } else {
    showPrompt('');
  }
}

function handleInteraction() {
  if (state.hasEnded) return;

  const nearest = nearestInteraction();
  if (!nearest || nearest.distance > CONFIG.interactionRadius) return;

  if (nearest.type === 'lever' && state.keyCollected && !state.leverActivated) {
    state.leverActivated = true;
    state.gateOpen = true;
    interactables.lever.group.rotation.z = -0.75;
    setStatus('The gate is open. Reach the chest.', 2.0);
    updateObjectiveText();
    return;
  }

  if (nearest.type === 'chest' && state.gateOpen) {
    endGame('win', 'The relic is yours. Press R to run again.');
  }
}

function endGame(result, message) {
  if (state.hasEnded) return;
  state.hasEnded = true;
  state.result = result;
  state.objectiveText = result === 'win' ? 'Relic secured' : 'Run failed';
  state.statusText = message;
  showPrompt('');
  showBanner(result === 'win' ? 'You Escaped' : 'Run Failed', message);
}

function updateTimer(dt) {
  if (state.hasEnded) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) {
    endGame('lose', 'Time ran out. Press R to try again.');
  }
}

function setupInput() {
  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.sprint = true;
        break;
      case 'KeyE':
        handleInteraction();
        break;
      case 'KeyR':
        window.location.reload();
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        input.sprint = false;
        break;
      default:
        break;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

async function init() {
  hideBanner();
  setStatus('Loading assets');
  updateObjectiveText();
  updateHud();

  await fetchAssetCatalog();
  buildLevel();
  await placeDecorations();
  interactables = await placeInteractables();
  player = await spawnPlayer();

  enemies = [
    await spawnEnemy(
      'enemy_orc',
      new THREE.Vector3(-10.5, 0, 2.5),
      [
        new THREE.Vector3(-13, 0, 1),
        new THREE.Vector3(-11, 0, 11),
        new THREE.Vector3(-3, 0, 8),
        new THREE.Vector3(-2, 0, 1)
      ],
      '#ffb347'
    ),
    await spawnEnemy(
      'enemy_demon',
      new THREE.Vector3(10.5, 0, 0.5),
      [
        new THREE.Vector3(8, 0, -8),
        new THREE.Vector3(13, 0, -2),
        new THREE.Vector3(14, 0, 10),
        new THREE.Vector3(8, 0, 12)
      ],
      '#ff6b7a'
    )
  ];

  camera.position.copy(player.group.position).add(CONFIG.cameraOffset);
  camera.lookAt(player.group.position.clone().add(CONFIG.cameraLookOffset));

  updateObjectiveText();
  setStatus('Sneak through the ruins and find the key.');
  updateHud();

  state.ready = true;
  window.__TEST__.ready = true;
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const elapsed = clock.elapsedTime;
  const now = performance.now();

  if (state.ready) {
    updateTimer(dt);
    if (!state.hasEnded) {
      updatePlayer(dt);
      updateInteractions();
      for (const enemy of enemies) {
        updateEnemy(enemy, dt);
      }
    }

    updateDoorVisual(dt);
    updateFloatingProps(elapsed);
    updateCamera(dt);
    for (const mixer of mixers) {
      mixer.update(dt);
    }
    consumeTransientStatus(now);
    updateHud();
  }

  renderer.render(scene, camera);
}

setupInput();
init()
  .then(() => {
    renderer.setAnimationLoop(animate);
  })
  .catch((error) => {
    console.error(error);
    showBanner('Load Failed', 'Open the browser console and press R to retry.');
    setStatus('Load failed');
    updateHud();
  });
