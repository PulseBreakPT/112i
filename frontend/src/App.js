import { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Radio, LoaderCircle, X, Menu, PanelsTopLeft } from 'lucide-react';
import { Toaster, toast } from './components/ui/sonner';
import { useGame } from './game/useGame';
import { Sidebar, Footer } from './game/Shell';
import { GameHUD, OperationsDock } from './game/GameHUD';
import { IncidentPanel } from './game/IncidentPanel';
import { DispatchPanel } from './game/DispatchPanel';
import { PortugalMap as CityMap } from './game/PortugalMap';
import { CallModal, HelpModal } from './game/Modals';
import Management from './game/Management';
import Operations from './game/Operations';
import Reports from './game/Reports';
import Settings from './game/Settings';
import CommandCenters from './game/CommandCenters';
import StrategicOperations from './game/StrategicOperations';
import { beep } from './game/common';
import { ambientAudio } from './game/ambientAudio';
import { useAmbientAudio } from './game/useAmbientAudio';
import EventEffects from './game/EventEffects';
import './Silver.css';
import './game/semantics.css';
import './Immersive.css';
import './Minimal.css';
import './Polish.css';
import './Clarity.css';
import './Compact.css';
import './VehicleMedia.css';
import './Interface.css';

function GameApp() {
  const { game, world, error, busy, act, retry, feedback, clearFeedback } = useGame();
  const location = useLocation();
  const navigate = useNavigate();
  const isCentral = location.pathname === '/';
  const [selected, setSelected] = useState(null);
  const [callId, setCallId] = useState(null);
  const [help, setHelp] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [panel, setPanel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sound, setSoundState] = useState(() => localStorage.getItem('nexo-sound') !== 'false');
  const sequence = useRef(null);
  const audioActive = !!game && !!game.speed && isCentral;
  useAmbientAudio(sound, audioActive);
  const setSound = value => {
    setSoundState(value);
    localStorage.setItem('nexo-sound', String(value));
    ambientAudio.configure(value, audioActive);
    if (value) ambientAudio.unlock();
  };

  useEffect(() => {
    if (!game) return;
    if (!game.incidents.some(i => i.id === selected)) setSelected(game.incidents[0]?.id || null);
    if (sequence.current !== null && game.sequence > sequence.current) beep(sound, 780);
    sequence.current = game.sequence;
  }, [game, selected, sound]);

  useEffect(() => {
    if (!feedback) return;
    beep(sound, feedback.tone === 'positive' ? 1040 : feedback.tone === 'warning' ? 620 : 210);
  }, [feedback, sound]);

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

  const save = async () => { if (await act('save')) toast.success('Progresso guardado neste navegador.'); };
  const selectIncident = id => { setSelected(id); setPanel('dispatch'); if (!isCentral) navigate('/'); beep(sound, 490); };
  const call = id => { setCallId(id); setSelected(id); beep(sound, 800); };
  const closeCall = () => { setCallId(null); setPanel('dispatch'); };
  const focusIncident = () => { setPanel(null); setFocusKey(k => k + 1); };
  const openPanel = value => { setMenuOpen(false); setPanel(value); if (!isCentral) navigate('/'); };

  if (!game || !world) return <div className="loading-screen" data-testid="loading-screen"><Radio size={40} /><h1>NEXO<span>112</span></h1>{error ? <><p data-testid="loading-error">{error}</p><button data-testid="retry-connection" className="primary-button" onClick={retry}>Voltar a ligar</button></> : <><LoaderCircle className="spinner" size={20} /><p>A estabelecer ligação à central…</p></>}</div>;
  const incident = game.incidents.find(i => i.id === selected);
  const waitingIncidents = game.incidents.filter(item => item.status === 'waiting');
  const queueTone = waitingIncidents.some(item => item.priority === 1) ? 'danger' : waitingIncidents.length ? 'warning' : game.incidents.length ? 'active' : 'success';
  const workspaceName = { '/comando':'Áreas operacionais', '/estrategia':'Estratégia operacional', '/bases': 'Rede de bases', '/frota': 'Frota de emergência', '/operacoes': 'Operações e apoio', '/relatorios': 'Relatório do turno', '/definicoes': 'Definições' }[location.pathname] || 'Setor não encontrado';

  return <div className={`app-shell immersive-shell minimal-shell nexo-interface dark ${isCentral ? 'central-open' : 'workspace-open'} ${panel && isCentral ? `panel-open panel-${panel}` : ''}`}>
    <main className="world-stage" aria-label="Mapa operacional" inert={!isCentral || menuOpen}>
      <CityMap world={world} game={game} selected={selected} onSelect={selectIncident} onCall={call} focusKey={focusKey} active={isCentral && !menuOpen} />
    </main>
    <GameHUD game={game} act={act} sound={sound} setSound={setSound} onSave={save} error={error} />
    <div className="menu-launcher">
      <button className={menuOpen ? 'active' : ''} data-testid="game-menu-toggle" aria-label={menuOpen ? 'Fechar menu do jogo' : 'Abrir menu do jogo'} aria-expanded={menuOpen} aria-controls="game-menu" onClick={() => { setMenuOpen(value => !value); setPanel(null); }}>{menuOpen ? <X size={17} /> : <Menu size={17} />}<span>Menu</span></button>
      {isCentral && <button className="quick-incidents" data-tone={queueTone} data-testid="quick-incidents" aria-label={`${game.incidents.length} ocorrências, ${waitingIncidents.length} a aguardar mobilização — abrir fila`} aria-expanded={panel === 'incidents'} aria-controls="incident-drawer" onClick={() => openPanel(panel === 'incidents' ? null : 'incidents')}><Radio size={17} /><span className="quick-incidents-label">Ocorrências</span><b className="queue-count">{game.incidents.length}</b></button>}
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
        <DispatchPanel game={game} world={world} incident={incident} act={act} busy={busy} onCall={call} onFocus={focusIncident} onClose={() => setPanel(null)} />
      </div>}
    </> : <>
      <div className="workspace-shade" aria-hidden="true" />
      <section className="game-workspace" aria-label={workspaceName} data-testid="game-workspace">
        <div className="workspace-bar"><div className="workspace-breadcrumb"><PanelsTopLeft size={14} /><span>COMANDO</span><span>/</span><strong>{workspaceName.toUpperCase()}</strong></div><button className="workspace-close" aria-label="Voltar ao mapa" data-testid="workspace-close" onClick={() => navigate('/')}><span>Voltar ao mapa</span><kbd>ESC</kbd><X size={17} /></button></div>
        <Routes>
          <Route path="/comando" element={<CommandCenters game={game} world={world} act={act} busy={busy} />} />
          <Route path="/estrategia" element={<StrategicOperations game={game} world={world} act={act} busy={busy} />} />
          <Route path="/bases" element={<Management key="bases" game={game} world={world} act={act} busy={busy} mode="bases" />} />
          <Route path="/frota" element={<Management key="fleet" game={game} world={world} act={act} busy={busy} mode="fleet" />} />
          <Route path="/operacoes" element={<Operations game={game} world={world} act={act} busy={busy} />} />
          <Route path="/relatorios" element={<Reports game={game} />} />
          <Route path="/definicoes" element={<Settings game={game} act={act} sound={sound} setSound={setSound} onSave={save} onHelp={() => setHelp(true)} busy={busy} />} />
          <Route path="*" element={<div className="empty-state" data-testid="page-not-found"><h1>Setor não encontrado</h1><button className="primary-button" data-testid="return-to-central" onClick={() => navigate('/')}>Voltar à central</button></div>} />
        </Routes>
      </section>
    </>}
    <Footer game={game} error={error} />
    <CallModal incident={game.incidents.find(i => i.id === callId)} open={!!callId} onClose={closeCall} act={act} busy={busy} />
    <HelpModal open={help} onClose={() => setHelp(false)} />
    <EventEffects event={feedback} onDone={clearFeedback} />
    <Toaster theme="dark" position="top-center" richColors />
  </div>;
}
export default function App() { return <HashRouter><GameApp /></HashRouter>; }
