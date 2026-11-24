import './styles/main.css';
import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');

const game = new Game(canvas, uiRoot);
game.init();

// Expose clean debug hook in dev mode for quick inspection
if (import.meta.env.DEV) {
  window.__TOWER_BLAST__ = game;
}
