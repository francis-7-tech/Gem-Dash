import * as THREE from 'three';

// Builds a low-poly figure from a start.ng character style (see "Character style fields" in https://start.ng/docs.md).

const DEFAULT_STYLE = {
  body: 'male',
  primaryColor: '#4b7bec',
  secondaryColor: '#2b2f4a',
  skinColor: '#c68642',
  hairColor: '#17120f',
  hair: 'short',
  hat: 'none',
  accessory: 'none',
};

const BODIES = ['female', 'male'];
const HAIRS = ['short', 'afro', 'braids', 'bun', 'ponytail', 'dreads', 'bald'];
const HATS = ['none', 'cap', 'beanie', 'tophat', 'crown'];
const ACCESSORIES = ['none', 'glasses', 'earrings', 'beard', 'scarf', 'backpack'];

function pickColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function pickOption(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// Fills in anything missing or unknown, since start.ng may add options later.
export function normalizeStyle(style) {
  const s = style && typeof style === 'object' ? style : {};
  return {
    body: pickOption(s.body, BODIES, DEFAULT_STYLE.body),
    primaryColor: pickColor(s.primaryColor, DEFAULT_STYLE.primaryColor),
    secondaryColor: pickColor(s.secondaryColor, DEFAULT_STYLE.secondaryColor),
    skinColor: pickColor(s.skinColor, DEFAULT_STYLE.skinColor),
    hairColor: pickColor(s.hairColor, DEFAULT_STYLE.hairColor),
    hair: pickOption(s.hair, HAIRS, DEFAULT_STYLE.hair),
    hat: pickOption(s.hat, HATS, DEFAULT_STYLE.hat),
    accessory: pickOption(s.accessory, ACCESSORIES, DEFAULT_STYLE.accessory),
  };
}

function part(geometry, color, options = {}) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options }),
  );
  mesh.castShadow = true;
  return mesh;
}

function addLegs(figure, style, parts) {
  const female = style.body === 'female';
  const legColor = female ? style.skinColor : style.secondaryColor;
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.13 * side, 0.8, 0);
    const leg = part(new THREE.BoxGeometry(0.2, 0.8, 0.22), legColor);
    leg.position.y = -0.4;
    const shoe = part(new THREE.BoxGeometry(0.22, 0.12, 0.32), '#2d2d2d');
    shoe.position.set(0, -0.76, 0.05);
    hip.add(leg, shoe);
    figure.add(hip);
    parts[side < 0 ? 'leftLeg' : 'rightLeg'] = hip;
  }
  if (female) {
    const skirt = part(new THREE.CylinderGeometry(0.27, 0.42, 0.42, 20), style.secondaryColor);
    skirt.position.y = 0.72;
    figure.add(skirt);
  } else {
    const hips = part(new THREE.BoxGeometry(0.48, 0.2, 0.26), style.secondaryColor);
    hips.position.y = 0.82;
    figure.add(hips);
  }
}

function addBody(figure, style, parts) {
  const female = style.body === 'female';
  const torso = female
    ? part(new THREE.CylinderGeometry(0.24, 0.27, 0.62, 20), style.primaryColor)
    : part(new THREE.BoxGeometry(0.5, 0.62, 0.3), style.primaryColor);
  torso.position.y = 1.12;
  const neck = part(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), style.skinColor);
  neck.position.y = 1.48;
  figure.add(torso, neck);

  const shoulderX = female ? 0.31 : 0.33;
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(shoulderX * side, 1.38, 0);
    const sleeve = part(new THREE.BoxGeometry(0.14, 0.36, 0.16), style.primaryColor);
    sleeve.position.y = -0.18;
    const forearm = part(new THREE.BoxGeometry(0.12, 0.3, 0.14), style.skinColor);
    forearm.position.y = -0.5;
    const hand = part(new THREE.SphereGeometry(0.08, 12, 8), style.skinColor);
    hand.position.y = -0.68;
    shoulder.add(sleeve, forearm, hand);
    figure.add(shoulder);
    parts[side < 0 ? 'leftArm' : 'rightArm'] = shoulder;
  }
}

function addHead(figure, style) {
  const head = part(new THREE.SphereGeometry(0.24, 24, 16), style.skinColor);
  head.position.y = 1.75;
  figure.add(head);
  for (const side of [-1, 1]) {
    const eye = part(new THREE.SphereGeometry(0.035, 8, 8), '#1b1b1b');
    eye.position.set(0.08 * side, 1.78, 0.215);
    figure.add(eye);
  }
}

function addStrands(figure, color, count, fromAngle, toAngle, length) {
  for (let i = 0; i < count; i++) {
    const angle = fromAngle + ((toAngle - fromAngle) * i) / (count - 1);
    const strand = part(new THREE.CylinderGeometry(0.035, 0.03, length, 6), color);
    strand.position.set(Math.sin(angle) * 0.22, 1.75 - length / 2, Math.cos(angle) * 0.22);
    figure.add(strand);
  }
}

