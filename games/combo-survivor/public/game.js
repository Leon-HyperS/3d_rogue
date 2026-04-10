import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const query = new URLSearchParams(window.location.search);
const DEBUG = query.get('debug') === '1';
const CALIBRATION = query.get('calibration') === '1' || DEBUG;

const ui = {
  wave: document.getElementById('wave'),
  timer: document.getElementById('timer'),
  healthLabel: document.getElementById('healthLabel'),
  healthBar: document.getElementById('healthBar'),
  staminaLabel: document.getElementById('staminaLabel'),
  staminaBar: document.getElementById('staminaBar'),
  xpLabel: document.getElementById('xpLabel'),
  xpBar: document.getElementById('xpBar'),
  level: document.getElementById('level'),
  specialLabel: document.getElementById('specialLabel'),
  status: document.getElementById('status'),
  skillList: document.getElementById('skillList'),
  prompt: document.getElementById('prompt'),
  flash: document.getElementById('flash'),
  banner: document.getElementById('banner'),
  bannerTitle: document.getElementById('bannerTitle'),
  bannerText: document.getElementById('bannerText'),
  draftOverlay: document.getElementById('draftOverlay'),
  draftButtons: [
    document.getElementById('draftChoice0'),
    document.getElementById('draftChoice1'),
    document.getElementById('draftChoice2')
  ]
};

const CONFIG = {
  arenaHalf: 20,
  floorColor: 0x1a2038,
  floorAccent: 0x2b3357,
  wallColor: 0x354567,
  wallHeight: 2.6,
  timerSeconds: 105,
  player: {
    radius: 0.55,
    walkSpeed: 5.7,
    attackMoveSpeed: 3.1,
    dashSpeed: 17,
    dashDuration: 0.2,
    dashIFrames: 0.24,
    dashCost: 28,
    maxStamina: 100,
    staminaRecharge: 26,
    maxHealth: 100,
    targetHeight: 2.15,
    visualYawOffset: 0,
    specialCooldown: 8.5,
    specialRadius: 4.2,
    specialDamage: 24
  },
  enemy: {
    groundTargetHeight: 2.45,
    blobTargetHeight: 1.55,
    flyingTargetHeight: 1.85,
    eliteTargetHeight: 3.0
  },
  pickup: {
    magnetRadius: 3.4,
    collectRadius: 1.1
  },
  cameraOffset: new THREE.Vector3(0, 13.5, 12.4),
  cameraLookOffset: new THREE.Vector3(0, 1.4, 0),
  ambientLight: 0.62,
  directionalLight: 1.42,
  fillLight: 0.35,
  intermission: 2.1
};

const ATTACK_CHAIN = [
  {
    id: 'light_1',
    damage: 14,
    range: 2.3,
    radius: 1.35,
    arcCos: Math.cos(THREE.MathUtils.degToRad(65)),
    activeTime: 0.1,
    queueOpen: 0.12,
    totalTime: 0.28,
    moveFactor: 0.6,
    knockback: 4.8,
    stun: 0.12,
    effectRadius: 1.9,
    color: 0xffd36d
  },
  {
    id: 'light_2',
    damage: 18,
    range: 2.7,
    radius: 1.45,
    arcCos: Math.cos(THREE.MathUtils.degToRad(72)),
    activeTime: 0.12,
    queueOpen: 0.15,
    totalTime: 0.32,
    moveFactor: 0.48,
    knockback: 5.8,
    stun: 0.15,
    effectRadius: 2.2,
    color: 0xffbf6a
  },
  {
    id: 'heavy',
    damage: 28,
    range: 3.25,
    radius: 1.8,
    arcCos: Math.cos(THREE.MathUtils.degToRad(85)),
    activeTime: 0.16,
    queueOpen: 0.18,
    totalTime: 0.45,
    moveFactor: 0.28,
    knockback: 8.6,
    stun: 0.3,
    heavy: true,
    effectRadius: 3.4,
    color: 0xfff09b
  }
];

const ENEMY_TYPES = {
  orc: {
    id: 'orc',
    assetId: 'enemy_orc',
    label: 'Orc Brute',
    maxHealth: 38,
    speed: 3.2,
    radius: 0.72,
    damage: 14,
    attackRange: 1.65,
    attackWindup: 0.22,
    attackCooldown: 1.15,
    xp: 3,
    poolSize: 6,
    prewarm: 2,
    targetHeight: CONFIG.enemy.groundTargetHeight,
    visualYawOffset: 0,
    color: '#ffba7a'
  },
  demon: {
    id: 'demon',
    assetId: 'enemy_demon',
    label: 'Demon Duelist',
    maxHealth: 46,
    speed: 3.0,
    radius: 0.76,
    damage: 17,
    attackRange: 1.9,
    attackWindup: 0.28,
    attackCooldown: 1.32,
    xp: 4,
    poolSize: 5,
    prewarm: 1,
    targetHeight: CONFIG.enemy.groundTargetHeight,
    visualYawOffset: 0,
    color: '#ff7a7a'
  },
  blob: {
    id: 'blob',
    assetId: 'enemy_blob',
    label: 'Spiked Blob',
    maxHealth: 18,
    speed: 4.45,
    radius: 0.56,
    damage: 9,
    attackRange: 1.2,
    attackWindup: 0.16,
    attackCooldown: 0.85,
    xp: 2,
    poolSize: 7,
    prewarm: 3,
    targetHeight: CONFIG.enemy.blobTargetHeight,
    visualYawOffset: 0,
    color: '#a7ffb1'
  },
  ghost: {
    id: 'ghost',
    assetId: 'enemy_ghost',
    label: 'Ghost Hexer',
    maxHealth: 25,
    speed: 2.3,
    radius: 0.58,
    damage: 11,
    attackRange: 8,
    attackWindup: 0.42,
    attackCooldown: 2.35,
    projectileSpeed: 10.8,
    xp: 3,
    poolSize: 4,
    prewarm: 1,
    targetHeight: CONFIG.enemy.flyingTargetHeight,
    visualYawOffset: 0,
    color: '#99d9ff',
    flying: true,
    hoverHeight: 2
  },
  yeti: {
    id: 'yeti',
    assetId: 'enemy_yeti',
    label: 'Yeti Champion',
    maxHealth: 132,
    speed: 2.75,
    radius: 0.96,
    damage: 22,
    attackRange: 2.15,
    attackWindup: 0.42,
    attackCooldown: 1.45,
    xp: 12,
    poolSize: 1,
    prewarm: 0,
    targetHeight: CONFIG.enemy.eliteTargetHeight,
    visualYawOffset: 0,
    color: '#fff0c9',
    elite: true
  }
};

const PICKUP_TYPES = {
  xp: {
    id: 'pickup_coin',
    label: 'XP Shard',
    targetHeight: 0.7
  },
  heal: {
    id: 'pickup_heart',
    label: 'Heart',
    targetHeight: 0.9
  },
  special: {
    id: 'pickup_thunder',
    label: 'Thunder',
    targetHeight: 0.95
  }
};

const UPGRADE_DEFS = [
  {
    id: 'shockwave_finisher',
    label: 'Shockwave Finisher',
    description: 'Heavy attacks emit a circular shockwave on impact.'
  },
  {
    id: 'orbit_blade',
    label: 'Orbit Blade',
    description: 'A spectral blade circles you and slices nearby enemies.'
  },
  {
    id: 'dash_slash',
    label: 'Dash Slash',
    description: 'Every wave-dash carves a damaging slash through the lane.'
  },
  {
    id: 'ghost_bolts',
    label: 'Ghost Bolts',
    description: 'Auto-fire spirit bolts at nearby enemies every few seconds.'
  },
  {
    id: 'counter_burst',
    label: 'Counter Burst',
    description: 'Taking a hit triggers a retaliatory pulse on a cooldown.'
  },
  {
    id: 'spinning_slash',
    label: 'Spinning Slash',
    description: 'Periodically unleash an automatic spinning slash around you.'
  },
  {
    id: 'launch_finisher',
    label: 'Launcher Finisher',
    description: 'Heavy finishers hit harder and stagger enemies longer.'
  },
  {
    id: 'storm_special',
    label: 'Storm Special',
    description: 'Your special burst expands and fires extra lightning bolts.'
  },
  {
    id: 'phase_step',
    label: 'Phase Step',
    description: 'Wave-dash farther, costs less stamina, and grants extra i-frames.'
  },
  {
    id: 'blade_temper',
    label: 'Blade Temper',
    description: 'All melee attacks deal bonus damage.'
  },
  {
    id: 'survivor_instinct',
    label: 'Survivor Instinct',
    description: 'Increase max health and heal immediately.'
  },
  {
    id: 'quicksilver_core',
    label: 'Quicksilver Core',
    description: 'Special cooldown shortens and recharges immediately.'
  }
];

