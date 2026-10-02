import { useMemo, useState } from 'react';
import { Activity, Award, BadgeCheck, Brain, Heart, HeartPulse, Search, ShieldCheck, SlidersHorizontal, UserMinus, Users, Zap, Gauge, MessageCircle, MapPin, CarFront } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { SERVICE, money, duration } from './common';
import { toast } from 'sonner';
import TrainingPanel from './TrainingPanel';
import './Personnel.css';

const STATUS_LABELS={
  available:'Disponível',
  assigned:'Atribuído',
  training:'Em formação',
  offshift:'Fora de turno',
  resting:'Em descanso',
};

const stateLabel=person=>person.unit_id?'Atribuído':STATUS_LABELS[person.status]||person.status||'Indisponível';
const statTone=value=>value>=80?'high':value>=60?'good':value>=40?'mid':'low';
const initials=name=>String(name||'?').split(' ').filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();

export default function Personnel({game,world,act,busy}){
  const [query,setQuery]=useState('');
  const [service,setService]=useState('all');
  const [status,setStatus]=useState('all');
  const [sort,setSort]=useState('name');
  const [selectedId,setSelectedId]=useState(null);

  const people=useMemo(()=>game.personnel||[],[game.personnel]);
  const selected=people.find(person=>person.id===selectedId)||null;
  const selectedBase=selected?game.bases.find(base=>base.id===selected.base_id):null;
  const selectedUnit=selected?game.units.find(unit=>unit.id===selected.unit_id):null;

  const filtered=useMemo(()=>{
    const normalized=query.trim().toLocaleLowerCase('pt-PT');
    const list=people.filter(person=>{
      const matchesQuery=!normalized||[person.name,person.rank,person.specialization,person.trait].some(value=>String(value||'').toLocaleLowerCase('pt-PT').includes(normalized));
      const matchesService=service==='all'||person.service===service;
      const personStatus=person.unit_id?'assigned':person.status;
      const matchesStatus=status==='all'||personStatus===status;
      return matchesQuery&&matchesService&&matchesStatus;
    });
    return [...list].sort((a,b)=>{
      if(sort==='skill')return (b.skill||0)-(a.skill||0);
      if(sort==='experience')return (b.experience||0)-(a.experience||0);
      if(sort==='fatigue')return (a.fatigue||0)-(b.fatigue||0);
      return String(a.name||'').localeCompare(String(b.name||''),'pt');
    });
  },[people,query,service,status,sort]);

  const available=people.filter(person=>!person.unit_id&&person.status==='available').length;
  const assigned=people.filter(person=>!!person.unit_id).length;
  const training=people.filter(person=>person.status==='training').length;
  const averageSkill=people.length?Math.round(people.reduce((sum,person)=>sum+(person.skill||0),0)/people.length):0;

  const run=async(kind,data,message)=>{
    const next=await act(kind,data);
    if(next&&message)toast.success(message);
    return next;
  };

  return <main className="management-page personnel-page">
    <div className="page-heading personnel-heading">
      <div><span className="page-eyebrow">GESTÃO DE RECURSOS HUMANOS</span><h1>Funcionários</h1><p>Consulta competências, estado operacional, carreira, formações e distribuição do efetivo.</p></div>
    </div>

    <section className="personnel-overview" aria-label="Resumo do efetivo">
      <article><Users size={18}/><div><small>TOTAL</small><strong>{people.length}</strong></div></article>
      <article><BadgeCheck size={18}/><div><small>DISPONÍVEIS</small><strong>{available}</strong></div></article>
      <article><CarFront size={18}/><div><small>ATRIBUÍDOS</small><strong>{assigned}</strong></div></article>
      <article><Brain size={18}/><div><small>EM FORMAÇÃO</small><strong>{training}</strong></div></article>
      <article><Gauge size={18}/><div><small>COMPETÊNCIA MÉDIA</small><strong>{averageSkill}</strong></div></article>
    </section>

    <div className="strategy-columns">
      <section className="strategy-panel">
        <header><Users/><div><h2>Recrutamento</h2><p>Reforça o efetivo de cada base e acompanha os processos de seleção em curso.</p></div></header>
        <div className="recruitment-grid">{game.bases.map(base=><article key={base.id}><div><strong>{base.name}</strong><small>{base.personnel}/{base.staff_capacity} elementos</small></div><Button data-action-tone={(game.money||0) >= 225 ? 'positive' : 'supported'} disabled={busy||(base.personnel||0)>=base.staff_capacity} onClick={()=>run('queue_recruitment',{base_id:base.id,amount:1},'Recrutamento iniciado.')}>Recrutar · {money(225)}</Button></article>)}</div>
        <div className="strategy-list">{(game.recruitment_queue||[]).filter(item=>item.status==='pending').map(item=><article key={item.id}><div><strong>{game.bases.find(base=>base.id===item.base_id)?.name}</strong><small>{item.amount} elemento(s) · T−{duration(item.completes_at-game.elapsed)}</small></div></article>)}</div>
      </section>
      <TrainingPanel game={game} world={world} act={act} busy={busy}/>
    </div>

    <section className="personnel-toolbar">
      <label className="personnel-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Pesquisar funcionário, especialização ou traço" aria-label="Pesquisar funcionários"/></label>
      <label><span>Serviço</span><select value={service} onChange={event=>setService(event.target.value)}><option value="all">Todos</option><option value="fire">Bombeiros</option><option value="medical">Emergência médica</option><option value="police">Polícia</option></select></label>
      <label><span>Estado</span><select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Todos</option><option value="available">Disponíveis</option><option value="assigned">Atribuídos</option><option value="training">Em formação</option></select></label>
      <label><span>Ordenar</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="name">Nome</option><option value="skill">Competência</option><option value="experience">Experiência</option><option value="fatigue">Menor fadiga</option></select></label>
      <div className="personnel-result-count"><SlidersHorizontal size={14}/><strong>{filtered.length}</strong><span>resultado{filtered.length===1?'':'s'}</span></div>
    </section>

    <section className="personnel-directory">
      {filtered.map(person=>{
        const base=game.bases.find(item=>item.id===person.base_id);
        const unit=game.units.find(item=>item.id===person.unit_id);
        const fatigue=Math.round(person.fatigue||0);
        return <article className="employee-card" key={person.id} onClick={()=>setSelectedId(person.id)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(person.id);}}}>
          <header>
            <div className="employee-avatar" aria-hidden="true">{initials(person.name)}</div>
            <div className="employee-identity"><div><span className={`person-status ${person.status}`}/><strong>{person.name}</strong></div><small>{SERVICE[person.service]?.name||person.service} · {person.rank||'Operacional'} · Nível {person.level||1}</small></div>
            <span className="employee-state">{stateLabel(person)}</span>
          </header>
          <div className="employee-location"><MapPin size={13}/><span>{base?.name||'Base por definir'}</span>{unit&&<><CarFront size={13}/><b>{unit.callsign||unit.name}</b></>}</div>
          <div className="employee-key-stats">
            <div><small>COMPETÊNCIA</small><strong data-tone={statTone(person.skill??60)}>{Math.round(person.skill??60)}</strong></div>
            <div><small>MORAL</small><strong data-tone={statTone(person.morale??80)}>{Math.round(person.morale??80)}</strong></div>
            <div><small>FADIGA</small><strong data-tone={statTone(100-fatigue)}>{fatigue}%</strong></div>
            <div><small>XP</small><strong>{person.experience||0}</strong></div>
          </div>
          <div className="employee-specialty"><BadgeCheck size={13}/><span>{person.specialization||'Operações gerais'}</span><em>{person.trait||'Profissional'}</em></div>
          <footer onClick={event=>event.stopPropagation()}>
            {!person.unit_id&&person.status==='available'?<select aria-label={`Transferir ${person.name}`} value={person.base_id} onChange={event=>run('transfer_personnel',{person_id:person.id,base_id:event.target.value},'Elemento transferido.')}>{game.bases.filter(item=>item.service===person.service).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select>:<span className="employee-assignment">{unit?unit.callsign||unit.name:stateLabel(person)}</span>}
            <button disabled={busy||!!person.unit_id||person.status!=='available'} onClick={()=>act('dismiss_personnel',{person_id:person.id})} title="Dispensar elemento"><UserMinus size={14}/><span>Dispensar</span></button>
          </footer>
        </article>;
      })}
      {!filtered.length&&<div className="personnel-empty"><Users size={28}/><strong>Sem funcionários com estes filtros</strong><p>Altera a pesquisa, o serviço ou o estado.</p></div>}
    </section>

    <Dialog open={!!selected} onOpenChange={open=>!open&&setSelectedId(null)}>
      <DialogContent className="game-modal personnel-sheet">
        {selected&&<>
          <div className="modal-eyebrow"><Users size={15}/> FICHA INDIVIDUAL</div>
          <DialogTitle>{selected.name}</DialogTitle>
          <DialogDescription>{SERVICE[selected.service]?.name} · {selected.rank||'Operacional'} · nível {selected.level||1}</DialogDescription>

          <div className="personnel-sheet-summary">
            <div className="employee-avatar large">{initials(selected.name)}</div>
            <div className="personnel-sheet-identity"><div><span className={`person-status ${selected.status}`}/><strong>{stateLabel(selected)}</strong></div><small>{selectedBase?.name||'Base por definir'}{selectedUnit?` · ${selectedUnit.callsign||selectedUnit.name}`:''}</small><b>{selected.specialization||'Operações gerais'} · {selected.trait||'Profissional'}</b></div>
            <dl><div><dt>Idade</dt><dd>{selected.age||'-'}</dd></div><div><dt>Serviço</dt><dd>{selected.service_years||0} a</dd></div><div><dt>Salário</dt><dd>{money(selected.salary||0)}</dd></div></dl>
          </div>

          <div className="personnel-stat-grid">
            {[
              ['Competência',selected.skill,Gauge],
              ['Moral',selected.morale,Heart],
              ['Saúde',selected.health,HeartPulse],
              ['Stress',selected.stress||0,Activity,100-(selected.stress||0)],
              ['Decisão',selected.decision_making,Brain],
              ['Trabalho em equipa',selected.teamwork,Users],
              ['Disciplina',selected.discipline,ShieldCheck],
              ['Resistência',selected.endurance,Zap],
              ['Liderança',selected.leadership,Award],
              ['Comunicação',selected.communication,MessageCircle],
            ].map(([label,value,Icon,toneValue])=><article key={label} data-tone={statTone(Number(toneValue??value)||0)}><Icon size={15}/><div><small>{label.toUpperCase()}</small><strong>{Math.round(Number(value)||0)}</strong><i><b style={{width:`${Math.max(0,Math.min(100,label==='Stress'?100-(Number(value)||0):Number(value)||0))}%`}}/></i></div></article>)}
          </div>

          <div className="personnel-sheet-sections">
            <section><h3>Competências técnicas</h3><p><span>Primeiros socorros</span><b>{selected.first_aid??60}</b></p><p><span>Condução de emergência</span><b>{selected.emergency_driving??60}</b></p><p><span>Velocidade de resposta</span><b>{selected.response_speed??60}</b></p><p><span>Coesão de equipa</span><b>{selected.team_affinity??60}</b></p></section>
            <section><h3>Carreira</h3><p><span>Experiência</span><b>{selected.experience||0} XP</b></p><p><span>Missões</span><b>{selected.missions_completed||0}</b></p><p><span>Sucessos</span><b>{selected.successes||0}</b></p><p><span>Falhas</span><b>{selected.failures||0}</b></p><p><span>Ferimentos</span><b>{selected.injuries||0}</b></p><p><span>Condecorações</span><b>{selected.commendations||0}</b></p></section>
            <section className="personnel-sheet-training"><h3>Formações e certificações</h3><div>{selected.qualifications?.length?selected.qualifications.map(id=><span key={id}>{world.training_catalog.find(course=>course.id===id)?.name||id}</span>):<small>Sem certificações especializadas.</small>}</div></section>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </main>;
}
