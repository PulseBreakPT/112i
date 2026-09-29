import { useEffect, useRef, useState } from 'react';
import { fetchRoadRoute } from './localGame';
import { ArrowUpRight, Check, MapPin, Radio, Send, PhoneIncoming, Crosshair, X, ClipboardList, HeartPulse, Shield, Gauge, Clock3, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SERVICE, ServiceIcon, STATUS, money, duration } from './common';
import { operationalText } from './operationalLanguage';
export const DispatchPanel = ({ game, world, incident, act, busy, onCall, onFocus, onClose }) => {
  const [picked, setPicked] = useState([]);
  const [estimates, setEstimates] = useState({}), [estimating, setEstimating] = useState(false);
  const estimateRequest = useRef(0);
  useEffect(() => { setPicked([]); setEstimates({}); setEstimating(false); estimateRequest.current += 1; }, [incident?.id]);
  useEffect(() => setPicked(p => p.filter(id => game.units.some(u => u.id === id && ['available','patrol'].includes(u.status)))), [game.units]);
  const available = game.units.filter(u => ['available','patrol'].includes(u.status)).sort((a, b) => Number(Boolean(incident?.needs[b.service]) && b.land === incident?.land) - Number(Boolean(incident?.needs[a.service]) && a.land === incident?.land));
  const assigned = game.units.filter(u => u.incident_id === incident?.id);
  const needed = s => Math.max(0, (incident?.needs[s] || 0) - assigned.filter(u => u.service === s).length);
  const send = async () => { const routes=Object.fromEntries(picked.filter(id=>estimates[game.units.find(unit=>unit.id===id)?.node]).map(id=>[id,estimates[game.units.find(unit=>unit.id===id)?.node]]));const result = await act('dispatch', { incident_id: incident.id, unit_ids: picked, routes }); if (result) setPicked([]); };
  const estimateRoutes = async () => {
    const request = ++estimateRequest.current;
    setEstimating(true);
    const origins = [...new Set(available.filter(u => needed(u.service) && u.land === incident.land).map(u => u.node))];
    const routes = await Promise.all(origins.map(async node => {
      try { return [node, await fetchRoadRoute(node, incident.node, game.conditions)]; }
      catch (error) { return [node, { error: operationalText(error?.message || 'Estimativa indisponível. Tenta novamente.') }]; }
    }));
    if (request === estimateRequest.current) {
      setEstimates(Object.fromEntries(routes));
      setEstimating(false);
    }
  };
  return <aside className="dispatch-panel">
    <div className="panel-heading"><h2><Crosshair size={17} /> Mobilização</h2><div className="panel-heading-actions"><span className="subtle">{incident ? `#${incident.number}` : '—'}</span>{onClose && <button className="icon-btn" aria-label="Recolher painel de mobilização" title="Recolher painel de mobilização" data-testid="close-dispatch" onClick={onClose}><X size={17} /></button>}</div></div>
    {!incident ? <div className="empty-state" data-testid="dispatch-empty"><Radio size={35} /><strong>Central em escuta</strong><p>Nenhuma ocorrência selecionada.</p></div> : <>
      <div className="dispatch-content">
        <div className="dispatch-detail">
          <div className="detail-eyebrow"><span className={`priority p${incident.priority}`}>P{incident.priority} · {incident.priority === 1 ? 'CRÍTICA' : incident.priority === 2 ? 'URGENTE' : 'MODERADA'}</span><span className="service-tag" style={{ '--chip-color': SERVICE[incident.service].color }}><ServiceIcon service={incident.service} size={13} />{SERVICE[incident.service].short}</span></div>
          <h2 data-testid="selected-incident-title">{incident.title}</h2>
          <button className="location-link" data-testid="focus-incident" onClick={onFocus}><MapPin size={14} /><span>{incident.address || incident.district}</span><ArrowUpRight size={14} /></button>
          <div className="dispatch-situation"><span className={`incident-state ${incident.status}`}><i />{STATUS[incident.status] || incident.status}</span><span className={`dispatch-deadline ${incident.deadline - game.elapsed <= 60 ? 'critical' : incident.deadline - game.elapsed <= 120 ? 'warning' : ''}`}><small>Tempo restante</small><b data-testid="dispatch-deadline"><Clock3 size={14} />{duration(incident.deadline - game.elapsed)}</b></span></div>
          {(incident.casualties > 0 || incident.detainees > 0) && <div className="mission-facts dispatch-impact">{incident.casualties > 0 && <span data-tone="warning"><HeartPulse size={13} />{incident.casualties} ferido{incident.casualties !== 1 ? 's' : ''}</span>}{incident.detainees > 0 && <span data-tone="active"><Shield size={13} />{incident.detainees} detido{incident.detainees !== 1 ? 's' : ''}</span>}</div>}
          {!incident.call_answered && <button data-testid="call-112-answer-button" className="call-mini" onClick={() => onCall(incident.id)}><PhoneIncoming size={17} /><span>Atender chamada 112<small>Recolher informação do local</small></span><ArrowUpRight size={16} /></button>}
        </div>
        <div className="requirements"><h3>Meios necessários</h3><div>{Object.entries(incident.needs).map(([s, n]) => <span key={s} className={!needed(s) ? 'requirement-ready' : ''} style={{ '--service-color': SERVICE[s].color }} data-testid={`requirement-${s}`}><ServiceIcon service={s} size={16} /><b>{assigned.filter(u => u.service === s).length}/{n}</b> {SERVICE[s].short}{!needed(s) && <Check size={13} />}</span>)}</div></div>
      {!!incident.required_vehicle_types?.length && <div className="specialized-requirements"><h3>VIATURAS OBRIGATÓRIAS</h3><div>{incident.required_vehicle_types.map(type => {const vehicle=Object.values(world.vehicle_catalog).flat().find(item => item.id === type);const present=assigned.some(unit => unit.vehicle_type === type);return <span className={present ? 'ready' : ''} key={type}>{vehicle?.name || type}{present && <Check size={11} />}</span>;})}</div></div>}
      {assigned.length > 0 && <div className="assigned-units"><h3>MEIOS MOBILIZADOS</h3>{assigned.map(u => <div key={u.id} data-testid={`assigned-${u.name}`}><ServiceIcon service={u.service} size={15} color={SERVICE[u.service].color} /><b>{u.name}</b><span className="route-distance">{(u.route_distance / 1000).toFixed(1)} km</span><span className={`state-label ${u.status}`}>{['enroute', 'returning'].includes(u.status) ? `${duration(u.travel_total - u.travel)} · ${STATUS[u.status]}` : STATUS[u.status] || 'Estado indisponível'}</span></div>)}{incident.status === 'onscene' && <div className="resolution-progress" data-testid="resolution-progress"><i style={{ width: `${incident.progress}%` }} /></div>}</div>}
      <div className="units-heading"><h3>Seleciona os meios</h3><span data-testid="available-unit-count">{available.length} disponíveis</span></div>
      <button className="route-estimate-action" data-testid="estimate-routes-button" disabled={estimating || !available.some(u => needed(u.service) && u.land === incident.land)} onClick={estimateRoutes}><MapPin size={14} />{estimating ? 'A calcular percursos…' : 'Estimar tempos de chegada'}<ArrowUpRight size={14} /></button>
      {Object.values(estimates).some(route => route.error) && <p className="route-estimate-note route-estimate-error" role="alert">{Object.values(estimates).find(route => route.error).error}</p>}
      <div className="units-scroll">{available.map(u => {
        const selected = picked.includes(u.id);
        const full = picked.filter(id => game.units.find(v => v.id === id)?.service === u.service).length >= needed(u.service);
        const disconnected = u.land !== incident.land;
        const disabled = disconnected || (!selected && (full || !needed(u.service)));
        const state = disconnected ? 'Sem ligação' : selected ? 'Selecionada' : !incident.needs[u.service] ? 'Não necessária' : !needed(u.service) || full ? 'Meios suficientes' : u.status === 'patrol' ? 'Em patrulha' : 'Disponível';
        return <button key={u.id} data-testid={`select-unit-${u.name}`} disabled={disabled} aria-pressed={selected} className={`unit-choice ${selected ? 'selected' : ''}`} onClick={() => setPicked(p => selected ? p.filter(id => id !== u.id) : [...p, u.id])}>
          <span className="unit-icon" style={{ color: SERVICE[u.service].color }}><ServiceIcon service={u.service} size={20} /></span>
          <span className="unit-choice-text"><strong>{u.name}</strong><small title={game.bases.find(b => b.id === u.base_id)?.name}>{game.bases.find(b => b.id === u.base_id)?.name}</small>{estimates[u.node] && !estimates[u.node].error && <span className="unit-road-eta" data-testid={`route-estimate-${u.name}`}>{duration(estimates[u.node].duration)} · {(estimates[u.node].distance / 1000).toFixed(1)} km</span>}</span>
          <span className="unit-choice-right"><span className="unit-ready" data-unavailable={disabled}>{state}</span><span className={`checkbox ${selected ? 'checked' : ''}`}>{selected && <Check size={14} />}</span></span>
        </button>;
      })}{available.length === 0 && <p className="subtle" data-testid="no-available-units">Não há meios disponíveis para mobilização.</p>}</div>
      {!!game.arrs?.length && <details className="dispatch-foldout arr-dispatch" key={`arr-${incident.id}`}><summary><ClipboardList size={15} />Mobilização por regulamento<ChevronDown size={15} /></summary><div>{game.arrs.map(arr => <button key={arr.id} disabled={busy || !Object.entries(incident.needs).some(([service, count]) => count > assigned.filter(unit => unit.service === service).length && (arr.resources[service] || 0) > 0)} onClick={() => act('dispatch_arr', { incident_id: incident.id, arr_id: arr.id })}><strong>{arr.name}</strong><small>{Object.entries(arr.resources).filter(([,count]) => count).map(([service,count]) => `${count} ${SERVICE[service].short}`).join(' · ')}</small></button>)}</div></details>}
      <details className="dispatch-foldout mission-briefing" key={`briefing-${incident.id}`}><summary><Radio size={15} />Detalhes da ocorrência<ChevronDown size={15} /></summary>
        <p data-testid="selected-incident-description">{incident.description}</p>
        <div className="mission-facts"><span><Gauge size={13} />{incident.difficulty || 'Média'}</span><span data-tone={incident.casualties > 0 ? 'warning' : undefined}><HeartPulse size={13} />{incident.casualties || 0} feridos</span><span data-tone={incident.detainees > 0 ? 'active' : undefined}><Shield size={13} />{incident.detainees || 0} detidos</span></div>
        <div className="dispatch-reward"><span>Receita prevista</span><b data-testid="selected-incident-reward">{money(incident.reward)} <small>+{incident.xp} XP</small></b></div>
        <p className="route-estimate-note">Percursos reais · OSRM / OpenStreetMap. Tempos estimados, sem trânsito em direto. A velocidade do jogo acelera o relógio, não a viatura.</p>
      </details>
      </div><div className="dispatch-bottom"><div><span data-testid="selected-unit-count">{picked.length} meio{picked.length !== 1 ? 's' : ''} selecionado{picked.length !== 1 ? 's' : ''}</span><span className="dispatch-selection-state" data-ready={picked.length > 0}>{picked.length ? 'Mobilização pronta' : 'Seleciona os meios'}</span></div><Button className="dispatch-button" data-testid="dispatch-action-button" disabled={!picked.length || busy} onClick={send}><Send size={17} /> {busy ? 'A preparar percursos…' : 'Mobilizar meios'} <ArrowUpRight size={17} /></Button></div>
    </>}
  </aside>;
};
