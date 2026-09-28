import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Radio, LoaderCircle } from 'lucide-react';
import { Toaster, toast } from './components/ui/sonner';
import { useGame } from './game/useGame';
import { Header, Sidebar, Toolbar, Footer } from './game/Shell';
import { IncidentPanel } from './game/IncidentPanel';
import { DispatchPanel } from './game/DispatchPanel';
import { CityMap } from './game/CityMap';
import { CallModal, HelpModal } from './game/Modals';
import Management from './game/Management';
import Reports from './game/Reports';
import Settings from './game/Settings';
import { beep } from './game/common';
import './App.css';

function GameApp() {
  const { game, world, error, busy, act, retry } = useGame();
  const [selected, setSelected] = useState(null), [callId, setCallId] = useState(null), [help, setHelp] = useState(false), [focusKey, setFocusKey] = useState(0), [mobileTab, setMobileTab] = useState('map');
  const [sound, setSoundState] = useState(() => localStorage.getItem('nexo-sound') === 'true');
  const sequence = useRef(null), completed = useRef(null);
  const setSound = value => { setSoundState(value); localStorage.setItem('nexo-sound', String(value)); beep(value); };
  useEffect(() => { if (!game) return; if (!game.incidents.some(i => i.id === selected)) setSelected(game.incidents[0]?.id || null); if (sequence.current !== null && game.sequence > sequence.current) beep(sound, 780); if (completed.current !== null && game.completed > completed.current) { toast.success('Ocorrência resolvida. Recompensa recebida!', { id: 'mission-complete' }); beep(sound, 1000); } sequence.current = game.sequence; completed.current = game.completed; }, [game, selected, sound]);
  const save = async () => { if (await act('save')) toast.success('Progresso guardado. Bom trabalho, operador.'); };
  const selectIncident = id => { setSelected(id); setMobileTab('dispatch'); beep(sound, 490); };
  const call = id => { setCallId(id); setSelected(id); beep(sound, 800); };
  if (!game || !world) return <div className="loading-screen" data-testid="loading-screen"><Radio size={40} /><h1>NEXO<span>112</span></h1>{error ? <><p data-testid="loading-error">{error}</p><button data-testid="retry-connection" className="primary-button" onClick={retry}>Voltar a ligar</button></> : <><LoaderCircle className="spinner" size={20} /><p>A estabelecer ligação à central…</p></>}</div>;
  const incident = game.incidents.find(i => i.id === selected);
  return <div className="app-shell dark"><Sidebar onHelp={() => setHelp(true)} /><div className="app-main"><Header game={game} act={act} sound={sound} setSound={setSound} onSave={save} /><Toolbar game={game} act={act} /><Routes><Route path="/" element={<><div className="mobile-switch">{[['incidents', 'Ocorrências', game.incidents.length], ['map', 'Mapa'], ['dispatch', 'Despacho']].map(([id, label, count]) => <button key={id} data-testid={`mobile-tab-${id}`} onClick={() => setMobileTab(id)} className={mobileTab === id ? 'active' : ''}>{label}{count !== undefined && <span>{count}</span>}</button>)}</div><main className={`operations-grid mobile-${mobileTab}`}><IncidentPanel game={game} selected={selected} onSelect={selectIncident} onCall={call} act={act} busy={busy} /><CityMap world={world} game={game} selected={selected} onSelect={selectIncident} onCall={call} focusKey={focusKey} /><DispatchPanel game={game} incident={incident} act={act} busy={busy} onCall={call} onFocus={() => { setFocusKey(k => k + 1); setMobileTab('map'); }} /></main></>} /><Route path="/bases" element={<Management game={game} world={world} act={act} busy={busy} mode="bases" />} /><Route path="/frota" element={<Management game={game} world={world} act={act} busy={busy} mode="fleet" />} /><Route path="/relatorios" element={<Reports game={game} />} /><Route path="/definicoes" element={<Settings game={game} act={act} sound={sound} setSound={setSound} onSave={save} onHelp={() => setHelp(true)} busy={busy} />} /><Route path="*" element={<div className="empty-state" data-testid="page-not-found"><h1>Setor não encontrado</h1><a href="/" data-testid="return-to-central">Voltar à central</a></div>} /></Routes><Footer game={game} error={error} /></div><CallModal incident={game.incidents.find(i => i.id === callId)} open={!!callId} onClose={() => setCallId(null)} act={act} busy={busy} /><HelpModal open={help} onClose={() => setHelp(false)} /><Toaster theme="dark" position="top-center" richColors /></div>;
}
export default function App() { return <BrowserRouter><GameApp /></BrowserRouter>; }