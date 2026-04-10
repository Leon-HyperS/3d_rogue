import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const query = new URLSearchParams(window.location.search);
const DEBUG = query.get('debug') === '1';
const CALIBRATION = query.get('calibration') === '1' || DEBUG;

const ui = {
  modeLabel: document.getElementById('modeLabel'),
  statusLabel: document.getElementById('statusLabel'),
  playerHealthLabel: document.getElementById('playerHealthLabel'),
  playerHealthBar: document.getElementById('playerHealthBar'),
  enemyPanel: document.getElementById('enemyPanel'),
  enemyHealthLabel: document.getElementById('enemyHealthLabel'),
  enemyHealthBar: document.getElementById('enemyHealthBar'),
  expLabel: document.getElementById('expLabel'),
  equippedMoveLabel: document.getElementById('equippedMoveLabel'),
  lastUnlockLabel: document.getElementById('lastUnlockLabel'),
  unlockedMoves: document.getElementById('unlockedMoves'),
  prompt: document.getElementById('prompt'),
  banner: document.getElementById('banner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerText: document.getElementById('bannerText'),
  rewardOverlay: document.getElementById('rewardOverlay'),
  rewardSubtitle: document.getElementById('rewardSubtitle'),
  rewardExp: document.getElementById('rewardExp'),
  rewardChoices: document.getElementById('rewardChoices')
};

const CONFIG = {
  player: {
    radius: 0.58,
    maxHealth: 100,
    hubSpeed: 5.6,
    fightSpeed: 5.1,
    targetHeight: 2.15,
    visualYawOffset: 0
  },
  enemy: {
    radius: 0.74,
    targetHeight: 2.45,
    visualYawOffset: 0
  },
  camera: {
    hubOffset: new THREE.Vector3(0, 10.5, 9.6),
    hubLookOffset: new THREE.Vector3(0, 1.4, 0),
    fightOffset: new THREE.Vector3(0, 6.2, 8.4),
    fightLookOffset: new THREE.Vector3(0, 1.1, 0)
  },
  hub: {
    bounds: {
      minX: -10.5,
      maxX: 10.5,
      minZ: -10.5,
      maxZ: 10.5
    },
    playerSpawn: new THREE.Vector3(0, 0, 6.4),
    interactRadius: 2.15
  },
  fight: {
    bounds: {
      minX: -5.4,
      maxX: 5.4,
      minZ: -4.3,
      maxZ: 4.3
    },
    playerSpawn: new THREE.Vector3(-3.15, 0, 0),
    enemySpawn: new THREE.Vector3(3.15, 0, 0),
    introSeconds: 0.8
  },
  ambientLight: 0.66,
  directionalLight: 1.5,
  fillLight: 0.36
};

const ATTACK_DEFS = {
  light: {
    id: 'light',
    label: 'Light',
    damage: 11,
    range: 2.05,
    arcCos: Math.cos(THREE.MathUtils.degToRad(75)),
    activeTime: 0.09,
    totalTime: 0.25,
    knockback: 3.9,
    invuln: 0.15,
    moveFactor: 0.45
  },
  heavy: {
    id: 'heavy',
    label: 'Heavy',
    damage: 18,
    range: 2.75,
    arcCos: Math.cos(THREE.MathUtils.degToRad(88)),
    activeTime: 0.16,
    totalTime: 0.42,
    knockback: 6.5,
    invuln: 0.18,
    moveFactor: 0.2
  },
  enemy: {
    id: 'enemy',
    label: 'Punch',
    damage: 12,
    range: 1.9,
    arcCos: Math.cos(THREE.MathUtils.degToRad(80)),
    activeTime: 0.17,
    totalTime: 0.38,
    knockback: 4.4,
    invuln: 0.16,
    moveFactor: 0.12
  }
};

const NPC_DEFS = {
  orc: {
    id: 'orc',
    label: 'Stone Orc',
    assetId: 'npc_orc',
    color: '#ffb76d',
    markerColor: 0xffb76d,
    maxHealth: 68,
    hubPosition: new THREE.Vector3(-5.6, 0, -2.8)
  },
  demon: {
    id: 'demon',
    label: 'Crimson Demon',
    assetId: 'npc_demon',
    color: '#ff7f9e',
    markerColor: 0xff7f9e,
    maxHealth: 76,
    hubPosition: new THREE.Vector3(5.7, 0, -3.4)
  }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1120);
scene.fog = new THREE.Fog(0x0a1120, 24, 52);

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
const assets = new Map();
const assetCache = new Map();
const mixers = [];
const projectiles = [];
const effects = [];

const hubRoot = new THREE.Group();
const fightRoot = new THREE.Group();
scene.add(hubRoot);
scene.add(fightRoot);

const input = {
  up: false,
  down: false,
  left: false,
  right: false
};

const state = {
  ready: false,
  mode: 'boot',
  transitionLock: false,
  statusText: 'Loading assets',
  exp: 0,
  equippedMoveId: null,
  lastUnlockedMoveId: null,
  unlockedMoves: new Set(),
  npcAssignments: {},
  rewardSelection: 0,
  currentNpcId: null,
  fightIntroTimer: 0
};

let player = null;
let fightEnemy = null;
let nearestNpcId = null;
const hubNpcs = new Map();

function shuffleArray(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clearMovementInput() {
  input.up = false;
  input.down = false;
  input.left = false;
  input.right = false;
}

function getModeLabel(mode) {
  const labels = {
    boot: 'Loading',
    hub: 'Hub',
    fightIntro: 'Fight Intro',
    fight: 'Fight',
    reward: 'Reward',
    lose: 'Defeat'
  };
  return labels[mode] || mode;
}

function getMoveIds() {
  return ['diveKick', 'projectile', 'dashAttack'];
}

function getUnlockedMoveIds() {
  return getMoveIds().filter((id) => state.unlockedMoves.has(id));
}

function getMoveLabel(moveId) {
  return SPECIAL_MOVES[moveId]?.label ?? 'None';
}

function setStatus(text) {
  state.statusText = text;
}

function showPrompt(text) {
  if (!text) {
    ui.prompt.textContent = '';
    ui.prompt.classList.remove('visible');
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

function lerpAngle(current, target, alpha) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * alpha;
}

function getForwardVector(heading) {
  return new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
}

function getCameraMoveVector() {
  const move = new THREE.Vector3(
    Number(input.right) - Number(input.left),
    0,
    Number(input.down) - Number(input.up)
  );
  if (move.lengthSq() === 0) {
    return move;
  }
  move.normalize();

  const cameraForward = new THREE.Vector3();
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;
  cameraForward.normalize();

  const right = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).normalize();
  const forward = cameraForward.negate();

  const worldMove = new THREE.Vector3();
  worldMove.addScaledVector(right, move.x);
  worldMove.addScaledVector(forward, move.z);
  if (worldMove.lengthSq() > 0) {
    worldMove.normalize();
  }
  return worldMove;
}

function clampWithinBounds(position, radius, bounds) {
  position.x = clamp(position.x, bounds.minX + radius, bounds.maxX - radius);
  position.z = clamp(position.z, bounds.minZ + radius, bounds.maxZ - radius);
}

function moveActorWithinBounds(actor, deltaMove, bounds) {
  actor.group.position.add(deltaMove);
  clampWithinBounds(actor.group.position, actor.radius, bounds);
}

function enableShadows(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
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

  const initialBounds = computeVisibleBounds(root);
  const size = initialBounds.getSize(new THREE.Vector3());
  const safeHeight = Math.max(size.y, size.x, size.z, 0.001);
  const scale = targetHeight / safeHeight;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBounds = computeVisibleBounds(root);
  root.position.y += anchor === 'maxY' ? -scaledBounds.max.y : -scaledBounds.min.y;
  root.updateMatrixWorld(true);
}

function attachCalibrationHelpers(root, label, color = 0xff00ff) {
  if (!CALIBRATION) return;
  root.add(new THREE.AxesHelper(0.7));
  root.add(
    new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 1.1, 0),
      1.2,
      color
    )
  );
  const worldForward = new THREE.Vector3();
  root.getWorldDirection(worldForward);
  console.log(`[calibration] ${label} forward (-Z):`, worldForward.toArray());
}