const WAVE_DEFS = [
  {
    intro: 'Wave 1 - Test the combo.',
    spawns: [
      { archetype: 'blob', count: 4, delay: 0.2, interval: 0.78 },
      { archetype: 'orc', count: 2, delay: 2.3, interval: 1.05 }
    ]
  },
  {
    intro: 'Wave 2 - Add pressure from range.',
    spawns: [
      { archetype: 'blob', count: 5, delay: 0.2, interval: 0.66 },
      { archetype: 'orc', count: 3, delay: 1.8, interval: 0.96 },
      { archetype: 'ghost', count: 1, delay: 5.4, interval: 0.2 }
    ]
  },
  {
    intro: 'Wave 3 - The arena tightens.',
    spawns: [
      { archetype: 'demon', count: 3, delay: 0.4, interval: 1.1 },
      { archetype: 'blob', count: 4, delay: 2.6, interval: 0.58 },
      { archetype: 'ghost', count: 2, delay: 5.8, interval: 1.0 }
    ]
  },
  {
    intro: 'Wave 4 - Hold the center.',
    spawns: [
      { archetype: 'orc', count: 3, delay: 0.1, interval: 0.8 },
      { archetype: 'demon', count: 3, delay: 1.7, interval: 0.95 },
      { archetype: 'ghost', count: 3, delay: 4.9, interval: 0.82 }
    ]
  },
  {
    intro: 'Final Wave - Elite incoming.',
    spawns: [
      { archetype: 'yeti', count: 1, delay: 0.2, interval: 0.2 },
      { archetype: 'blob', count: 4, delay: 1.6, interval: 0.55 },
      { archetype: 'ghost', count: 2, delay: 4.6, interval: 0.92 }
    ]
  }
];

const state = {
  ready: false,
  hasEnded: false,
  result: null,
  draftActive: false,
  statusText: 'Loading assets',
  timeLeft: CONFIG.timerSeconds,
  wave: 0,
  level: 1,
  xp: 0,
  xpToNext: getXpThreshold(1),
  selectedUpgrades: [],
  draftChoices: [],
  draftSelection: 0,
  hitPause: 0,
  slowMoFactor: 1,
  slowMoTimer: 0,
  cameraShakeIntensity: 0,
  cameraShakeTimer: 0
};

const director = {
  currentWaveIndex: -1,
  waveActive: false,
  intermission: 1.2,
  spawnQueue: [],
  elapsedInWave: 0,
  completed: false
};

const combatStats = {
  damageBonus: 0,
  dashCostMultiplier: 1,
  dashDistanceMultiplier: 1,
  specialCooldownMultiplier: 1,
  specialRadiusBonus: 0
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080d1a);
scene.fog = new THREE.Fog(0x080d1a, 26, 54);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 220);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const loader = new GLTFLoader();
const mixers = [];
const assets = new Map();
const assetCache = new Map();
const colliders = [];
const spawnPoints = [];
const effects = [];
const activeEnemies = [];
const activePickups = [];
const projectiles = [];
const enemyPools = new Map();
const pickupPools = new Map();

const sharedGeometries = {
  ring: new THREE.RingGeometry(0.6, 0.82, 36),
  projectile: new THREE.SphereGeometry(0.22, 10, 10),
  blocker: new THREE.BoxGeometry(1, 1, 1)
};

const input = {
  up: false,
  down: false,
  left: false,
  right: false
};

let player = null;
let orbitBlade = null;
let promptState = null;
let transientStatus = null;
let flashTimeoutId = 0;

window.__TEST__ = {
  ready: false,
  getState: () => ({
    ready: state.ready,
    hasEnded: state.hasEnded,
    result: state.result,
    wave: state.wave,
    level: state.level,
    xp: Number(state.xp.toFixed(2)),
    xpToNext: Number(state.xpToNext.toFixed(2)),
    timeLeft: Number(state.timeLeft.toFixed(2)),
    draftActive: state.draftActive,
    upgrades: state.selectedUpgrades.map((upgrade) => upgrade.id),
    livingEnemies: activeEnemies.length,
    player: player
      ? {
          x: Number(player.group.position.x.toFixed(2)),
          z: Number(player.group.position.z.toFixed(2)),
          health: Number(player.health.toFixed(2)),
          maxHealth: Number(player.maxHealth.toFixed(2)),
          stamina: Number(player.stamina.toFixed(2)),
          specialCooldown: Number(player.specialCooldown.toFixed(2)),
          isAttacking: Boolean(player.attack),
          isDashing: player.dashTimer > 0
        }
      : null
  }),
  restart: () => window.location.reload(),
  pickUpgrade: (index) => chooseDraft(index),
  grantXp: (amount = state.xpToNext) => {
    if (!state.ready || state.hasEnded) return null;
    gainXp(amount);
    return window.__TEST__.getState();
  },
  forceDraft: () => {
    if (!state.ready || state.hasEnded) return false;
    openDraft();
    return state.draftActive;
  },
  spawnEnemy: (type = 'orc') => {
    if (!state.ready || state.hasEnded || !ENEMY_TYPES[type]) return null;
    const enemy = spawnEnemy(type);
    return enemy ? enemy.archetype.id : null;
  },
  clearEnemies: () => {
    for (const enemy of [...activeEnemies]) {
      releaseEnemy(enemy);
    }
    return 0;
  }
};

ui.draftButtons.forEach((button, index) => {
  button.addEventListener('mouseenter', () => {
    if (!state.draftActive) return;
    state.draftSelection = index;
    renderDraftChoices();
  });
  button.addEventListener('click', () => chooseDraft(index));
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getXpThreshold(level) {
  return 8 + (level - 1) * 5;
}

function lerpAngle(current, target, alpha) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * alpha;
}

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function waitNextTick() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function hasUpgrade(id) {
  return state.selectedUpgrades.some((upgrade) => upgrade.id === id);
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

function setStatus(text, duration = 0) {
  state.statusText = text;
  transientStatus = duration > 0
    ? { text, until: performance.now() + duration * 1000 }
    : null;
}

function pushPrompt(text, duration = 0) {
  promptState = duration > 0
    ? { text, until: performance.now() + duration * 1000 }
    : { text, until: Number.POSITIVE_INFINITY };
  ui.prompt.textContent = text;
  ui.prompt.classList.add('visible');
}

function hidePrompt() {
  promptState = null;
  ui.prompt.classList.remove('visible');
  ui.prompt.textContent = '';
}

function flashScreen(color, opacity = 0.28, durationMs = 100) {
  ui.flash.style.background = color;
  ui.flash.style.opacity = String(opacity);
  if (flashTimeoutId) {
    window.clearTimeout(flashTimeoutId);
  }
  flashTimeoutId = window.setTimeout(() => {
    ui.flash.style.opacity = '0';
  }, durationMs);
}

function showBanner(title, text) {
  ui.bannerTitle.textContent = title;
  ui.bannerText.textContent = text;
  ui.banner.classList.add('visible');
}

function hideBanner() {
  ui.banner.classList.remove('visible');
}

function renderSkillList() {
  ui.skillList.replaceChildren();
  if (state.selectedUpgrades.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No skills drafted yet. Level up to start shaping the build.';
    ui.skillList.appendChild(item);
    return;
  }

  for (const upgrade of state.selectedUpgrades) {
    const item = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = upgrade.label;
    item.appendChild(strong);
    item.appendChild(document.createElement('br'));
    item.appendChild(document.createTextNode(upgrade.description));
    ui.skillList.appendChild(item);
  }
}

function renderDraftChoices() {
  const visible = state.draftActive && state.draftChoices.length > 0;
  ui.draftOverlay.classList.toggle('visible', visible);

  ui.draftButtons.forEach((button, index) => {
    const choice = state.draftChoices[index];
    if (!choice) {
      button.hidden = true;
      button.disabled = true;
      button.innerHTML = '';
      button.classList.remove('selected');
      return;
    }
    button.hidden = false;
    button.disabled = false;
    button.classList.toggle('selected', state.draftSelection === index);
    button.innerHTML = [
      `<div class="draft-hotkey">${index + 1}</div>`,
      `<strong>${choice.label}</strong>`,
      `<div>${choice.description}</div>`
    ].join('');
  });
}

function updateStatus(now) {
  if (transientStatus && transientStatus.until > now) {
    state.statusText = transientStatus.text;
    return;
  }
  transientStatus = null;

  if (!state.ready) {
    state.statusText = 'Loading assets';
    return;
  }
  if (state.hasEnded) {
    return;
  }
  if (state.draftActive) {
    state.statusText = 'Choose a new technique.';
    return;
  }
  if (director.completed) {
    state.statusText = activeEnemies.length > 0
      ? 'Clear the last enemies.'
      : 'Arena cleared.';
    return;
  }
  if (director.waveActive) {
    state.statusText = `Wave ${state.wave} underway.`;
    return;
  }

  const nextWave = clamp(director.currentWaveIndex + 2, 1, WAVE_DEFS.length);
  state.statusText = `Prepare for wave ${nextWave}.`;
}

function updatePrompt(now) {
  if (state.draftActive) {
    ui.prompt.textContent = 'Choose 1, 2, 3, or Enter.';
    ui.prompt.classList.add('visible');
    return;
  }
  if (state.hasEnded) {
    ui.prompt.textContent = 'Press R to restart.';
    ui.prompt.classList.add('visible');
    return;
  }
  if (promptState && promptState.until > now) {
    ui.prompt.textContent = promptState.text;
    ui.prompt.classList.add('visible');
    return;
  }
  hidePrompt();
}

function updateHud() {
  ui.wave.textContent = state.ready
    ? `${Math.max(1, state.wave || 1)} / ${WAVE_DEFS.length}`
    : '--';
  ui.timer.textContent = `${Math.max(0, state.timeLeft).toFixed(1)}s`;

  if (!player) {
    ui.healthLabel.textContent = '--';
    ui.staminaLabel.textContent = '--';
    ui.xpLabel.textContent = '--';
    ui.healthBar.style.transform = 'scaleX(1)';
    ui.staminaBar.style.transform = 'scaleX(1)';
    ui.xpBar.style.transform = 'scaleX(0)';
    ui.level.textContent = String(state.level);
    ui.specialLabel.textContent = 'Loading';
    ui.status.textContent = state.statusText;
    return;
  }

  ui.healthLabel.textContent = `${Math.round(player.health)} / ${Math.round(player.maxHealth)}`;
  ui.staminaLabel.textContent = `${Math.round(player.stamina)}%`;
  ui.xpLabel.textContent = `${state.xp.toFixed(0)} / ${state.xpToNext.toFixed(0)}`;
  ui.level.textContent = String(state.level);
  ui.specialLabel.textContent = player.specialCooldown <= 0
    ? 'Ready'
    : `${player.specialCooldown.toFixed(1)}s`;

  ui.healthBar.style.transform = `scaleX(${clamp(player.health / player.maxHealth, 0, 1)})`;
  ui.staminaBar.style.transform = `scaleX(${clamp(player.stamina / CONFIG.player.maxStamina, 0, 1)})`;
  ui.xpBar.style.transform = `scaleX(${clamp(state.xp / state.xpToNext, 0, 1)})`;
  ui.status.textContent = state.statusText;
}

function createFallbackAsset(entry) {
  const group = new THREE.Group();
  let mesh = null;

  switch (entry.category) {
    case 'character':
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.34, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xc9f2ff, roughness: 0.76 })
      );
      break;
    case 'enemy':
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.62, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xd67370, roughness: 0.8 })
      );
      break;
    case 'pickup':
      mesh = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.22, 0.08, 42, 10),
        new THREE.MeshStandardMaterial({ color: 0xffd86b, metalness: 0.25, roughness: 0.42 })
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

