import { useEffect, useRef, useState } from 'react';
import { Radio, Pause, Play, Volume2, VolumeX, Save, Crosshair, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from './Shell';
import { clock, money } from './common';

export function GameHUD({ game, act, sound, setSound, onSave, error }) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const options = useRef(null);
  useEffect(() => {
    if (!optionsOpen) return;
    const close = event => { if (!options.current?.contains(event.target)) setOptionsOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [optionsOpen]);
  const rank = game.level === 1 ? 'Recruta' : game.level < 4 ? 'Coordenador' : 'Comandante';
  return <header className="minimal-hud" aria-label="Painel de comando">
    <Link to="/" className="minimal-brand" data-testid="brand-home" aria-label="NEXO 112 — voltar ao mapa"><Radio size={18} /><span data-testid="game-brand">NEXO<span>112</span></span></Link>
    <div className="minimal-readout">
      <span className="minimal-budget" data-testid="user-budget-display" title="Orçamento">{money(game.money)}</span>
      <b data-testid="game-clock">{clock(game.elapsed).slice(0, 5)}</b>
      <IconButton icon={game.speed ? Pause : Play} label={game.speed ? 'Pausar simulação' : 'Retomar simulação'} testId="game-speed-pause" active={!game.speed} onClick={() => act('speed', { speed: game.speed ? 0 : 1 })} />
      <div className="hud-options-wrap" ref={options}>
        <button className={`minimal-options-toggle ${optionsOpen ? 'active' : ''}`} aria-label="Controlos e recursos do turno" aria-expanded={optionsOpen} data-testid="hud-options-toggle" onClick={() => setOptionsOpen(!optionsOpen)}><SlidersHorizontal size={16} /><span>{game.speed}×</span></button>
        {optionsOpen && <div className="hud-options" data-testid="hud-options" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOptionsOpen(false); } }}>
          <div className="hud-options-heading">CONTROLOS DO TURNO</div>
          <div className="option-line"><span>Velocidade</span><div className="speed-group">{[1, 2, 5].map(n => <button key={n} aria-label={`Velocidade ${n} vezes`} aria-pressed={game.speed === n} data-testid={`game-speed-${n}x`} className={game.speed === n ? 'chosen' : ''} onClick={() => act('speed', { speed: n })}>{n}×</button>)}</div></div>
          <div className="option-line"><span>Operador · Nível {game.level}</span><strong data-testid="user-level-badge">{rank}</strong></div>
          <div className="option-line"><span>Experiência</span><span>{game.xp % 200}/200 XP</span></div>
          <div className="xp-track"><i style={{ width: `${game.xp % 200 / 2}%` }} /></div>
          <div className="option-line"><span>Condições</span><strong data-testid="current-conditions">{game.conditions?.weather_label || 'Céu limpo'} · {game.conditions?.traffic_label || 'Trânsito fluido'}{game.conditions?.night ? ' · Noite' : ''}{game.conditions?.roadworks ? ' · Obras' : ''}</strong></div>
          <div className="option-line"><span>Confiança</span><strong data-testid="city-trust" data-tone={game.trust >= 80 ? 'positive' : game.trust >= 50 ? 'warning' : 'negative'}>{game.trust}%</strong></div>
          <div className="option-actions"><button data-testid="sound-toggle" onClick={() => setSound(!sound)}>{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}{sound ? 'Som ligado' : 'Som desligado'}</button><button data-testid="save-game-button" onClick={onSave}><Save size={15} /> Guardar</button></div>
        </div>}
      </div>
    </div>
    {error && <div className="connection-notice" role="status">{error}</div>}
  </header>;
}

export function OperationsDock({ game, panel, onPanelChange }) {
  return <div className="menu-operations" aria-label="Operações" data-testid="operations-dock">
    <button data-testid="mobile-tab-incidents" aria-expanded={panel === 'incidents'} onClick={() => onPanelChange('incidents')}><Radio size={17} /><span>Ocorrências</span><b data-testid="snapshot-active">{game.incidents.length}</b><ChevronRight size={14} /></button>
    <button data-testid="mobile-tab-dispatch" aria-expanded={panel === 'dispatch'} onClick={() => onPanelChange('dispatch')}><Crosshair size={17} /><span>Despacho</span><small data-testid="snapshot-ready">{game.units.filter(u => u.status === 'available').length} livres</small><ChevronRight size={14} /></button>
  </div>;
}
