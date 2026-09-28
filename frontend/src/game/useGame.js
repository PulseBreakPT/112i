import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WORLD, applyAction, fetchRoadRoute, loadLocalGame, saveLocalGame, selectArrUnitIds, tickGame } from './localGame';

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

  useEffect(() => { current.current = game; }, [game]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden || !current.current?.speed) return;
      update(tickGame(current.current, 2));
    }, 2000);
    return () => clearInterval(timer);
  }, [update]);

  const act = useCallback(async (requestedType, requestedData = {}) => {
    setBusy(true);
    try {
      let type=requestedType,data={...requestedData};
      if(type==='dispatch_arr'){
        data={incident_id:data.incident_id,unit_ids:selectArrUnitIds(current.current,data.incident_id,data.arr_id)};
        type='dispatch';
      }
      if(type==='dispatch'){
        const incident=current.current.incidents.find(item=>item.id===data.incident_id);
        if(!incident)throw new Error('Ocorrência já encerrada.');
        const prepared=data.routes||{};
        const plans=await Promise.all((data.unit_ids||[]).map(async id=>{
          const unit=current.current.units.find(item=>item.id===id);
          if(!unit)throw new Error('Unidade indisponível.');
          return [id,prepared[id]||await fetchRoadRoute(unit.node,incident.node,current.current.conditions)];
        }));
        data={...data,routes:Object.fromEntries(plans)};
      }
      return update(applyAction(current.current, type, data));
    } catch (error) {
      toast.error(error?.message || 'Não foi possível concluir a ação. Tenta novamente.', { 'data-testid': 'action-error-toast' });
      return null;
    } finally { setBusy(false); }
  }, [update]);

  return { game, world: WORLD, error: '', busy, act, retry: () => {} };
}
