import * as THREE from 'three';
import { buildCharacter } from './character.js';
import { whoIsPlaying, signIn, saveRun, topPlayers } from './startng.js';

const ROUND_SECONDS = 60;
const ISLAND_RADIUS = 14;
const PLAY_RADIUS = ISLAND_RADIUS - 1.6;
const PLAYER_SPEED = 7;
const PLAYER_RADIUS = 0.4;
const GEMS_ON_ISLAND = 5;
const GEM_COLORS = ['#ff4d6d', '#4cc9f0', '#ffd166', '#b388ff', '#06d6a0'];

// Difficulty: every GEMS_PER_LEVEL gems is a new level, and each level sends more, faster boulders.
const GEMS_PER_LEVEL = 5;
const BOULDER_INTERVAL = { start: 2.4, step: 0.3, min: 0.6 };
const BOULDER_SPEED = { start: 5, step: 0.7, max: 12 };
const PAIRS_FROM_LEVEL = 4;
const PAIR_CHANCE = 0.5;
const HIT_FLASH_SECONDS = 0.8;

const ui = {
  level: document.getElementById('level'),
  levelUp: document.getElementById('level-up'),
  gems: document.getElementById('gems'),
  time: document.getElementById('time'),
  startScreen: document.getElementById('start-screen'),
  endScreen: document.getElementById('end-screen'),
  endTitle: document.getElementById('end-title'),
  finalGems: document.getElementById('final-gems'),
  saveMessage: document.getElementById('save-message'),
  leaderboard: document.getElementById('leaderboard'),
  card: document.getElementById('player-card'),
  face: document.getElementById('player-face'),
  name: document.getElementById('player-name'),
  account: document.getElementById('player-account'),
  signIn: document.getElementById('player-sign-in'),
};

// ---------- Scene ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game').append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
scene.fog = new THREE.Fog('#8fd3ff', 35, 80);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
const CAMERA_OFFSET = new THREE.Vector3(0, 10, 12);

scene.add(new THREE.HemisphereLight('#ffffff', '#5a8f3c', 0.9));
const sun = new THREE.DirectionalLight('#ffffff', 1.4);
sun.position.set(10, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18 });
scene.add(sun);

const sea = new THREE.Mesh(new THREE.CircleGeometry(120, 48), new THREE.MeshLambertMaterial({ color: '#2e86de' }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.7;
scene.add(sea);

const sand = new THREE.Mesh(
  new THREE.CylinderGeometry(ISLAND_RADIUS + 1.2, ISLAND_RADIUS + 1.8, 0.6, 48),
  new THREE.MeshLambertMaterial({ color: '#f1d58a' }),
);
sand.position.y = -0.55;
scene.add(sand);

const grass = new THREE.Mesh(
  new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 0.6, 1.2, 48),
  new THREE.MeshLambertMaterial({ color: '#7bc950' }),
);
grass.position.y = -0.6;
grass.receiveShadow = true;
scene.add(grass);

function addPalm(angle) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, 3, 8),
    new THREE.MeshLambertMaterial({ color: '#8b5a2b' }),
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 1.2, 7),
    new THREE.MeshLambertMaterial({ color: '#2d9b4e' }),
  );
  leaves.position.y = 3.2;
  leaves.castShadow = true;
  palm.add(trunk, leaves);
  palm.position.set(Math.sin(angle) * (ISLAND_RADIUS - 0.6), 0, Math.cos(angle) * (ISLAND_RADIUS - 0.6));
  scene.add(palm);
}
[0.3, 1.4, 2.6, 3.5, 4.6, 5.6].forEach(addPalm);

// ---------- Player ----------

let player = buildCharacter(null);
scene.add(player);
let lookKey = '';
let currentUser = null;

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    child.material?.dispose();
  });
}

