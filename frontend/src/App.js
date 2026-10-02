import { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Radio, LoaderCircle, X, Menu, PanelsTopLeft, Info, BarChart3, Building2, CarFront, Users } from 'lucide-react';
import { Toaster, toast } from './components/ui/sonner';
import { useGame } from './game/useGame';
import { Sidebar, Footer } from './game/Shell';
import { GameHUD } from './game/GameHUD';
import { IncidentPanel } from './game/IncidentPanel';
import { DispatchPanel } from './game/DispatchPanel';
import { PortugalMap as CityMap } from './game/PortugalMap';
import { CallModal, HelpModal } from './game/Modals';
import Management from './game/Management';
import Operations from './game/Operations';
import Personnel from './game/Personnel';
import Reports from './game/Reports';
import Settings from './game/Settings';
import Privacy from './game/Privacy';
import CommandCenters from './game/CommandCenters';
import StrategicOperations from './game/StrategicOperations';
import Cooperation from './game/Cooperation';
import ManagementHub from './game/ManagementHub';
import Career from './game/Career';
import { beep } from './game/common';
import { ambientAudio } from './game/ambientAudio';
import { useAmbientAudio } from './game/useAmbientAudio';
import EventEffects from './game/EventEffects';
import { APP_NAME, BRAND_WORD, BRAND_NUMBER } from './game/branding';
import { SOUND_PREFERENCE_KEY } from './game/storageCompatibility';
import { useTimeTheme } from './game/timeTheme';
import './Silver.css';
import './game/semantics.css';
import './Immersive.css';
import './Minimal.css';
import './Polish.css';
import './Clarity.css';
import './Compact.css';
import './VehicleMedia.css';
import './Interface.css';
import './TimeTheme.css';
import './ThemeComponents.css';

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
  const [centralWidget, setCentralWidget] = useState(null);
  const [sound, setSoundState] = useState(() => localStorage.getItem(SOUND_PREFERENCE_KEY) !== 'false');
  const sequence = useRef(null);
  const audioActive = !!game && !!game.speed && isCentral;
  const themeLocation = game?.command_centers?.find(center => center.id === game.active_command_center_id && center.active !== false) || game?.command_centers?.find(center => center.active !== false) || game?.bases?.[0] || { lat: 39.5, lng: -8, city: 'Portugal', land: 'mainland' };
  const { themeMode, setThemeMode, theme } = useTimeTheme(themeLocation);
  useAmbientAudio(sound, audioActive);
  const setSound = value => {
    setSoundState(value);
    localStorage.setItem(SOUND_PREFERENCE_KEY, String(value));
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

  useEffect(() => { if (!isCentral) { setPanel(null); setCentralWidget(null); } setMenuOpen(false); }, [isCentral, location.pathname]);
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
  const openPanel = value => { setMenuOpen(false); setCentralWidget(null); setPanel(value); if (!isCentral) navigate('/'); };
  const toggleCentralWidget = value => { setPanel(null); setCentralWidget(current => current === value ? null : value); };
  const quickNavigate = path => { setMenuOpen(false); setPanel(null); setCentralWidget(null); navigate(path); };

  if (!game || !world) return <div className="loading-screen" data-testid="loading-screen"><Radio size={40} /><h1 className="brand-wordmark" aria-label={APP_NAME}>{BRAND_WORD}{' '}<span>{BRAND_NUMBER}</span></h1>{error ? <><p data-testid="loading-error">{error}</p><button data-testid="retry-connection" className="primary-button" onClick={retry}>Voltar a ligar</button></> : <><LoaderCircle className="spinner" size={20} /><p>A estabelecer ligação à central…</p></>}</div>;
  const incident = game.incidents.find(i => i.id === selected);
  const waitingIncidents = game.incidents.filter(item => item.status === 'waiting');
  const queueTone = waitingIncidents.some(item => item.priority === 1) ? 'danger' : waitingIncidents.length ? 'warning' : game.incidents.length ? 'active' : 'success';
  const workspaceMeta = { '/gestao':['GESTÃO','Gestão'], '/comando':['GESTÃO','Comandos'], '/bases':['GESTÃO','Bases'], '/frota':['GESTÃO','Frota'], '/funcionarios':['GESTÃO','Funcionários'], '/infraestruturas':['GESTÃO','Infraestruturas'], '/operacoes':['OPERAÇÕES','Operações'], '/estrategia':['ESTRATÉGIA','Planeamento'], '/alianca':['ALIANÇA','Aliança operacional'], '/relatorios':['RELATÓRIOS','Desempenho'], '/carreira':['PERFIL','Carreira'], '/definicoes':['SISTEMA','Definições'], '/privacidade':['SISTEMA','Privacidade'] }[location.pathname] || ['SISTEMA','Setor não encontrado'];
  const [workspaceSection, workspaceName] = workspaceMeta;

  return <div data-time-theme={theme.phase} data-time-theme-mode={themeMode} className={`app-shell immersive-shell minimal-shell distrito-interface ${theme.dark ? 'dark' : ''} ${isCentral ? 'central-open' : 'workspace-open'} ${panel && isCentral ? `panel-open panel-${panel}` : ''} ${menuOpen ? 'menu-open' : ''}`}>
    <main className="world-stage" aria-label="Mapa operacional" inert={!isCentral || menuOpen}>
      <CityMap theme={theme} world={world} game={game} selected={selected} onSelect={selectIncident} focusKey={focusKey} active={isCentral && !menuOpen} />
    </main>
    <GameHUD game={game} act={act} sound={sound} setSound={setSound} onSave={save} error={error} themeMode={themeMode} setThemeMode={setThemeMode} theme={theme} />
    <div className="menu-launcher">
      <button className={menuOpen ? 'active' : ''} data-testid="game-menu-toggle" aria-label={menuOpen ? 'Fechar menu do jogo' : 'Abrir menu do jogo'} aria-expanded={menuOpen} aria-controls="game-menu" onClick={() => { setMenuOpen(value => !value); setPanel(null); setCentralWidget(null); }}>{menuOpen ? <X size={17} /> : <Menu size={17} />}<span>Menu</span></button>
    </div>
    <button
      className={`central-incidents-launcher ${panel === 'incidents' ? 'active' : ''}`}
      data-tone={queueTone}
      data-testid="central-incidents-button"
      aria-label={`${game.incidents.length} ocorrências, ${waitingIncidents.length} a aguardar mobilização — abrir fila`}
      aria-expanded={panel === 'incidents'}
      aria-controls="incident-drawer"
      onClick={() => openPanel(panel === 'incidents' ? null : 'incidents')}
    ><Radio size={18}/><span>Ocorrências</span><b>{game.incidents.length}</b></button>
    <>
      <nav className="central-quick-rail central-management-rail" aria-label="Gestão rápida">
        <button title="Gestão" aria-label="Abrir gestão" onClick={() => quickNavigate('/gestao')}><PanelsTopLeft size={17}/><span>Gestão</span></button>
        <button title="Bases" aria-label="Abrir bases" onClick={() => quickNavigate('/bases')}><Building2 size={17}/><span>Bases</span></button>
        <button title="Frota" aria-label="Abrir frota" onClick={() => quickNavigate('/frota')}><CarFront size={17}/><span>Frota</span></button>
        <button title="Funcionários" aria-label="Abrir funcionários" onClick={() => quickNavigate('/funcionarios')}><Users size={17}/><span>Funcionários</span></button>
      </nav>
    </>
    {menuOpen && <>
      <div className="menu-dismiss" data-testid="menu-dismiss" onClick={() => setMenuOpen(false)} />
      <div className="game-menu" id="game-menu" data-testid="game-menu">
        <div className="game-menu-heading"><span data-testid="operations-title">MENU PRINCIPAL</span></div>
        <Sidebar onNavigate={() => setMenuOpen(false)} onHelp={() => { setMenuOpen(false); setHelp(true); }} />
        {isCentral && <div className="menu-context-tools" aria-label="Informação rápida">
          <div className="menu-context-heading">CENTRAL</div>
          <button className={centralWidget === 'info' ? 'active' : ''} aria-label="Informação da central" aria-expanded={centralWidget === 'info'} onClick={() => toggleCentralWidget('info')}><Info size={16}/><span>Informação</span></button>
          {centralWidget === 'info' && <div className="menu-context-summary" aria-label="Resumo da central">
            <div><small>Condições</small><strong>{game.conditions?.weather_label || 'Céu limpo'}</strong><span>{game.conditions?.traffic_label || 'Trânsito fluido'}{game.conditions?.night ? ' · Noite' : ''}</span></div>
            <div><small>Operador</small><strong>Nível {game.level}</strong><span>{game.xp % 200}/200 XP</span></div>
            <div><small>Orçamento</small><strong>{money(game.money)}</strong><span>Disponível</span></div>
            <div><small>Comando</small><strong>{game.command_centers?.find(center => center.id === game.active_command_center_id)?.name || game.command_centers?.[0]?.name || 'Sem comando'}</strong><span>{game.city}</span></div>
          </div>}
          <button className={centralWidget === 'stats' ? 'active' : ''} aria-label="Estatísticas da central" aria-expanded={centralWidget === 'stats'} onClick={() => toggleCentralWidget('stats')}><BarChart3 size={16}/><span>Estatísticas</span></button>
          {centralWidget === 'stats' && <div className="menu-context-summary" aria-label="Estatísticas rápidas">
            <div><small>Ocorrências</small><strong>{game.incidents.length}</strong><span>{waitingIncidents.length} a aguardar</span></div>
            <div><small>Viaturas</small><strong>{game.units.filter(unit => unit.status === 'available').length}/{game.units.length}</strong><span>Disponíveis</span></div>
            <div><small>Efetivo</small><strong>{(game.personnel || []).filter(person => !person.unit_id && person.status === 'available').length}</strong><span>Elementos livres</span></div>
            <div><small>Confiança</small><strong>{game.trust}%</strong><span>{game.bases.length} bases · {(game.facilities || []).length} instalações</span></div>
          </div>}
        </div>}
      </div>
    </>}
    {isCentral ? <>
      {panel && <div className="panel-shade" aria-hidden="true" onClick={() => setPanel(null)} />}
      {panel === 'incidents' && <div className="tactical-drawer incidents-drawer" id="incident-drawer" data-testid="incident-drawer">
        <IncidentPanel game={game} selected={selected} onSelect={selectIncident} onCall={call} act={act} busy={busy} onClose={() => setPanel(null)} />
      </div>}
      {panel === 'dispatch' && <div className="tactical-drawer dispatch-drawer" id="dispatch-drawer" data-testid="dispatch-drawer">
        <DispatchPanel game={game} world={world} incident={incident} act={act} busy={busy} onCall={call} onFocus={focusIncident} onClose={() => setPanel(null)} />
      </div>}
    </> : <>
      <div className="workspace-shade" aria-hidden="true" onClick={() => navigate('/')} />
      <section className="game-workspace" aria-label={workspaceName} data-testid="game-workspace">
        <div className="workspace-bar"><div className="workspace-breadcrumb"><PanelsTopLeft size={14} /><span>{workspaceSection}</span><span>/</span><strong>{workspaceName.toUpperCase()}</strong></div><button className="workspace-close" aria-label="Voltar ao mapa" data-testid="workspace-close" onClick={() => navigate('/')}><span>Voltar ao mapa</span><kbd>ESC</kbd><X size={17} /></button></div>
        <Routes>
          <Route path="/gestao" element={<ManagementHub game={game} />} />
          <Route path="/comando" element={<CommandCenters game={game} world={world} act={act} busy={busy} />} />
          <Route path="/estrategia" element={<StrategicOperations game={game} world={world} act={act} busy={busy} />} />
          <Route path="/alianca" element={<Cooperation game={game} world={world} act={act} busy={busy} />} />
          <Route path="/bases" element={<Management key="bases" game={game} world={world} act={act} busy={busy} mode="bases" />} />
          <Route path="/frota" element={<Management key="fleet" game={game} world={world} act={act} busy={busy} mode="fleet" />} />
          <Route path="/funcionarios" element={<Personnel game={game} world={world} act={act} busy={busy} />} />
          <Route path="/infraestruturas" element={<Operations game={game} world={world} act={act} busy={busy} mode="infrastructure" />} />
          <Route path="/operacoes" element={<Operations game={game} world={world} act={act} busy={busy} mode="operations" />} />
          <Route path="/relatorios" element={<Reports game={game} />} />
          <Route path="/carreira" element={<Career game={game} act={act} busy={busy} />} />
          <Route path="/definicoes" element={<Settings game={game} act={act} sound={sound} setSound={setSound} onSave={save} onHelp={() => setHelp(true)} busy={busy} />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="*" element={<div className="empty-state" data-testid="page-not-found"><h1>Setor não encontrado</h1><button className="primary-button" data-testid="return-to-central" onClick={() => navigate('/')}>Voltar à central</button></div>} />
        </Routes>
      </section>
    </>}
    <Footer game={game} error={error} />
    <CallModal incident={game.incidents.find(i => i.id === callId)} open={!!callId} onClose={closeCall} act={act} busy={busy} />
    <HelpModal open={help} onClose={() => setHelp(false)} />
    <EventEffects event={feedback} onDone={clearFeedback} />
    <Toaster theme={theme.dark ? 'dark' : 'light'} position="top-center" richColors />
  </div>;
}
export default function App() { return <HashRouter><GameApp /></HashRouter>; }
