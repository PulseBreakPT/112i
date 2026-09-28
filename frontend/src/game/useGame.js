import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`, timeout: 15000 });
export function useGame() {
  const [game, setGame] = useState(null), [world, setWorld] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const current = useRef(null), queue = useRef(Promise.resolve()), acting = useRef(false);
  const update = useCallback(g => { current.current = g; setGame(g); }, []);
  const load = useCallback(async () => {
    setError('');
    try {
      const worldRequest = api.get('/world');
      const id = localStorage.getItem('nexo-game-id');
      let response;
      if (id) { try { response = await api.get(`/games/${id}`); } catch (e) { if (e.response?.status !== 404 && e.response?.status !== 422) throw e; } }
      response ||= await api.post('/games');
      localStorage.setItem('nexo-game-id', response.data.id);
      update(response.data); setWorld((await worldRequest).data);
    } catch (_) { setError('Não foi possível ligar à central. O teu progresso guardado está seguro.'); }
  }, [update]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!current.current || acting.current || document.hidden) return;
      acting.current = true;
      const operation = queue.current.catch(() => {}).then(async () => {
        try { const r = await api.post(`/games/${current.current.id}/tick`, { seconds: 2 }); update(r.data); setError(''); }
        catch (_) { setError('Ligação interrompida. A tentar restabelecer…'); }
        finally { acting.current = false; }
      });
      queue.current = operation;
    }, 2000);
    return () => clearInterval(timer);
  }, [update]);
  const act = useCallback((type, data = {}) => {
    setBusy(true);
    const operation = queue.current.catch(() => {}).then(async () => {
      try { const response = await api.post(`/games/${current.current.id}/action`, { type, data }); update(response.data); setError(''); return response.data; }
      catch (e) { toast.error(e.response?.data?.detail || 'Não foi possível concluir a ação. Tenta novamente.', { 'data-testid': 'action-error-toast' }); return null; }
      finally { setBusy(false); }
    });
    queue.current = operation;
    return operation;
  }, [update]);
  return { game, world, error, busy, act, retry: load };
}