// Rebuilds the character from a start.ng style, keeping its place on the island.
function setLook(style) {
  const key = JSON.stringify(style ?? null);
  if (key === lookKey) return;
  lookKey = key;
  const next = buildCharacter(style);
  next.position.copy(player.position);
  next.rotation.y = player.rotation.y;
  scene.remove(player);
  disposeObject(player);
  player = next;
  scene.add(player);
}

function showCard(who) {
  const person = who?.user ?? who?.guest;
  ui.name.textContent = person?.name ?? 'Guest';
  ui.account.textContent = who?.user?.account ? `@${who.user.account}` : 'Not signed in';
  if (person?.face) {
    ui.face.src = person.face;
    ui.face.hidden = false;
  } else {
    ui.face.hidden = true;
  }
  ui.signIn.hidden = Boolean(who?.user);
  ui.card.hidden = false;
}

// Asks start.ng who is playing and dresses the character in their start.ng style.
async function refreshPlayer() {
  const who = await whoIsPlaying();
  currentUser = who?.user ?? null;
  const person = who?.user ?? who?.guest;
  if (person) setLook(person.style);
  showCard(who);
}

ui.signIn.addEventListener('click', signIn);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshPlayer();
});
window.addEventListener('focus', refreshPlayer);

// start.ng may send players back with a session in the address; the connect page doesn't need it.
if (location.hash.includes('startng_session')) {
  history.replaceState(null, '', location.pathname + location.search);
}

// ---------- Controls ----------

const keys = new Set();
const KEY_DIRECTIONS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

addEventListener('keydown', (e) => {
  if (KEY_DIRECTIONS[e.code]) {
    keys.add(e.code);
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Drag anywhere on the game to move, like a joystick.
let dragStart = null;
const dragDirection = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragStart = { x: e.clientX, y: e.clientY };
  dragDirection.set(0, 0);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragStart) return;
  dragDirection.set(e.clientX - dragStart.x, e.clientY - dragStart.y);
  if (dragDirection.length() < 12) dragDirection.set(0, 0);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  renderer.domElement.addEventListener(type, () => {
    dragStart = null;
    dragDirection.set(0, 0);
  });
}

function moveInput() {
  const direction = new THREE.Vector2();
  for (const code of keys) direction.add(new THREE.Vector2(...KEY_DIRECTIONS[code]));
  if (direction.lengthSq() === 0) direction.copy(dragDirection);
  return direction.lengthSq() > 0 ? direction.normalize() : direction;
}

// ---------- Gems and boulders ----------

const gemGeometry = new THREE.OctahedronGeometry(0.4);
const boulderGeometry = new THREE.IcosahedronGeometry(0.9, 0);
let gems = [];
let boulders = [];

function randomPointOnIsland(maxRadius) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * maxRadius;
  return new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
}

function spawnGem() {
  let point;
  do {
    point = randomPointOnIsland(PLAY_RADIUS - 0.5);
  } while (point.distanceTo(player.position) < 3);
  const color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
  const gem = new THREE.Mesh(
    gemGeometry,
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.2 }),
  );
  gem.position.set(point.x, 0.8, point.z);
  gem.castShadow = true;
  gem.userData.phase = Math.random() * Math.PI * 2;
  scene.add(gem);
  gems.push(gem);
}

function levelFor(gemCount) {
  return 1 + Math.floor(gemCount / GEMS_PER_LEVEL);
}

function boulderInterval(level) {
  return Math.max(BOULDER_INTERVAL.min, BOULDER_INTERVAL.start - BOULDER_INTERVAL.step * (level - 1));
}

function spawnBoulder(level) {
  const angle = Math.random() * Math.PI * 2;
  const start = new THREE.Vector3(Math.sin(angle) * (ISLAND_RADIUS + 2), 0.9, Math.cos(angle) * (ISLAND_RADIUS + 2));
  const target = randomPointOnIsland(ISLAND_RADIUS * 0.6);
  const speed = Math.min(BOULDER_SPEED.max, BOULDER_SPEED.start + BOULDER_SPEED.step * (level - 1)) + Math.random() * 1.5;
  const velocity = new THREE.Vector3(target.x - start.x, 0, target.z - start.z).normalize().multiplyScalar(speed);
  const boulder = new THREE.Mesh(
    boulderGeometry,
    new THREE.MeshStandardMaterial({ color: '#7d7d7d', roughness: 1, flatShading: true }),
  );
  boulder.position.copy(start);
  boulder.castShadow = true;
  boulder.userData.velocity = velocity;
  boulder.userData.rollAxis = new THREE.Vector3(velocity.z, 0, -velocity.x).normalize();
  scene.add(boulder);
  boulders.push(boulder);
}

