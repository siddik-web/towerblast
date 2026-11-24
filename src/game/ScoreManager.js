export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.blockPoints = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.comboWindow = 1.85;
    this.blocksDestroyed = 0;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }
  }

  registerBlockDestruction(basePoints, shattered = false) {
    this.blocksDestroyed++;
    this.combo = this.comboTimer > 0 ? Math.min(8, this.combo + 1) : 1;
    this.comboTimer = this.comboWindow;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    const multiplier = 1 + (this.combo - 1) * 0.25;
    const shatterBonus = shattered ? 25 : 0;
    const awarded = Math.round((basePoints + shatterBonus) * multiplier);

    this.blockPoints += awarded;
    this.score += awarded;

    return {
      awarded,
      combo: this.combo,
      multiplier
    };
  }

  finalizeLevel(levelConfig, destructionRatio, remainingAmmo) {
    const spareAmmoBonus = Math.max(0, remainingAmmo) * 500;
    const isTotalDemolition = destructionRatio >= 0.96;
    const completeBonus = isTotalDemolition ? 1000 : 0;
    const finalScore = this.score + spareAmmoBonus + completeBonus;

    const thresholds = levelConfig.starThresholds || [1000, 2200, 3500];
    // Stars are earned through score thresholds, not handed out for leftover ammo.
    // Higher tiers use stricter demolition targets and much smaller ammo budgets.
    let stars = finalScore >= thresholds[0] ? 1 : 0;
    if (finalScore >= thresholds[1]) stars = 2;
    if (finalScore >= thresholds[2] && destructionRatio >= Math.max(0.88, levelConfig.targetDestruction)) {
      stars = 3;
    }
    // A completed level always earns at least one star.
    stars = Math.max(1, stars);

    this.score = finalScore;

    return {
      blockPoints: this.blockPoints,
      spareAmmoBonus,
      completeBonus,
      isTotalDemolition,
      maxCombo: this.maxCombo,
      finalScore,
      stars,
      remainingAmmo,
      destructionPercent: Math.round(destructionRatio * 100)
    };
  }
}