function computeVisibleBounds(root) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    if (child.isMesh && child.geometry) {
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox();
      }
      const childBox = child.geometry.boundingBox.clone();
      childBox.applyMatrix4(child.matrixWorld);
      box.union(childBox);
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

  const firstBounds = computeVisibleBounds(root);
  const size = firstBounds.getSize(new THREE.Vector3());
  const safeHeight = Math.max(size.y, size.x, size.z, 0.001);
  root.scale.setScalar(targetHeight / safeHeight);
  root.updateMatrixWorld(true);

  const scaledBounds = computeVisibleBounds(root);
  root.position.y += anchor === 'maxY' ? -scaledBounds.max.y : -scaledBounds.min.y;
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

function attachCalibrationHelpers(root, label, color = 0xff00ff) {
  if (!CALIBRATION) return;
  root.add(new THREE.AxesHelper(0.65));
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
      currentAction: null
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
      attack: ['hit', 'strike', 'slash', 'punch'],
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

function pointCollidesXZ(position, radius, box) {
  const nearestX = Math.max(box.minX, Math.min(position.x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(position.z, box.maxZ));
  const dx = position.x - nearestX;
  const dz = position.z - nearestZ;
  return (dx * dx + dz * dz) < radius * radius;
}

function moveWithCollisions(group, deltaMove, radius) {
  const nextX = group.position.clone();
  nextX.x += deltaMove.x;
  const nextZ = group.position.clone();
  nextZ.z += deltaMove.z;

  for (const box of colliders) {
    if (pointCollidesXZ(nextX, radius, box)) {
      deltaMove.x = 0;
      break;
    }
  }

  for (const box of colliders) {
    if (pointCollidesXZ(nextZ, radius, box)) {
      deltaMove.z = 0;
      break;
    }
  }

  group.position.x += deltaMove.x;
  group.position.z += deltaMove.z;
  clampWithinArena(group.position, radius);
}

function clampWithinArena(position, margin = 0.5) {
  position.x = clamp(position.x, -CONFIG.arenaHalf + margin, CONFIG.arenaHalf - margin);
  position.z = clamp(position.z, -CONFIG.arenaHalf + margin, CONFIG.arenaHalf - margin);
}

function createLights() {
  const ambient = new THREE.AmbientLight(0xffffff, CONFIG.ambientLight);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff2d2, CONFIG.directionalLight);
  sun.position.set(8, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -26;
  sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -26;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 70;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x74a7ff, CONFIG.fillLight);
  fill.position.set(-14, 8, -5);
  scene.add(fill);
}

function createGround() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 48),
    new THREE.MeshStandardMaterial({
      color: CONFIG.floorColor,
      roughness: 0.95,
      metalness: 0.03
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(10.5, 15.5, 48),
    new THREE.MeshBasicMaterial({
      color: CONFIG.floorAccent,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.03;
  scene.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(4.8, 6.2, 36),
    new THREE.MeshBasicMaterial({
      color: 0x3b4570,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    })
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.031;
  scene.add(innerRing);
}

function addBlocker(x, z, width, depth, height = CONFIG.wallHeight) {
  const mesh = new THREE.Mesh(
    sharedGeometries.blocker,
    new THREE.MeshStandardMaterial({
      color: CONFIG.wallColor,
      roughness: 0.9,
      metalness: 0.05
    })
  );
  mesh.scale.set(width, height, depth);
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
  addBlocker(0, -h, h * 2 + 2, 1.8);
  addBlocker(0, h, h * 2 + 2, 1.8);
  addBlocker(-h, 0, 1.8, h * 2 + 2);
  addBlocker(h, 0, 1.8, h * 2 + 2);
}

function addArenaBlockers() {
  addBlocker(0, -6.2, 7.4, 2.1, 2.2);
  addBlocker(-7.8, -1.5, 2.2, 7.2, 2.2);
  addBlocker(8.2, 4.3, 2.5, 8, 2.2);
  addBlocker(-4.5, 8.1, 7.6, 2.2, 2.2);
  addBlocker(6.6, -9.2, 8.2, 2.2, 2.2);
}

function buildSpawnPoints() {
  const points = [
    [-16, 0, -16],
    [0, 0, -18],
    [16, 0, -16],
    [-18, 0, 0],
    [18, 0, 0],
    [-16, 0, 16],
    [0, 0, 18],
    [16, 0, 16]
  ];

  for (const [x, y, z] of points) {
    const point = new THREE.Vector3(x, y, z);
    spawnPoints.push(point);
    if (DEBUG) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x67d8ff })
      );
      marker.position.copy(point);
      marker.position.y = 0.35;
      scene.add(marker);
    }
  }
}

function buildArena() {
  createGround();
  createLights();
  addBoundaryWalls();
  addArenaBlockers();
  buildSpawnPoints();

  if (DEBUG) {
    scene.add(new THREE.GridHelper(48, 48, 0x5d7bc4, 0x273251));
    scene.add(new THREE.AxesHelper(2.8));
  }
}

async function placeDecorations() {
  const placements = [
    { id: 'env_fence_straight', pos: [-16, 0, -4], height: 1.4, rot: Math.PI / 2 },
    { id: 'env_fence_corner', pos: [-15, 0, -15], height: 1.4 },
    { id: 'env_fence_middle', pos: [15, 0, -15], height: 1.35 },
    { id: 'env_rock_platform_medium', pos: [9.4, 0, 8], height: 1.7, rot: Math.PI / 5 },
    { id: 'env_rock_platform_large', pos: [-10.5, 0, 10.5], height: 1.85, rot: -Math.PI / 7 },
    { id: 'env_rock_small', pos: [-12.5, 0, 4.5], height: 1.5 },
    { id: 'env_rock_large', pos: [10.5, 0, -13], height: 1.75 },
    { id: 'env_plant_small', pos: [14, 0, 13.5], height: 1.35 },
    { id: 'env_plant_large', pos: [-13.8, 0, -11.5], height: 1.6 },
    { id: 'env_plant_small', pos: [2.5, 0, 12.6], height: 1.28 }
  ];

  for (const placement of placements) {
    const instance = await instantiateAsset(placement.id, {
      targetHeight: placement.height,
      anchor: 'minY',
      visualYawOffset: 0
    });
    instance.group.position.set(...placement.pos);
    if (placement.rot) {
      instance.group.rotation.y = placement.rot;
    }
    scene.add(instance.group);
  }
}