function createFallbackAsset(entry) {
  const group = new THREE.Group();
  let mesh = null;
  switch (entry.category) {
    case 'character':
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.34, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9f2ff, roughness: 0.78 })
      );
      break;
    case 'enemy':
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.62, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xd67370, roughness: 0.82 })
      );
      break;
    case 'mechanic':
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.6, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x90b77d, roughness: 0.72 })
      );
      break;
    default:
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x91a7d0, roughness: 0.82 })
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
  if (!entry) {
    throw new Error(`Unknown asset id: ${id}`);
  }

  const promise = new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(payload);
    };

    const timeoutId = window.setTimeout(() => {
      console.warn(`[asset] timeout fallback for ${id}`);
      finish({
        id,
        scene: createFallbackAsset(entry),
        animations: [],
        isFallback: true
      });
    }, 2200);

    loader.load(
      `./assets/${entry.path}`,
      (gltf) => {
        enableShadows(gltf.scene);
        console.log(`[asset] ${id} animations:`, gltf.animations.map((clip) => clip.name));
        finish({
          id,
          scene: gltf.scene,
          animations: gltf.animations || [],
          isFallback: false
        });
      },
      undefined,
      (error) => {
        console.warn(`[asset] fallback for ${id}`, error);
        finish({
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
  attachCalibrationHelpers(visual, id, options.helperColor ?? 0xff00ff);

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
      attack: ['slash', 'punch', 'hit', 'strike'],
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

function switchAnimation(controller, desiredName, { loop = true, fadeTime = 0.12, timeScale = 1 } = {}) {
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

function removeMixer(mixer) {
  const index = mixers.indexOf(mixer);
  if (index !== -1) {
    mixers.splice(index, 1);
  }
}

function createTextSprite(label, color = '#ffd86a', scale = 1.6) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#15101a';
  ctx.lineWidth = 10;
  ctx.strokeText(label, 128, 64);
  ctx.fillText(label, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.4 * scale, 1.2 * scale, 1);
  return sprite;
}

function createActor(instance, config) {
  return {
    id: config.id,
    label: config.label,
    side: config.side,
    group: instance.group,
    animation: instance.animation,
    radius: config.radius,
    maxHealth: config.maxHealth,
    health: config.maxHealth,
    heading: config.heading ?? 0,
    knockback: new THREE.Vector3(),
    invulnTimer: 0,
    hurtTimer: 0,
    attack: null,
    attackCooldown: 0,
    specialCooldown: 0,
    specialAction: null,
    assignedMoveId: config.assignedMoveId ?? null,
    aiOffset: Math.random() * Math.PI * 2
  };
}

function resetActorCombatState(actor) {
  actor.health = actor.maxHealth;
  actor.knockback.set(0, 0, 0);
  actor.invulnTimer = 0;
  actor.hurtTimer = 0;
  actor.attack = null;
  actor.attackCooldown = 0;
  actor.specialCooldown = 0;
  actor.specialAction = null;
  actor.group.position.y = 0;
  actor.group.scale.setScalar(1);
}

function setMode(mode) {
  state.mode = mode;
  hubRoot.visible = mode === 'hub' || mode === 'reward' || mode === 'boot';
  fightRoot.visible = mode === 'fightIntro' || mode === 'fight' || mode === 'lose';
  ui.rewardOverlay.classList.toggle('visible', mode === 'reward');
  const showEnemy = Boolean(fightEnemy) && (mode === 'fightIntro' || mode === 'fight' || mode === 'lose');
  ui.enemyPanel.classList.toggle('visible', showEnemy);
  if (mode !== 'lose') {
    hideBanner();
  }
  if (mode !== 'reward') {
    ui.rewardOverlay.classList.remove('visible');
  }
  if (mode !== 'hub') {
    showPrompt('');
  }
}

function createFloor(width, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0.02 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function createRing(radius, color) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.08, 10, 48),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

async function placeStaticAsset(parent, id, options = {}) {
  const instance = await instantiateAsset(id, {
    targetHeight: options.targetHeight ?? 1.5,
    visualYawOffset: options.visualYawOffset ?? 0
  });
  instance.group.position.copy(options.position ?? new THREE.Vector3());
  instance.group.position.y += options.positionYOffset ?? 0;
  instance.group.rotation.y = options.rotationY ?? 0;
  if (options.scale) {
    instance.group.scale.multiplyScalar(options.scale);
  }
  parent.add(instance.group);
  return instance;
}

function createFightSpark(position, color, startScale = 0.3, endScale = 1.8, life = 0.18) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.06, 8, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  fightRoot.add(mesh);
  effects.push({ mesh, life, duration: life, startScale, endScale });
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.life -= dt;
    const t = 1 - Math.max(0, effect.life) / effect.duration;
    const scale = THREE.MathUtils.lerp(effect.startScale, effect.endScale, t);
    effect.mesh.scale.setScalar(scale);
    effect.mesh.material.opacity = 0.75 * (1 - t);
    if (effect.life <= 0) {
      effect.mesh.parent?.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      effects.splice(i, 1);
    }
  }
}

function clearEffects() {
  while (effects.length > 0) {
    const effect = effects.pop();
    effect.mesh.parent?.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
  }
}

function spawnProjectile(config) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(config.radius ?? 0.24, 16, 12),
    new THREE.MeshStandardMaterial({
      color: config.color ?? 0x8fd7ff,
      emissive: config.emissive ?? 0x20395f,
      roughness: 0.25,
      metalness: 0.1
    })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(config.position);
  fightRoot.add(mesh);
  projectiles.push({
    ownerSide: config.ownerSide,
    mesh,
    velocity: config.direction.clone().normalize().multiplyScalar(config.speed),
    damage: config.damage,
    knockback: config.knockback ?? 4.5,
    life: config.life ?? 1.2,
    radius: config.radius ?? 0.24
  });
}

function clearProjectiles() {
  while (projectiles.length > 0) {
    const projectile = projectiles.pop();
    projectile.mesh.parent?.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
  }
}

function releaseProjectile(index) {
  const [projectile] = projectiles.splice(index, 1);
  if (!projectile) return;
  projectile.mesh.parent?.remove(projectile.mesh);
  projectile.mesh.geometry.dispose();
  projectile.mesh.material.dispose();
}

function getOpponent(actor) {
  return actor.side === 'player' ? fightEnemy : player;
}

function getActorAimDirection(actor) {
  const target = getOpponent(actor);
  if (target) {
    const direction = target.group.position.clone().sub(actor.group.position);
    direction.y = 0;
    if (direction.lengthSq() > 0.001) {
      return direction.normalize();
    }
  }
  return getForwardVector(actor.heading);
}

const SPECIAL_MOVES = {
  diveKick: {
    id: 'diveKick',
    label: 'Dive Kick',
    description: 'Leap forward, then crash down for a single heavy hit.',
    cooldown: 3.2,
    damage: 22,
    range: 1.8,
    unlockCost: 1,
    activate(actor) {
      actor.specialCooldown = this.cooldown;
      actor.specialAction = {
        type: 'diveKick',
        moveId: this.id,
        elapsed: 0,
        duration: 0.52,
        direction: getActorAimDirection(actor),
        speed: 8.6,
        damage: this.damage,
        hit: false
      };
      createFightSpark(actor.group.position.clone().add(new THREE.Vector3(0, 0.1, 0)), 0xffd67d, 0.3, 1.0, 0.14);
    }
  },
  projectile: {
    id: 'projectile',
    label: 'Spirit Shot',
    description: 'Fire a quick projectile that travels straight ahead.',
    cooldown: 2.4,
    damage: 15,
    range: 9,
    unlockCost: 1,
    activate(actor) {
      actor.specialCooldown = this.cooldown;
      const direction = getActorAimDirection(actor);
      spawnProjectile({
        ownerSide: actor.side,
        position: actor.group.position.clone().add(new THREE.Vector3(0, 1.05, 0)),
        direction,
        speed: 11.5,
        damage: this.damage,
        knockback: 5.2,
        life: 1.35,
        radius: 0.26,
        color: actor.side === 'player' ? 0x8fe3ff : 0xff9aa6,
        emissive: actor.side === 'player' ? 0x183653 : 0x4e1c2a
      });
      createFightSpark(actor.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), actor.side === 'player' ? 0x8fe3ff : 0xff9aa6, 0.3, 1.25, 0.16);
    }
  },
  dashAttack: {
    id: 'dashAttack',
    label: 'Dash Slash',
    description: 'Burst forward in a fast straight-line strike.',
    cooldown: 3.0,
    damage: 18,
    range: 2.2,
    unlockCost: 1,
    activate(actor) {
      actor.specialCooldown = this.cooldown;
      actor.specialAction = {
        type: 'dashAttack',
        moveId: this.id,
        elapsed: 0,
        duration: 0.28,
        direction: getActorAimDirection(actor),
        speed: 13.5,
        damage: this.damage,
        hit: false
      };
      createFightSpark(actor.group.position.clone(), 0xa9fff1, 0.4, 1.35, 0.12);
    }
  }
};

