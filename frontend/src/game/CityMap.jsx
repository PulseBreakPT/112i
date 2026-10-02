import { useRef, useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, Minus, LocateFixed, Layers3, Navigation, Sun, Radio, PhoneIncoming, ArrowUpRight, Building2 } from 'lucide-react';
import { SERVICE, ServiceIcon } from './common';
import { portugalShortTime, recordRealTime } from './engines/timeEngine';
import { IconButton } from './Shell';
import CityTerrain from './CityTerrain';
import { UrbanLife, AtmosphericWeather, useSceneActivity } from './CityAtmosphere';
export const CityMap = ({ world, game, selected, onSelect, onCall, focusKey, active = true }) => {
  const controls = useRef(null), container = useRef(null), previousSize = useRef(null);
  const [viewport, setViewport] = useState(null);
  const [layers, setLayers] = useState(false), [detailed, setDetailed] = useState(true), [labelsVisible, setLabelsVisible] = useState(true), [unitsVisible, setUnitsVisible] = useState(true);
  const sceneActive = useSceneActivity(active && !!game.speed);
  const call = game.incidents.find(i => !i.call_answered);
  const fit = viewport ? Math.min(viewport.width / world.width, viewport.height / world.height) : .2;
  const initialScale = Math.max(fit, Math.min(1.1, Math.max(.8, (viewport?.width || 0) / 1400)));
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setViewport({ width, height });
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const previous = previousSize.current;
    const state = controls.current?.instance.transformState;
    if (previous && viewport && state) {
      const scale = Math.max(fit, state.scale);
      const x = (previous.width / 2 - state.positionX) / state.scale;
      const y = (previous.height / 2 - state.positionY) / state.scale;
      controls.current.setTransform(viewport.width / 2 - x * scale, viewport.height / 2 - y * scale, scale, 0);
    }
    previousSize.current = viewport;
  }, [viewport, fit]);
  useEffect(() => {
    if (!focusKey || !selected || !controls.current || !viewport) return;
    const target = document.getElementById(`map-inc-${selected}`);
    if (!target) return;
    const { e: x, f: y } = target.transform.baseVal.consolidate().matrix;
    const scale = Math.max(fit, 1.25);
    controls.current.setTransform(viewport.width / 2 - x * scale, viewport.height / 2 - y * scale, scale, 450);
  }, [focusKey, selected, viewport, fit]);
  return <section ref={container} className="map-section" style={{ '--world-width': `${world.width}px`, '--world-height': `${world.height}px` }} data-testid="city-map">
    {viewport && <TransformWrapper ref={controls} initialScale={initialScale} initialPositionX={Math.min(0, viewport.width / 2 - 700 * initialScale)} initialPositionY={Math.min(0, viewport.height / 2 - 500 * initialScale)} minScale={fit} maxScale={2.8} limitToBounds centerZoomedOut wheel={{ step: .12 }} doubleClick={{ disabled: true }} panning={{ excluded: ['map-clickable'] }}>
      <TransformComponent wrapperClass="map-transform" contentClass="map-content"><svg className="city-svg" viewBox={`0 0 ${world.width} ${world.height}`} role="img" aria-label="Mapa de Porto d'Ouro com ruas, estradas, bases e ocorrências" data-testid="city-map-svg">
        <CityTerrain world={world} detailed={detailed} labelsVisible={labelsVisible} />
        <UrbanLife world={world} active={sceneActive} />
        <AtmosphericWeather world={world} active={sceneActive} />
        {game.units.filter(u => u.status === 'enroute').map(u => <polyline key={`route-${u.id}`} points={u.route.map(p => p.join(',')).join(' ')} fill="none" stroke={SERVICE[u.service].color} strokeWidth="3" strokeDasharray="6 5" opacity={u.incident_id === selected ? '.85' : '.3'} className={game.speed ? 'route-line' : ''} />)}
        {game.bases.map(b => <g key={b.id} className="map-base" transform={`translate(${b.x},${b.y})`} data-testid={`map-base-${b.service}-${b.id}`}><title>{b.name}</title><rect x="-15" y="-15" width="30" height="30" rx="6" fill="#181818" stroke={SERVICE[b.service].color} strokeWidth=".8" /><rect x="-12" y="-12" width="24" height="24" rx="4" fill={SERVICE[b.service].color} opacity=".07" /><Building2 x="-8" y="-8" width="16" height="16" color={SERVICE[b.service].color} strokeWidth="1.3" /><text y="27" textAnchor="middle" fill={SERVICE[b.service].color} fontSize="6.5" fontFamily="IBM Plex Mono" letterSpacing=".6">{SERVICE[b.service].short}</text></g>)}
        {game.incidents.map(inc => <g key={inc.id} id={`map-inc-${inc.id}`} data-testid={`map-incident-${inc.number}`} role="button" aria-label={inc.title} tabIndex="0" className="map-clickable" onClick={() => onSelect(inc.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(inc.id); } }} transform={`translate(${inc.x},${inc.y})`}>
          <circle r="29" fill="transparent" />
          {selected === inc.id && <g className={game.speed ? 'marker-orbit' : ''}><circle r="31" fill="none" stroke={SERVICE[inc.service].color} strokeWidth=".6" opacity=".4" /><path d="M-36 0h5M31 0h5M0-36v5M0 31v5" stroke={SERVICE[inc.service].color} strokeWidth="1" opacity=".65" /></g>}
          <g className="pin-shadow"><circle className="incident-core" r="19" fill="#171717" stroke={SERVICE[inc.service].color} strokeWidth="1.5" /><circle r="15.5" fill={SERVICE[inc.service].color} opacity=".13" /><ServiceIcon service={inc.service} x="-9" y="-9" width="18" height="18" color={SERVICE[inc.service].color} strokeWidth="1.8" /></g>
          <circle cx="14" cy="-14" r="3.5" fill={inc.priority === 1 ? '#f38989' : inc.priority === 2 ? '#edbb69' : '#83b3f5'} stroke="#171717" strokeWidth="1.5" />
          <text className="pin-caption" y="33" textAnchor="middle" fill="#e0e0e0" fontSize="9">{`#${inc.number}`}</text>
        </g>)}
        {unitsVisible && game.units.filter(u => u.status !== 'available').map(u => <g key={u.id} data-testid={`moving-unit-${u.name}`} className="moving-unit" style={{ transform: `translate(${u.x}px, ${u.y}px)`, transitionDuration: game.speed ? '1.8s' : '0s' }}><title>{u.name}</title><rect x="-11" y="-8" width="22" height="16" rx="4" fill="#171717" stroke={SERVICE[u.service].color} strokeWidth="2" /><path d="M-4 -3L4 0L-4 3Z" fill={SERVICE[u.service].color} /><circle cx="9" cy="-7" r="3" fill={SERVICE[u.service].color} /></g>)}
      </svg></TransformComponent>
    </TransformWrapper>}
    <div className="map-title"><div className="map-live"><span className="live-dot" /> VISÃO TÁTICA · EM DIRETO</div><h1 data-testid="map-city-title">Porto d'Ouro<span>PT</span></h1><p><Sun size={14} />24°C <span>·</span> Céu limpo <span>·</span> Vento 12 km/h</p><div className="map-district-code">SETOR METROPOLITANO / 01</div></div>
    <div className="map-layer-wrap"><button data-testid="map-layers-button" className={`map-layer-button ${layers ? 'active' : ''}`} aria-label="Camadas do mapa" aria-expanded={layers} onClick={() => setLayers(!layers)}><Layers3 size={16} /> Camadas</button>{layers && <div className="layer-menu" data-testid="map-layers-menu">{[['Edifícios', detailed, setDetailed], ['Topónimos', labelsVisible, setLabelsVisible], ['Unidades', unitsVisible, setUnitsVisible]].map(([name, value, setter]) => <label key={name}><input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} data-testid={`layer-${name.toLowerCase()}`} />{name}</label>)}<div className="layer-service-key">{Object.entries(SERVICE).map(([key, service]) => <span key={key}><ServiceIcon service={key} size={13} color={service.color} />{service.short}</span>)}</div></div>}</div>
    <div className="map-compass"><Navigation size={22} /><span>N</span></div>
    <div className="map-zoom"><IconButton icon={Plus} label="Aproximar mapa" testId="map-zoom-in" onClick={() => controls.current?.zoomIn()} /><IconButton icon={Minus} label="Afastar mapa" testId="map-zoom-out" onClick={() => controls.current?.zoomOut()} /><span /><IconButton icon={LocateFixed} label="Ver cidade inteira" testId="map-reset" onClick={() => controls.current?.centerView(fit, 450)} /></div>
    <div className="map-legend" aria-label="Legenda dos serviços">{Object.entries(SERVICE).map(([k, s]) => <span key={k}><ServiceIcon service={k} color={s.color} size={13} />{s.name === 'Emergência médica' ? 'INEM' : s.name}</span>)}<span><i className="base-dot" />Bases</span></div>
        <div className="map-bottom"><div className="radio-feed"><div className="radio-feed-heading"><Radio size={14} /><strong>REDE RÁDIO</strong><span className="radio-bars"><i /><i /><i /><i /></span><span>CANAL 01</span></div>{game.logs.slice(0, 2).map(l => <div key={l.id} className="radio-log" data-testid={`radio-log-${l.id}`}><time>{portugalShortTime(recordRealTime(l, game))}</time><span className={l.kind}>{l.text}</span></div>)}</div>{call && <button className="incoming-call" data-testid="incoming-call-button" onClick={() => onCall(call.id)}><span className="incoming-icon"><PhoneIncoming size={20} /></span><span><small>LINHA 112 · CHAMADA EM ESPERA</small><strong>Atender 112</strong></span><ArrowUpRight size={19} /></button>}</div>
    {!game.speed && <div className="paused-label" data-testid="game-paused-indicator">SIMULAÇÃO EM PAUSA</div>}
  </section>;
};