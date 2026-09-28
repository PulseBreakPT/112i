import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Check, MapPin, Radio, Send, PhoneIncoming, Crosshair, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SERVICE, ServiceIcon, STATUS, money, duration } from './common';
export const DispatchPanel = ({ game, incident, act, busy, onCall, onFocus, onClose }) => {
  const [picked, setPicked] = useState([]);
  const [estimates, setEstimates] = useState({}), [estimating, setEstimating] = useState(false);
  const estimateRequest = useRef(0);
  useEffect(() => { setPicked([]); setEstimates({}); setEstimating(false); estimateRequest.current += 1; }, [incident?.id]);
  useEffect(() => setPicked(p => p.filter(id => game.units.some(u => u.id === id && u.status === 'available'))), [game.units]);
  const available = game.units.filter(u => u.status === 'available');
  const assigned = game.units.filter(u => u.incident_id === incident?.id);
  const needed = s => Math.max(0, (incident?.needs[s] || 0) - assigned.filter(u => u.service === s).length);
  const send = async () => { const result = await act('dispatch', { incident_id: incident.id, unit_ids: picked }); if (result) setPicked([]); };
  const estimateRoutes = async () => {
    const request = ++estimateRequest.current;
    setEstimating(true);
    const origins = [...new Set(available.filter(u => needed(u.service) && u.land === incident.land).map(u => u.node))];
    const routes = await Promise.all(origins.map(async node => {
      try {
        const { data } = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/road-routes/${encodeURIComponent(node)}/${encodeURIComponent(incident.node)}`, { timeout: 90000 });
        return [node, data];
      } catch (error) {
        return [node, { error: error.response?.data?.detail || 'Estimativa indisponível. Tenta novamente.' }];
      }
    }));
    if (request === estimateRequest.current) { setEstimates(Object.fromEntries(routes)); setEstimating(false); }
  };
  return <aside className="dispatch-panel">
    <div className="panel-heading"><h2><Crosshair size={17} /> Despacho</h2><div className="panel-heading-actions"><span className="subtle">{incident ? `#${incident.number}` : '—'}</span>{onClose && <button className="icon-btn" aria-label="Recolher despacho" title="Recolher despacho" data-testid="close-dispatch" onClick={onClose}><X size={17} /></button>}</div></div>
    {!incident ? <div className="empty-state" data-testid="dispatch-empty"><Radio size={35} /><strong>Central em escuta</strong><p>Nenhuma ocorrência selecionada.</p></div> : <>
      <div className="dispatch-content"><div className="dispatch-detail"><div className="detail-eyebrow"><span className={`priority p${incident.priority}`}>PRIORIDADE {incident.priority}</span><span style={{ color: SERVICE[incident.service].color }}>{SERVICE[incident.service].short}</span></div><h2 data-testid="selected-incident-title">{incident.title}</h2><button className="location-link" data-testid="focus-incident" onClick={onFocus}><MapPin size={13} />{incident.district}<ArrowUpRight size={12} /></button><p data-testid="selected-incident-description">{incident.description}</p><div className="dispatch-reward"><span>Recompensa prevista</span><b data-testid="selected-incident-reward">{money(incident.reward)} <small>+{incident.xp} XP</small></b></div>
      {!incident.call_answered && <button data-testid="call-112-answer-button" className="call-mini" onClick={() => onCall(incident.id)}><PhoneIncoming size={15} /> Atender chamada 112 <ArrowUpRight size={14} /></button>}</div>
      <div className="requirements"><h3>MEIOS NECESSÁRIOS</h3><div>{Object.entries(incident.needs).map(([s, n]) => <span key={s} style={{ '--service-color': SERVICE[s].color }} data-testid={`requirement-${s}`}><ServiceIcon service={s} size={15} /> {assigned.filter(u => u.service === s).length}/{n} {SERVICE[s].short}{!needed(s) && <Check size={12} />}</span>)}</div></div>
      {assigned.length > 0 && <div className="assigned-units"><h3>MEIOS MOBILIZADOS</h3>{assigned.map(u => <div key={u.id} data-testid={`assigned-${u.name}`}><ServiceIcon service={u.service} size={15} color={SERVICE[u.service].color} /><b>{u.name}</b><span className="route-distance">{(u.route_distance / 1000).toFixed(1)} km</span><span className={`state-label ${u.status}`}>{u.status === 'onscene' ? 'No local' : `${duration(u.travel_total - u.travel)} · A caminho`}</span></div>)}{incident.status === 'onscene' && <div className="resolution-progress" data-testid="resolution-progress"><i style={{ width: `${incident.progress}%` }} /></div>}</div>}
      <div className="units-heading"><h3>UNIDADES DISPONÍVEIS</h3><span data-testid="available-unit-count">{available.length}</span></div>
      <button className="route-estimate-action" data-testid="estimate-routes-button" disabled={estimating || !available.some(u => needed(u.service) && u.land === incident.land)} onClick={estimateRoutes}><MapPin size={13} />{estimating ? 'A calcular percursos rodoviários…' : 'Estimar percursos e tempos'}<ArrowUpRight size={13} /></button>
      <p className="route-estimate-note">Tempos de condução estimados · OSRM / OpenStreetMap.<br />Sem trânsito em direto. A velocidade do jogo acelera o relógio, não a viatura.</p>
      {Object.values(estimates).some(route => route.error) && <p className="route-estimate-note route-estimate-error" role="alert">{Object.values(estimates).find(route => route.error).error}</p>}
      <div className="units-scroll">{available.map(u => { const selected = picked.includes(u.id); const full = picked.filter(id => game.units.find(v => v.id === id)?.service === u.service).length >= needed(u.service); const disconnected = u.land !== incident.land; const disabled = disconnected || (!selected && (full || !needed(u.service))); return <button key={u.id} data-testid={`select-unit-${u.name}`} disabled={disabled} className={`unit-choice ${selected ? 'selected' : ''}`} onClick={() => setPicked(p => selected ? p.filter(id => id !== u.id) : [...p, u.id])}><span className="unit-icon" style={{ color: SERVICE[u.service].color }}><ServiceIcon service={u.service} size={20} /></span><span className="unit-choice-text"><strong>{u.name}</strong><small>{game.bases.find(b => b.id === u.base_id)?.name}</small>{estimates[u.node] && !estimates[u.node].error && <span className="unit-road-eta" data-testid={`route-estimate-${u.name}`}>{duration(estimates[u.node].duration)} · {(estimates[u.node].distance / 1000).toFixed(1)} km</span>}</span><span className="unit-choice-right"><span className="unit-ready">{disconnected ? 'Sem ligação' : 'Disponível'}</span><span className={`checkbox ${selected ? 'checked' : ''}`}>{selected && <Check size={12} />}</span></span></button>; })}{available.length === 0 && <p className="subtle" data-testid="no-available-units">Todas as unidades estão em missão.</p>}</div>
      </div><div className="dispatch-bottom"><div><span data-testid="selected-unit-count">{picked.length} unidade{picked.length !== 1 ? 's' : ''} selecionada{picked.length !== 1 ? 's' : ''}</span><span>REDE TETRA <i className="live-dot" /></span></div><Button className="dispatch-button" data-testid="dispatch-action-button" disabled={!picked.length || busy} onClick={send}><Send size={16} /> {busy ? 'A preparar percursos…' : 'Despachar equipa'} <span>↗</span></Button></div>
    </>}
  </aside>;
};