function getNearestHubNpc() {
  if (!player) return null;
  let nearest = null;
  let bestDistance = Infinity;
  for (const npc of hubNpcs.values()) {
    const distance = npc.group.position.distanceTo(player.group.position);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = { npc, distance };
    }
  }
  return nearest;
}

function rerollNpcAssignments() {
  const shuffled = shuffleArray(getMoveIds());
  state.npcAssignments = {
    orc: shuffled[0],
    demon: shuffled[1]
  };
}

function renderUnlockedMoves() {
  const unlocked = getUnlockedMoveIds();
  if (unlocked.length === 0) {
    ui.unlockedMoves.innerHTML = '<li>No moves unlocked yet.</li>';
    return;
  }
  ui.unlockedMoves.innerHTML = unlocked
    .map((moveId) => {
      const suffix = state.equippedMoveId === moveId ? ' (equipped)' : '';
      return `<li>${SPECIAL_MOVES[moveId].label}${suffix}</li>`;
    })
    .join('');
}

function renderRewardChoices() {
  const choices = getUnlockedMoveIds();
  ui.rewardChoices.innerHTML = '';
  if (choices.length === 0) {
    return;
  }

  state.rewardSelection = clamp(state.rewardSelection, 0, choices.length - 1);
  choices.forEach((moveId, index) => {
    const move = SPECIAL_MOVES[moveId];
    const isSelected = index === state.rewardSelection;
    const isEquipped = state.equippedMoveId === moveId;
    const cost = isEquipped ? 0 : move.unlockCost;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `reward-choice${isSelected ? ' selected' : ''}`;
    card.innerHTML = `
      <span class="reward-meta">${isEquipped ? 'Equipped' : `Cost ${cost} EXP`}</span>
      <strong>${move.label}</strong>
      <p>${move.description}</p>
      <p>Cooldown: ${move.cooldown.toFixed(1)}s</p>
    `;
    card.addEventListener('click', () => {
      state.rewardSelection = index;
      renderRewardChoices();
    });
    card.addEventListener('dblclick', () => {
      attemptEquipMove(moveId);
    });
    ui.rewardChoices.appendChild(card);
  });

  const unlockedFrom = state.currentNpcId ? NPC_DEFS[state.currentNpcId].label : 'the arena';
  const lastLabel = state.lastUnlockedMoveId ? SPECIAL_MOVES[state.lastUnlockedMoveId].label : 'a move';
  ui.rewardSubtitle.textContent = `You learned ${lastLabel} from ${unlockedFrom}.`;
  ui.rewardExp.textContent = `EXP: ${state.exp}`;
}

function updateHud() {
  ui.modeLabel.textContent = getModeLabel(state.mode);
  ui.statusLabel.textContent = state.statusText;
  ui.playerHealthLabel.textContent = player
    ? `${Math.ceil(player.health)} / ${player.maxHealth}`
    : '--';
  ui.playerHealthBar.style.transform = `scaleX(${player ? player.health / player.maxHealth : 0})`;

  if (fightEnemy && (state.mode === 'fightIntro' || state.mode === 'fight' || state.mode === 'lose')) {
    ui.enemyHealthLabel.textContent = `${fightEnemy.label}: ${Math.ceil(fightEnemy.health)} / ${fightEnemy.maxHealth}`;
    ui.enemyHealthBar.style.transform = `scaleX(${fightEnemy.health / fightEnemy.maxHealth})`;
  } else {
    ui.enemyHealthLabel.textContent = '--';
    ui.enemyHealthBar.style.transform = 'scaleX(0)';
  }

  ui.expLabel.textContent = String(state.exp);
  ui.equippedMoveLabel.textContent = getMoveLabel(state.equippedMoveId);
  ui.lastUnlockLabel.textContent = getMoveLabel(state.lastUnlockedMoveId);
  renderUnlockedMoves();
  if (state.mode === 'reward') {
    renderRewardChoices();
  }
}

