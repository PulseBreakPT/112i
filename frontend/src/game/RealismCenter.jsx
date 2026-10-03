import { useMemo, useState } from 'react';
import { Activity, Building2, CarFront, Clock3, HeartPulse, Plus, RadioTower, ShieldCheck, Users, Wrench } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { money, duration, SERVICE } from './common';
import { REALISM_MODULES, SHIFT_MODELS, tacticalOptionsFor, coverageSnapshot } from './realismEngine';
import { logisticsCapacity, LOGISTICS_STOCKS } from './logisticsEngine';
import './RealismCenter.css';

const percent=value=>`${Math.round(Number(value)||0)}%`;
const stateTone=value=>value>=75?'positive':value>=50?'neutral':value>=30?'warning':'danger';
const orderStatus=status=>status==='ordered'?'Em adjudicação':status==='awaiting-garage'?'Aguardar garagem':status==='delivered'?'Entregue':status==='cancelled'?'Cancelado':status;
const personDutyLabel=state=>({'on-duty':'Em turno','off-duty':'Fora de turno',recalled:'Convocado',sick:'Baixa',leave:'Férias/licença'}[state]||state||'—');

export default function RealismCenter({game,world,act,busy}){
  const [tab,setTab]=useState('central');
  const [offerBases,setOfferBases]=useState({});
  const [recall,setRecall]=useState({});
  const [eventCounts,setEventCounts]=useState({});
  const [aid,setAid]=useState({service:'fire',units:1,base_id:game.bases?.[0]?.id||'',incident_id:game.incidents?.[0]?.id||''});
  const [chargerBase,setChargerBase]=useState(game.bases?.[0]?.id||'');
  const coverage=useMemo(()=>game.coverage_state?.overall!==undefined?game.coverage_state:coverageSnapshot(game),[game]);
  const realism=game.realism||{};
  const onDuty=(game.personnel||[]).filter(person=>['on-duty','recalled'].includes(person.duty_state)).length;
  const hospitals=(game.facilities||[]).filter(item=>item.type==='hospital'&&item.enabled!==false);
  const worstHospital=Math.max(0,...hospitals.map(item=>item.ed_pressure||0));
  const fleetAvailable=(game.units||[]).length?Math.round((game.units||[]).filter(unit=>['available','patrol','staged'].includes(unit.status)).length/game.units.length*100):0;
  const latestAudit=game.operational_audits?.[0];
  const run=async(kind,data,message)=>{const next=await act(kind,data);if(next&&message)toast.success(message);return next;};

  const tabs=[
    ['central','Comando'],
    ['staff','Turnos'],
    ['fleet','Frota & Procurement'],
    ['health','Saúde'],
    ['operations','Operações'],
    ['resilience','Resiliência'],
    ['aar','AAR'],
  ];

  return <main className="management-page realism-page">
    <div className="page-heading">
      <div><span className="page-eyebrow">SIMULAÇÃO OPERACIONAL INTEGRADA</span><h1>Centro de Realismo</h1><p>Estado humano, clínico, técnico, territorial e institucional da rede de emergência.</p></div>
      <div className="realism-mode">
        <span>Modo</span>
        <div>{['assisted','realistic','hardcore'].map(mode=><button key={mode} className={realism.mode===mode?'active':''} disabled={busy} onClick={()=>run('set_realism_mode',{mode})}>{mode==='assisted'?'Assistido':mode==='realistic'?'Realista':'Hardcore'}</button>)}</div>
      </div>
    </div>

    <section className="realism-kpis">
      <article data-tone={stateTone(coverage.overall)}><RadioTower/><div><span>Cobertura territorial</span><strong>{percent(coverage.overall)}</strong><small>{(game.coverage_recommendations||[]).length} recomendações</small></div></article>
      <article><Users/><div><span>Efetivo em turno</span><strong>{onDuty}/{(game.personnel||[]).length}</strong><small>{(game.personnel||[]).filter(person=>person.duty_state==='recalled').length} convocados</small></div></article>
      <article data-tone={worstHospital>=88?'danger':worstHospital>=70?'warning':'positive'}><HeartPulse/><div><span>Pressão hospitalar</span><strong>{percent(worstHospital)}</strong><small>{hospitals.filter(item=>item.diversion).length} em desvio</small></div></article>
      <article data-tone={stateTone(fleetAvailable)}><CarFront/><div><span>Frota disponível</span><strong>{percent(fleetAvailable)}</strong><small>{(game.units||[]).filter(unit=>unit.inspection_overdue).length} inspeções vencidas</small></div></article>
      <article data-tone={game.infrastructure_state?.communications==='normal'?'positive':'warning'}><Activity/><div><span>Comunicações</span><strong>{game.infrastructure_state?.communications==='normal'?'Normal':'Degradada'}</strong><small>SIRESP {game.infrastructure_state?.sirensp||'normal'}</small></div></article>
      <article data-tone={latestAudit?.score>=85?'positive':latestAudit?.score>=65?'warning':'danger'}><ShieldCheck/><div><span>Última auditoria</span><strong>{latestAudit?percent(latestAudit.score):'—'}</strong><small>{latestAudit?.findings?.length||0} não conformidades</small></div></article>
      <article data-tone={(game.media_state?.scrutiny||0)>60?'danger':(game.media_state?.scrutiny||0)>30?'warning':'positive'}><Activity/><div><span>Escrutínio</span><strong>{percent(game.media_state?.scrutiny||0)}</strong><small>pressão mediática/institucional</small></div></article>
    </section>

    <nav className="realism-tabs" aria-label="Centro de Realismo">
      {tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
    </nav>

    {tab==='central'&&<div className="realism-grid two">
      <section className="realism-panel">
        <header><div><h2>Cobertura por serviço</h2><p>Disponibilidade instantânea e zonas frágeis.</p></div></header>
        <div className="coverage-services">{Object.entries(coverage.by_service||{}).map(([service,data])=><article key={service} data-tone={stateTone(data.score)}>
          <div><strong>{SERVICE[service]?.name||service}</strong><b>{percent(data.score)}</b></div>
          <div className="realism-meter"><i style={{width:`${Math.min(100,data.score)}%`}}/></div>
          <small>{data.uncovered?.length||0} bases abaixo de 35%</small>
        </article>)}</div>
        {(game.coverage_recommendations||[]).length>0&&<div className="recommendation-list">{game.coverage_recommendations.map(item=><div key={item.id}><RadioTower size={14}/><span>{item.text}</span></div>)}</div>}
      </section>

      <section className="realism-panel">
        <header><div><h2>Previsão de risco</h2><p>Procura operacional estimada pela hora, estação e condições.</p></div></header>
        <div className="risk-grid">{Object.entries(game.risk_forecast||{}).map(([service,risk])=><article key={service}><span>{SERVICE[service]?.name||service}</span><strong>{risk.label}</strong><small>Índice ×{Number(risk.index||1).toFixed(2)}</small></article>)}</div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Objetivos estratégicos</h2><p>Indicadores de qualidade da rede no ciclo atual.</p></div></header>
        <div className="objective-list">{(game.strategic_objectives||[]).map(item=><article key={item.id} className={item.met?'met':''}><ShieldCheck size={16}/><div><strong>{item.title}</strong><small>Atual: {Math.round(item.progress||0)} · Meta: {item.target}</small></div><b>{item.met?'Cumprido':'Em curso'}</b></article>)}</div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Confiança territorial</h2><p>Perceção pública por cidade e serviço.</p></div></header>
        <div className="trust-table">{Object.entries(game.regional_trust||{}).map(([region,services])=><article key={region}><strong>{region}</strong>{['fire','medical','police'].map(service=><span key={service}>{SERVICE[service]?.name||service}<b>{percent(services[service]??90)}</b></span>)}</article>)}</div>
      </section>
    </div>}

    {tab==='staff'&&<div className="realism-grid two">
      <section className="realism-panel wide">
        <header><div><h2>Escalas e disponibilidade</h2><p>Turnos rotativos, baixas, férias e chamadas extraordinárias.</p></div></header>
        <div className="shift-models">{Object.entries(SHIFT_MODELS).map(([service,shifts])=><article key={service}><strong>{SERVICE[service]?.name||service}</strong><div>{shifts.map(shift=><span key={shift.id}>{shift.name} · {String(shift.start).padStart(2,'0')}:00–{String(shift.end).padStart(2,'0')}:00</span>)}</div></article>)}</div>
        <div className="base-staff-list">{game.bases.map(base=>{
          const people=(game.personnel||[]).filter(person=>person.base_id===base.id);
          const duty=people.filter(person=>['on-duty','recalled'].includes(person.duty_state)).length;
          const off=people.filter(person=>person.duty_state==='off-duty').length;
          const absent=people.filter(person=>['sick','leave'].includes(person.duty_state)).length;
          const count=Math.max(1,Number(recall[base.id])||1);
          return <article key={base.id}><div><strong>{base.name}</strong><small>{SERVICE[base.service]?.name} · {duty} em turno · {off} fora · {absent} ausentes</small></div><label><input type="number" min="1" max="20" value={count} onChange={event=>setRecall(current=>({...current,[base.id]:event.target.value}))}/><Button disabled={busy||!off} data-action-tone={off?'positive':'neutral'} onClick={()=>run('recall_personnel',{base_id:base.id,count,hours:8},'Pessoal convocado.')}>Convocar</Button></label></article>;
        })}</div>
      </section>

      <section className="realism-panel wide">
        <header><div><h2>Efetivo individual</h2><p>Estado de turno, fadiga, saúde, horas extra e recertificações.</p></div></header>
        <div className="person-table"><div className="person-head"><span>Elemento</span><span>Estado</span><span>Fadiga</span><span>Saúde</span><span>Horas extra</span><span>Recert.</span></div>{(game.personnel||[]).map(person=><div className="person-row" key={person.id}><div><strong>{person.name}</strong><small>{SERVICE[person.service]?.name} · {person.shift_code}</small></div><span>{personDutyLabel(person.duty_state)}</span><span>{percent(person.fatigue||0)}</span><span>{percent(person.health??100)}</span><span>{Math.round((person.overtime_minutes||0)/60*10)/10} h</span><span>{Object.values(person.certifications||{}).filter(item=>item.warning||item.status==='expired').length}</span></div>)}</div>
      </section>
    </div>}

    {tab==='fleet'&&<div className="realism-grid two">
      <section className="realism-panel wide">
        <header><div><h2>Procurement em curso</h2><p>Aquisições têm adjudicação, prazo contratual, entrega e capacidade de garagem.</p></div></header>
        <div className="procurement-list">{(game.vehicle_procurements||[]).map(order=><article key={order.id} data-status={order.status}><div><strong>{order.name}</strong><small>{game.bases.find(base=>base.id===order.base_id)?.name}</small></div><span>{orderStatus(order.status)}</span><span>{order.contract_days} dias contratuais</span><span>{order.status==='ordered'?duration(Math.max(0,order.delivery_at-game.elapsed)):'—'}</span><b>{money(order.own_contribution||0)}</b></article>)}{!(game.vehicle_procurements||[]).length&&<p className="realism-empty">Sem aquisições em curso.</p>}</div>
      </section>

      <section className="realism-panel wide">
        <header><div><h2>Mercado usado</h2><p>Preço inferior, mas com idade, quilometragem e condição já acumuladas.</p></div></header>
        <div className="used-market">{(game.used_vehicle_market||[]).filter(item=>item.status==='available').map(offer=>{
          const bases=game.bases.filter(base=>base.service===offer.service);
          const target=offerBases[offer.id]||bases[0]?.id||'';
          return <article key={offer.id}><div><strong>{offer.name}</strong><small>{offer.age} anos · {offer.mileage_km.toLocaleString('pt-PT')} km · condição {offer.condition}%</small></div><b>{money(offer.price)}</b><select value={target} onChange={event=>setOfferBases(current=>({...current,[offer.id]:event.target.value}))}>{bases.map(base=><option key={base.id} value={base.id}>{base.name}</option>)}</select><Button disabled={busy||!target} onClick={()=>run('buy_used_vehicle',{offer_id:offer.id,base_id:target},'Viatura usada adjudicada.')}>Adjudicar</Button></article>;
        })}{!(game.used_vehicle_market||[]).some(item=>item.status==='available')&&<p className="realism-empty">Sem ofertas usadas nesta semana.</p>}</div>
      </section>

      <section className="realism-panel wide">
        <header><div><h2>Saúde técnica da frota</h2><p>Idade, inspeção, pneus, travões e bateria.</p></div></header>
        <div className="fleet-health"><div className="fleet-health-head"><span>Viatura</span><span>Idade</span><span>Condição</span><span>Pneus</span><span>Travões</span><span>Bateria</span><span>Inspeção</span><span>Seguro</span><span/></div>{game.units.map(unit=><div className="fleet-health-row" key={unit.id}><div><strong>{unit.name}</strong><small>{unit.mileage_km?.toLocaleString('pt-PT',{maximumFractionDigits:0})||0} km</small></div><span>{unit.age_years||0} a</span><span>{percent(unit.condition??100)}</span><span>{percent(unit.tyre_condition??100)}</span><span>{percent(unit.brake_condition??100)}</span><span>{percent(unit.battery_condition??100)}</span><span>{unit.inspection_overdue?'Vencida':'Válida'}</span><select value={unit.insurance?.type||'public-fleet'} onChange={event=>run('set_vehicle_insurance',{unit_id:unit.id,type:event.target.value})}><option value="public-fleet">Frota pública</option><option value="comprehensive">Completo</option><option value="self-insured">Auto-seguro</option></select>{unit.inspection_overdue?<Button disabled={busy} onClick={()=>run('perform_vehicle_inspection',{unit_id:unit.id},'Inspeção concluída.')}><Wrench size={13}/>Inspecionar</Button>:<span/>}</div>)}</div>
      </section>
    </div>}

    {tab==='health'&&<div className="realism-grid two">
      <section className="realism-panel wide">
        <header><div><h2>Rede hospitalar em tempo real</h2><p>Pressão externa, ocupação, especialidades, handover e desvio.</p></div></header>
        <div className="hospital-grid">{hospitals.map(hospital=>{
          const gamePatients=(game.patients||[]).filter(patient=>patient.hospital_id===hospital.id&&['transporting','admitted','transfer_transporting'].includes(patient.status)).length;
          return <article key={hospital.id} data-tone={hospital.ed_pressure>=88?'danger':hospital.ed_pressure>=70?'warning':'positive'}><header><HeartPulse/><div><strong>{hospital.name}</strong><small>{hospital.city}</small></div><b>{percent(hospital.ed_pressure)}</b></header><div className="realism-meter"><i style={{width:`${hospital.ed_pressure||0}%`}}/></div><div className="hospital-stats"><span>Externos <b>{hospital.external_occupancy||0}</b></span><span>Do jogo <b>{gamePatients}</b></span><span>Capacidade <b>{hospital.capacity}</b></span><span>Handover <b>{hospital.handover_minutes||12} min</b></span></div><div className="specialty-tags">{(hospital.specialties||[]).map(id=><span key={id} data-status={hospital.specialty_status?.[id]||'open'}>{id} · {hospital.specialty_status?.[id]||'open'}</span>)}</div><Button disabled={busy} data-action-tone={hospital.diversion?'warning':'neutral'} onClick={()=>run('set_hospital_diversion',{facility_id:hospital.id,enabled:!hospital.manual_diversion})}>{hospital.diversion?'Desvio ativo':'Ativar desvio manual'}</Button></article>;
        })}{!hospitals.length&&<p className="realism-empty">Constrói um hospital para ativar a rede clínica dinâmica.</p>}</div>
      </section>
    </div>}

    {tab==='operations'&&<div className="realism-grid two">
      <section className="realism-panel wide">
        <header><div><h2>Ocorrências ativas · inteligência e comando</h2><p>Informação inicial imperfeita, reconhecimento e decisão tática.</p></div></header>
        <div className="incident-realism-list">{game.incidents.map(incident=>{
          const options=tacticalOptionsFor(incident);
          return <article key={incident.id}><header><div><strong>{incident.title}</strong><small>{incident.district} · P{incident.priority} · {incident.rarity_label}</small></div><b>{Math.round(incident.intel_confidence||0)}% intel</b></header><div className="incident-realism-meta"><span>{incident.reconnaissance?.complete?'Situação confirmada':'Informação preliminar'}</span><span>{incident.caller_reports?.length||1} chamada(s)</span><span>{incident.escalation_stage||0} agravamento(s)</span><span>{incident.command_structure?.established?'COS estabelecido':'Comando inicial'}</span></div><div className="tactic-options">{options.map(option=><button key={option.id} className={incident.tactical_plan?.option===option.id?'active':''} disabled={busy} onClick={()=>run('set_incident_tactic',{incident_id:incident.id,option:option.id})}><strong>{option.name}</strong><small>{option.description}</small><span>Vel. ×{option.speed.toFixed(2)} · risco ×{option.risk.toFixed(2)}</span></button>)}</div></article>;
        })}{!game.incidents.length&&<p className="realism-empty">Sem ocorrências ativas.</p>}</div>
      </section>

      <section className="realism-panel wide">
        <header><div><h2>Eventos públicos planeados</h2><p>Pré-posiciona recursos para reduzir risco sem esvaziar a cobertura normal.</p></div></header>
        <div className="public-events">{(game.planned_public_events||[]).filter(event=>event.status!=='completed').map(event=><article key={event.id}><div><strong>{event.name}</strong><small>{event.status==='active'?'Em curso':'Previsto'} · início em {duration(Math.max(0,event.starts_at-game.elapsed))}</small></div>{['fire','medical','police'].map(service=>{const key=`${event.id}:${service}`,value=eventCounts[key]??event.prepositioned?.[service]??0;return <label key={service}><span>{SERVICE[service]?.name}</span><input type="number" min="0" max="9" value={value} onChange={e=>setEventCounts(current=>({...current,[key]:e.target.value}))}/><Button disabled={busy} onClick={()=>run('set_event_preposition',{event_id:event.id,service,count:Number(value)})}>Aplicar</Button></label>})}</article>)}{!(game.planned_public_events||[]).some(event=>event.status!=='completed')&&<p className="realism-empty">Sem eventos públicos planeados.</p>}</div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Investigação criminal</h2><p>Casos persistem depois da ocorrência e consomem capacidade investigatória.</p></div></header>
        <div className="case-persistence-list">{(game.police_cases||[]).filter(file=>file.status!=='closed').map(file=><article key={file.id}><div><strong>{file.title}</strong><small>{file.status} · prova {file.evidence||0} · suspeitos {file.suspects||0}</small></div><div className="realism-meter"><i style={{width:String(Math.min(100,file.progress||0))+'%'}}/></div><span>{Math.round(file.progress||0)}%</span><Button disabled={busy||file.assigned_priority} onClick={()=>run('prioritize_police_case',{case_id:file.id},'Investigação priorizada.')}>{file.assigned_priority?'Prioridade ativa':'Priorizar'}</Button></article>)}{!(game.police_cases||[]).some(file=>file.status!=='closed')&&<p className="realism-empty">Sem processos investigatórios pendentes.</p>}</div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Apoio mútuo</h2><p>Solicita reforços externos com tempo de chegada e custo operacional.</p></div></header>
        <div className="mutual-aid-form"><label><span>Serviço</span><select value={aid.service} onChange={event=>setAid(current=>({...current,service:event.target.value,base_id:game.bases.find(base=>base.service===event.target.value)?.id||''}))}><option value="fire">Bombeiros</option><option value="medical">INEM</option><option value="police">PSP</option></select></label><label><span>Base de referência</span><select value={aid.base_id} onChange={event=>setAid(current=>({...current,base_id:event.target.value}))}>{game.bases.filter(base=>base.service===aid.service).map(base=><option key={base.id} value={base.id}>{base.name}</option>)}</select></label><label><span>Ocorrência</span><select value={aid.incident_id} onChange={event=>setAid(current=>({...current,incident_id:event.target.value}))}><option value="">Cobertura geral</option>{game.incidents.map(incident=><option key={incident.id} value={incident.id}>{incident.title}</option>)}</select></label><label><span>Meios</span><input type="number" min="1" max="5" value={aid.units} onChange={event=>setAid(current=>({...current,units:event.target.value}))}/></label><Button disabled={busy||!aid.base_id} onClick={()=>run('request_mutual_aid',{...aid,units:Number(aid.units)},'Apoio mútuo solicitado.')}><Plus size={14}/>Solicitar apoio</Button></div>
        <div className="mutual-aid-list">{(game.mutual_aid||[]).filter(item=>item.status!=='completed').map(item=><article key={item.id}><strong>{item.name}</strong><span>{item.units} meio(s)</span><span>{item.status==='requested'?'ETA '+duration(Math.max(0,item.arrives_at-game.elapsed)):'No dispositivo'}</span><b>{money(item.cost)}</b></article>)}</div>
      </section>
    </div>}

    {tab==='resilience'&&<div className="realism-grid two">
      <section className="realism-panel">
        <header><div><h2>Módulos de simulação</h2><p>Podes ativar ou desativar subsistemas individualmente.</p></div></header>
        <div className="module-list">{Object.entries(REALISM_MODULES).map(([id,label])=><label key={id}><input type="checkbox" checked={realism.modules?.[id]!==false} onChange={event=>run('toggle_realism_module',{module:id,enabled:event.target.checked})}/><span><strong>{label}</strong><small>{realism.modules?.[id]!==false?'Ativo':'Desativado'}</small></span></label>)}</div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Continuidade operacional</h2><p>Redundância de comunicações e energia de contingência.</p></div></header>
        <div className="resilience-controls"><label><span>Redundância</span><select value={realism.communications_redundancy||'normal'} onChange={event=>run('set_communications_redundancy',{value:event.target.value},'Redundância atualizada.')}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></label><label className="check-row"><input type="checkbox" checked={game.infrastructure_state?.backup_power!==false} onChange={event=>run('set_infrastructure_backup',{enabled:event.target.checked})}/><span>Geradores / energia de contingência</span></label><div className="infra-state"><span>Rede elétrica <b>{game.infrastructure_state?.power||'normal'}</b></span><span>Comunicações <b>{game.infrastructure_state?.communications||'normal'}</b></span><span>SIRESP <b>{game.infrastructure_state?.sirensp||'normal'}</b></span></div></div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Sustentabilidade e energia</h2><p>Consumo estimado da frota e infraestrutura elétrica.</p></div></header>
        <div className="sustainability-grid"><span>Gasóleo <b>{Math.round(game.sustainability_state?.diesel_litres||0).toLocaleString('pt-PT')} L</b></span><span>Gasolina <b>{Math.round(game.sustainability_state?.petrol_litres||0).toLocaleString('pt-PT')} L</b></span><span>Eletricidade <b>{Math.round(game.sustainability_state?.electric_kwh||0).toLocaleString('pt-PT')} kWh</b></span><span>CO₂ operacional <b>{Math.round(game.sustainability_state?.co2_kg||0).toLocaleString('pt-PT')} kg</b></span></div>
        <div className="charger-install"><select value={chargerBase} onChange={event=>setChargerBase(event.target.value)}>{game.bases.map(base=><option key={base.id} value={base.id}>{base.name}</option>)}</select><Button disabled={busy||!chargerBase} onClick={()=>run('install_ev_charger',{base_id:chargerBase,count:1},'Carregador instalado.')}>Instalar carregador · {money(25000)}</Button></div>
      </section>

      <section className="realism-panel">
        <header><div><h2>Camadas operacionais</h2><p>Informação estratégica disponível para o mapa e planeamento.</p></div></header>
        <div className="module-list">{Object.entries(game.operational_layers||{}).map(([layer,enabled])=><label key={layer}><input type="checkbox" checked={!!enabled} onChange={event=>run('toggle_operational_layer',{layer,enabled:event.target.checked})}/><span><strong>{layer}</strong><small>{enabled?'Visível':'Oculta'}</small></span></label>)}</div>
      </section>

      <section className="realism-panel wide">
        <header><div><h2>Auditorias operacionais</h2><p>Não conformidades de frota, formação e logística.</p></div></header>
        <div className="audit-list">{(game.operational_audits||[]).map(audit=><article key={audit.id} data-tone={audit.score>=85?'positive':audit.score>=65?'warning':'danger'}><header><strong>Semana {audit.week}</strong><b>{percent(audit.score)}</b></header>{audit.findings?.length?<div>{audit.findings.map((finding,index)=><span key={index}>{finding.severity==='major'?'●':'○'} {finding.text}</span>)}</div>:<small>Sem não conformidades.</small>}{!audit.acknowledged&&audit.findings?.length>0&&<Button disabled={busy} onClick={()=>run('acknowledge_audit',{audit_id:audit.id})}>Tomar conhecimento</Button>}</article>)}{!(game.operational_audits||[]).length&&<p className="realism-empty">A primeira auditoria será gerada no ciclo semanal.</p>}</div>
      </section>
    </div>}

    {tab==='aar'&&<section className="realism-panel">
      <header><div><h2>After Action Review</h2><p>Tempo, qualidade, doutrina, agravamentos e custo operacional por ocorrência.</p></div></header>
      <div className="aar-list">{(game.after_action_reports||[]).map(report=><article key={report.id}><header><div><strong>{report.title}</strong><small>{report.success?'Resolvida':'Falhada'} · score {report.performance_score}% · intel {report.intel_confidence}%</small></div><b>{money(report.costs?.total||0)}</b></header><div className="aar-costs"><span>Combustível <b>{money(report.costs?.fuel||0)}</b></span><span>Consumíveis <b>{money(report.costs?.consumables||0)}</b></span><span>Horas extra <b>{money(report.costs?.overtime||0)}</b></span><span>Desgaste/reparação <b>{money(report.costs?.repairs||0)}</b></span><span>Apoio externo <b>{money(report.costs?.external_support||0)}</b></span></div><div className="aar-lessons">{(report.lessons||[]).map((lesson,index)=><span key={index}>• {lesson}</span>)}</div></article>)}{!(game.after_action_reports||[]).length&&<p className="realism-empty">Os relatórios aparecem após o encerramento das ocorrências.</p>}</div>
    </section>}
  </main>;
}