function removeObject(object) {
  scene.remove(object);
  object.material.dispose();
}

function clearIsland() {
  gems.forEach(removeObject);
  boulders.forEach(removeObject);
  gems = [];
  boulders = [];
}

// ---------- Rounds ----------

// 'ready' → 'playing' → 'hit' (a short flash after a boulder hit) → 'over'
let state = 'ready';
let timeLeft = ROUND_SECONDS;
let gemsCollected = 0;
let level = 1;
let hitFlashLeft = 0;
let nextBoulderIn = 0;
let levelUpTimer = 0;

function updateHud() {
  ui.level.textContent = String(level);
  ui.gems.textContent = String(gemsCollected);
  ui.time.textContent = String(Math.max(0, Math.ceil(timeLeft)));
}

function showLevelUp() {
  ui.levelUp.textContent = `Level ${level}! More boulders`;
  ui.levelUp.hidden = true;
  void ui.levelUp.offsetWidth; // restart the pop animation
  ui.levelUp.hidden = false;
  clearTimeout(levelUpTimer);
  levelUpTimer = setTimeout(() => {
    ui.levelUp.hidden = true;
  }, 1500);
}

function startRound() {
  clearIsland();
  player.position.set(0, 0, 0);
  player.rotation.y = 0;
  player.visible = true;
  timeLeft = ROUND_SECONDS;
  gemsCollected = 0;
  level = 1;
  hitFlashLeft = 0;
  nextBoulderIn = 2;
  for (let i = 0; i < GEMS_ON_ISLAND; i++) spawnGem();
  clearTimeout(levelUpTimer);
  ui.levelUp.hidden = true;
  ui.startScreen.hidden = true;
  ui.endScreen.hidden = true;
  state = 'playing';
  updateHud();
}

function renderLeaderboard(entries) {
  ui.leaderboard.replaceChildren();
  if (!entries) {
    const li = document.createElement('li');
    li.textContent = 'The leaderboard shows when you play on gem-dash.start.ng.';
    ui.leaderboard.append(li);
    return;
  }
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No scores yet. Be the first!';
    ui.leaderboard.append(li);
    return;
  }
  for (const entry of entries) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = `${entry.rank}. ${entry.name}`;
    const score = document.createElement('span');
    score.textContent = `${entry.stats?.gems ?? entry.score} 💎`;
    li.append(name, score);
    if (currentUser && entry.player_id === currentUser.id) li.classList.add('me');
    ui.leaderboard.append(li);
  }
}

async function endRound(reason) {
  state = 'over';
  player.visible = true;
  clearTimeout(levelUpTimer);
  ui.levelUp.hidden = true;
  ui.endTitle.textContent = reason === 'hit' ? 'Hit by a boulder!' : "Time's up!";
  ui.finalGems.textContent = String(gemsCollected);
  ui.saveMessage.textContent = currentUser ? 'Saving your score…' : 'Sign in with start.ng to save your score to the leaderboard.';
  ui.leaderboard.replaceChildren();
  ui.endScreen.hidden = false;

  if (currentUser) {
    const saved = await saveRun(gemsCollected);
    if (!saved) {
      ui.saveMessage.textContent = 'Could not reach start.ng to save your score.';
    } else if (!saved.ok) {
      ui.saveMessage.textContent = saved.error ?? 'Your score was not saved.';
    } else if (saved.result.improved) {
      ui.saveMessage.textContent = `New best! You're #${saved.result.rank}.`;
    } else {
      ui.saveMessage.textContent = `Your best is still ${saved.result.best} gems (#${saved.result.rank}).`;
    }
  }
  renderLeaderboard(await topPlayers(10));
}