async function createPlayer() {
  const instance = await instantiateAsset('player_character', {
    targetHeight: CONFIG.player.targetHeight,
    anchor: 'minY',
    visualYawOffset: CONFIG.player.visualYawOffset
  });
  instance.group.position.set(0, 0, 8);
  scene.add(instance.group);
  attachCalibrationHelpers(instance.group, 'player', 0x9ffff2);

  return {
    ...instance,
    radius: CONFIG.player.radius,
    heading: Math.PI,
    maxHealth: CONFIG.player.maxHealth,
    health: CONFIG.player.maxHealth,
    stamina: CONFIG.player.maxStamina,
    specialCooldown: 0,
    invulnTimer: 0,
    dashTimer: 0,
    dashDirection: new THREE.Vector3(),
    attack: null,
    attackBuffered: false,
    comboResetTimer: 0,
    knockback: new THREE.Vector3(),
    hitstunTimer: 0,
    ghostBoltTimer: 2.8,
    spinSlashTimer: 5.2,
    counterBurstCooldown: 0,
    orbitAngle: 0
  };
}

function createEffectMesh(color) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  return new THREE.Mesh(sharedGeometries.ring, material);
}

function spawnRingEffect(position, color, endScale = 3, duration = 0.22) {
  const mesh = createEffectMesh(color);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y = 0.06;
  mesh.scale.setScalar(0.6);
  scene.add(mesh);
  effects.push({
    mesh,
    age: 0,
    duration,
    startScale: 0.6,
    endScale
  });
}

function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.age += dt;
    const t = clamp(effect.age / effect.duration, 0, 1);
    const scale = THREE.MathUtils.lerp(effect.startScale, effect.endScale, t);
    effect.mesh.scale.setScalar(scale);
    effect.mesh.material.opacity = 0.65 * (1 - t);
    if (t >= 1) {
      scene.remove(effect.mesh);
      effect.mesh.material.dispose?.();
      effects.splice(i, 1);
    }
  }
}

function warmProjectilePool(count = 28) {
  for (let i = 0; i < count; i += 1) {
    const mesh = new THREE.Mesh(
      sharedGeometries.projectile,
      new THREE.MeshStandardMaterial({
        color: 0x9dd8ff,
        emissive: 0x0a243b,
        roughness: 0.35,
        metalness: 0.18
      })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    scene.add(mesh);
    projectiles.push({
      mesh,
      active: false,
      velocity: new THREE.Vector3(),
      owner: 'enemy',
      damage: 0,
      life: 0,
      radius: 0.22,
      knockback: 0
    });
  }
}

function spawnProjectile(options) {
  const projectile = projectiles.find((candidate) => !candidate.active);
  if (!projectile) {
    return null;
  }

  projectile.active = true;
  projectile.owner = options.owner;
  projectile.damage = options.damage;
  projectile.life = options.life ?? 1.4;
  projectile.radius = options.radius ?? 0.22;
  projectile.knockback = options.knockback ?? 4;
  projectile.velocity.copy(options.direction).multiplyScalar(options.speed);
  projectile.mesh.position.copy(options.position);
  projectile.mesh.visible = true;
  projectile.mesh.scale.setScalar(options.scale ?? 1);
  projectile.mesh.material.color.setHex(options.color ?? 0x9dd8ff);
  projectile.mesh.material.emissive.setHex(options.emissive ?? 0x0a243b);
  return projectile;
}

function releaseProjectile(projectile) {
  projectile.active = false;
  projectile.life = 0;
  projectile.mesh.visible = false;
  projectile.mesh.position.set(0, -100, 0);
}

async function createEnemyEntity(typeId) {
  const archetype = ENEMY_TYPES[typeId];
  const instance = await instantiateAsset(archetype.assetId, {
    targetHeight: archetype.targetHeight,
    anchor: 'minY',
    visualYawOffset: archetype.visualYawOffset
  });
  instance.group.visible = false;
  scene.add(instance.group);
  attachCalibrationHelpers(instance.group, archetype.label, 0xff7de1);

  return {
    ...instance,
    poolId: typeId,
    archetype,
    active: false,
    radius: archetype.radius,
    maxHealth: archetype.maxHealth,
    health: archetype.maxHealth,
    heading: 0,
    knockback: new THREE.Vector3(),
    hitstunTimer: 0,
    hurtTimer: 0,
    attackCooldown: 0,
    attackWindup: 0,
    orbitCooldown: 0,
    hoverOffset: Math.random() * Math.PI * 2
  };
}

async function warmEnemyPools() {
  for (const typeId of Object.keys(ENEMY_TYPES)) {
    const archetype = ENEMY_TYPES[typeId];
    const pool = {
      typeId,
      available: []
    };
    const initialCount = archetype.prewarm ?? archetype.poolSize;
    for (let i = 0; i < initialCount; i += 1) {
      pool.available.push(await createEnemyEntity(typeId));
    }
    enemyPools.set(typeId, pool);
  }
}

async function topOffEnemyPools() {
  for (const typeId of Object.keys(ENEMY_TYPES)) {
    const archetype = ENEMY_TYPES[typeId];
    const pool = enemyPools.get(typeId);
    if (!pool) continue;
    while (pool.available.length < archetype.poolSize) {
      pool.available.push(await createEnemyEntity(typeId));
      await waitNextTick();
    }
  }
}

function acquireEnemy(typeId) {
  const pool = enemyPools.get(typeId);
  if (!pool || pool.available.length === 0) {
    console.warn(`[pool] enemy pool exhausted: ${typeId}`);
    return null;
  }

  const enemy = pool.available.pop();
  const archetype = enemy.archetype;
  enemy.active = true;
  enemy.maxHealth = archetype.maxHealth;
  enemy.health = archetype.maxHealth;
  enemy.attackCooldown = 0.5 + Math.random() * 0.5;
  enemy.attackWindup = 0;
  enemy.hurtTimer = 0;
  enemy.hitstunTimer = 0;
  enemy.orbitCooldown = 0;
  enemy.knockback.set(0, 0, 0);
  enemy.group.rotation.set(0, 0, 0);
  enemy.group.scale.setScalar(1);
  enemy.group.visible = true;
  activeEnemies.push(enemy);
  switchAnimation(enemy.animation, archetype.flying ? 'idle' : 'walk', {
    loop: true,
    timeScale: archetype.flying ? 1.1 : 0.95
  });
  return enemy;
}

function releaseEnemy(enemy) {
  enemy.active = false;
  enemy.group.visible = false;
  enemy.group.position.set(0, -100, 0);
  enemy.knockback.set(0, 0, 0);
  enemy.attackWindup = 0;
  enemy.hitstunTimer = 0;
  enemy.hurtTimer = 0;
  enemy.attack = null;
  const activeIndex = activeEnemies.indexOf(enemy);
  if (activeIndex !== -1) {
    activeEnemies.splice(activeIndex, 1);
  }
  const pool = enemyPools.get(enemy.poolId);
  if (pool) {
    pool.available.push(enemy);
  }
}

function chooseSpawnPoint(minDistance = 8) {
  if (!player) {
    return spawnPoints[Math.floor(Math.random() * spawnPoints.length)].clone();
  }

  const playerPos = player.group.position;
  const candidates = spawnPoints
    .map((point) => ({
      point,
      distance: point.distanceTo(playerPos)
    }))
    .sort((a, b) => b.distance - a.distance);

  const filtered = candidates.filter((candidate) => candidate.distance >= minDistance);
  const choicePool = filtered.length > 0 ? filtered : candidates.slice(0, 3);
  return choicePool[Math.floor(Math.random() * choicePool.length)].point.clone();
}

function spawnEnemy(typeId, position = chooseSpawnPoint()) {
  const enemy = acquireEnemy(typeId);
  if (!enemy) {
    return null;
  }

  enemy.group.position.copy(position);
  enemy.group.position.y = enemy.archetype.flying
    ? enemy.archetype.hoverHeight
    : 0;
  enemy.heading = Math.atan2(-position.x, -position.z);
  enemy.group.rotation.y = enemy.heading;
  return enemy;
}

async function createPickupEntity(kind) {
  const type = PICKUP_TYPES[kind];
  const instance = await instantiateAsset(type.id, {
    targetHeight: type.targetHeight,
    anchor: 'minY',
    visualYawOffset: 0
  });
  instance.group.visible = false;
  scene.add(instance.group);
  return {
    ...instance,
    kind,
    active: false,
    lifetime: 0,
    floatOffset: Math.random() * Math.PI * 2,
    baseY: 0.4,
    value: 1
  };
}

async function warmPickupPools() {
  const specs = [
    { kind: 'xp', count: 18, prewarm: 6 },
    { kind: 'heal', count: 6, prewarm: 2 },
    { kind: 'special', count: 4, prewarm: 1 }
  ];

  for (const spec of specs) {
    const pool = {
      kind: spec.kind,
      available: []
    };
    for (let i = 0; i < spec.prewarm; i += 1) {
      pool.available.push(await createPickupEntity(spec.kind));
    }
    pool.targetCount = spec.count;
    pickupPools.set(spec.kind, pool);
  }
}

async function topOffPickupPools() {
  for (const [kind, pool] of pickupPools.entries()) {
    while (pool.available.length < pool.targetCount) {
      pool.available.push(await createPickupEntity(kind));
      await waitNextTick();
    }
  }
}

function acquirePickup(kind) {
  const pool = pickupPools.get(kind);
  if (!pool || pool.available.length === 0) {
    console.warn(`[pool] pickup pool exhausted: ${kind}`);
    return null;
  }
  const pickup = pool.available.pop();
  pickup.active = true;
  pickup.group.visible = true;
  pickup.group.scale.setScalar(1);
  pickup.lifetime = 0;
  activePickups.push(pickup);
  return pickup;
}

function releasePickup(pickup) {
  pickup.active = false;
  pickup.group.visible = false;
  pickup.group.position.set(0, -100, 0);
  pickup.group.rotation.set(0, 0, 0);
  const activeIndex = activePickups.indexOf(pickup);
  if (activeIndex !== -1) {
    activePickups.splice(activeIndex, 1);
  }
  const pool = pickupPools.get(pickup.kind);
  if (pool) {
    pool.available.push(pickup);
  }
}

function spawnPickup(kind, position, value = 1) {
  const pickup = acquirePickup(kind);
  if (!pickup) {
    return null;
  }

  pickup.value = value;
  pickup.group.position.copy(position);
  pickup.group.position.x += THREE.MathUtils.randFloatSpread(0.9);
  pickup.group.position.z += THREE.MathUtils.randFloatSpread(0.9);
  pickup.baseY = 0.45 + Math.random() * 0.2;
  return pickup;
}

function spawnXpBurst(position, amount) {
  for (let i = 0; i < amount; i += 1) {
    spawnPickup('xp', position, 1);
  }
}

function triggerHitPause(duration) {
  state.hitPause = Math.max(state.hitPause, duration);
}

function triggerSlowMo(factor, duration) {
  state.slowMoFactor = Math.min(state.slowMoFactor, factor);
  state.slowMoTimer = Math.max(state.slowMoTimer, duration);
}

function shakeCamera(intensity, duration) {
  state.cameraShakeIntensity = Math.max(state.cameraShakeIntensity, intensity);
  state.cameraShakeTimer = Math.max(state.cameraShakeTimer, duration);
}

function getScaledDt(realDt) {
  if (state.hitPause > 0) {
    state.hitPause = Math.max(0, state.hitPause - realDt);
    return 0;
  }

  if (state.slowMoTimer > 0) {
    state.slowMoTimer = Math.max(0, state.slowMoTimer - realDt);
    const scaled = realDt * state.slowMoFactor;
    if (state.slowMoTimer === 0) {
      state.slowMoFactor = 1;
    }
    return scaled;
  }

  return realDt;
}

function getPlayerForward() {
  return getForwardVector(player.heading);
}

function performAreaAttack(center, radius, damage, options = {}) {
  let hitCount = 0;
  const color = options.color ?? 0xffd86b;
  spawnRingEffect(center, color, radius, options.effectDuration ?? 0.24);

  for (const enemy of [...activeEnemies]) {
    const toEnemy = enemy.group.position.clone().sub(center);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > radius + enemy.radius) {
      continue;
    }
    const direction = distance > 0.001 ? toEnemy.normalize() : getPlayerForward();
    const knockback = options.knockback ?? 5;
    const stun = options.stun ?? 0.18;
    applyDamageToEnemy(enemy, damage, direction, knockback, stun, {
      heavy: options.heavy ?? false
    });
    hitCount += 1;
  }

  if (hitCount > 0) {
    flashScreen('#fff4bb', 0.18, 80);
    shakeCamera(options.heavy ? 0.32 : 0.16, options.heavy ? 0.18 : 0.12);
  }

  return hitCount;
}

