export class ScreenShake {
  constructor() {
    this.trauma = 0;
    this.time = 0;
    this.decay = 1.85;
    this.maxOffset = 0.85;
    this.maxRoll = 0.045;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  reset() {
    this.trauma = 0;
  }

  update(dt) {
    this.time += dt * 38;
    if (this.trauma <= 0.001) {
      this.trauma = 0;
      return { x: 0, y: 0, z: 0, roll: 0 };
    }

    const shake = this.trauma * this.trauma;
    const x = Math.sin(this.time * 1.13) * Math.cos(this.time * 0.71) * this.maxOffset * shake;
    const y = Math.cos(this.time * 1.37) * Math.sin(this.time * 0.89) * this.maxOffset * shake;
    const z = Math.sin(this.time * 0.97) * this.maxOffset * 0.4 * shake;
    const roll = Math.sin(this.time * 1.29) * this.maxRoll * shake;

    this.trauma = Math.max(0, this.trauma - this.decay * dt);
    return { x, y, z, roll };
  }
}