function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, CONFIG.ambientLight);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff7e1, CONFIG.directionalLight);
  key.position.set(10, 18, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x87b8ff, CONFIG.fillLight);
  fill.position.set(-12, 8, -10);
  scene.add(fill);
}

async function buildHubEnvironment() {
  const floor = createFloor(26, 26, 0x27364f);
  hubRoot.add(floor);

  const ring = createRing(4.5, 0x4f6188);
  ring.position.y = 0.04;
  hubRoot.add(ring);

  const innerPad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.35, 32),
    new THREE.MeshStandardMaterial({ color: 0x314867, roughness: 0.9 })
  );
  innerPad.receiveShadow = true;
  innerPad.castShadow = true;
  innerPad.position.y = 0.16;
  hubRoot.add(innerPad);

  const fencePromises = [];
  const topZ = -11.2;
  const bottomZ = 11.2;
  const leftX = -11.2;
  const rightX = 11.2;
  const fenceXs = [-7.4, -3.7, 0, 3.7, 7.4];
  const fenceZs = [-7.4, -3.7, 0, 3.7, 7.4];

  for (const x of fenceXs) {
    fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_middle', {
      targetHeight: 2.15,
      position: new THREE.Vector3(x, 0, topZ)
    }));
    fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_middle', {
      targetHeight: 2.15,
      position: new THREE.Vector3(x, 0, bottomZ),
      rotationY: Math.PI
    }));
  }

  for (const z of fenceZs) {
    fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_middle', {
      targetHeight: 2.15,
      position: new THREE.Vector3(leftX, 0, z),
      rotationY: -Math.PI / 2
    }));
    fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_middle', {
      targetHeight: 2.15,
      position: new THREE.Vector3(rightX, 0, z),
      rotationY: Math.PI / 2
    }));
  }

  fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_corner', {
    targetHeight: 2.15,
    position: new THREE.Vector3(leftX, 0, topZ)
  }));
  fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_corner', {
    targetHeight: 2.15,
    position: new THREE.Vector3(rightX, 0, topZ),
    rotationY: Math.PI / 2
  }));
  fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_corner', {
    targetHeight: 2.15,
    position: new THREE.Vector3(leftX, 0, bottomZ),
    rotationY: -Math.PI / 2
  }));
  fencePromises.push(placeStaticAsset(hubRoot, 'env_fence_corner', {
    targetHeight: 2.15,
    position: new THREE.Vector3(rightX, 0, bottomZ),
    rotationY: Math.PI
  }));

  await Promise.all(fencePromises);

  await Promise.all([
    placeStaticAsset(hubRoot, 'env_rock_platform_large', {
      targetHeight: 4.6,
      position: new THREE.Vector3(-8.3, 0, 6.7),
      rotationY: 0.9,
      scale: 0.95
    }),
    placeStaticAsset(hubRoot, 'env_rock_platform_medium', {
      targetHeight: 3.2,
      position: new THREE.Vector3(7.8, 0, 7.4),
      rotationY: -0.4,
      scale: 0.9
    }),
    placeStaticAsset(hubRoot, 'env_rock_large', {
      targetHeight: 1.6,
      position: new THREE.Vector3(-7.6, 0, -8.2),
      rotationY: 0.5
    }),
    placeStaticAsset(hubRoot, 'env_rock_small', {
      targetHeight: 1.1,
      position: new THREE.Vector3(-9.6, 0, -5.8),
      rotationY: 0.3
    }),
    placeStaticAsset(hubRoot, 'env_rock_large', {
      targetHeight: 1.7,
      position: new THREE.Vector3(8.6, 0, -8.4),
      rotationY: -0.2
    }),
    placeStaticAsset(hubRoot, 'env_rock_small', {
      targetHeight: 1.0,
      position: new THREE.Vector3(9.6, 0, -5.8),
      rotationY: 0.8
    }),
    placeStaticAsset(hubRoot, 'mechanic_door', {
      targetHeight: 2.8,
      position: new THREE.Vector3(0, 0, -9.9)
    })
  ]);
}

async function buildFightEnvironment() {
  const floor = createFloor(15.5, 13.5, 0x1d2940);
  fightRoot.add(floor);

  const arenaPad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.8, 4.8, 0.26, 40),
    new THREE.MeshStandardMaterial({ color: 0x31486a, roughness: 0.92 })
  );
  arenaPad.castShadow = true;
  arenaPad.receiveShadow = true;
  arenaPad.position.y = 0.12;
  fightRoot.add(arenaPad);

  const ring = createRing(4.5, 0xffd98a);
  ring.position.y = 0.15;
  fightRoot.add(ring);

  await Promise.all([
    placeStaticAsset(fightRoot, 'env_rock_platform_large', {
      targetHeight: 4.3,
      position: new THREE.Vector3(-5.8, 0, 3.9),
      rotationY: 0.9,
      scale: 0.8
    }),
    placeStaticAsset(fightRoot, 'env_rock_platform_medium', {
      targetHeight: 3.2,
      position: new THREE.Vector3(5.6, 0, -3.6),
      rotationY: 0.4,
      scale: 0.9
    }),
    placeStaticAsset(fightRoot, 'env_rock_large', {
      targetHeight: 1.5,
      position: new THREE.Vector3(-5.6, 0, -3.8)
    }),
    placeStaticAsset(fightRoot, 'env_rock_large', {
      targetHeight: 1.5,
      position: new THREE.Vector3(5.8, 0, 3.7),
      rotationY: 0.5
    }),
    placeStaticAsset(fightRoot, 'mechanic_door', {
      targetHeight: 2.8,
      position: new THREE.Vector3(0, 0, -5.4)
    })
  ]);
}

async function spawnPlayer() {
  const instance = await instantiateAsset('player_knight', {
    targetHeight: CONFIG.player.targetHeight,
    visualYawOffset: CONFIG.player.visualYawOffset,
    helperColor: 0x6ce1ff
  });
  const actor = createActor(instance, {
    id: 'player',
    label: 'Knight',
    side: 'player',
    radius: CONFIG.player.radius,
    maxHealth: CONFIG.player.maxHealth,
    heading: Math.PI
  });
  actor.group.position.copy(CONFIG.hub.playerSpawn);
  actor.group.rotation.y = actor.heading;
  switchAnimation(actor.animation, 'idle', { loop: true, timeScale: 1 });
  return actor;
}