function performSlashAttack(definition, stepIndex) {
  const origin = player.group.position.clone();
  const forward = getPlayerForward();
  const center = origin.clone().addScaledVector(forward, definition.range);
  spawnRingEffect(center, definition.color, definition.effectRadius, definition.heavy ? 0.28 : 0.2);

  let hitCount = 0;
  for (const enemy of [...activeEnemies]) {
    const toEnemy = enemy.group.position.clone().sub(origin);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > definition.range + definition.radius + enemy.radius) {
      continue;
    }

    const towardEnemy = distance > 0.001 ? toEnemy.normalize() : forward.clone();
    if (towardEnemy.dot(forward) < definition.arcCos) {
      continue;
    }

    let damage = definition.damage + combatStats.damageBonus;
    let knockback = definition.knockback;
    let stun = definition.stun;

    if (stepIndex === ATTACK_CHAIN.length - 1 && hasUpgrade('launch_finisher')) {
      damage += 8;
      knockback += 3.4;
      stun += 0.18;
    }

    applyDamageToEnemy(enemy, damage, towardEnemy, knockback, stun, {
      heavy: definition.heavy ?? false
    });
    hitCount += 1;
  }

  if (stepIndex === ATTACK_CHAIN.length - 1 && hasUpgrade('shockwave_finisher')) {
    performAreaAttack(origin, 4.1, 14 + combatStats.damageBonus, {
      knockback: 7.6,
      stun: 0.28,
      heavy: true,
      color: 0x9fd7ff
    });
  }

  if (hitCount > 0) {
    triggerHitPause(definition.heavy ? 0.055 : 0.03);
    shakeCamera(definition.heavy ? 0.28 : 0.14, definition.heavy ? 0.18 : 0.12);
    flashScreen(definition.heavy ? '#fff3b0' : '#ffffff', definition.heavy ? 0.22 : 0.12, 70);
  }
}

function startAttack(stepIndex) {
  const definition = ATTACK_CHAIN[stepIndex];
  player.attack = {
    stepIndex,
    definition,
    timer: 0,
    hitFired: false,
    queued: false
  };
  player.attackBuffered = false;
  switchAnimation(player.animation, 'attack', {
    loop: false,
    fadeTime: 0.08,
    timeScale: stepIndex === 2 ? 1.12 : 1.0
  });
}

function tryAttack() {
  if (!player || state.hasEnded || state.draftActive) return;
  if (player.hitstunTimer > 0 || player.dashTimer > 0) return;

  if (player.attack) {
    player.attackBuffered = true;
    return;
  }

  startAttack(0);
}

function tryDodge() {
  if (!player || state.hasEnded || state.draftActive) return;
  if (player.dashTimer > 0 || player.hitstunTimer > 0) return;

  const dashCost = CONFIG.player.dashCost * combatStats.dashCostMultiplier;
  if (player.stamina < dashCost) {
    setStatus('Not enough stamina to dodge.', 0.8);
    return;
  }

  let dashDirection = getCameraMoveVector();
  if (dashDirection.lengthSq() === 0) {
    dashDirection = getPlayerForward();
  }

  player.stamina = Math.max(0, player.stamina - dashCost);
  player.attack = null;
  player.attackBuffered = false;
  player.dashDirection.copy(dashDirection);
  player.dashTimer = CONFIG.player.dashDuration * combatStats.dashDistanceMultiplier;
  player.invulnTimer = CONFIG.player.dashIFrames + (hasUpgrade('phase_step') ? 0.08 : 0);
  player.heading = Math.atan2(dashDirection.x, dashDirection.z);
  flashScreen('#7bdcff', 0.16, 80);
  pushPrompt('Wave-dash!', 0.6);

  if (hasUpgrade('dash_slash')) {
    const slashCenter = player.group.position.clone().addScaledVector(dashDirection, 1.7);
    performAreaAttack(slashCenter, 2.0, 18 + combatStats.damageBonus, {
      knockback: 6.8,
      stun: 0.18,
      color: 0x88f5ff
    });
  }
}

