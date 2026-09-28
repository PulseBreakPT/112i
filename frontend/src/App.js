import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Radio, LoaderCircle, X, Menu, PanelsTopLeft } from 'lucide-react';
import { Toaster, toast } from './components/ui/sonner';
import { useGame } from './game/useGame';
import { Sidebar, Footer } from './game/Shell';
import { GameHUD, OperationsDock } from './game/GameHUD';
import { IncidentPanel } from './game/IncidentPanel';
import { DispatchPanel } from './game/DispatchPanel';
import { CityMap } from './game/CityMap';
import { CallModal, HelpModal } from './game/Modals';
import Management from './game/Management';
import Reports from './game/Reports';
import Settings from './game/Settings';
import { beep } from './game/common';
import './Silver.css';
import './game/semantics.css';
import './Immersive.css';
import './Minimal.css';
import './Polish.css';

function GameApp() {
  const { game, world, error, busy, act, retry } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const isCentral = location.pathname === '/';
  const [selected, setSelected] = useState(null);
  const [callId, setCallId] = useState(null);
  const [help, setHelp] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [panel, setPanel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sound, setSoundState] = useState(() => localStorage.getItem('nexo-sound') === 'true');
  const sequence = useRef(null), completed = useRef(null);
  const setSound = value => { setSoundState(value); localStorage.setItem('nexo-sound', String(value)); beep(value); };

  useEffect(() => {
    if (!game) return;
    if (!game.incidents.some(i => i.id === selected)) setSelected(game.incidents[0]?.id || null);
    if (sequence.current !== null && game.sequence > sequence.current) beep(sound, 780);
    if (completed.current !== null && game.completed > completed.current) {
      toast.success('Ocorrência resolvida. Recompensa recebida!', { id: 'mission-complete' });
      beep(sound, 1000);
    }
    sequence.current = game.sequence;
    completed.current = game.completed;
  }, [game, selected, sound]);

  useEffect(() => { if (!isCentral) setPanel(null); setMenuOpen(false); }, [isCentral, location.pathname]);
  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[role="dialog"][data-state="open"]')) return;
      setMenuOpen(false);
      if (!isCentral) navigate('/');
      else setPanel(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isCentral, navigate]);

  const save = async () => { if (await act('save')) toast.success('Progresso guardado. Bom trabalho, operador.'); };
  const selectIncident = id => { setSelected(id); setPanel('dispatch'); if (!isCentral) navigate('/'); beep(sound, 490); };
  const call = id => { setCallId(id); setSelected(id); beep(sound, 800); };
  const closeCall = () => { setCallId(null); setPanel('dispatch'); };
  const focusIncident = () => { setPanel(null); setFocusKey(k => k + 1); };
  const openPanel = value => { setMenuOpen(false); setPanel(value); if (!isCentral) navigate('/'); };

  if (!game || !world) return <div className="loading-screen" data-testid="loading-screen"><Radio size={40} /><h1>NEXO<span>112</span></h1>{error ? <><p data-testid="loading-error">{error}</p><button data-testid="retry-connection" className="primary-button" onClick={retry}>Voltar a ligar</button></> : <><LoaderCircle className="spinner" size={20} /><p>A estabelecer ligação à central…</p></>}</div>;
  const incident = game.incidents.find(i => i.id === selected);
  const workspaceName = { '/bases': 'Rede de bases', '/frota': 'Frota de emergência', '/relatorios': 'Relatório do turno', '/definicoes': 'Definições' }[location.pathname] || 'Setor não encontrado';

  return <div className={`app-shell immersive-shell minimal-shell dark ${isCentral ? 'central-open' : 'workspace-open'} ${panel && isCentral ? `panel-open panel-${panel}` : ''}`}>
    <main className="world-stage" aria-label="Mapa operacional" inert={!isCentral || menuOpen}>
      <CityMap world={world} game={game} selected={selected} onSelect={selectIncident} onCall={call} focusKey={focusKey} />
    </main>
    <GameHUD game={game} act={act} sound={sound} setSound={setSound} onSave={save} error={error} />
    <div className="menu-launcher">
      <button className={menuOpen ? 'active' : ''} data-testid="game-menu-toggle" aria-label={menuOpen ? 'Fechar menu do jogo' : 'Abrir menu do jogo'} aria-expanded={menuOpen} aria-controls="game-menu" onClick={() => { setMenuOpen(value => !value); setPanel(null); }}>{menuOpen ? <X size={17} /> : <Menu size={17} />}<span>Menu</span></button>
      {isCentral && <button className="quick-incidents" data-testid="quick-incidents" aria-label={`${game.incidents.length} ocorrências — abrir fila`} aria-expanded={panel === 'incidents'} onClick={() => openPanel(panel === 'incidents' ? null : 'incidents')}><Radio size={16} /><span>{game.incidents.length}</span></button>}
    </div>
    {menuOpen && <>
      <button className="menu-dismiss" aria-label="Fechar menu" data-testid="menu-dismiss" onClick={() => setMenuOpen(false)} />
      <div className="game-menu" id="game-menu" data-testid="game-menu">
        <div className="game-menu-heading"><span data-testid="operations-title">CENTRAL DE OPERAÇÕES</span><button className="icon-btn" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}><X size={16} /></button></div>
        <OperationsDock game={game} panel={panel} onPanelChange={openPanel} />
        <Sidebar onNavigate={() => setMenuOpen(false)} onHelp={() => { setMenuOpen(false); setHelp(true); }} />
      </div>
    </>}
    {isCentral ? <>
      {panel === 'incidents' && <div className="tactical-drawer incidents-drawer" id="incident-drawer" data-testid="incident-drawer">
        <IncidentPanel game={game} selected={selected} onSelect={selectIncident} onCall={call} act={act} busy={busy} onClose={() => setPanel(null)} />
      </div>}
      {panel === 'dispatch' && <div className="tactical-drawer dispatch-drawer" id="dispatch-drawer" data-testid="dispatch-drawer">
        <DispatchPanel game={game} incident={incident} act={act} busy={busy} onCall={call} onFocus={focusIncident} onClose={() => setPanel(null)} />
      </div>}
    </> : <>
      <div className="workspace-shade" aria-hidden="true" />
      <section className="game-workspace" aria-label={workspaceName} data-testid="game-workspace">
        <div className="workspace-bar"><div className="workspace-breadcrumb"><PanelsTopLeft size={14} /><span>COMANDO</span><span>/</span><strong>{workspaceName.toUpperCase()}</strong></div><button className="workspace-close" data-testid="workspace-close" onClick={() => navigate('/')}><span>Voltar ao mapa</span><kbd>ESC</kbd><X size={17} /></button></div>
        <Routes>
          <Route path="/bases" element={<Management key="bases" game={game} world={world} act={act} busy={busy} mode="bases" />} />
          <Route path="/frota" element={<Management key="fleet" game={game} world={world} act={act} busy={busy} mode="fleet" />} />
          <Route path="/relatorios" element={<Reports game={game} />} />
          <Route path="/definicoes" element={<Settings game={game} act={act} sound={sound} setSound={setSound} onSave={save} onHelp={() => setHelp(true)} busy={busy} />} />
          <Route path="*" element={<div className="empty-state" data-testid="page-not-found"><h1>Setor não encontrado</h1><button className="primary-button" data-testid="return-to-central" onClick={() => navigate('/')}>Voltar à central</button></div>} />
        </Routes>
      </section>
    </>}
    <Footer game={game} error={error} />
    <CallModal incident={game.incidents.find(i => i.id === callId)} open={!!callId} onClose={closeCall} act={act} busy={busy} />
    <HelpModal open={help} onClose={() => setHelp(false)} />
    <Toaster theme="dark" position="top-center" richColors />
  </div>;
}
export default function App() { return <BrowserRouter><GameApp /></BrowserRouter>; }