async function spawnHubNpcs() {
  for (const def of Object.values(NPC_DEFS)) {
    const instance = await instantiateAsset(def.assetId, {
      targetHeight: CONFIG.enemy.targetHeight,
      visualYawOffset: CONFIG.enemy.visualYawOffset,
      helperColor: def.markerColor
    });
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.08, 10, 36),
      new THREE.MeshBasicMaterial({ color: def.markerColor })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.04;
    instance.group.add(marker);

    const label = createTextSprite(def.label, def.color, 0.8);
    label.position.set(0, 2.9, 0);
    instance.group.add(label);

    instance.group.position.copy(def.hubPosition);
    instance.group.rotation.y = Math.PI;
    hubRoot.add(instance.group);
    switchAnimation(instance.animation, 'idle', { loop: true, timeScale: 1 });

    hubNpcs.set(def.id, {
      id: def.id,
      label: def.label,
      assetId: def.assetId,
      color: def.color,
      marker,
      labelSprite: label,
      group: instance.group,
      animation: instance.animation,
      radius: CONFIG.enemy.radius
    });
  }
}

function destroyFightEnemy() {
  if (!fightEnemy) return;
  if (fightEnemy.animation?.mixer) {
    removeMixer(fightEnemy.animation.mixer);
  }
  fightEnemy.group.parent?.remove(fightEnemy.group);
  fightEnemy = null;
}

async function spawnFightEnemy(npcId) {
  destroyFightEnemy();
  const def = NPC_DEFS[npcId];
  const instance = await instantiateAsset(def.assetId, {
    targetHeight: CONFIG.enemy.targetHeight,
    visualYawOffset: CONFIG.enemy.visualYawOffset,
    helperColor: def.markerColor
  });
  const actor = createActor(instance, {
    id: def.id,
    label: def.label,
    side: 'enemy',
    radius: CONFIG.enemy.radius,
    maxHealth: def.maxHealth,
    heading: -Math.PI / 2,
    assignedMoveId: state.npcAssignments[npcId]
  });
  actor.group.position.copy(CONFIG.fight.enemySpawn);
  actor.group.rotation.y = actor.heading;
  actor.specialCooldown = 1.0;
  actor.attackCooldown = 0.4;
  fightRoot.add(actor.group);
  switchAnimation(actor.animation, 'idle', { loop: true, timeScale: 1 });
  fightEnemy = actor;
}

function resetPlayerForHub() {
  resetActorCombatState(player);
  if (player.group.parent !== hubRoot) {
    hubRoot.add(player.group);
  }
  player.group.position.copy(CONFIG.hub.playerSpawn);
  player.heading = Math.PI;
  player.group.rotation.y = player.heading;
  switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
}

function openRewardOverlayForMove(moveId) {
  if (moveId && SPECIAL_MOVES[moveId]) {
    state.unlockedMoves.add(moveId);
    state.lastUnlockedMoveId = moveId;
  }
  const choices = getUnlockedMoveIds();
  state.rewardSelection = Math.max(0, choices.indexOf(state.lastUnlockedMoveId));
  renderRewardChoices();
  setMode('reward');
}

function attemptEquipMove(moveId = getUnlockedMoveIds()[state.rewardSelection]) {
  if (!moveId || !SPECIAL_MOVES[moveId] || !state.unlockedMoves.has(moveId)) {
    return false;
  }

  const cost = state.equippedMoveId === moveId ? 0 : SPECIAL_MOVES[moveId].unlockCost;
  if (cost > state.exp) {
    setStatus('Not enough EXP to equip that move yet.');
    return false;
  }

  if (cost > 0) {
    state.exp -= cost;
  }
  state.equippedMoveId = moveId;
  state.currentNpcId = null;
  setStatus(`Equipped ${SPECIAL_MOVES[moveId].label}.`);
  setMode('hub');
  return true;
}

function handleDuelWin() {
  const unlockedMoveId = state.npcAssignments[state.currentNpcId];
  state.exp += 1;
  state.lastUnlockedMoveId = unlockedMoveId;
  state.unlockedMoves.add(unlockedMoveId);
  clearProjectiles();
  clearEffects();
  destroyFightEnemy();
  resetPlayerForHub();
  setStatus(`Victory. ${SPECIAL_MOVES[unlockedMoveId].label} unlocked. Spend 1 EXP to equip it.`);
  openRewardOverlayForMove(unlockedMoveId);
}

function handleDuelLoss() {
  clearMovementInput();
  clearProjectiles();
  clearEffects();
  setMode('lose');
  setStatus('Defeated. Press R to start a new run.');
  switchAnimation(player.animation, 'death', { loop: false, fadeTime: 0.08, timeScale: 1 });
  showBanner('Run Failed', 'Your unlocked moves are lost. Press R to reroll the duelists.');
}

function handleDuelResult(result) {
  if (state.mode !== 'fight' && state.mode !== 'fightIntro') return;
  if (result === 'win') {
    handleDuelWin();
  } else {
    handleDuelLoss();
  }
}

async function startFight(npcId) {
  if (!state.ready || state.transitionLock || state.mode !== 'hub') {
    return false;
  }
  if (!NPC_DEFS[npcId]) {
    return false;
  }

  state.transitionLock = true;
  clearMovementInput();
  showPrompt('');
  state.currentNpcId = npcId;
  setStatus(`Challenging ${NPC_DEFS[npcId].label}.`);

  if (player.group.parent !== fightRoot) {
    fightRoot.add(player.group);
  }
  resetActorCombatState(player);
  player.group.position.copy(CONFIG.fight.playerSpawn);
  player.heading = Math.PI / 2;
  player.group.rotation.y = player.heading;
  switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });

  await spawnFightEnemy(npcId);
  resetActorCombatState(fightEnemy);
  fightEnemy.specialCooldown = 1.0;
  fightEnemy.attackCooldown = 0.4;
  fightEnemy.group.position.copy(CONFIG.fight.enemySpawn);
  fightEnemy.heading = -Math.PI / 2;
  fightEnemy.group.rotation.y = fightEnemy.heading;

  state.fightIntroTimer = CONFIG.fight.introSeconds;
  setMode('fightIntro');
  setStatus(`${NPC_DEFS[npcId].label} steps into the ring.`);
  state.transitionLock = false;
  return true;
}

function restartRun() {
  clearMovementInput();
  clearProjectiles();
  clearEffects();
  destroyFightEnemy();
  state.exp = 0;
  state.equippedMoveId = null;
  state.lastUnlockedMoveId = null;
  state.unlockedMoves.clear();
  state.currentNpcId = null;
  rerollNpcAssignments();
  resetPlayerForHub();
  hideBanner();
  setMode('hub');
  setStatus('New run started. Challenge a duelist.');
}

function updateHubNpcs(dt) {
  const time = clock.elapsedTime;
  for (const npc of hubNpcs.values()) {
    npc.marker.rotation.z += dt * 1.2;
    npc.marker.position.y = 0.04 + Math.sin(time * 2 + npc.marker.position.x) * 0.02;
    npc.labelSprite.position.y = 2.75 + Math.sin(time * 2.2 + npc.group.position.x) * 0.08;
    switchAnimation(npc.animation, 'idle', { loop: true, timeScale: 1 });
  }
}