function trySpecial() {
  if (!player || state.hasEnded || state.draftActive) return;
  if (player.specialCooldown > 0 || player.hitstunTimer > 0) return;

  const radius = CONFIG.player.specialRadius + combatStats.specialRadiusBonus;
  const damage = CONFIG.player.specialDamage + combatStats.damageBonus;
  const hits = performAreaAttack(player.group.position.clone(), radius, damage, {
    knockback: 9.5,
    stun: 0.34,
    heavy: true,
    color: 0x9fd7ff,
    effectDuration: 0.34
  });

  player.specialCooldown = CONFIG.player.specialCooldown * combatStats.specialCooldownMultiplier;
  triggerSlowMo(0.7, 0.12);
  setStatus(hits > 0 ? 'Special burst connected.' : 'Special burst unleashed.', 1.0);

  if (hasUpgrade('storm_special')) {
    const targets = [...activeEnemies]
      .sort((a, b) => a.group.position.distanceTo(player.group.position) - b.group.position.distanceTo(player.group.position))
      .slice(0, 4);
    for (const target of targets) {
      const direction = target.group.position.clone().sub(player.group.position);
      direction.y = 0;
      direction.normalize();
      spawnProjectile({
        owner: 'player',
        position: player.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        direction,
        speed: 15,
        damage: 16 + combatStats.damageBonus,
        knockback: 6.5,
        life: 1.2,
        color: 0xcff4ff,
        emissive: 0x164970
      });
    }
  }
}

function applyUpgrade(upgrade) {
  if (hasUpgrade(upgrade.id)) return;

  state.selectedUpgrades.push(upgrade);

  switch (upgrade.id) {
    case 'blade_temper':
      combatStats.damageBonus += 4;
      break;
    case 'survivor_instinct':
      player.maxHealth += 10;
      player.health = Math.min(player.maxHealth, player.health + 22);
      break;
    case 'quicksilver_core':
      combatStats.specialCooldownMultiplier *= 0.85;
      player.specialCooldown = Math.max(0, player.specialCooldown - 2.8);
      break;
    case 'phase_step':
      combatStats.dashCostMultiplier *= 0.72;
      combatStats.dashDistanceMultiplier *= 1.18;
      break;
    case 'storm_special':
      combatStats.specialRadiusBonus += 1.4;
      break;
    default:
      break;
  }

  renderSkillList();
}

function openDraft() {
  if (state.hasEnded) return;

  const available = UPGRADE_DEFS.filter((upgrade) => !hasUpgrade(upgrade.id));
  if (available.length === 0) {
    return;
  }

  shuffleInPlace(available);
  state.draftChoices = available.slice(0, 3);
  state.draftSelection = 0;
  state.draftActive = true;
  renderDraftChoices();
  pushPrompt('Choose 1, 2, 3, or Enter.', 999);
  flashScreen('#ffe48a', 0.2, 120);
  triggerSlowMo(0.5, 0.16);
}

function chooseDraft(index) {
  if (!state.draftActive) return;
  const choice = state.draftChoices[index];
  if (!choice) return;

  applyUpgrade(choice);
  state.draftActive = false;
  state.draftChoices = [];
  renderDraftChoices();
  setStatus(`${choice.label} acquired.`, 1.4);
  pushPrompt(`${choice.label} added to the build.`, 1.1);

  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = getXpThreshold(state.level);
    openDraft();
    if (state.draftActive) {
      break;
    }
  }
}

function gainXp(amount) {
  state.xp += amount;
  if (!state.draftActive && state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = getXpThreshold(state.level);
    openDraft();
  }
}

function damagePlayer(amount, direction) {
  if (!player || state.hasEnded || state.draftActive) return false;
  if (player.invulnTimer > 0) return false;

  player.health = Math.max(0, player.health - amount);
  player.hitstunTimer = 0.18;
  player.knockback.copy(direction).multiplyScalar(6.5);
  player.attack = null;
  player.attackBuffered = false;
  flashScreen('#ff7575', 0.28, 120);
  shakeCamera(0.34, 0.18);
  setStatus(`Took ${amount} damage.`, 0.8);

  if (hasUpgrade('counter_burst') && player.counterBurstCooldown <= 0) {
    player.counterBurstCooldown = 6.8;
    performAreaAttack(player.group.position.clone(), 3.4, 16 + combatStats.damageBonus, {
      knockback: 7.2,
      stun: 0.2,
      color: 0x8bf2ff
    });
  }

  if (player.health <= 0) {
    endGame('lose', 'You were overwhelmed. Press R to fight again.');
  }

  return true;
}

function killEnemy(enemy, direction) {
  if (!enemy.active) return;

  spawnRingEffect(enemy.group.position.clone(), enemy.archetype.elite ? 0xfff1bd : 0xff9688, enemy.archetype.elite ? 4.3 : 2.2, enemy.archetype.elite ? 0.36 : 0.22);
  spawnXpBurst(enemy.group.position, enemy.archetype.xp);

  if (!enemy.archetype.elite && Math.random() < 0.16) {
    spawnPickup('heal', enemy.group.position, 18);
  }
  if ((enemy.archetype.elite || Math.random() < 0.08) && director.currentWaveIndex >= 1) {
    spawnPickup('special', enemy.group.position, 1);
  }

  if (enemy.archetype.elite) {
    triggerSlowMo(0.45, 0.22);
    setStatus('Elite down. Clear the arena.', 1.4);
  }

  releaseEnemy(enemy);
}

function applyDamageToEnemy(enemy, damage, direction, knockback, stun, options = {}) {
  if (!enemy.active) return;

  enemy.health -= damage;
  enemy.hurtTimer = 0.12;
  enemy.hitstunTimer = Math.max(enemy.hitstunTimer, stun);
  enemy.knockback.copy(direction).multiplyScalar(knockback);

  if (enemy.health <= 0) {
    killEnemy(enemy, direction);
    return;
  }

  if (options.heavy) {
    triggerHitPause(0.04);
  }
}

function updateAttackState(dt) {
  if (!player.attack) {
    return;
  }

  const attack = player.attack;
  attack.timer += dt;

  if (!attack.hitFired && attack.timer >= attack.definition.activeTime) {
    attack.hitFired = true;
    performSlashAttack(attack.definition, attack.stepIndex);
  }

  if (player.attackBuffered && attack.timer >= attack.definition.queueOpen) {
    attack.queued = true;
  }

  if (attack.timer >= attack.definition.totalTime) {
    if (attack.queued && attack.stepIndex < ATTACK_CHAIN.length - 1) {
      startAttack(attack.stepIndex + 1);
    } else {
      player.attack = null;
      player.attackBuffered = false;
    }
  }
}

function updatePlayer(dt) {
  if (!player) return;

  player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  player.hitstunTimer = Math.max(0, player.hitstunTimer - dt);
  player.specialCooldown = Math.max(0, player.specialCooldown - dt);
  player.counterBurstCooldown = Math.max(0, player.counterBurstCooldown - dt);

  if (!state.hasEnded) {
    player.stamina = Math.min(
      CONFIG.player.maxStamina,
      player.stamina + CONFIG.player.staminaRecharge * dt
    );
  }

  if (player.knockback.lengthSq() > 0.0001) {
    const knockbackStep = player.knockback.clone().multiplyScalar(dt);
    moveWithCollisions(player.group, knockbackStep, player.radius);
    player.knockback.lerp(new THREE.Vector3(), Math.min(1, dt * 10));
  }

  updateAttackState(dt);

  if (player.dashTimer > 0) {
    const dashMultiplier = hasUpgrade('phase_step') ? 1.18 : 1;
    const dashMove = player.dashDirection.clone().multiplyScalar(CONFIG.player.dashSpeed * dashMultiplier * dt);
    moveWithCollisions(player.group, dashMove, player.radius);
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.group.rotation.y = lerpAngle(
      player.group.rotation.y,
      player.heading,
      Math.min(1, dt * 22)
    );
    switchAnimation(player.animation, 'run', { loop: true, timeScale: 1.6 });
    return;
  }

  const worldMove = getCameraMoveVector();
  const hasMovement = worldMove.lengthSq() > 0;
  let speed = CONFIG.player.walkSpeed;

  if (player.attack) {
    speed = CONFIG.player.attackMoveSpeed * player.attack.definition.moveFactor;
  }
  if (player.hitstunTimer > 0) {
    speed *= 0.2;
  }

  if (hasMovement) {
    player.heading = Math.atan2(worldMove.x, worldMove.z);
  }

  moveWithCollisions(player.group, worldMove.multiplyScalar(speed * dt), player.radius);
  player.group.rotation.y = lerpAngle(
    player.group.rotation.y,
    player.heading,
    Math.min(1, dt * 14)
  );

  if (player.attack) {
    switchAnimation(player.animation, 'attack', { loop: false, timeScale: 1.02 });
  } else if (hasMovement) {
    switchAnimation(player.animation, 'run', { loop: true, timeScale: 1.1 });
  } else {
    switchAnimation(player.animation, 'idle', { loop: true, timeScale: 1 });
  }
}

