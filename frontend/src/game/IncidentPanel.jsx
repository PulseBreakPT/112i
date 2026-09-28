import { Radio, Clock3, ChevronRight, SlidersHorizontal, Plus, CheckCheck, PhoneIncoming, MapPin } from 'lucide-react';
import { useState } from 'react';
import { SERVICE, ServiceIcon, STATUS, duration, money } from './common';
export const IncidentPanel = ({ game, selected, onSelect, onCall, act, busy }) => {
  const [filter, setFilter] = useState('all');
  const list = game.incidents.filter(i => filter === 'all' || i.service === filter);
  return <section className="incident-panel">
    <div className="panel-heading"><h2><Radio size={17} /> Ocorrências <span data-testid="incident-count" className="count-badge">{game.incidents.length}</span></h2><button className="icon-btn" title="Ordenar por prioridade" aria-label="Ordenar por prioridade" data-testid="sort-priority" onClick={() => setFilter(filter === 'priority' ? 'all' : 'priority')}><SlidersHorizontal size={15} /></button></div>
    <div className="incident-tabs">{[['all', 'Todas'], ['fire', 'Bombeiros'], ['medical', 'INEM'], ['police', 'PSP']].map(([key, name]) => <button key={key} data-testid={`filter-${key}`} onClick={() => setFilter(key)} className={filter === key ? 'selected' : ''}>{name}</button>)}</div>
    <div className="queue-label"><span>FILA DE DESPACHO</span><span data-testid="waiting-count">{game.incidents.filter(i => i.status === 'waiting').length} pendentes</span></div>
    <div className="incidents-scroll">{(filter === 'priority' ? [...game.incidents].sort((a, b) => a.priority - b.priority) : list).map(inc => <button className={`incident-card ${selected === inc.id ? 'selected' : ''}`} key={inc.id} data-testid={`incident-${inc.number}`} onClick={() => onSelect(inc.id)} style={{ '--service-color': SERVICE[inc.service].color }}>
      <div className="incident-top"><span className={`priority p${inc.priority}`} data-testid={`priority-${inc.number}`}>P{inc.priority} · {inc.priority === 1 ? 'CRÍTICA' : inc.priority === 2 ? 'URGENTE' : 'MODERADA'}</span><span className="incident-number">#{inc.number}</span></div>
      <h3 data-testid={`incident-title-${inc.number}`}><span className="service-icon"><ServiceIcon service={inc.service} size={18} /></span>{inc.title}</h3>
      <p className="incident-address" data-testid={`incident-address-${inc.number}`}><MapPin size={12} />{inc.address}</p>
      <div className="incident-meta"><span className={`incident-state ${inc.status}`} data-testid={`incident-status-${inc.number}`}><i />{STATUS[inc.status]}</span><span data-testid={`incident-timer-${inc.number}`}><Clock3 size={12} />{duration(inc.deadline - game.elapsed)}</span></div>
      <div className="incident-bottom"><div className="required-mini">{Object.entries(inc.needs).map(([s, n]) => <span key={s} style={{ color: SERVICE[s].color }}><ServiceIcon service={s} size={13} />{n}</span>)}</div><span>{money(inc.reward)} <ChevronRight size={13} /></span></div>
    </button>)}{!list.length && filter !== 'priority' && <div className="empty-state" data-testid="incidents-empty"><CheckCheck size={30} /><strong>Setor tranquilo</strong><p>Sem ocorrências neste momento.</p></div>}</div>
    <button className="new-incident" data-testid="new-incident-button" disabled={busy || game.incidents.length >= 7} onClick={() => act('new_incident')}><Plus size={15} /> Receber ocorrência</button>
    <div className="shift-summary"><span><CheckCheck size={16} /> ESTE TURNO</span><div><strong data-testid="shift-completed">{game.completed}<small>resolvidas</small></strong><strong className="earnings" data-testid="shift-earnings">+{money(game.earned)}<small>receitas</small></strong></div></div>
  </section>;
};