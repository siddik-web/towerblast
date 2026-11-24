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

// Register the PWA worker only in production. BASE_URL keeps the worker
// and its scope inside /towerblast/ when hosted on GitHub Pages.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL
      })
      .catch((error) => {
        console.error('[TowerBlast] Service worker registration failed:', error);
      });
  });
}