function beginEnemyAttack(enemy) {
  if (enemy.attackWindup > 0 || enemy.hitstunTimer > 0) return;
  enemy.attackWindup = enemy.archetype.attackWindup;
  enemy.attackCooldown = enemy.archetype.attackCooldown;
  switchAnimation(enemy.animation, 'attack', {
    loop: false,
    fadeTime: 0.08,
    timeScale: enemy.archetype.flying ? 1.2 : 1.0
  });
}

function executeEnemyAttack(enemy) {
  const toPlayer = player.group.position.clone().sub(enemy.group.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  const direction = distance > 0.001 ? toPlayer.normalize() : getForwardVector(enemy.heading);

  if (enemy.archetype.flying) {
    spawnProjectile({
      owner: 'enemy',
      position: enemy.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      direction,
      speed: enemy.archetype.projectileSpeed,
      damage: enemy.archetype.damage,
      knockback: 5,
      life: 1.8,
      color: 0xffa2c7,
      emissive: 0x4a1237
    });
    spawnRingEffect(enemy.group.position.clone(), 0xe7b4ff, 1.7, 0.18);
  } else if (distance <= enemy.archetype.attackRange + player.radius) {
    damagePlayer(enemy.archetype.damage, direction);
  }
}

function updateEnemy(enemy, dt) {
  if (!enemy.active) return;

  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
  enemy.hitstunTimer = Math.max(0, enemy.hitstunTimer - dt);
  enemy.orbitCooldown = Math.max(0, enemy.orbitCooldown - dt);

  if (enemy.knockback.lengthSq() > 0.0001) {
    const knockbackStep = enemy.knockback.clone().multiplyScalar(dt);
    if (enemy.archetype.flying) {
      enemy.group.position.add(knockbackStep);
      clampWithinArena(enemy.group.position, enemy.radius);
    } else {
      moveWithCollisions(enemy.group, knockbackStep, enemy.radius);
    }
    enemy.knockback.lerp(new THREE.Vector3(), Math.min(1, dt * 9));
  }

  if (enemy.attackWindup > 0) {
    enemy.attackWindup = Math.max(0, enemy.attackWindup - dt);
    if (enemy.attackWindup === 0) {
      executeEnemyAttack(enemy);
    }
  }

  const toPlayer = player.group.position.clone().sub(enemy.group.position);
  toPlayer.y = 0;
  const distance = toPlayer.length();
  const direction = distance > 0.001 ? toPlayer.normalize() : getForwardVector(enemy.heading);
  const lateral = new THREE.Vector3(-direction.z, 0, direction.x);
  let move = new THREE.Vector3();

  if (enemy.hitstunTimer <= 0 && enemy.attackWindup <= 0) {
    if (enemy.archetype.flying) {
      if (distance > enemy.archetype.attackRange - 1.5) {
        move.add(direction);
      } else if (distance < enemy.archetype.attackRange - 3) {
        move.addScaledVector(direction, -1);
      }
      move.addScaledVector(lateral, Math.sin(clock.elapsedTime * 1.8 + enemy.hoverOffset) * 0.45);
      if (enemy.attackCooldown <= 0 && distance <= enemy.archetype.attackRange) {
        beginEnemyAttack(enemy);
      }
    } else {
      if (distance > enemy.archetype.attackRange * 0.92) {
        move.add(direction);
      }
      if (enemy.attackCooldown <= 0 && distance <= enemy.archetype.attackRange) {
        beginEnemyAttack(enemy);
      }
    }
  }

  if (move.lengthSq() > 1) {
    move.normalize();
  }

  if (move.lengthSq() > 0.001) {
    enemy.heading = Math.atan2(move.x, move.z);
  } else if (distance > 0.001) {
    enemy.heading = Math.atan2(direction.x, direction.z);
  }

  const moveSpeed = enemy.archetype.speed * (enemy.attackWindup > 0 ? 0.16 : 1);
  const moveStep = move.multiplyScalar(moveSpeed * dt);

  if (enemy.archetype.flying) {
    enemy.group.position.add(moveStep);
    clampWithinArena(enemy.group.position, enemy.radius);
    enemy.group.position.y = enemy.archetype.hoverHeight + Math.sin(clock.elapsedTime * 3.2 + enemy.hoverOffset) * 0.2;
  } else {
    moveWithCollisions(enemy.group, moveStep, enemy.radius);
    enemy.group.position.y = 0;
  }

  enemy.group.rotation.y = lerpAngle(
    enemy.group.rotation.y,
    enemy.heading,
    Math.min(1, dt * 10)
  );

  const hurtScale = 1 + enemy.hurtTimer * 0.22;
  enemy.group.scale.setScalar(hurtScale);

  if (enemy.attackWindup > 0) {
    switchAnimation(enemy.animation, 'attack', { loop: false, timeScale: 1.0 });
  } else if (move.lengthSq() > 0.02) {
    switchAnimation(enemy.animation, enemy.archetype.flying ? 'run' : 'walk', {
      loop: true,
      timeScale: enemy.archetype.flying ? 1.05 : 0.95
    });
  } else {
    switchAnimation(enemy.animation, 'idle', { loop: true, timeScale: 1 });
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    if (!projectile.active) continue;

    projectile.life -= dt;
    projectile.mesh.position.addScaledVector(projectile.velocity, dt);

    if (projectile.life <= 0) {
      releaseProjectile(projectile);
      continue;
    }

    if (projectile.owner === 'enemy') {
      const distance = projectile.mesh.position.distanceTo(player.group.position);
      if (distance <= projectile.radius + player.radius) {
        const direction = player.group.position.clone().sub(projectile.mesh.position);
        direction.y = 0;
        if (direction.lengthSq() === 0) {
          direction.copy(getPlayerForward());
        } else {
          direction.normalize();
        }
        damagePlayer(projectile.damage, direction);
        releaseProjectile(projectile);
      }
    } else {
      let hit = false;
      for (const enemy of [...activeEnemies]) {
        const distance = projectile.mesh.position.distanceTo(enemy.group.position);
        if (distance <= projectile.radius + enemy.radius) {
          const direction = enemy.group.position.clone().sub(projectile.mesh.position);
          direction.y = 0;
          if (direction.lengthSq() === 0) {
            direction.copy(getPlayerForward());
          } else {
            direction.normalize();
          }
          applyDamageToEnemy(enemy, projectile.damage, direction, projectile.knockback, 0.18, { heavy: false });
          hit = true;
          break;
        }
      }
      if (hit) {
        releaseProjectile(projectile);
      }
    }

    if (Math.abs(projectile.mesh.position.x) > CONFIG.arenaHalf + 4 || Math.abs(projectile.mesh.position.z) > CONFIG.arenaHalf + 4) {
      releaseProjectile(projectile);
    }
  }
}

function updatePickups(dt) {
  for (let i = activePickups.length - 1; i >= 0; i -= 1) {
    updateSinglePickup(activePickups[i], dt);
  }
}

function updateSinglePickup(pickup, dt) {
  pickup.lifetime += dt;
  pickup.group.rotation.y += dt * 2.1;
  pickup.group.position.y = pickup.baseY + Math.sin(clock.elapsedTime * 3.2 + pickup.floatOffset) * 0.15;

  const toPlayer = player.group.position.clone().sub(pickup.group.position);
  const distance = toPlayer.length();

  if (distance <= CONFIG.pickup.collectRadius) {
    collectPickup(pickup);
    return;
  }

  if (distance <= CONFIG.pickup.magnetRadius) {
    toPlayer.normalize();
    pickup.group.position.addScaledVector(toPlayer, dt * 7.2);
  }

  if (pickup.lifetime > 18) {
    releasePickup(pickup);
  }
}

function collectPickup(pickup) {
  switch (pickup.kind) {
    case 'xp':
      gainXp(pickup.value);
      break;
    case 'heal':
      player.health = Math.min(player.maxHealth, player.health + 18);
      setStatus('Recovered health.', 0.8);
      break;
    case 'special':
      player.specialCooldown = Math.max(0, player.specialCooldown - 3.5);
      setStatus('Special charge recovered.', 0.9);
      break;
    default:
      break;
  }
  releasePickup(pickup);
}

function ensureOrbitBlade() {
  if (orbitBlade) return;
  orbitBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.95, 0.55),
    new THREE.MeshStandardMaterial({
      color: 0x9ce8ff,
      emissive: 0x18486a,
      roughness: 0.35,
      metalness: 0.25
    })
  );
  orbitBlade.castShadow = true;
  orbitBlade.receiveShadow = true;
  orbitBlade.visible = false;
  scene.add(orbitBlade);
}

