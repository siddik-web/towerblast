export const BLOCK_MATERIALS = {
  wood: {
    id: 'wood',
    label: 'Wood',
    colors: [0xd98a4e, 0xc97b3e, 0xe59c5c, 0xb86d35],
    density: 0.9,
    friction: 0.72,
    restitution: 0.14,
    hp: 40,
    score: 100,
    sound: 'wood',
    roughness: 0.78,
    metalness: 0.04
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    colors: [0x6de3ff, 0x8beeff, 0x52d1f7],
    density: 0.65,
    friction: 0.45,
    restitution: 0.18,
    hp: 16,
    score: 85,
    sound: 'glass',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.74,
    weak: true
  },
  explosive: {
    id: 'explosive',
    label: 'TNT Core',
    colors: [0xff3b30, 0xf24e1e],
    density: 0.95,
    friction: 0.74,
    restitution: 0.15,
    hp: 20,
    score: 160,
    sound: 'wood',
    roughness: 0.55,
    metalness: 0.08,
    emissive: 0x4a0d05,
    explosive: true,
    blastRadius: 5.8,
    blastForce: 64,
    blastDamage: 115,
    weak: true
  },
  stone: {
    id: 'stone',
    label: 'Stone',
    colors: [0x8b98a8, 0x7c8a9b, 0x99a6b5, 0x6f7d8e],
    density: 1.8,
    friction: 0.82,
    restitution: 0.08,
    hp: 92,
    score: 180,
    sound: 'stone',
    roughness: 0.88,
    metalness: 0.05
  },
  concrete: {
    id: 'concrete',
    label: 'Concrete',
    colors: [0xc4bfb6, 0xb5afa5, 0xd1ccc3],
    density: 2.25,
    friction: 0.84,
    restitution: 0.06,
    hp: 145,
    score: 225,
    sound: 'stone',
    roughness: 0.92,
    metalness: 0.06
  },
  steel: {
    id: 'steel',
    label: 'Reinforced Steel',
    colors: [0x465c75, 0x3b4f66, 0x546d8a],
    density: 3.0,
    friction: 0.68,
    restitution: 0.16,
    hp: 245,
    score: 310,
    sound: 'metal',
    roughness: 0.36,
    metalness: 0.68
  }
};

export const WEAPON_TYPES = {
  cannonball: {
    id: 'cannonball',
    name: 'Cannonball',
    shortName: 'Iron Ball',
    hotkey: '1',
    icon: '⚫',
    accent: '#64748b',
    color: 0x2b3442,
    speed: 31,
    gravityScale: 1.0,
    mass: 6.2,
    radius: 0.42,
    count: 1,
    spread: 0,
    blastRadius: 2.8,
    blastForce: 32,
    directDamage: 68,
    blastDamage: 38,
    shake: 0.3,
    description: 'Heavy iron shot with reliable direct impact'
  },
  bomb: {
    id: 'bomb',
    name: 'Mega Bomb',
    shortName: 'Bomb',
    hotkey: '2',
    icon: '💣',
    accent: '#ef4444',
    color: 0x1c1917,
    speed: 25.5,
    gravityScale: 1.12,
    mass: 7.4,
    radius: 0.54,
    count: 1,
    spread: 0,
    blastRadius: 6.4,
    blastForce: 78,
    directDamage: 120,
    blastDamage: 128,
    shake: 0.78,
    description: 'Explodes on impact with a huge blast radius'
  },
  cluster: {
    id: 'cluster',
    name: 'Scatter Shot',
    shortName: 'Scatter',
    hotkey: '3',
    icon: '✨',
    accent: '#06b6d4',
    color: 0x06b6d4,
    speed: 32,
    gravityScale: 0.92,
    mass: 2.8,
    radius: 0.27,
    count: 5,
    spread: 0.068,
    blastRadius: 2.3,
    blastForce: 24,
    directDamage: 52,
    blastDamage: 34,
    shake: 0.34,
    description: 'Launches 5 energized spheres across wide targets'
  },
  rocket: {
    id: 'rocket',
    name: 'Power Rocket',
    shortName: 'Rocket',
    hotkey: '4',
    icon: '🚀',
    accent: '#f97316',
    color: 0xf97316,
    speed: 39,
    gravityScale: 0.14,
    mass: 5.5,
    radius: 0.38,
    count: 1,
    spread: 0,
    blastRadius: 5.6,
    blastForce: 90,
    directDamage: 210,
    blastDamage: 155,
    shake: 0.88,
    description: 'Flat-trajectory missile that punches through steel'
  }
};

export const WEAPON_ORDER = ['cannonball', 'bomb', 'cluster', 'rocket'];

// Helper builder that keeps blocks cleanly stacked with tiny epsilon clearance to prevent initial overlap jitter.
const EPS = 0.004;