document.getElementById('start-button').addEventListener('click', startRound);
document.getElementById('again-button').addEventListener('click', startRound);

// ---------- Game loop ----------

const clock = new THREE.Clock();
let walkTime = 0;

function animateWalk(moving, dt) {
  const parts = player.userData.parts;
  if (moving) walkTime += dt * 10;
  const swing = moving ? Math.sin(walkTime) * 0.6 : 0;
  for (const [name, sign] of [['leftLeg', 1], ['rightLeg', -1], ['leftArm', -1], ['rightArm', 1]]) {
    const limb = parts[name];
    limb.rotation.x = THREE.MathUtils.lerp(limb.rotation.x, swing * sign, 0.3);
  }
}

function update(dt) {
  const direction = moveInput();
  const moving = state === 'playing' && direction.lengthSq() > 0;

  if (moving) {
    player.position.x += direction.x * PLAYER_SPEED * dt;
    player.position.z += direction.y * PLAYER_SPEED * dt;
    const distance = Math.hypot(player.position.x, player.position.z);
    if (distance > PLAY_RADIUS) player.position.multiplyScalar(PLAY_RADIUS / distance);
    player.rotation.y = Math.atan2(direction.x, direction.y);
  }
  animateWalk(moving, dt);

  const now = clock.elapsedTime;
  for (const gem of gems) {
    gem.rotation.y += dt * 2;
    gem.position.y = 0.8 + Math.sin(now * 3 + gem.userData.phase) * 0.15;
  }

  if (state === 'hit') {
    hitFlashLeft -= dt;
    player.visible = Math.floor(hitFlashLeft * 10) % 2 === 0;
    if (hitFlashLeft <= 0) endRound('hit');
    return;
  }

  if (state !== 'playing') return;

  timeLeft -= dt;

  for (const gem of [...gems]) {
    const dx = gem.position.x - player.position.x;
    const dz = gem.position.z - player.position.z;
    if (Math.hypot(dx, dz) < 0.9) {
      gemsCollected += 1;
      removeObject(gem);
      gems = gems.filter((g) => g !== gem);
      spawnGem();
      const newLevel = levelFor(gemsCollected);
      if (newLevel > level) {
        level = newLevel;
        showLevelUp();
      }
    }
  }

  nextBoulderIn -= dt;
  if (nextBoulderIn <= 0) {
    spawnBoulder(level);
    if (level >= PAIRS_FROM_LEVEL && Math.random() < PAIR_CHANCE) spawnBoulder(level);
    nextBoulderIn = boulderInterval(level);
  }

  for (const boulder of [...boulders]) {
    const { velocity, rollAxis } = boulder.userData;
    boulder.position.addScaledVector(velocity, dt);
    boulder.rotateOnWorldAxis(rollAxis, (velocity.length() * dt) / 0.9);

    const gap = Math.hypot(player.position.x - boulder.position.x, player.position.z - boulder.position.z);
    if (gap < 0.9 + PLAYER_RADIUS) {
      // One hit ends the round: flash the character briefly, then show the end card.
      state = 'hit';
      hitFlashLeft = HIT_FLASH_SECONDS;
      updateHud();
      return;
    }

    if (Math.hypot(boulder.position.x, boulder.position.z) > ISLAND_RADIUS + 6) {
      removeObject(boulder);
      boulders = boulders.filter((b) => b !== boulder);
    }
  }

  updateHud();
  if (timeLeft <= 0) endRound('time');
}

function followCamera(dt) {
  const target = player.position.clone().add(CAMERA_OFFSET);
  camera.position.lerp(target, Math.min(1, dt * 4));
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}

camera.position.copy(CAMERA_OFFSET);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  followCamera(dt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

updateHud();
refreshPlayer();