function updateAutoSkills(dt) {
  if (!player) return;

  if (hasUpgrade('orbit_blade')) {
    ensureOrbitBlade();
    orbitBlade.visible = true;
    player.orbitAngle += dt * 3.2;
    orbitBlade.position.copy(player.group.position);
    orbitBlade.position.x += Math.cos(player.orbitAngle) * 1.8;
    orbitBlade.position.z += Math.sin(player.orbitAngle) * 1.8;
    orbitBlade.position.y = 1.1 + Math.sin(player.orbitAngle * 2) * 0.18;
    orbitBlade.rotation.y += dt * 8;

    for (const enemy of [...activeEnemies]) {
      const distance = orbitBlade.position.distanceTo(enemy.group.position);
      if (distance <= 1.0 + enemy.radius && enemy.orbitCooldown <= 0) {
        const direction = enemy.group.position.clone().sub(player.group.position);
        direction.y = 0;
        if (direction.lengthSq() === 0) {
          direction.copy(getPlayerForward());
        } else {
          direction.normalize();
        }
        enemy.orbitCooldown = 0.45;
        applyDamageToEnemy(enemy, 7 + combatStats.damageBonus * 0.35, direction, 3.5, 0.1);
      }
    }
  } else if (orbitBlade) {
    orbitBlade.visible = false;
  }

  if (hasUpgrade('ghost_bolts')) {
    player.ghostBoltTimer -= dt;
    if (player.ghostBoltTimer <= 0 && activeEnemies.length > 0) {
      player.ghostBoltTimer = 3.4;
      const targets = [...activeEnemies]
        .sort((a, b) => a.group.position.distanceTo(player.group.position) - b.group.position.distanceTo(player.group.position))
        .slice(0, 2);
      for (const target of targets) {
        const direction = target.group.position.clone().sub(player.group.position);
        direction.y = 0;
        direction.normalize();
        spawnProjectile({
          owner: 'player',
          position: player.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
          direction,
          speed: 14.5,
          damage: 13 + combatStats.damageBonus,
          knockback: 5.6,
          life: 1.45,
          color: 0x9fefff,
          emissive: 0x14415b
        });
      }
      spawnRingEffect(player.group.position.clone(), 0x9fefff, 1.8, 0.18);
    }
  }

  if (hasUpgrade('spinning_slash')) {
    player.spinSlashTimer -= dt;
    if (player.spinSlashTimer <= 0 && activeEnemies.length > 0) {
      player.spinSlashTimer = 6.5;
      performAreaAttack(player.group.position.clone(), 3.2, 16 + combatStats.damageBonus, {
        knockback: 6.4,
        stun: 0.18,
        color: 0xffdfa0
      });
    }
  }
}

function buildSpawnQueue(definition) {
  const queue = [];
  for (const group of definition.spawns) {
    for (let i = 0; i < group.count; i += 1) {
      queue.push({
        archetype: group.archetype,
        delay: group.delay + i * group.interval
      });
    }
  }
  queue.sort((a, b) => a.delay - b.delay);
  return queue;
}

function startNextWave() {
  if (director.currentWaveIndex + 1 >= WAVE_DEFS.length) {
    director.completed = true;
    return;
  }

  director.currentWaveIndex += 1;
  director.waveActive = true;
  director.elapsedInWave = 0;
  director.spawnQueue = buildSpawnQueue(WAVE_DEFS[director.currentWaveIndex]);
  state.wave = director.currentWaveIndex + 1;
  setStatus(WAVE_DEFS[director.currentWaveIndex].intro, 1.6);
  pushPrompt(`Wave ${state.wave}`, 1.2);
}

function updateWaveDirector(dt) {
  if (state.draftActive || state.hasEnded) return;

  if (!director.waveActive) {
    if (director.completed) {
      if (activeEnemies.length === 0) {
        endGame('win', 'The arena falls silent. Press R to run again.');
      }
      return;
    }

    director.intermission -= dt;
    if (director.intermission <= 0) {
      director.intermission = CONFIG.intermission;
      startNextWave();
    }
    return;
  }

  director.elapsedInWave += dt;
  while (director.spawnQueue.length > 0 && director.elapsedInWave >= director.spawnQueue[0].delay) {
    const nextSpawn = director.spawnQueue.shift();
    spawnEnemy(nextSpawn.archetype, chooseSpawnPoint());
  }

  if (director.spawnQueue.length === 0 && activeEnemies.length === 0) {
    director.waveActive = false;
    if (director.currentWaveIndex >= WAVE_DEFS.length - 1) {
      director.completed = true;
      return;
    }
    director.intermission = CONFIG.intermission;
    setStatus(`Wave ${state.wave} cleared. Prepare for the next push.`, 1.4);
    spawnPickup('special', player.group.position.clone().add(new THREE.Vector3(0, 0, -1.2)), 1);
  }
}

function updateTimer(dt) {
  if (state.hasEnded || state.draftActive) return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) {
    endGame('lose', 'Time ran out. Press R to fight again.');
  }
}

function endGame(result, message) {
  if (state.hasEnded) return;
  state.hasEnded = true;
  state.result = result;
  state.draftActive = false;
  renderDraftChoices();
  setStatus(message);
  pushPrompt('Press R to restart.', 999);
  showBanner(result === 'win' ? 'Arena Cleared' : 'Run Failed', message);
  if (result === 'win') {
    triggerSlowMo(0.5, 0.2);
  }
}

function updateCamera(dt) {
  if (!player) return;
  const desired = player.group.position.clone().add(CONFIG.cameraOffset);

  if (state.cameraShakeTimer > 0) {
    state.cameraShakeTimer = Math.max(0, state.cameraShakeTimer - dt);
    const shake = state.cameraShakeIntensity * (state.cameraShakeTimer / Math.max(state.cameraShakeTimer, 0.0001));
    desired.x += (Math.random() - 0.5) * shake;
    desired.y += (Math.random() - 0.5) * shake * 0.45;
    desired.z += (Math.random() - 0.5) * shake;
    state.cameraShakeIntensity = Math.max(0, state.cameraShakeIntensity - dt * 1.5);
  }

  camera.position.lerp(desired, Math.min(1, dt * 3.6));
  const target = player.group.position.clone().add(CONFIG.cameraLookOffset);
  camera.lookAt(target);
}

function updateMixers(dt) {
  for (const mixer of mixers) {
    mixer.update(dt);
  }
}

function setupInput() {
  window.addEventListener('keydown', (event) => {
    if (state.draftActive) {
      if (event.code === 'Digit1') {
        chooseDraft(0);
        return;
      }
      if (event.code === 'Digit2') {
        chooseDraft(1);
        return;
      }
      if (event.code === 'Digit3') {
        chooseDraft(2);
        return;
      }
      if (event.code === 'Enter') {
        chooseDraft(state.draftSelection);
        return;
      }
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
      case 'Space':
        event.preventDefault();
        if (!event.repeat) {
          tryAttack();
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (!event.repeat) {
          tryDodge();
        }
        break;
      case 'KeyF':
        if (!event.repeat) {
          trySpecial();
        }
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
      default:
        break;
    }
  });

  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

async function init() {
  hideBanner();
  renderSkillList();
  renderDraftChoices();
  updateHud();
  setStatus('Loading assets');

  await fetchAssetCatalog();
  buildArena();
  await placeDecorations();
  await warmEnemyPools();
  await warmPickupPools();
  warmProjectilePool();
  player = await createPlayer();

  camera.position.copy(player.group.position).add(CONFIG.cameraOffset);
  camera.lookAt(player.group.position.clone().add(CONFIG.cameraLookOffset));

  setStatus('Enter the arena. Wave one is forming.', 1.5);
  pushPrompt('Space attacks. Shift wave-dashes.', 2.3);
  state.ready = true;
  window.__TEST__.ready = true;

  void topOffEnemyPools().catch((error) => {
    console.warn('[warmup] enemy pool top-off failed', error);
  });
  void topOffPickupPools().catch((error) => {
    console.warn('[warmup] pickup pool top-off failed', error);
  });
}

function animate() {
  const realDt = Math.min(0.05, clock.getDelta());
  const dt = getScaledDt(realDt);
  const now = performance.now();

  if (state.ready) {
    updateStatus(now);
    updatePrompt(now);

    if (!state.hasEnded && !state.draftActive) {
      updateTimer(dt);
      updateWaveDirector(dt);
      updatePlayer(dt);
      updateAutoSkills(dt);

      for (let i = activeEnemies.length - 1; i >= 0; i -= 1) {
        updateEnemy(activeEnemies[i], dt);
      }

      updateProjectiles(dt);
      updatePickups(dt);
    }

    updateEffects(realDt);
    updateMixers(dt);
    updateCamera(realDt);
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