function createBuilder() {
  const blocks = [];
  const add = (x, yBottom, z, w, h, d, material, shape = 'box', colorIndex = undefined) => {
    blocks.push({
      x: Number(x.toFixed(3)),
      y: Number((yBottom + h / 2 + EPS).toFixed(3)),
      z: Number(z.toFixed(3)),
      w,
      h,
      d,
      material,
      shape,
      colorIndex
    });
    return yBottom + h + EPS;
  };

  // Adds a symmetric floor: support pillars + optional center core + slab cap
  const addStory = ({
    y,
    spanX = 3.2,
    spanZ = 1.6,
    pillarH = 1.8,
    pillarW = 0.7,
    pillarD = 0.7,
    pillarMat = 'wood',
    slabH = 0.45,
    slabMat = 'wood',
    centerMat = null,
    centerScale = 0.9,
    offsetX = 0,
    offsetZ = 0,
    fourPillars = true,
    pillarShape = 'box',
    roofOverhang = 0.35
  }) => {
    const halfX = spanX / 2;
    const halfZ = spanZ / 2;
    if (fourPillars && spanZ > 0.2) {
      add(offsetX - halfX, y, offsetZ - halfZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
      add(offsetX + halfX, y, offsetZ - halfZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
      add(offsetX - halfX, y, offsetZ + halfZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
      add(offsetX + halfX, y, offsetZ + halfZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
    } else {
      add(offsetX - halfX, y, offsetZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
      add(offsetX + halfX, y, offsetZ, pillarW, pillarH, pillarD, pillarMat, pillarShape);
    }

    if (centerMat) {
      const cw = Math.min(1.05, pillarH * 0.65) * centerScale;
      add(offsetX, y, offsetZ, cw, cw, cw, centerMat, centerMat === 'explosive' ? 'cylinder' : 'box');
    }

    const slabY = y + pillarH + EPS;
    const slabW = spanX + pillarW + roofOverhang;
    const slabD = (fourPillars && spanZ > 0.2 ? spanZ : 0) + pillarD + roofOverhang;
    add(offsetX, slabY, offsetZ, slabW, slabH, slabD, slabMat, 'box');
    return slabY + slabH + EPS;
  };

  // Adds a decorative spire / crown at the top
  const addCrown = (y, offsetX = 0, offsetZ = 0, mat = 'wood', width = 1.6) => {
    let cur = add(offsetX, y, offsetZ, width, 0.7, width, mat);
    cur = add(offsetX, cur, offsetZ, width * 0.58, 0.9, width * 0.58, mat, 'cylinder');
    return cur;
  };

  return { blocks, add, addStory, addCrown };
}

function buildLevel1() {
  const b = createBuilder();
  let y = 0;
  y = b.addStory({ y, spanX: 2.6, spanZ: 1.4, pillarH: 1.7, pillarW: 0.65, pillarD: 0.65, pillarMat: 'wood', slabMat: 'wood', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.0, spanZ: 1.1, pillarH: 1.5, pillarW: 0.58, pillarD: 0.58, pillarMat: 'wood', slabMat: 'wood' });
  b.addCrown(y, 0, 0, 'wood', 1.4);
  return b.blocks;
}

function buildLevel2() {
  const b = createBuilder();
  // Twin wooden watchtowers connected by a bridge with glass supports
  for (const side of [-2.3, 2.3]) {
    let y = 0;
    y = b.addStory({ y, offsetX: side, spanX: 1.5, spanZ: 1.4, pillarH: 1.7, pillarW: 0.55, pillarD: 0.55, pillarMat: 'wood', slabMat: 'wood', centerMat: side < 0 ? 'glass' : 'explosive' });
    y = b.addStory({ y, offsetX: side, spanX: 1.2, spanZ: 1.1, pillarH: 1.5, pillarW: 0.5, pillarD: 0.5, pillarMat: 'wood', slabMat: 'wood' });
    b.addCrown(y, side, 0, 'wood', 1.0);
  }
  // Center wooden gatehouse + bridge
  let cy = 0;
  cy = b.addStory({ y: cy, spanX: 1.6, spanZ: 1.1, pillarH: 1.7, pillarW: 0.5, pillarD: 0.5, pillarMat: 'glass', slabMat: 'wood', centerMat: 'explosive' });
  b.add(0, cy, 0, 1.5, 1.0, 1.0, 'wood');
  return b.blocks;
}

function buildLevel3() {
  const b = createBuilder();
  // 4-story wooden pagoda with explosive base and glass weak floor
  let y = 0;
  y = b.addStory({ y, spanX: 3.6, spanZ: 2.0, pillarH: 1.7, pillarW: 0.72, pillarD: 0.72, pillarMat: 'wood', slabMat: 'wood', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.9, spanZ: 1.6, pillarH: 1.5, pillarW: 0.62, pillarD: 0.62, pillarMat: 'glass', slabMat: 'wood', centerMat: 'wood' });
  y = b.addStory({ y, spanX: 2.2, spanZ: 1.3, pillarH: 1.4, pillarW: 0.55, pillarD: 0.55, pillarMat: 'wood', slabMat: 'wood', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 1.5, spanZ: 0.9, pillarH: 1.2, pillarW: 0.48, pillarD: 0.48, pillarMat: 'wood', slabMat: 'wood' });
  b.addCrown(y, 0, 0, 'wood', 1.2);
  return b.blocks;
}

function buildLevel4() {
  const b = createBuilder();
  // Stone Bastion: stone pillars, wood weak cross-braces, TNT chamber
  let y = 0;
  y = b.addStory({ y, spanX: 3.4, spanZ: 1.9, pillarH: 1.8, pillarW: 0.75, pillarD: 0.75, pillarMat: 'stone', slabH: 0.5, slabMat: 'stone', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.6, spanZ: 1.5, pillarH: 1.6, pillarW: 0.62, pillarD: 0.62, pillarMat: 'wood', slabH: 0.48, slabMat: 'stone', centerMat: 'glass' });
  y = b.addStory({ y, spanX: 1.9, spanZ: 1.2, pillarH: 1.5, pillarW: 0.58, pillarD: 0.58, pillarMat: 'stone', slabH: 0.45, slabMat: 'stone' });
  b.addCrown(y, 0, 0, 'stone', 1.4);
  return b.blocks;
}

function buildLevel5() {
  const b = createBuilder();
  // Quarry Spire: tall stepped stone obelisk with explosive vaults
  let y = 0;
  y = b.addStory({ y, spanX: 3.8, spanZ: 2.2, pillarH: 1.75, pillarW: 0.8, pillarD: 0.8, pillarMat: 'stone', slabH: 0.52, slabMat: 'concrete', centerMat: 'explosive' });
  // Side buttresses
  b.add(-2.7, 0, 0, 0.8, 1.9, 1.4, 'stone');
  b.add(2.7, 0, 0, 0.8, 1.9, 1.4, 'stone');
  y = b.addStory({ y, spanX: 2.8, spanZ: 1.7, pillarH: 1.65, pillarW: 0.68, pillarD: 0.68, pillarMat: 'stone', slabH: 0.48, slabMat: 'stone', centerMat: 'glass' });
  y = b.addStory({ y, spanX: 2.0, spanZ: 1.3, pillarH: 1.5, pillarW: 0.58, pillarD: 0.58, pillarMat: 'stone', slabH: 0.45, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 1.3, spanZ: 0.9, pillarH: 1.35, pillarW: 0.5, pillarD: 0.5, pillarMat: 'stone', slabH: 0.4, slabMat: 'stone' });
  b.addCrown(y, 0, 0, 'concrete', 1.15);
  return b.blocks;
}

function buildLevel6() {
  const b = createBuilder();
  // Bunker Arch: heavy concrete top over twin arches with fragile inner cores (Rocket intro!)
  let y = 0;
  for (const sx of [-2.1, 2.1]) {
    b.add(sx - 0.85, 0, -0.7, 0.72, 2.0, 0.72, 'concrete');
    b.add(sx + 0.85, 0, -0.7, 0.72, 2.0, 0.72, 'stone');
    b.add(sx - 0.85, 0, 0.7, 0.72, 2.0, 0.72, 'concrete');
    b.add(sx + 0.85, 0, 0.7, 0.72, 2.0, 0.72, 'stone');
    b.add(sx, 0, 0, 0.9, 0.9, 0.9, 'explosive', 'cylinder');
  }
  y = 2.0 + EPS;
  // Massive concrete bridge lintel
  y = b.add(0, y, 0, 6.4, 0.6, 2.5, 'concrete');
  y = b.addStory({ y, spanX: 3.4, spanZ: 1.5, pillarH: 1.65, pillarW: 0.68, pillarD: 0.68, pillarMat: 'concrete', slabH: 0.5, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.0, spanZ: 1.1, pillarH: 1.4, pillarW: 0.58, pillarD: 0.58, pillarMat: 'stone', slabH: 0.45, slabMat: 'concrete' });
  b.addCrown(y, 0, 0, 'concrete', 1.3);
  return b.blocks;
}

function buildLevel7() {
  const b = createBuilder();
  // Clocktower: Stone base, wooden middle gallery, glass lantern top
  let y = 0;
  y = b.addStory({ y, spanX: 2.8, spanZ: 2.2, pillarH: 2.0, pillarW: 0.78, pillarD: 0.78, pillarMat: 'stone', slabH: 0.5, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.4, spanZ: 1.9, pillarH: 1.8, pillarW: 0.65, pillarD: 0.65, pillarMat: 'wood', slabH: 0.45, slabMat: 'stone', centerMat: 'wood' });
  y = b.addStory({ y, spanX: 2.0, spanZ: 1.6, pillarH: 1.6, pillarW: 0.56, pillarD: 0.56, pillarMat: 'glass', slabH: 0.45, slabMat: 'wood', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 1.5, spanZ: 1.2, pillarH: 1.5, pillarW: 0.5, pillarD: 0.5, pillarMat: 'wood', slabH: 0.4, slabMat: 'stone' });
  b.addCrown(y, 0, 0, 'glass', 1.1);
  return b.blocks;
}

function buildLevel8() {
  const b = createBuilder();
  // Citadel Gate: Twin stone towers + concrete bridge + wooden battlements
  for (const sx of [-2.7, 2.7]) {
    let ty = 0;
    ty = b.addStory({ y: ty, offsetX: sx, spanX: 1.5, spanZ: 1.6, pillarH: 1.85, pillarW: 0.65, pillarD: 0.65, pillarMat: 'stone', slabH: 0.46, slabMat: 'concrete', centerMat: 'explosive' });
    ty = b.addStory({ y: ty, offsetX: sx, spanX: 1.3, spanZ: 1.3, pillarH: 1.65, pillarW: 0.55, pillarD: 0.55, pillarMat: 'stone', slabH: 0.44, slabMat: 'stone' });
    ty = b.addStory({ y: ty, offsetX: sx, spanX: 1.0, spanZ: 1.0, pillarH: 1.3, pillarW: 0.48, pillarD: 0.48, pillarMat: 'wood', slabH: 0.4, slabMat: 'wood' });
    b.addCrown(ty, sx, 0, 'wood', 0.9);
  }
  // Central archway
  let cy = 0;
  cy = b.addStory({ y: cy, spanX: 2.2, spanZ: 1.2, pillarH: 1.85, pillarW: 0.55, pillarD: 0.55, pillarMat: 'glass', slabH: 0.46, slabMat: 'concrete', centerMat: 'explosive' });
  b.add(0, cy, 0, 2.4, 1.0, 1.3, 'wood');
  b.add(0, cy + 1.0 + EPS, 0, 1.3, 0.9, 1.0, 'stone');
  return b.blocks;
}

function buildLevel9() {
  const b = createBuilder();
  // Shatter Pyramid: Stepped mixed stone/wood/glass pyramid with chain-reaction explosives
  let y = 0;
  // Base 5 columns wide
  const baseXs = [-3.2, -1.6, 0, 1.6, 3.2];
  for (let i = 0; i < baseXs.length; i++) {
    const mat = i % 2 === 0 ? 'stone' : 'glass';
    b.add(baseXs[i], y, -0.8, 0.68, 1.7, 0.68, mat);
    b.add(baseXs[i], y, 0.8, 0.68, 1.7, 0.68, mat);
  }
  b.add(-1.6, y, 0, 0.8, 0.8, 0.8, 'explosive', 'cylinder');
  b.add(1.6, y, 0, 0.8, 0.8, 0.8, 'explosive', 'cylinder');
  y += 1.7 + EPS;
  y = b.add(0, y, 0, 7.4, 0.48, 2.5, 'concrete');

  // Level 2
  y = b.addStory({ y, spanX: 4.4, spanZ: 1.6, pillarH: 1.55, pillarW: 0.65, pillarD: 0.65, pillarMat: 'wood', slabH: 0.46, slabMat: 'stone', centerMat: 'explosive' });
  // Level 3
  y = b.addStory({ y, spanX: 2.8, spanZ: 1.3, pillarH: 1.45, pillarW: 0.58, pillarD: 0.58, pillarMat: 'glass', slabH: 0.44, slabMat: 'wood', centerMat: 'stone' });
  // Level 4
  y = b.addStory({ y, spanX: 1.5, spanZ: 1.0, pillarH: 1.3, pillarW: 0.5, pillarD: 0.5, pillarMat: 'stone', slabH: 0.4, slabMat: 'concrete' });
  b.addCrown(y, 0, 0, 'explosive', 1.0);
  return b.blocks;
}

function buildLevel10() {
  const b = createBuilder();
  // Sky Fortress: 5-story multi-bay concrete & glass skyscraper
  let y = 0;
  y = b.addStory({ y, spanX: 4.0, spanZ: 2.2, pillarH: 1.7, pillarW: 0.78, pillarD: 0.78, pillarMat: 'concrete', slabH: 0.5, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 3.4, spanZ: 1.9, pillarH: 1.55, pillarW: 0.66, pillarD: 0.66, pillarMat: 'glass', slabH: 0.48, slabMat: 'stone', centerMat: 'wood' });
  y = b.addStory({ y, spanX: 2.9, spanZ: 1.7, pillarH: 1.5, pillarW: 0.62, pillarD: 0.62, pillarMat: 'stone', slabH: 0.46, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.3, spanZ: 1.4, pillarH: 1.4, pillarW: 0.56, pillarD: 0.56, pillarMat: 'wood', slabH: 0.44, slabMat: 'stone', centerMat: 'glass' });
  y = b.addStory({ y, spanX: 1.6, spanZ: 1.1, pillarH: 1.3, pillarW: 0.5, pillarD: 0.5, pillarMat: 'concrete', slabH: 0.42, slabMat: 'concrete' });
  b.addCrown(y, 0, 0, 'stone', 1.2);
  return b.blocks;
}

function buildLevel11() {
  const b = createBuilder();
  // Triple Spire: Three interconnected towers with explosive cross-bridges
  const configs = [
    { x: -3.2, floors: 3, mat: 'stone', topMat: 'wood' },
    { x: 0, floors: 4, mat: 'concrete', topMat: 'stone' },
    { x: 3.2, floors: 3, mat: 'stone', topMat: 'wood' }
  ];
  for (const cfg of configs) {
    let y = 0;
    for (let f = 0; f < cfg.floors; f++) {
      const span = 1.55 - f * 0.16;
      const pMat = f === 1 ? 'glass' : (f === 0 ? cfg.mat : cfg.topMat);
      const center = (f === 0 || (cfg.x === 0 && f === 2)) ? 'explosive' : null;
      y = b.addStory({
        y,
        offsetX: cfg.x,
        spanX: span,
        spanZ: 1.45 - f * 0.12,
        pillarH: 1.55,
        pillarW: 0.56,
        pillarD: 0.56,
        pillarMat: pMat,
        slabH: 0.44,
        slabMat: f === 0 ? 'concrete' : 'stone',
        centerMat: center
      });
    }
    b.addCrown(y, cfg.x, 0, cfg.topMat, 0.9);
  }
  // Explosive canisters between towers
  b.add(-1.6, 0, 0, 0.85, 0.9, 0.85, 'explosive', 'cylinder');
  b.add(1.6, 0, 0, 0.85, 0.9, 0.85, 'explosive', 'cylinder');
  return b.blocks;
}

function buildLevel12() {
  const b = createBuilder();
  // Domino Hall: Front-to-back terraced monoliths built for domino chain collapse!
  const rows = [
    { z: 2.3, floors: 3, mat: 'wood', slab: 'stone' },
    { z: 0.0, floors: 4, mat: 'stone', slab: 'concrete' },
    { z: -2.4, floors: 4, mat: 'concrete', slab: 'stone' }
  ];
  for (const r of rows) {
    let y = 0;
    for (let f = 0; f < r.floors; f++) {
      y = b.addStory({
        y,
        offsetZ: r.z,
        spanX: 3.2 - f * 0.35,
        spanZ: 0.9,
        pillarH: 1.55,
        pillarW: 0.62,
        pillarD: 0.55,
        pillarMat: f === 0 ? r.mat : (f === 1 ? 'glass' : r.mat),
        slabH: 0.44,
        slabMat: r.slab,
        centerMat: f === 0 ? 'explosive' : null,
        fourPillars: false
      });
    }
  }
  return b.blocks;
}

function buildLevel13() {
  const b = createBuilder();
  // Iron Bastille: Steel frame protecting inner explosive core
  let y = 0;
  y = b.addStory({ y, spanX: 3.8, spanZ: 2.2, pillarH: 1.9, pillarW: 0.78, pillarD: 0.78, pillarMat: 'steel', slabH: 0.54, slabMat: 'steel', centerMat: 'explosive' });
  // Front steel blast shield
  b.add(0, 0, 1.95, 2.2, 1.5, 0.5, 'steel');
  y = b.addStory({ y, spanX: 3.0, spanZ: 1.8, pillarH: 1.65, pillarW: 0.65, pillarD: 0.65, pillarMat: 'concrete', slabH: 0.48, slabMat: 'steel', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.2, spanZ: 1.4, pillarH: 1.5, pillarW: 0.58, pillarD: 0.58, pillarMat: 'glass', slabH: 0.46, slabMat: 'concrete', centerMat: 'stone' });
  y = b.addStory({ y, spanX: 1.5, spanZ: 1.0, pillarH: 1.35, pillarW: 0.52, pillarD: 0.52, pillarMat: 'steel', slabH: 0.42, slabMat: 'steel' });
  b.addCrown(y, 0, 0, 'steel', 1.2);
  return b.blocks;
}

function buildLevel14() {
  const b = createBuilder();
  // Titan Monolith: Towering 6-story steel, concrete & stone skyscraper with recessed weak columns
  let y = 0;
  y = b.addStory({ y, spanX: 4.2, spanZ: 2.4, pillarH: 1.8, pillarW: 0.82, pillarD: 0.82, pillarMat: 'steel', slabH: 0.52, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 3.6, spanZ: 2.1, pillarH: 1.6, pillarW: 0.7, pillarD: 0.7, pillarMat: 'concrete', slabH: 0.48, slabMat: 'steel', centerMat: 'glass' });
  y = b.addStory({ y, spanX: 3.0, spanZ: 1.8, pillarH: 1.55, pillarW: 0.64, pillarD: 0.64, pillarMat: 'glass', slabH: 0.48, slabMat: 'concrete', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 2.5, spanZ: 1.5, pillarH: 1.45, pillarW: 0.58, pillarD: 0.58, pillarMat: 'steel', slabH: 0.45, slabMat: 'stone', centerMat: 'wood' });
  y = b.addStory({ y, spanX: 1.9, spanZ: 1.2, pillarH: 1.35, pillarW: 0.52, pillarD: 0.52, pillarMat: 'concrete', slabH: 0.42, slabMat: 'steel', centerMat: 'explosive' });
  y = b.addStory({ y, spanX: 1.3, spanZ: 0.9, pillarH: 1.2, pillarW: 0.48, pillarD: 0.48, pillarMat: 'steel', slabH: 0.4, slabMat: 'steel' });
  b.addCrown(y, 0, 0, 'steel', 1.1);
  return b.blocks;
}

function buildLevel15() {
  const b = createBuilder();
  // Grand Emperor's Citadel: Multi-wing fortress with steel shields, twin concrete keeps & central reactor spire
  // Left & Right Armored Keeps
  for (const sx of [-3.3, 3.3]) {
    let wy = 0;
    wy = b.addStory({ y: wy, offsetX: sx, spanX: 1.6, spanZ: 1.7, pillarH: 1.75, pillarW: 0.68, pillarD: 0.68, pillarMat: 'steel', slabH: 0.48, slabMat: 'concrete', centerMat: 'explosive' });
    wy = b.addStory({ y: wy, offsetX: sx, spanX: 1.35, spanZ: 1.4, pillarH: 1.55, pillarW: 0.58, pillarD: 0.58, pillarMat: 'concrete', slabH: 0.45, slabMat: 'steel', centerMat: 'glass' });
    wy = b.addStory({ y: wy, offsetX: sx, spanX: 1.05, spanZ: 1.1, pillarH: 1.35, pillarW: 0.5, pillarD: 0.5, pillarMat: 'stone', slabH: 0.42, slabMat: 'concrete' });
    b.addCrown(wy, sx, 0, 'steel', 0.9);
  }
  // Central Reactor Spire
  let cy = 0;
  cy = b.addStory({ y: cy, spanX: 2.6, spanZ: 2.1, pillarH: 1.85, pillarW: 0.72, pillarD: 0.72, pillarMat: 'steel', slabH: 0.52, slabMat: 'steel', centerMat: 'explosive' });
  cy = b.addStory({ y: cy, spanX: 2.2, spanZ: 1.8, pillarH: 1.65, pillarW: 0.62, pillarD: 0.62, pillarMat: 'glass', slabH: 0.48, slabMat: 'concrete', centerMat: 'explosive' });
  cy = b.addStory({ y: cy, spanX: 1.8, spanZ: 1.5, pillarH: 1.5, pillarW: 0.56, pillarD: 0.56, pillarMat: 'concrete', slabH: 0.46, slabMat: 'steel', centerMat: 'explosive' });
  cy = b.addStory({ y: cy, spanX: 1.4, spanZ: 1.1, pillarH: 1.35, pillarW: 0.5, pillarD: 0.5, pillarMat: 'steel', slabH: 0.42, slabMat: 'steel' });
  b.addCrown(cy, 0, 0, 'explosive', 1.05);
  return b.blocks;
}


// Advanced challenge campaign: compact procedural blueprints with deliberately
// limited ammunition, higher destruction targets and distinct structural puzzles.
function buildChallengeTower(spec) {
  const b = createBuilder();
  const xs = spec.columns === 5 ? [-3.2, -1.6, 0, 1.6, 3.2] :
    spec.columns === 4 ? [-2.4, -0.8, 0.8, 2.4] : [-2.0, 0, 2.0];
  const mats = spec.materials;
  let y = 0;

  // Separate pylons share a vulnerable bridge: find the correct support to collapse.
  for (let i = 0; i < xs.length; i++) {
    let ty = 0;
    const floors = spec.floors + (i === Math.floor(xs.length / 2) ? 1 : 0);
    for (let f = 0; f < floors; f++) {
      const material = mats[(i + f * 2) % mats.length];
      // Keep every pylon inside its own collision footprint. The old 1.8-unit
      // spans placed adjacent corner pillars and roof slabs inside one another.
      ty = b.addStory({
        y: ty,
        offsetX: xs[i],
        spanX: 0.82,
        spanZ: 0.9,
        pillarH: 1.35 + (f % 2) * 0.18,
        pillarW: 0.28,
        pillarD: 0.28,
        pillarMat: material,
        slabH: material === 'steel' || material === 'concrete' ? 0.42 : 0.36,
        slabMat: mats[(i + f + 1) % mats.length],
        centerMat: (f === spec.coreFloor && (i === 0 || i === xs.length - 1 || i === Math.floor(xs.length / 2))) ? 'explosive' : null,
        roofOverhang: 0.08
      });
    }
    b.addCrown(ty, xs[i], 0, mats[(i + 1) % mats.length], 0.85);
    y = Math.max(y, ty);
  }

  // Do not span a single rigid body through the pylon collision volumes:
  // that made the bridge start interpenetrating several towers at once.
  // The challenge's separated pylons remain linked by their visual layout and
  // can still be brought down by projectile and explosion forces.
  if (spec.shield) {
    b.add(0, 0, 2.25, 0.9, 1.8, 0.32, spec.shield);
  }
  // A low central charge rewards precision rather than indiscriminate top hits.
  if (spec.centralCharge) {
    b.add(0, 0, 0, 0.78, 0.82, 0.78, 'explosive', 'cylinder');
  }
  return b.blocks;
}

const ADVANCED_CHALLENGES = [
  { name: 'Glass Needle Run', tier: 'Precision Trials', tierIndex: 6, skyTheme: 'alpine', description: 'PRECISION: Two shots only. Break the glass feet before the stone crown settles.', columns: 3, floors: 4, materials: ['glass','stone','glass'], coreFloor: 0, bridge: 'stone', ammo: { cannonball: 1, bomb: 1, cluster: 0, rocket: 0 }, target: .91, stars: [4200,6100,7900] },
  { name: 'TNT Switchyard', tier: 'Precision Trials', tierIndex: 6, skyTheme: 'sunset', description: 'CHAIN REACTION: Trigger the outer charges to collapse the bridge into the center tower.', columns: 5, floors: 3, materials: ['wood','stone','glass'], coreFloor: 0, bridge: 'wood', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 0 }, target: .90, stars: [5200,7300,9400] },
  { name: 'Concrete Crossfire', tier: 'Precision Trials', tierIndex: 6, skyTheme: 'twilight', description: 'ARMORED: A narrow firing lane protects the weak rear supports. Use a high arc.', columns: 4, floors: 4, materials: ['concrete','steel','glass'], coreFloor: 1, shield: 'steel', ammo: { cannonball: 0, bomb: 1, cluster: 1, rocket: 1 }, target: .90, stars: [5800,8200,10800] },
  { name: 'Domino Deadline', tier: 'Chain Reaction', tierIndex: 7, skyTheme: 'golden', description: 'DOMINO: Tip the left pylon first. The bridge must take down every tower.', columns: 5, floors: 3, materials: ['wood','glass','stone'], coreFloor: 0, bridge: 'stone', ammo: { cannonball: 2, bomb: 0, cluster: 1, rocket: 0 }, target: .92, stars: [5400,7600,9800] },
  { name: 'Steel Heart', boss: { name: 'The Iron Warden', rewardCoins: 250, rewardTitle: 'Iron Warden Crest' }, tier: 'Chain Reaction', tierIndex: 7, skyTheme: 'twilight', description: 'WEAK POINT: Steel armor surrounds a single explosive core. Save the rocket for the core.', columns: 3, floors: 5, materials: ['steel','concrete','glass'], coreFloor: 2, shield: 'steel', ammo: { cannonball: 0, bomb: 1, cluster: 0, rocket: 1 }, target: .90, stars: [6500,9000,11800] },
  { name: 'Twin Reactor', tier: 'Chain Reaction', tierIndex: 7, skyTheme: 'sunset', description: 'TWIN CHARGES: Detonate both outer cores with one carefully placed blast.', columns: 4, floors: 4, materials: ['stone','glass','concrete'], coreFloor: 1, bridge: 'concrete', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 0 }, target: .91, stars: [6800,9400,12200] },
  { name: 'The Last Bastion', tier: 'Expert Siege', tierIndex: 8, skyTheme: 'twilight', description: 'EXPERT: Four shots. Maximize collapse damage; every missed shot matters.', columns: 5, floors: 4, materials: ['steel','stone','concrete','glass'], coreFloor: 0, bridge: 'steel', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 1 }, target: .92, stars: [8200,11200,14500] },
  { name: 'Suspended Ruin', tier: 'Expert Siege', tierIndex: 8, skyTheme: 'golden', description: 'SUSPENDED: Destroy the supports, not the upper bridge. Let gravity do the work.', columns: 3, floors: 5, materials: ['glass','concrete','wood'], coreFloor: 0, bridge: 'concrete', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 0 }, target: .93, stars: [7600,10400,13600] },
  { name: 'Fortress of Echoes', tier: 'Expert Siege', tierIndex: 8, skyTheme: 'alpine', description: 'RICOCHET PLAN: Break the front shield, then chain the rear explosive supports.', columns: 4, floors: 5, materials: ['stone','steel','glass'], coreFloor: 1, shield: 'concrete', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 1 }, target: .92, stars: [9000,12400,15800] },
  { name: 'Worldbreaker', boss: { name: 'Worldbreaker Prime', rewardCoins: 500, rewardTitle: 'Worldbreaker Trophy' }, tier: 'Final Trials', tierIndex: 9, skyTheme: 'twilight', description: 'FINAL TRIAL: A multi-pylon fortress. Plan every shot and earn a 3-star demolition.', columns: 5, floors: 5, materials: ['steel','concrete','stone','glass'], coreFloor: 2, bridge: 'steel', shield: 'steel', ammo: { cannonball: 1, bomb: 1, cluster: 1, rocket: 2 }, target: .93, stars: [11000,14800,19000] }
];

