import { applyAction, loadLocalGame, saveLocalGame, tickGame } from './localGame';

export const localGameApi = {
  load: () => loadLocalGame(),
  save: game => saveLocalGame(game),
  tick: (game,seconds) => tickGame(game,seconds),
  action: (game,type,data) => applyAction(game,type,data),
};