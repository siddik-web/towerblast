import { Block } from './Block.js';

export class TowerGenerator {
  constructor(physicsWorld, scene) {
    this.physicsWorld = physicsWorld;
    this.scene = scene;
  }

  generate(levelConfig) {
    const blueprint = levelConfig.build();
    const blocks = [];
    let maxHeight = 0;

    for (let i = 0; i < blueprint.length; i++) {
      const def = blueprint[i];
      const block = new Block(def, this.physicsWorld, this.scene, i);
      blocks.push(block);
      const topY = def.y + def.h * 0.5;
      if (topY > maxHeight) maxHeight = topY;
    }

    return {
      blocks,
      towerHeight: maxHeight
    };
  }
}
