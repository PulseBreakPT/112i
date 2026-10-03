import { Radio, Clock3, SlidersHorizontal, Plus, CheckCheck, X, MapPin, HeartPulse, Shield, GraduationCap, Coins, Star } from 'lucide-react';
import { useState } from 'react';
import { SERVICE, ServiceIcon, STATUS, duration, money } from './common';
import { useVirtualList } from './engines/virtualList';

export const IncidentPanel = ({ game, selected, onSelect, act, busy, onClose }) => {
  const [filter, setFilter] = useState('all');
  const [priorityFirst, setPriorityFirst] = useState(true);
  const list = game.incidents.filter(item => filter === 'all' || item.service === filter);
  const ordered = [...list].sort((a, b) => priorityFirst ? a.priority - b.priority || a.deadline - b.deadline : b.number - a.number);
  const virtual = useVirtualList(ordered.length);
  const waiting = game.incidents.filter(item => item.status === 'waiting').length;
  const atCapacity = game.incidents.length >= (game.progression?.mission_cap || 3);
  const canManuallySpawn = process.env.NODE_ENV !== 'production';

  return <section className="incident-panel" aria-label="Fila de ocorrências">
    <div className="panel-heading">
      <h2><Radio size={18} /> Ocorrências <span data-testid="incident-count" className="count-badge">{game.incidents.length}/{game.progression?.mission_cap || 3}</span></h2>
      <div className="panel-heading-actions">{onClose && <button className="icon-btn" aria-label="Recolher ocorrências" title="Recolher ocorrências" data-testid="close-incidents" onClick={onClose}><X size={18} /></button>}</div>
    </div>
    <div className="incident-tabs" aria-label="Filtrar por serviço">
      {[['all', 'Todas'], ['fire', 'Bombeiros'], ['medical', 'INEM'], ['police', 'PSP']].map(([key, name]) => <button key={key} data-service={key} data-testid={`filter-${key}`} aria-pressed={filter === key} onClick={() => setFilter(key)} className={filter === key ? 'selected' : ''}>{name}</button>)}
    </div>
    <div className="queue-label">
      <span className={`queue-pending ${waiting ? 'has-waiting' : ''}`} data-testid="waiting-count"><i />{waiting} {waiting === 1 ? 'pendente' : 'pendentes'}</span>
      <button className="queue-sort" title={priorityFirst ? 'Mudar para mais recentes' : 'Ordenar por prioridade'} aria-label="Ordenar por prioridade" aria-pressed={priorityFirst} data-testid="sort-priority" onClick={() => setPriorityFirst(value => !value)}><SlidersHorizontal size={13} />{priorityFirst ? 'Prioridade' : 'Mais recentes'}</button>
    </div>
    <div className="incidents-scroll" ref={virtual.containerRef} onScroll={virtual.onScroll}>
      {!!virtual.paddingTop && <div style={{ height: virtual.paddingTop, flex: '0 0 auto' }} />}
      {ordered.slice(virtual.start, virtual.end).map(inc => {
        const activeDeadline = inc.response_arrived_at ? (inc.resolution_deadline || inc.deadline) : (inc.response_deadline || inc.deadline);
        const remaining = activeDeadline - game.elapsed;
        return <button className={`incident-card ${selected === inc.id ? 'selected' : ''}`} key={inc.id} data-priority={inc.priority} data-testid={`incident-${inc.number}`} onClick={() => onSelect(inc.id)} style={{ '--service-color': SERVICE[inc.service].ink }}>
          <div className="incident-reward-primary" data-testid={`incident-reward-${inc.number}`}><span><Coins size={14} />{money(inc.reward)}</span><span><Star size={13} />{inc.xp} XP</span></div>
          <div className="incident-top">
            <span className={`priority p${inc.priority}`} data-testid={`priority-${inc.number}`}>P{inc.priority} · {inc.priority === 1 ? 'CRÍTICA' : inc.priority === 2 ? 'URGENTE' : 'MODERADA'}</span>
            <span className={`incident-timer ${remaining <= 60 ? 'critical' : remaining <= 120 ? 'warning' : ''}`} data-testid={`incident-timer-${inc.number}`} aria-label={`Tempo restante: ${duration(remaining)}`}><Clock3 size={13} />{duration(remaining)}</span>
          </div>
          <h3 data-testid={`incident-title-${inc.number}`}><span className="service-icon"><ServiceIcon service={inc.service} size={20} /></span>{inc.title}</h3>
          <p className="incident-address" data-testid={`incident-address-${inc.number}`}><MapPin size={13} />{inc.address}</p>
          <div className="incident-meta"><span className={`incident-state ${inc.status}`} data-testid={`incident-status-${inc.number}`}><i />{STATUS[inc.status] || inc.status}</span><span className="incident-number">#{inc.number}</span></div>
          <div className="incident-bottom">
            <div className="required-mini" aria-label="Meios necessários">{Object.entries(inc.needs).map(([service, count]) => <span key={service} title={`${count} ${SERVICE[service].name}`} style={{ '--chip-color': SERVICE[service].ink }}><ServiceIcon service={service} size={13} /><b>{count}</b><span>{service === 'fire' ? 'BOMB.' : SERVICE[service].short}</span></span>)}{!!inc.required_vehicle_types?.length && <span className="special-requirement" title="Requer veículo especializado">ESP</span>}{!!inc.required_trainings?.length && <span className="special-requirement" title="Requer formação especializada"><GraduationCap size={11} /> FOR</span>}{inc.escalated && <span className="special-requirement" title="Ocorrência agravada">AGR</span>}</div>
          </div>
          <div className="incident-secondary"><div className="incident-impact">{inc.rarity_label && <span className="rarity-badge" data-rarity={inc.rarity_level}>N{inc.rarity_level} · {inc.rarity_label}</span>}{inc.category_label && <span className="incident-category">{inc.category_label}</span>}<span>{inc.difficulty || 'Média'}</span><span>INTEL {Math.round(inc.intel_confidence||0)}%</span><span>LOCAL {Math.round(inc.location_confidence||0)}%</span>{inc.reconnaissance?.complete&&<span data-tone="active">RECON</span>}{inc.command_structure?.established&&<span data-tone="active">COS</span>}{inc.tactical_plan?.option&&<span>{String(inc.tactical_plan.option).toUpperCase()}</span>}{inc.operational_phases?.[inc.active_phase] && <span>{inc.operational_phases[inc.active_phase]}</span>}{inc.casualties > 0 && <span data-tone="warning"><HeartPulse size={12} />{inc.casualties} ferido{inc.casualties !== 1 ? 's' : ''}</span>}{inc.detainees > 0 && <span data-tone="active"><Shield size={12} />{inc.detainees} detido{inc.detainees !== 1 ? 's' : ''}</span>}{((inc.victim_states?.critical||0)+(inc.victim_states?.pcr||0))>0 && <span data-tone="warning"><HeartPulse size={12} />{(inc.victim_states?.critical||0)+(inc.victim_states?.pcr||0)} crítica(s)</span>}</div>{selected===inc.id&&inc.dispatch_explanation?.length>0&&<div className="dispatch-explanation-mini">{inc.dispatch_explanation.slice(0,2).map(item=><small key={item.unit_id}>{item.text}</small>)}</div>}</div>
        </button>;
      })}
      {!!virtual.paddingBottom && <div style={{ height: virtual.paddingBottom, flex: '0 0 auto' }} />}
      {!ordered.length && <div className="empty-state" data-testid="incidents-empty"><CheckCheck size={30} /><strong>{game.incidents.length ? 'Sem ocorrências deste serviço' : 'Sem ocorrências pendentes'}</strong><p>{game.incidents.length ? 'Seleciona Todas para consultar a fila completa.' : 'A central está pronta para a próxima chamada.'}</p></div>}
    </div>
    {canManuallySpawn && <button className="new-incident" data-testid="new-incident-button" disabled={busy || atCapacity} onClick={() => act('new_incident')}><Plus size={16} />{atCapacity ? 'Limite de ocorrências atingido' : 'Gerar ocorrência de teste'}</button>}
  </section>;
};