function updateHubPlayer(dt) {
  const worldMove = getCameraMoveVector();
  const hasMovement = worldMove.lengthSq() > 0;

  if (hasMovement) {
    player.heading = Math.atan2(worldMove.x, worldMove.z);
  }

  moveActorWithinBounds(player, worldMove.multiplyScalar(CONFIG.player.hubSpeed * dt), CONFIG.hub.bounds);
  player.group.rotation.y = lerpAngle(
    player.group.rotation.y,
    player.heading,
    Math.min(1, dt * 12)
  );

  if (hasMovement) {
    switchAnimation(player.animation, 'run', { loop: true, timeScale: 1.08 });
  } else {
    switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
  }
}

function updateHubPrompt() {
  const nearest = getNearestHubNpc();
  nearestNpcId = nearest?.npc.id ?? null;
  if (!nearest || nearest.distance > CONFIG.hub.interactRadius) {
    showPrompt('');
    return;
  }
  showPrompt(`Press E to challenge ${nearest.npc.label}`);
}

function updateActorTimers(actor, dt) {
  actor.invulnTimer = Math.max(0, actor.invulnTimer - dt);
  actor.hurtTimer = Math.max(0, actor.hurtTimer - dt);
  actor.attackCooldown = Math.max(0, actor.attackCooldown - dt);
  actor.specialCooldown = Math.max(0, actor.specialCooldown - dt);
  if (actor.knockback.lengthSq() > 0.0001) {
    moveActorWithinBounds(actor, actor.knockback.clone().multiplyScalar(dt), CONFIG.fight.bounds);
    actor.knockback.lerp(new THREE.Vector3(), Math.min(1, dt * 10));
  }
  actor.group.scale.setScalar(1 + actor.hurtTimer * 0.1);
}

function canHitTarget(actor, target, definition) {
  if (!target || target.health <= 0) return false;
  const delta = target.group.position.clone().sub(actor.group.position);
  delta.y = 0;
  const distance = delta.length();
  if (distance > definition.range + target.radius) {
    return false;
  }
  const forward = getForwardVector(actor.heading);
  if (distance <= 0.001) {
    return true;
  }
  return delta.normalize().dot(forward) >= definition.arcCos;
}

function applyDamage(target, amount, direction, options = {}) {
  if (!target || target.health <= 0 || target.invulnTimer > 0) {
    return false;
  }

  target.health = Math.max(0, target.health - amount);
  target.invulnTimer = options.invuln ?? 0.16;
  target.hurtTimer = 0.18;
  if (direction.lengthSq() > 0.001) {
    target.knockback.add(direction.clone().normalize().multiplyScalar(options.knockback ?? 4.5));
  }
  createFightSpark(
    target.group.position.clone().add(new THREE.Vector3(0, 0.7, 0)),
    target.side === 'player' ? 0xff8da3 : 0xc0edff,
    0.25,
    1.2,
    0.16
  );

  if (target.health <= 0) {
    if (target.side === 'enemy') {
      handleDuelResult('win');
    } else {
      handleDuelResult('lose');
    }
  }
  return true;
}

function startAttack(actor, definition) {
  if (actor.attack || actor.specialAction || actor.health <= 0) {
    return false;
  }
  actor.attack = {
    definition,
    timer: 0,
    hitResolved: false
  };
  actor.attackCooldown = Math.max(actor.attackCooldown, 0.18);
  switchAnimation(actor.animation, 'attack', { loop: false, fadeTime: 0.08, timeScale: definition === ATTACK_DEFS.heavy ? 0.95 : 1.08 });
  return true;
}

function updateAttack(actor, dt) {
  if (!actor.attack) return false;
  const attack = actor.attack;
  attack.timer += dt;

  if (!attack.hitResolved && attack.timer >= attack.definition.activeTime) {
    attack.hitResolved = true;
    const target = getOpponent(actor);
    if (canHitTarget(actor, target, attack.definition)) {
      const direction = target.group.position.clone().sub(actor.group.position);
      direction.y = 0;
      if (direction.lengthSq() <= 0.001) {
        direction.copy(getForwardVector(actor.heading));
      }
      applyDamage(target, attack.definition.damage, direction, {
        knockback: attack.definition.knockback,
        invuln: attack.definition.invuln
      });
    } else {
      createFightSpark(
        actor.group.position.clone().add(getForwardVector(actor.heading).multiplyScalar(1.4)).add(new THREE.Vector3(0, 0.7, 0)),
        0xffefb8,
        0.2,
        0.8,
        0.1
      );
    }
  }

  if (attack.timer >= attack.definition.totalTime) {
    actor.attack = null;
    return false;
  }
  return true;
}

function startSpecialMove(actor, moveId) {
  const move = SPECIAL_MOVES[moveId];
  if (!move || actor.specialCooldown > 0 || actor.attack || actor.specialAction) {
    return false;
  }
  move.activate(actor);
  return true;
}

function updateSpecialAction(actor, dt) {
  if (!actor.specialAction) return false;
  const action = actor.specialAction;
  action.elapsed += dt;

  if (action.type === 'dashAttack') {
    moveActorWithinBounds(actor, action.direction.clone().multiplyScalar(action.speed * dt), CONFIG.fight.bounds);
    actor.heading = Math.atan2(action.direction.x, action.direction.z);
    actor.group.rotation.y = lerpAngle(actor.group.rotation.y, actor.heading, Math.min(1, dt * 22));
    switchAnimation(actor.animation, 'attack', { loop: false, fadeTime: 0.04, timeScale: 1.25 });

    if (!action.hit) {
      const target = getOpponent(actor);
      if (target && actor.group.position.distanceTo(target.group.position) <= actor.radius + target.radius + 0.85) {
        action.hit = true;
        const direction = target.group.position.clone().sub(actor.group.position);
        direction.y = 0;
        applyDamage(target, action.damage, direction, { knockback: 7.2, invuln: 0.18 });
      }
    }
  } else if (action.type === 'diveKick') {
    const progress = clamp(action.elapsed / action.duration, 0, 1);
    const speed = progress < 0.45 ? action.speed * 0.55 : action.speed * 1.15;
    moveActorWithinBounds(actor, action.direction.clone().multiplyScalar(speed * dt), CONFIG.fight.bounds);
    actor.heading = Math.atan2(action.direction.x, action.direction.z);
    actor.group.rotation.y = lerpAngle(actor.group.rotation.y, actor.heading, Math.min(1, dt * 18));
    actor.group.position.y = Math.sin(progress * Math.PI) * 1.65;
    switchAnimation(actor.animation, 'attack', { loop: false, fadeTime: 0.04, timeScale: 1.08 });

    if (!action.hit && progress > 0.52) {
      const target = getOpponent(actor);
      if (target && actor.group.position.distanceTo(target.group.position) <= actor.radius + target.radius + 0.8) {
        action.hit = true;
        const direction = target.group.position.clone().sub(actor.group.position);
        direction.y = 0;
        applyDamage(target, action.damage, direction, { knockback: 8.4, invuln: 0.2 });
      }
    }
  }

  if (action.elapsed >= action.duration) {
    actor.group.position.y = 0;
    actor.specialAction = null;
    return false;
  }
  return true;
}

