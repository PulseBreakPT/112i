import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WORLD, applyAction, loadLocalGame, saveLocalGame, tickGame } from './localGame';

export function useGame() {
  const [game, setGame] = useState(() => loadLocalGame());
  const [busy, setBusy] = useState(false);
  const current = useRef(game);

  const update = useCallback(next => {
    const saved = saveLocalGame(next);
    current.current = saved;
    setGame(saved);
    return saved;
  }, []);

  useEffect(() => {
    current.current = game;
  }, [game]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !current.current?.speed) return;
      update(tickGame(current.current, 2));
    }, 2000);
    return () => clearInterval(timer);
  }, [update]);

  const act = useCallback(async (type, data = {}) => {
    setBusy(true);
    try {
      return update(applyAction(current.current, type, data));
    } catch (error) {
      toast.error(error?.message || 'Não foi possível concluir a ação. Tenta novamente.', { 'data-testid': 'action-error-toast' });
      return null;
    } finally {
      setBusy(false);
    }
  }, [update]);

  return { game, world: WORLD, error: '', busy, act, retry: () => {} };
}
