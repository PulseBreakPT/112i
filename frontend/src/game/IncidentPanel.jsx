import { Radio, Clock3, ChevronRight, SlidersHorizontal, Plus, CheckCheck, X, MapPin, HeartPulse, Shield, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { SERVICE, ServiceIcon, STATUS, duration, money } from './common';

export const IncidentPanel = ({ game, selected, onSelect, act, busy, onClose }) => {
  const [filter, setFilter] = useState('all');
  const [priorityFirst, setPriorityFirst] = useState(true);
  const list = game.incidents.filter(item => filter === 'all' || item.service === filter);
  const ordered = [...list].sort((a, b) => priorityFirst ? a.priority - b.priority || a.deadline - b.deadline : b.number - a.number);
  const waiting = game.incidents.filter(item => item.status === 'waiting').length;
  const atCapacity = game.incidents.length >= (game.progression?.mission_cap || 3);

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
    <div className="incidents-scroll">
      {ordered.map(inc => {
        const remaining = inc.deadline - game.elapsed;
        return <button className={`incident-card ${selected === inc.id ? 'selected' : ''}`} key={inc.id} data-priority={inc.priority} data-testid={`incident-${inc.number}`} onClick={() => onSelect(inc.id)} style={{ '--service-color': SERVICE[inc.service].color }}>
          <div className="incident-top">
            <span className={`priority p${inc.priority}`} data-testid={`priority-${inc.number}`}>P{inc.priority} · {inc.priority === 1 ? 'CRÍTICA' : inc.priority === 2 ? 'URGENTE' : 'MODERADA'}</span>
            <span className={`incident-timer ${remaining <= 60 ? 'critical' : remaining <= 120 ? 'warning' : ''}`} data-testid={`incident-timer-${inc.number}`} aria-label={`Tempo restante: ${duration(remaining)}`}><Clock3 size={13} />{duration(remaining)}</span>
          </div>
          <h3 data-testid={`incident-title-${inc.number}`}><span className="service-icon"><ServiceIcon service={inc.service} size={20} /></span>{inc.title}</h3>
          <p className="incident-address" data-testid={`incident-address-${inc.number}`}><MapPin size={13} />{inc.address}</p>
          <div className="incident-meta"><span className={`incident-state ${inc.status}`} data-testid={`incident-status-${inc.number}`}><i />{STATUS[inc.status] || inc.status}</span><span className="incident-number">#{inc.number}</span></div>
          <div className="incident-bottom">
            <div className="required-mini" aria-label="Meios necessários">{Object.entries(inc.needs).map(([service, count]) => <span key={service} title={`${count} ${SERVICE[service].name}`} style={{ '--chip-color': SERVICE[service].color }}><ServiceIcon service={service} size={13} /><b>{count}</b><span>{service === 'fire' ? 'BOMB.' : SERVICE[service].short}</span></span>)}{!!inc.required_vehicle_types?.length && <span className="special-requirement" title="Requer veículo especializado">ESP</span>}{!!inc.required_trainings?.length && <span className="special-requirement" title="Requer formação especializada"><GraduationCap size={11} /> FOR</span>}{inc.escalated && <span className="special-requirement" title="Ocorrência agravada">AGR</span>}</div>
          </div>
          <div className="incident-secondary"><div className="incident-impact"><span>{inc.difficulty || 'Média'}</span>{inc.casualties > 0 && <span data-tone="warning"><HeartPulse size={12} />{inc.casualties} ferido{inc.casualties !== 1 ? 's' : ''}</span>}{inc.detainees > 0 && <span data-tone="active"><Shield size={12} />{inc.detainees} detido{inc.detainees !== 1 ? 's' : ''}</span>}</div><span className="incident-reward">{money(inc.reward)}<ChevronRight size={14} /></span></div>
        </button>;
      })}
      {!ordered.length && <div className="empty-state" data-testid="incidents-empty"><CheckCheck size={30} /><strong>{game.incidents.length ? 'Sem ocorrências deste serviço' : 'Sem ocorrências pendentes'}</strong><p>{game.incidents.length ? 'Seleciona Todas para consultar a fila completa.' : 'A central está pronta para a próxima chamada.'}</p></div>}
    </div>
    <button className="new-incident" data-testid="new-incident-button" disabled={busy || atCapacity} onClick={() => act('new_incident')}><Plus size={16} />{atCapacity ? 'Limite de ocorrências atingido' : 'Receber ocorrência'}</button>
    <details className="shift-overview" data-testid="shift-overview"><summary><CheckCheck size={13} /><span>Resumo do turno</span><ChevronRight size={13} /></summary><div className="shift-summary"><div><strong data-testid="shift-completed">{game.completed}<small>resolvidas</small></strong><strong className="earnings" data-testid="shift-earnings">+{money(game.earned)}<small>receitas</small></strong></div></div></details>
  </section>;
};
