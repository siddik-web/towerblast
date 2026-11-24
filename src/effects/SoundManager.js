const SETTINGS_KEY = 'towerblast_audio_v1';

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.noiseBuffer = null;

    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.muted = false;

    this.musicTimer = null;
    this.musicStep = 0;
    this.lastCollapseSound = 0;

    this._loadSettings();
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.sfxEnabled = parsed.sfxEnabled ?? true;
        this.musicEnabled = parsed.musicEnabled ?? true;
        this.muted = parsed.muted ?? false;
      }
    } catch {
      // Ignore storage failures
    }
  }

  _saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          sfxEnabled: this.sfxEnabled,
          musicEnabled: this.musicEnabled,
          muted: this.muted
        })
      );
    } catch {
      // Ignore storage failures
    }
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this._createNoiseBuffer();
      this._applyGains();
      this._startMusicLoop();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _createNoiseBuffer() {
    const length = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  _applyGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.85, now, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.85 : 0, now, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.22 : 0, now, 0.05);
  }

  setMuted(muted) {
    this.muted = muted;
    this._saveSettings();
    this._applyGains();
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    this._saveSettings();
    this._applyGains();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this._saveSettings();
    this._applyGains();
  }

  _canPlaySfx() {
    return this.ctx && this.ctx.state === 'running' && !this.muted && this.sfxEnabled;
  }

  playButtonClick() {
    this.unlock();
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.06);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playWeaponSelect() {
    this.unlock();
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playCannonFire(weaponId = 'cannonball') {
    this.unlock();
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    // Punchy low boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = weaponId === 'rocket' ? 'sawtooth' : 'sine';
    const startFreq = weaponId === 'cluster' ? 230 : weaponId === 'bomb' ? 140 : 175;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + (weaponId === 'rocket' ? 0.38 : 0.24));
    oscGain.gain.setValueAtTime(0.55, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Blast noise puff / rocket whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = weaponId === 'rocket' ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(weaponId === 'rocket' ? 1100 : 880, now);
    filter.frequency.exponentialRampToValueAtTime(weaponId === 'rocket' ? 2600 : 160, now + 0.26);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + (weaponId === 'rocket' ? 0.42 : 0.24));

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.45);
  }

  playExplosion(intensity = 1.0, isChain = false) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const gainScale = Math.min(1.2, Math.max(0.35, intensity));

    // Sub-bass shockwave thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isChain ? 118 : 96, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.55);
    subGain.gain.setValueAtTime(0.75 * gainScale, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.65);

    // Roaring explosion noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400 * gainScale, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.72);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.62 * gainScale, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.8);
  }

  playBlockCollision(materialSound = 'wood', intensity = 0.5) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.38, 0.08 + intensity * 0.28);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (materialSound === 'glass') {
      osc.type = 'sine';
      const base = 1350 + Math.random() * 650;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, now + 0.09);
      gain.gain.setValueAtTime(vol * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    } else if (materialSound === 'metal') {
      osc.type = 'triangle';
      const base = 420 + Math.random() * 160;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.65, now + 0.14);
      gain.gain.setValueAtTime(vol * 0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    } else if (materialSound === 'stone') {
      osc.type = 'triangle';
      const base = 130 + Math.random() * 55;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    } else {
      // Wood hollow clack
      osc.type = 'triangle';
      const base = 240 + Math.random() * 110;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.065);
      gain.gain.setValueAtTime(vol * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playBlockShatter(materialSound = 'wood') {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(
      materialSound === 'glass' ? 3200 : materialSound === 'metal' ? 1400 : 950,
      now
    );
    filter.Q.value = materialSound === 'glass' ? 2.8 : 1.1;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.17);
  }

  playTowerCollapse() {
    if (!this._canPlaySfx()) return;
    const nowSec = performance.now() / 1000;
    if (nowSec - this.lastCollapseSound < 1.8) return;
    this.lastCollapseSound = nowSec;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.linearRampToValueAtTime(95, now + 0.9);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 1.0);
  }

  playCombo(combo = 2) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pitch = Math.min(1320, 440 * Math.pow(1.12, combo));
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.25, now + 0.1);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playLevelComplete() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  playLevelFail() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const t = now + i * 0.16;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  _startMusicLoop() {
    if (this.musicTimer) return;
    // Playful upbeat pentatonic marimba/arcade motif
    const melody = [
      261.63, 329.63, 392.0, 523.25,
      392.0, 329.63, 293.66, 392.0,
      329.63, 440.0, 523.25, 440.0,
      392.0, 329.63, 293.66, 0
    ];
    const bass = [130.81, 0, 196.0, 0, 146.83, 0, 196.0, 0, 164.81, 0, 220.0, 0, 196.0, 0, 146.83, 0];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.muted || !this.musicEnabled) return;
      if (document.hidden) return;

      const idx = this.musicStep % melody.length;
      this.musicStep++;
      const now = this.ctx.currentTime;

      const note = melody[idx];
      if (note > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.34);
      }

      const bNote = bass[idx];
      if (bNote > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bNote, now);
        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        bOsc.connect(bGain);
        bGain.connect(this.musicGain);
        bOsc.start(now);
        bOsc.stop(now + 0.4);
      }
    }, 290);
  }

  dispose() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
