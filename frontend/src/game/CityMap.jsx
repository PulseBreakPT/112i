import { memo, useRef, useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, Minus, LocateFixed, Layers3, Navigation, Sun, Radio, PhoneIncoming, ArrowUpRight, Building2 } from 'lucide-react';
import { SERVICE, ServiceIcon, clock } from './common';
import { IconButton } from './Shell';
const riverY = x => 790 - x * .23 + 58 * Math.sin(x / 185);
const riverPoints = Array.from({ length: 77 }, (_, i) => [-70 + i * 20, riverY(-70 + i * 20)]);
const riverPath = riverPoints.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
const terrain = [];
for (let r = 0; r < 12; r++) for (let c = 0; c < 17; c++) {
  const x = 60 + c * 80, y = 55 + r * 80;
  if (Math.abs(y + 40 - riverY(x + 40)) < 92) continue;
  const park = (c >= 1 && c <= 3 && r >= 1 && r <= 2) || (c >= 10 && c <= 12 && r >= 6 && r <= 7) || (c === 7 && r < 3);
  if (park) {
    terrain.push(<g key={`park-${c}-${r}`}><rect x={x + 8} y={y + 8} width="64" height="64" rx="6" fill="#20352b" stroke="#2a4031" /><path d={`M${x + 15} ${y + 62}L${x + 64} ${y + 18}`} stroke="#40503d" strokeWidth="2" />{Array.from({ length: 9 }, (_, j) => <circle key={j} cx={x + 17 + (j % 3) * 20} cy={y + 17 + Math.floor(j / 3) * 21} r={5 + (j + c) % 3} fill={j % 2 ? '#2c4533' : '#294332'} stroke="#334d39" />)}</g>);
  } else if (c > 11 && r < 5) {
    terrain.push(<g key={`warehouse-${c}-${r}`}><rect x={x + 14} y={y + 16} width="50" height="45" fill="#27312f" stroke="#37433e" /><rect x={x + 20} y={y + 20} width="38" height="36" fill="#2b3632" />{[0, 1, 2, 3].map(j => <line key={j} x1={x + 22} y1={y + 24 + j * 8} x2={x + 56} y2={y + 24 + j * 8} stroke="#35423b" />)}<path d={`M${x + 16} ${y + 66}h46`} stroke="#465044" strokeDasharray="3 3" /></g>);
  } else {
    for (let b = 0; b < 6; b++) {
      const bx = x + 12 + b % 3 * 22, by = y + 12 + Math.floor(b / 3) * 33;
      terrain.push(<g key={`${c}-${r}-${b}`}><rect x={bx + 2} y={by + 3} width={15 + (c + b) % 5} height={22 + (r + b) % 5} fill="#111e1d" /><rect x={bx} y={by} width={15 + (c + b) % 5} height={22 + (r + b) % 5} rx="1" fill={['#25312e', '#273430', '#2b3631', '#23302c'][(r + c + b) % 4]} stroke="#35403a" strokeWidth=".65" /><rect x={bx + 3} y={by + 4} width="8" height="5" fill="#2f3c35" /></g>);
    }
  }
}
const labels = [{ x: 238, y: 306, title: 'SÃO VICENTE' }, { x: 513, y: 396, title: 'BAIXA' }, { x: 820, y: 177, title: 'MONTE BELO' }, { x: 840, y: 411, title: 'SANTA CLARA' }, { x: 1164, y: 198, title: 'PARQUE INDUSTRIAL' }, { x: 514, y: 910, title: 'MARGEM SUL' }, { x: 1140, y: 771, title: 'PORTO COMERCIAL' }];
const MapGround = memo(({ world, detailed, labelsVisible }) => <g>
  <defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#294039" strokeWidth=".5" opacity=".22" /></pattern><pattern id="water-lines" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#397275" strokeWidth=".5" opacity=".18" /></pattern></defs>
  <rect width="1400" height="1000" fill="#182723" /><rect width="1400" height="1000" fill="url(#map-grid)" />
  <path d={riverPath} fill="none" stroke="#293e35" strokeWidth="122" /><path d={riverPath} fill="none" stroke="#2a5350" strokeWidth="101" /><path d={riverPath} fill="none" stroke="#153d41" strokeWidth="94" /><path d={riverPath} fill="none" stroke="#1b4b4c" strokeWidth="69" opacity=".4" />
  {detailed && terrain}
  {world.roads.map((road, i) => <g key={i}><line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke={road.bridge ? '#738479' : road.major ? '#535548' : '#3a4640'} strokeWidth={road.major ? 12 : 7} /><line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke={road.bridge ? '#3b4540' : road.major ? '#373d32' : '#242f2b'} strokeWidth={road.major ? 9 : 5} />{road.major && <line x1={road.a.x} y1={road.a.y} x2={road.b.x} y2={road.b.y} stroke="#7a7859" opacity=".5" strokeWidth=".8" strokeDasharray="5 7" />}</g>)}
  <g fill="none" stroke="#5a6048" strokeWidth="3"><path d="M-30 95Q190 14 420 20T950 50T1490 2" /><path d="M-30 106Q190 25 420 31T950 61T1490 13" /></g>
  <g fill="#202e28" stroke="#6b7359"><rect x="938" y="50" width="26" height="17" rx="3" /><rect x="768" y="783" width="28" height="18" rx="3" /></g><g fontFamily="IBM Plex Mono" fill="#b7ba9b" fontSize="10" textAnchor="middle"><text x="951" y="62">A12</text><text x="782" y="796">N112</text></g>
  {labelsVisible && <g className="map-labels">{labels.map(l => <text key={l.title} x={l.x} y={l.y} textAnchor="middle" fill="#97a79b" fontSize="14" fontWeight="600">{l.title}</text>)}<text x="596" y="754" transform="rotate(-19 596 754)" fill="#71a19f" fontSize="18" fontStyle="italic" fontFamily="Georgia">Rio Douro</text><text x="850" y="288" textAnchor="middle" fill="#829084" fontSize="9">Av. dos Descobrimentos</text><text x="399" y="530" textAnchor="middle" fill="#829084" fontSize="9">Avenida da República</text><text x="259" y="225" textAnchor="middle" fill="#7f9875" fontSize="10">Jardim de São Vicente</text><text x="978" y="646" textAnchor="middle" fill="#7f9875" fontSize="10">Parque Florestal</text></g>}
</g>);
export const CityMap = ({ world, game, selected, onSelect, onCall, focusKey }) => {
  const controls = useRef(null), [layers, setLayers] = useState(false), [detailed, setDetailed] = useState(true), [labelsVisible, setLabelsVisible] = useState(true), [unitsVisible, setUnitsVisible] = useState(true);
  const call = game.incidents.find(i => !i.call_answered);
  useEffect(() => { if (focusKey && selected) controls.current?.zoomToElement(`map-inc-${selected}`, 1.6, 500); }, [focusKey, selected]);
  return <section className="map-section" data-testid="city-map">
    <TransformWrapper ref={controls} initialScale={1} minScale={1} maxScale={3} limitToBounds centerOnInit wheel={{ step: .15 }} doubleClick={{ disabled: true }} panning={{ excluded: ['map-clickable'] }}>
      <TransformComponent wrapperClass="map-transform" contentClass="map-content"><svg className="city-svg" viewBox="0 0 1400 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa de Porto d'Ouro com ruas, estradas, bases e ocorrências" data-testid="city-map-svg">
        <MapGround world={world} detailed={detailed} labelsVisible={labelsVisible} />
        {game.units.filter(u => u.status === 'enroute').map(u => <polyline key={`route-${u.id}`} points={u.route.map(p => p.join(',')).join(' ')} fill="none" stroke={SERVICE[u.service].color} strokeWidth="3" strokeDasharray="6 5" opacity={u.incident_id === selected ? '.85' : '.3'} className={game.speed ? 'route-line' : ''} />)}
        {game.bases.map(b => <g key={b.id} className="map-base" transform={`translate(${b.x},${b.y})`} data-testid={`map-base-${b.service}-${b.id}`}><title>{b.name}</title><rect x="-19" y="-19" width="38" height="38" rx="5" fill="#152322" stroke={SERVICE[b.service].color} strokeWidth="1.5" /><Building2 x="-10" y="-10" width="20" height="20" color={SERVICE[b.service].color} /><rect x="-16" y="23" width="32" height="13" rx="2" fill="#152322" /><text y="32" textAnchor="middle" fill={SERVICE[b.service].color} fontSize="8" fontFamily="IBM Plex Mono">{SERVICE[b.service].short}</text></g>)}
        {game.incidents.map(inc => <g key={inc.id} id={`map-inc-${inc.id}`} data-testid={`map-incident-${inc.number}`} role="button" aria-label={inc.title} tabIndex="0" className="map-clickable" onClick={() => onSelect(inc.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(inc.id); } }} transform={`translate(${inc.x},${inc.y})`}>
          {selected === inc.id && <><circle r="48" fill={SERVICE[inc.service].color} opacity=".06" /><circle r="39" fill="none" stroke={SERVICE[inc.service].color} opacity=".25" /><circle r="30" fill="none" stroke={SERVICE[inc.service].color} opacity=".4" className={game.speed ? 'incident-pulse' : ''} /></>}
          <circle r="21" fill={SERVICE[inc.service].color} stroke="#172321" strokeWidth="4" /><ServiceIcon service={inc.service} x="-10" y="-10" width="20" height="20" color="#172321" strokeWidth="2.4" />
          <rect x="-26" y="29" width="52" height="20" rx="3" fill="#13231f" stroke={selected === inc.id ? SERVICE[inc.service].color : '#3c4940'} strokeWidth=".7" /><text y="42" textAnchor="middle" fill="#d0d9cc" fontSize="11" fontFamily="IBM Plex Mono">#{inc.number}</text>
        </g>)}
        {unitsVisible && game.units.filter(u => u.status !== 'available').map(u => <g key={u.id} data-testid={`moving-unit-${u.name}`} className="moving-unit" style={{ transform: `translate(${u.x}px, ${u.y}px)`, transitionDuration: game.speed ? '1.8s' : '0s' }}><title>{u.name}</title><rect x="-11" y="-8" width="22" height="16" rx="4" fill="#172321" stroke={SERVICE[u.service].color} strokeWidth="2" /><path d="M-4 -3L4 0L-4 3Z" fill={SERVICE[u.service].color} /><circle cx="9" cy="-7" r="3" fill={SERVICE[u.service].color} /></g>)}
      </svg></TransformComponent>
    </TransformWrapper>
    <div className="map-title"><div className="map-live"><span className="live-dot" /> MONITORIZAÇÃO EM TEMPO REAL</div><h1 data-testid="map-city-title">Porto d'Ouro<span>PT</span></h1><p><Sun size={14} />24°C <span>·</span> Céu limpo <span>·</span> Vento 12 km/h</p></div>
    <div className="map-layer-wrap"><button data-testid="map-layers-button" className={`map-layer-button ${layers ? 'active' : ''}`} onClick={() => setLayers(!layers)}><Layers3 size={16} /> Camadas</button>{layers && <div className="layer-menu" data-testid="map-layers-menu">{[['Edifícios', detailed, setDetailed], ['Topónimos', labelsVisible, setLabelsVisible], ['Unidades', unitsVisible, setUnitsVisible]].map(([name, value, setter]) => <label key={name}><input type="checkbox" checked={value} onChange={e => setter(e.target.checked)} data-testid={`layer-${name.toLowerCase()}`} />{name}</label>)}</div>}</div>
    <div className="map-compass"><Navigation size={22} /><span>N</span></div>
    <div className="map-zoom"><IconButton icon={Plus} label="Aproximar mapa" testId="map-zoom-in" onClick={() => controls.current?.zoomIn()} /><IconButton icon={Minus} label="Afastar mapa" testId="map-zoom-out" onClick={() => controls.current?.zoomOut()} /><span /><IconButton icon={LocateFixed} label="Centrar mapa" testId="map-reset" onClick={() => controls.current?.resetTransform()} /></div>
    <div className="map-legend">{Object.entries(SERVICE).map(([k, s]) => <span key={k}><i style={{ background: s.color }} />{s.name === 'Emergência médica' ? 'INEM' : s.name}</span>)}<span><i className="base-dot" />Bases</span></div>
    <div className="map-scale"><span />200 m</div>
    <div className="map-bottom"><div className="radio-feed"><div className="radio-feed-heading"><Radio size={14} /><strong>REDE RÁDIO</strong><span className="radio-bars"><i /><i /><i /><i /></span><span>CANAL 01</span></div>{game.logs.slice(0, 2).map(l => <div key={l.id} className="radio-log" data-testid={`radio-log-${l.id}`}><time>{clock(l.time).slice(0, 5)}</time><span className={l.kind}>{l.text}</span></div>)}</div>{call && <button className="incoming-call" data-testid="incoming-call-button" onClick={() => onCall(call.id)}><span className="incoming-icon"><PhoneIncoming size={20} /></span><span><small>LINHA 112 · CHAMADA EM ESPERA</small><strong>Há alguém que precisa de ti.</strong></span><ArrowUpRight size={19} /></button>}</div>
    {!game.speed && <div className="paused-label" data-testid="game-paused-indicator">SIMULAÇÃO EM PAUSA</div>}
  </section>;
};