function addHair(figure, style) {
  if (style.hair === 'bald') return;
  const color = style.hairColor;

  if (style.hair === 'afro') {
    const afro = part(new THREE.SphereGeometry(0.36, 20, 14), color);
    afro.position.set(0, 1.86, -0.04);
    figure.add(afro);
    return;
  }

  const cap = part(new THREE.SphereGeometry(0.255, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), color);
  cap.position.y = 1.75;
  cap.rotation.x = -0.25;
  figure.add(cap);

  if (style.hair === 'braids') {
    addStrands(figure, color, 6, Math.PI * 0.65, Math.PI * 1.35, 0.45);
  } else if (style.hair === 'dreads') {
    addStrands(figure, color, 10, Math.PI * 0.35, Math.PI * 1.65, 0.5);
  } else if (style.hair === 'bun') {
    const bun = part(new THREE.SphereGeometry(0.12, 12, 10), color);
    bun.position.set(0, 2.0, -0.12);
    figure.add(bun);
  } else if (style.hair === 'ponytail') {
    const tail = part(new THREE.CylinderGeometry(0.07, 0.04, 0.42, 8), color);
    tail.position.set(0, 1.62, -0.28);
    tail.rotation.x = 0.3;
    figure.add(tail);
  }
}

function addHat(figure, style) {
  const lift = style.hair === 'afro' ? 0.12 : 0;

  if (style.hat === 'cap' || style.hat === 'beanie') {
    const dome = part(new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), style.primaryColor);
    dome.position.y = 1.77 + lift;
    figure.add(dome);
    if (style.hat === 'cap') {
      const brim = part(new THREE.BoxGeometry(0.34, 0.03, 0.22), style.primaryColor);
      brim.position.set(0, 1.79 + lift, 0.3);
      figure.add(brim);
    } else {
      const rim = part(new THREE.TorusGeometry(0.265, 0.045, 8, 24), style.secondaryColor);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.79 + lift;
      figure.add(rim);
    }
  } else if (style.hat === 'tophat') {
    const brim = part(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 24), '#222222');
    brim.position.y = 1.96 + lift;
    const crown = part(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 24), '#222222');
    crown.position.y = 2.17 + lift;
    const band = part(new THREE.CylinderGeometry(0.205, 0.205, 0.06, 24), style.primaryColor);
    band.position.y = 2.0 + lift;
    figure.add(brim, crown, band);
  } else if (style.hat === 'crown') {
    const gold = { metalness: 0.6, roughness: 0.3 };
    const ring = part(
      new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20, 1, true),
      '#f5c518',
      { ...gold, side: THREE.DoubleSide },
    );
    ring.position.y = 2.0 + lift;
    figure.add(ring);
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      const spike = part(new THREE.ConeGeometry(0.05, 0.14, 8), '#f5c518', gold);
      spike.position.set(Math.sin(angle) * 0.2, 2.13 + lift, Math.cos(angle) * 0.2);
      figure.add(spike);
    }
  }
}

function addAccessory(figure, style) {
  if (style.accessory === 'glasses') {
    for (const side of [-1, 1]) {
      const lens = part(new THREE.TorusGeometry(0.06, 0.012, 8, 16), '#111111');
      lens.position.set(0.09 * side, 1.78, 0.235);
      figure.add(lens);
    }
    const bridge = part(new THREE.BoxGeometry(0.06, 0.012, 0.012), '#111111');
    bridge.position.set(0, 1.78, 0.24);
    figure.add(bridge);
  } else if (style.accessory === 'earrings') {
    for (const side of [-1, 1]) {
      const earring = part(new THREE.SphereGeometry(0.035, 8, 8), '#f5c518', { metalness: 0.6, roughness: 0.3 });
      earring.position.set(0.245 * side, 1.68, 0);
      figure.add(earring);
    }
  } else if (style.accessory === 'beard') {
    const beard = part(
      new THREE.SphereGeometry(0.245, 20, 12, 0, Math.PI, Math.PI * 0.55, Math.PI * 0.45),
      style.hairColor,
    );
    beard.position.set(0, 1.72, 0.02);
    figure.add(beard);
  } else if (style.accessory === 'scarf') {
    const scarf = part(new THREE.TorusGeometry(0.15, 0.06, 8, 20), style.secondaryColor);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.47;
    const tail = part(new THREE.BoxGeometry(0.1, 0.3, 0.05), style.secondaryColor);
    tail.position.set(0.08, 1.3, 0.17);
    figure.add(scarf, tail);
  } else if (style.accessory === 'backpack') {
    const pack = part(new THREE.BoxGeometry(0.4, 0.45, 0.18), style.secondaryColor);
    pack.position.set(0, 1.12, -0.25);
    figure.add(pack);
  }
}

// Returns a THREE.Group about 2 units tall, facing +z, with feet at y = 0.
// userData.parts holds the limbs so the game can animate walking.
export function buildCharacter(rawStyle) {
  const style = normalizeStyle(rawStyle);
  const figure = new THREE.Group();
  const parts = {};
  addLegs(figure, style, parts);
  addBody(figure, style, parts);
  addHead(figure, style);
  addHair(figure, style);
  addHat(figure, style);
  addAccessory(figure, style);
  figure.userData.parts = parts;
  return figure;
}
