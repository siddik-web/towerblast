export const GameState = Object.freeze({
  LOADING: 'LOADING',
  MAIN_MENU: 'MAIN_MENU',
  LEVEL_SELECT: 'LEVEL_SELECT',
  READY: 'READY',
  AIMING: 'AIMING',
  SHOOTING: 'SHOOTING',
  EXPLOSION: 'EXPLOSION',
  LEVEL_COMPLETED: 'LEVEL_COMPLETED',
  LEVEL_FAILED: 'LEVEL_FAILED',
  PAUSED: 'PAUSED'
});

export class StateMachine {
  constructor(initialState = GameState.LOADING) {
    this.current = initialState;
    this.previous = null;
    this.listeners = new Set();
  }

  setState(nextState, payload = null) {
    if (!Object.values(GameState).includes(nextState)) {
      console.warn(`[StateMachine] Unknown state: ${nextState}`);
      return false;
    }
    if (this.current === nextState) {
      return false;
    }
    this.previous = this.current;
    this.current = nextState;
    for (const listener of this.listeners) {
      listener(this.current, this.previous, payload);
    }
    return true;
  }

  is(state) {
    return this.current === state;
  }

  isAny(...states) {
    return states.includes(this.current);
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