function updateProjectiles(dt) {
  if (projectiles.length === 0) return;
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.life -= dt;
    projectile.mesh.position.addScaledVector(projectile.velocity, dt);

    if (projectile.life <= 0) {
      releaseProjectile(i);
      continue;
    }

    const target = projectile.ownerSide === 'player' ? fightEnemy : player;
    if (!target || (state.mode !== 'fight' && state.mode !== 'fightIntro')) {
      continue;
    }

    const distance = projectile.mesh.position.distanceTo(target.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)));
    if (distance <= projectile.radius + target.radius) {
      const direction = target.group.position.clone().sub(projectile.mesh.position);
      direction.y = 0;
      if (direction.lengthSq() <= 0.001) {
        direction.copy(getActorAimDirection(target));
      }
      applyDamage(target, projectile.damage, direction, {
        knockback: projectile.knockback,
        invuln: 0.18
      });
      releaseProjectile(i);
      continue;
    }

    if (
      Math.abs(projectile.mesh.position.x) > CONFIG.fight.bounds.maxX + 3 ||
      Math.abs(projectile.mesh.position.z) > CONFIG.fight.bounds.maxZ + 3
    ) {
      releaseProjectile(i);
    }
  }
}

function updateHubMode(dt) {
  updateHubPlayer(dt);
  updateHubNpcs(dt);
  updateHubPrompt();
}

function updateRewardMode(dt) {
  switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
  updateHubNpcs(dt);
}

function updateFightIntro(dt) {
  state.fightIntroTimer = Math.max(0, state.fightIntroTimer - dt);
  player.heading = Math.atan2(
    fightEnemy.group.position.x - player.group.position.x,
    fightEnemy.group.position.z - player.group.position.z
  );
  fightEnemy.heading = Math.atan2(
    player.group.position.x - fightEnemy.group.position.x,
    player.group.position.z - fightEnemy.group.position.z
  );
  player.group.rotation.y = lerpAngle(player.group.rotation.y, player.heading, Math.min(1, dt * 10));
  fightEnemy.group.rotation.y = lerpAngle(fightEnemy.group.rotation.y, fightEnemy.heading, Math.min(1, dt * 10));
  switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
  switchAnimation(fightEnemy.animation, 'idle', { loop: true, timeScale: 1 });

  if (state.fightIntroTimer === 0) {
    setMode('fight');
    setStatus(`${fightEnemy.label} uses ${getMoveLabel(fightEnemy.assignedMoveId)}.`);
  }
}

function updateFightPlayer(dt) {
  updateActorTimers(player, dt);
  const specialActive = updateSpecialAction(player, dt);
  updateAttack(player, dt);

  if (specialActive) {
    return;
  }

  const worldMove = getCameraMoveVector();
  const hasMovement = worldMove.lengthSq() > 0;
  let speed = CONFIG.player.fightSpeed;
  if (player.attack) {
    speed *= player.attack.definition.moveFactor;
  }
  if (player.hurtTimer > 0) {
    speed *= 0.65;
  }

  if (hasMovement) {
    player.heading = Math.atan2(worldMove.x, worldMove.z);
  }

  moveActorWithinBounds(player, worldMove.multiplyScalar(speed * dt), CONFIG.fight.bounds);
  player.group.rotation.y = lerpAngle(
    player.group.rotation.y,
    player.heading,
    Math.min(1, dt * 14)
  );

  if (player.attack) {
    switchAnimation(player.animation, 'attack', { loop: false, fadeTime: 0.08, timeScale: 1 });
  } else if (hasMovement) {
    switchAnimation(player.animation, 'run', { loop: true, timeScale: 1.04 });
  } else {
    switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
  }
}

function shouldEnemyUseSpecial(enemy, distance) {
  if (!enemy.assignedMoveId) return false;
  if (enemy.specialCooldown > 0) return false;
  switch (enemy.assignedMoveId) {
    case 'projectile':
      return distance >= 3 && distance <= 8.5;
    case 'dashAttack':
      return distance >= 1.8 && distance <= 4.5;
    case 'diveKick':
      return distance >= 1.5 && distance <= 3.8;
    default:
      return false;
  }
}

