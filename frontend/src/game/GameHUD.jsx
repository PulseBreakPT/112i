import { useEffect, useRef, useState } from 'react';
import { Radio, Pause, Play, Volume2, VolumeX, Save, Crosshair, SlidersHorizontal, ChevronRight, Clock3, Sun, Sunset, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconButton } from './Shell';
import { money } from './common';
import { APP_NAME, BRAND_WORD, BRAND_NUMBER } from './branding';

const THEME_OPTIONS = [[Clock3, 'auto', 'Auto'], [Sun, 'morning', 'Manhã'], [Sunset, 'afternoon', 'Tarde'], [Moon, 'night', 'Noite']];\n\nexport function GameHUD({ game, act, sound, setSound, onSave, error, themeMode = 'auto', setThemeMode = () => {}, theme }) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const options = useRef(null);
  useEffect(() => {
    if (!optionsOpen) return;
    const close = event => { if (!options.current?.contains(event.target)) setOptionsOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [optionsOpen]);
  const rank = game.level === 1 ? 'Operador em formação' : game.level < 4 ? 'Operador' : 'Coordenador de operações';
  return <header className="minimal-hud" aria-label="Painel de comando">
    <Link to="/" className="minimal-brand" data-testid="brand-home" aria-label={`${APP_NAME} — voltar ao mapa`}><Radio size={18} /><span className="brand-wordmark" data-testid="game-brand">{BRAND_WORD}{' '}<span>{BRAND_NUMBER}</span></span></Link>
    <div className="minimal-readout">
      <div className="hud-stat hud-budget"><small>Orçamento</small><span className="minimal-budget" data-testid="user-budget-display" title={money(game.money)}>{money(game.money)}</span></div>
      <IconButton icon={game.speed ? Pause : Play} label={game.speed ? 'Pausar simulação' : 'Retomar simulação'} testId="game-speed-pause" active={!game.speed} onClick={() => act('speed', { speed: game.speed ? 0 : 1 })} />
      <div className="hud-options-wrap" ref={options}>
        <button className={`minimal-options-toggle ${optionsOpen ? 'active' : ''}`} aria-label="Controlos e informação do turno" aria-expanded={optionsOpen} aria-controls="hud-options" data-testid="hud-options-toggle" onClick={() => setOptionsOpen(!optionsOpen)}><SlidersHorizontal size={17} /></button>
        {optionsOpen && <div className="hud-options" id="hud-options" data-testid="hud-options" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOptionsOpen(false); options.current?.querySelector('button')?.focus(); } }}>
          <div className="hud-options-heading">CONTROLOS DO TURNO</div>
          <div className="option-line"><span>Velocidade</span><div className="speed-group">{[1, 2, 5].map(n => <button key={n} aria-label={`Velocidade ${n} vezes`} aria-pressed={game.speed === n} data-testid={`game-speed-${n}x`} className={game.speed === n ? 'chosen' : ''} onClick={() => act('speed', { speed: n })}>{n}×</button>)}</div></div>
          <div className="option-line"><span>Operador · Nível {game.level}</span><strong data-testid="user-level-badge">{rank}</strong></div>
          <div className="option-line"><span>Experiência</span><span>{game.xp % 200}/200 XP</span></div>
          <div className="xp-track"><i style={{ width: `${game.xp % 200 / 2}%` }} /></div>
          <div className="option-line"><span>Condições</span><strong data-testid="current-conditions">{game.conditions?.weather_label || 'Céu limpo'} · {game.conditions?.traffic_label || 'Trânsito fluido'}{game.conditions?.night ? ' · Noite' : ''}{game.conditions?.roadworks ? ' · Obras' : ''}</strong></div>
          <div className="option-line"><span>Confiança pública</span><strong data-testid="city-trust" data-tone={game.trust >= 80 ? 'positive' : game.trust >= 50 ? 'warning' : 'negative'}>{game.trust}%</strong></div>
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
    <button data-testid="mobile-tab-dispatch" aria-expanded={panel === 'dispatch'} onClick={() => onPanelChange('dispatch')}><Crosshair size={17} /><span>Mobilização</span><small data-testid="snapshot-ready">{game.units.filter(u => u.status === 'available').length} disponíveis</small><ChevronRight size={14} /></button>
  </div>;
}