function buildAdvancedLevels() {
  return ADVANCED_CHALLENGES.map((spec, index) => ({
    id: 16 + index,
    name: spec.name,
    tier: spec.tier,
    tierIndex: spec.tierIndex,
    skyTheme: spec.skyTheme,
    description: spec.description,
    boss: spec.boss || null,
    targetDestruction: spec.target,
    ammo: spec.ammo,
    starThresholds: spec.stars,
    build: () => buildChallengeTower(spec)
  }));
}

export const LEVELS = [
  {
    id: 1,
    name: 'Timber Outpost',
    tier: 'Wooden Towers',
    tierIndex: 1,
    skyTheme: 'sunny',
    description: 'Aim for the glowing TNT barrel inside the base to bring the whole outpost down!',
    targetDestruction: 0.78,
    ammo: { cannonball: 5, bomb: 0, cluster: 0, rocket: 0 },
    starThresholds: [900, 1800, 2600],
    build: buildLevel1
  },
  {
    id: 2,
    name: 'Twin Pines',
    tier: 'Wooden Towers',
    tierIndex: 1,
    skyTheme: 'sunny',
    description: 'Mega Bomb unlocked! Drop a bomb in the center gap to topple both watchtowers.',
    targetDestruction: 0.80,
    ammo: { cannonball: 4, bomb: 2, cluster: 0, rocket: 0 },
    starThresholds: [1800, 3200, 4400],
    build: buildLevel2
  },
  {
    id: 3,
    name: 'Lumber Keep',
    tier: 'Wooden Towers',
    tierIndex: 1,
    skyTheme: 'sunny',
    description: 'A tall wooden pagoda built over a brittle glass mid-section.',
    targetDestruction: 0.82,
    ammo: { cannonball: 4, bomb: 2, cluster: 0, rocket: 0 },
    starThresholds: [2200, 3800, 5200],
    build: buildLevel3
  },
  {
    id: 4,
    name: 'Stone Bastion',
    tier: 'Stone & Concrete',
    tierIndex: 2,
    skyTheme: 'alpine',
    description: 'Scatter Shot unlocked! Shatter the wooden middle floor or detonate the stone base TNT.',
    targetDestruction: 0.80,
    ammo: { cannonball: 3, bomb: 2, cluster: 2, rocket: 0 },
    starThresholds: [2400, 4000, 5500],
    build: buildLevel4
  },
  {
    id: 5,
    name: 'Quarry Spire',
    tier: 'Stone & Concrete',
    tierIndex: 2,
    skyTheme: 'alpine',
    description: 'Heavy stone buttresses guard an explosive vault inside this towering spire.',
    targetDestruction: 0.82,
    ammo: { cannonball: 3, bomb: 2, cluster: 2, rocket: 0 },
    starThresholds: [3200, 5200, 6900],
    build: buildLevel5
  },
  {
    id: 6,
    name: 'Bunker Arch',
    tier: 'Stone & Concrete',
    tierIndex: 2,
    skyTheme: 'alpine',
    description: 'Power Rocket unlocked! Blast straight through heavy concrete arches!',
    targetDestruction: 0.82,
    ammo: { cannonball: 2, bomb: 2, cluster: 1, rocket: 2 },
    starThresholds: [3400, 5600, 7400],
    build: buildLevel6
  },
  {
    id: 7,
    name: 'Bell Clocktower',
    tier: 'Mixed Structures',
    tierIndex: 3,
    skyTheme: 'golden',
    description: 'Layered stone, wood, and glass—collapse the lower core for maximum combos.',
    targetDestruction: 0.82,
    ammo: { cannonball: 2, bomb: 2, cluster: 2, rocket: 1 },
    starThresholds: [3200, 5400, 7200],
    build: buildLevel7
  },
  {
    id: 8,
    name: 'Citadel Gate',
    tier: 'Mixed Structures',
    tierIndex: 3,
    skyTheme: 'golden',
    description: 'Twin stone gatehouses linked by a fragile glass courtyard.',
    targetDestruction: 0.83,
    ammo: { cannonball: 2, bomb: 2, cluster: 2, rocket: 2 },
    starThresholds: [4500, 7200, 9600],
    build: buildLevel8
  },
  {
    id: 9,
    name: 'Shatter Pyramid',
    tier: 'Mixed Structures',
    tierIndex: 3,
    skyTheme: 'golden',
    description: 'Trigger twin base explosives for a chain-reaction pyramid collapse!',
    targetDestruction: 0.84,
    ammo: { cannonball: 2, bomb: 2, cluster: 2, rocket: 2 },
    starThresholds: [4600, 7600, 10200],
    build: buildLevel9
  },
  {
    id: 10,
    name: 'Sky Fortress',
    tier: 'Multi-Layer Towers',
    tierIndex: 4,
    skyTheme: 'sunset',
    description: 'Five alternating stories of concrete, glass, and stone towering into the clouds.',
    targetDestruction: 0.83,
    ammo: { cannonball: 2, bomb: 2, cluster: 2, rocket: 2 },
    starThresholds: [4800, 7800, 10600],
    build: buildLevel10
  },
  {
    id: 11,
    name: 'Triple Spire',
    tier: 'Multi-Layer Towers',
    tierIndex: 4,
    skyTheme: 'sunset',
    description: 'Three tall towers separated by volatile TNT canisters—ignite the gaps!',
    targetDestruction: 0.82,
    ammo: { cannonball: 2, bomb: 3, cluster: 2, rocket: 2 },
    starThresholds: [6200, 9800, 13200],
    build: buildLevel11
  },
  {
    id: 12,
    name: 'Domino Hall',
    tier: 'Multi-Layer Towers',
    tierIndex: 4,
    skyTheme: 'sunset',
    description: 'Knock the front monolith backward to tip the entire hall like giant dominoes!',
    targetDestruction: 0.82,
    ammo: { cannonball: 2, bomb: 2, cluster: 2, rocket: 3 },
    starThresholds: [4800, 7800, 10500],
    build: buildLevel12
  },
  {
    id: 13,
    name: 'Iron Bastille',
    tier: 'Reinforced Fortresses',
    tierIndex: 5,
    skyTheme: 'twilight',
    description: 'Armored steel pillars shield an explosive vault. Use Rockets or high-arc Bombs!',
    targetDestruction: 0.82,
    ammo: { cannonball: 1, bomb: 3, cluster: 1, rocket: 3 },
    starThresholds: [5400, 8600, 11600],
    build: buildLevel13
  },
  {
    id: 14,
    name: 'Titan Monolith',
    tier: 'Reinforced Fortresses',
    tierIndex: 5,
    skyTheme: 'twilight',
    description: 'Six reinforced stories—target the recessed glass mid-layer and TNT cores!',
    targetDestruction: 0.82,
    ammo: { cannonball: 1, bomb: 3, cluster: 2, rocket: 3 },
    starThresholds: [6800, 10800, 14500],
    build: buildLevel14
  },
  {
    id: 15,
    name: "Emperor's Citadel",
    boss: { name: 'The Emperor', rewardCoins: 150, rewardTitle: 'Emperor Slayer Medal' },
    tier: 'Reinforced Fortresses',
    tierIndex: 5,
    skyTheme: 'twilight',
    description: 'The ultimate fortress! Breach the central reactor spire to obliterate both wings.',
    targetDestruction: 0.82,
    ammo: { cannonball: 1, bomb: 4, cluster: 2, rocket: 4 },
    starThresholds: [9500, 14800, 19800],
    build: buildLevel15
  },
  ...buildAdvancedLevels()
];