function updateFightEnemy(dt) {
  if (!fightEnemy) return;

  updateActorTimers(fightEnemy, dt);
  const specialActive = updateSpecialAction(fightEnemy, dt);
  const attackActive = updateAttack(fightEnemy, dt);
  if (state.mode !== 'fight') {
    switchAnimation(fightEnemy.animation, 'idle', { loop: true, timeScale: 1 });
    return;
  }

  const toPlayer = player.group.position.clone().sub(fightEnemy.group.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  const direction = distance > 0.001 ? toPlayer.normalize() : getForwardVector(fightEnemy.heading);
  const lateral = new THREE.Vector3(-direction.z, 0, direction.x);

  if (!specialActive && !attackActive) {
    if (shouldEnemyUseSpecial(fightEnemy, distance)) {
      startSpecialMove(fightEnemy, fightEnemy.assignedMoveId);
      return;
    }
    if (fightEnemy.attackCooldown <= 0 && distance <= ATTACK_DEFS.enemy.range + player.radius) {
      startAttack(fightEnemy, ATTACK_DEFS.enemy);
      fightEnemy.attackCooldown = 0.75;
      return;
    }
  }

  if (specialActive || attackActive) {
    return;
  }

  const move = new THREE.Vector3();
  if (distance > 2.1) {
    move.add(direction);
  } else if (distance < 1.4) {
    move.addScaledVector(direction, -0.8);
  }
  move.addScaledVector(lateral, Math.sin(clock.elapsedTime * 1.7 + fightEnemy.aiOffset) * 0.18);
  if (move.lengthSq() > 1) {
    move.normalize();
  }

  if (move.lengthSq() > 0.001) {
    fightEnemy.heading = Math.atan2(move.x, move.z);
    moveActorWithinBounds(fightEnemy, move.multiplyScalar(3.0 * dt), CONFIG.fight.bounds);
    switchAnimation(fightEnemy.animation, 'walk', { loop: true, timeScale: 0.95 });
  } else {
    fightEnemy.heading = Math.atan2(direction.x, direction.z);
    switchAnimation(fightEnemy.animation, 'idle', { loop: true, timeScale: 1 });
  }

  fightEnemy.group.rotation.y = lerpAngle(
    fightEnemy.group.rotation.y,
    fightEnemy.heading,
    Math.min(1, dt * 10)
  );
}

function updateCamera(dt) {
  if (!player) return;

  let desired = null;
  let target = null;

  if (state.mode === 'fightIntro' || state.mode === 'fight' || state.mode === 'lose') {
    const focus = fightEnemy
      ? player.group.position.clone().lerp(fightEnemy.group.position, 0.5)
      : player.group.position.clone();
    desired = focus.clone().add(CONFIG.camera.fightOffset);
    target = focus.clone().add(CONFIG.camera.fightLookOffset);
  } else {
    desired = player.group.position.clone().add(CONFIG.camera.hubOffset);
    target = player.group.position.clone().add(CONFIG.camera.hubLookOffset);
  }

  camera.position.lerp(desired, Math.min(1, dt * 3.6));
  camera.lookAt(target);
}

function tryPlayerAttack(kind) {
  if (state.mode !== 'fight') return;
  if (kind === 'light') {
    startAttack(player, ATTACK_DEFS.light);
  } else {
    startAttack(player, ATTACK_DEFS.heavy);
  }
}

function tryPlayerSpecial() {
  if (state.mode !== 'fight') return;
  if (!state.equippedMoveId) {
    setStatus('No special equipped. Win a duel and spend EXP to equip one.');
    return;
  }
  const success = startSpecialMove(player, state.equippedMoveId);
  if (!success && player.specialCooldown > 0) {
    setStatus(`${getMoveLabel(state.equippedMoveId)} cooldown: ${player.specialCooldown.toFixed(1)}s`);
  }
}

function handleRewardKeyDown(event) {
  const choices = getUnlockedMoveIds();
  if (choices.length === 0) {
    if (event.code === 'Escape' || event.code === 'KeyE') {
      state.currentNpcId = null;
      setMode('hub');
    }
    return;
  }

  switch (event.code) {
    case 'KeyA':
    case 'ArrowLeft':
      event.preventDefault();
      state.rewardSelection = (state.rewardSelection - 1 + choices.length) % choices.length;
      renderRewardChoices();
      break;
    case 'KeyD':
    case 'ArrowRight':
      event.preventDefault();
      state.rewardSelection = (state.rewardSelection + 1) % choices.length;
      renderRewardChoices();
      break;
    case 'Digit1':
      state.rewardSelection = 0;
      renderRewardChoices();
      break;
    case 'Digit2':
      if (choices[1]) {
        state.rewardSelection = 1;
        renderRewardChoices();
      }
      break;
    case 'Digit3':
      if (choices[2]) {
        state.rewardSelection = 2;
        renderRewardChoices();
      }
      break;
    case 'KeyE':
      event.preventDefault();
      attemptEquipMove();
      break;
    case 'Escape':
      event.preventDefault();
      state.currentNpcId = null;
      setMode('hub');
      setStatus('Reward saved. Equip it later after the next win.');
      break;
    default:
      break;
  }
}

function setupInput() {
  window.addEventListener('keydown', (event) => {
    if (state.mode === 'reward') {
      handleRewardKeyDown(event);
      return;
    }

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
      case 'KeyE':
        if (!event.repeat && state.mode === 'hub' && nearestNpcId) {
          void startFight(nearestNpcId);
        }
        break;
      case 'KeyJ':
        if (!event.repeat) {
          tryPlayerAttack('light');
        }
        break;
      case 'KeyK':
        if (!event.repeat) {
          tryPlayerAttack('heavy');
        }
        break;
      case 'KeyL':
        if (!event.repeat) {
          tryPlayerSpecial();
        }
        break;
      case 'KeyR':
        if (!event.repeat) {
          restartRun();
        }
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

window.__TEST__ = {
  ready: false,
  getState: () => ({
    ready: state.ready,
    mode: state.mode,
    exp: state.exp,
    equippedMoveId: state.equippedMoveId,
    lastUnlockedMoveId: state.lastUnlockedMoveId,
    unlockedMoves: getUnlockedMoveIds(),
    npcAssignments: { ...state.npcAssignments },
    currentNpcId: state.currentNpcId,
    rewardActive: state.mode === 'reward',
    player: player
      ? {
          x: Number(player.group.position.x.toFixed(2)),
          z: Number(player.group.position.z.toFixed(2)),
          health: Number(player.health.toFixed(2)),
          specialCooldown: Number(player.specialCooldown.toFixed(2))
        }
      : null,
    enemy: fightEnemy
      ? {
          id: fightEnemy.id,
          health: Number(fightEnemy.health.toFixed(2)),
          assignedMoveId: fightEnemy.assignedMoveId
        }
      : null
  }),
  restartRun: () => {
    restartRun();
    return window.__TEST__.getState();
  },
  startFight: async (npcId) => {
    await startFight(npcId);
    return window.__TEST__.getState();
  },
  forceWin: () => {
    if (state.mode !== 'fight' && state.mode !== 'fightIntro') return false;
    handleDuelResult('win');
    return true;
  },
  forceLose: () => {
    if (state.mode !== 'fight' && state.mode !== 'fightIntro') return false;
    handleDuelResult('lose');
    return true;
  },
  openRewardForMove: (moveId) => {
    openRewardOverlayForMove(moveId);
    return window.__TEST__.getState();
  },
  equipMove: (moveId) => {
    attemptEquipMove(moveId);
    return window.__TEST__.getState();
  },
  grantExp: (amount = 1) => {
    state.exp += amount;
    return window.__TEST__.getState();
  }
};

async function init() {
  createLights();
  setupInput();
  setStatus('Loading assets');
  updateHud();

  await fetchAssetCatalog();
  await buildHubEnvironment();
  await buildFightEnvironment();
  await spawnHubNpcs();

  player = await spawnPlayer();
  hubRoot.add(player.group);
  rerollNpcAssignments();
  setMode('hub');
  setStatus('Challenge a duelist.');

  camera.position.copy(player.group.position).add(CONFIG.camera.hubOffset);
  camera.lookAt(player.group.position.clone().add(CONFIG.camera.hubLookOffset));

  state.ready = true;
  window.__TEST__.ready = true;
  updateHud();
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());

  if (state.ready) {
    switch (state.mode) {
      case 'hub':
        updateHubMode(dt);
        break;
      case 'fightIntro':
        updateFightIntro(dt);
        break;
      case 'fight':
        updateFightPlayer(dt);
        updateFightEnemy(dt);
        break;
      case 'reward':
        updateRewardMode(dt);
        break;
      case 'lose':
        updateActorTimers(player, dt);
        if (fightEnemy) {
          updateActorTimers(fightEnemy, dt);
          switchAnimation(fightEnemy.animation, 'idle', { loop: true, timeScale: 1 });
        }
        break;
      default:
        break;
    }

    updateProjectiles(dt);
    updateEffects(dt);
    for (const mixer of mixers) {
      mixer.update(dt);
    }
    updateCamera(dt);
    updateHud();
  }

  renderer.render(scene, camera);
}

init()
  .catch((error) => {
    console.error(error);
    setStatus('Failed to load game.');
    showBanner('Load Failed', String(error));
  })
  .finally(() => {
    renderer.setAnimationLoop(animate);
  });
