import { useMemo, useState } from 'react';
import { Building2, Users, ShieldCheck, HeartPulse, Plus, CarFront, Target, Clock3, Trash2, ArrowUpRight, UserMinus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { SERVICE, ServiceIcon, money, duration, STATUS } from './common';

const FACILITY_LABELS = {
  hospital: { icon: HeartPulse, eyebrow: 'REDE CLÍNICA' },
  prison: { icon: ShieldCheck, eyebrow: 'CUSTÓDIA' },
  academy: { icon: Users, eyebrow: 'FORMAÇÃO' },
};

export default function Operations({ game, world, act, busy }) {
  const [tab, setTab] = useState('facilities');
  const [buildOpen, setBuildOpen] = useState(false);
  const [facilityType, setFacilityType] = useState('hospital');
  const [site, setSite] = useState(world.sites[0]?.id || '');
  const [commandCenterId, setCommandCenterId] = useState(game.active_command_center_id || game.command_centers?.[0]?.id || '');
  const [destinations, setDestinations] = useState({});
  const [course, setCourse] = useState(world.training_catalog[0]?.id || '');
  const [trainingBase, setTrainingBase] = useState(game.bases.find(base => base.service === world.training_catalog[0]?.service)?.id || '');
  const [trainingCount, setTrainingCount] = useState(1);
  const [arr, setArr] = useState({ name:'', fire:1, medical:0, police:0, vehicles:{} });
  const [unitGroup, setUnitGroup] = useState({ name:'', unit_ids:[] });
  const [specialtyChoices, setSpecialtyChoices] = useState({});

  const facilities = game.facilities || [];
  const patients = game.patients || [];
  const prisoners = game.prisoners || [];
  const trainings = game.trainings || [];
  const hospitals = facilities.filter(facility => facility.type === 'hospital' && (!facility.operational_at || facility.operational_at <= game.elapsed));
  const prisons = facilities.filter(facility => facility.type === 'prison' && (!facility.operational_at || facility.operational_at <= game.elapsed));
  const academy = facilities.some(facility => facility.type === 'academy' && (!facility.operational_at || facility.operational_at <= game.elapsed));
  const definition = world.facility_catalog[facilityType];
  const buildPrice = Math.round(definition.cost * (1 + facilities.length * .12));
  const selectedCourse = world.training_catalog.find(item => item.id === course);
  const compatibleBases = useMemo(() => game.bases.filter(base => base.service === selectedCourse?.service), [game.bases, selectedCourse]);

  const run = async (kind, data, success) => {
    const next = await act(kind, data);
    if (next && success) toast.success(success);
    return next;
  };
  const build = async () => {
    if (await run('build_facility', { type:facilityType, site_id:site, command_center_id:commandCenterId }, 'Construção da instalação iniciada.')) setBuildOpen(false);
  };
  const occupancy = facility => facility.type === 'hospital'
    ? patients.filter(patient => patient.hospital_id === facility.id && ['transporting','admitted'].includes(patient.status)).length
    : facility.type === 'prison'
      ? prisoners.filter(prisoner => prisoner.prison_id === facility.id && ['transporting','detained'].includes(prisoner.status)).length
      : trainings.filter(training => training.status === 'active').reduce((sum, training) => sum + training.count, 0);
  const destinationFor = (item, list) => destinations[item.id] || list[0]?.id || '';
  const chooseCourse = id => {
    setCourse(id);
    const item = world.training_catalog.find(candidate => candidate.id === id);
    setTrainingBase(game.bases.find(base => base.service === item?.service)?.id || '');
  };

  return <main className="management-page operations-page">
    <div className="page-heading">
      <div><span className="page-eyebrow">APOIO OPERACIONAL</span><h1>Operações e apoio</h1><p>Coordena o transporte de vítimas e detidos, a formação, o patrulhamento e a mobilização de meios.</p></div>
      <Button className="primary-button" onClick={() => setBuildOpen(true)}><Plus size={16} /> Construir instalação</Button>
    </div>

    <div className="operations-tabs" role="tablist">{[
      ['facilities','Instalações',Building2],
      ['aftercare','Vítimas e detidos',HeartPulse],
      ['training','Formação',Users],
      ['automation','Patrulhas e RAR',Target],
    ].map(([id,label,Icon]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div>

    {tab === 'facilities' && <>
      <div className="operations-summary">
        <div><HeartPulse size={18} /><span>Vítimas a aguardar</span><strong>{patients.filter(patient => patient.status === 'waiting').length}</strong></div>
        <div><ShieldCheck size={18} /><span>Detidos a aguardar</span><strong>{prisoners.filter(prisoner => prisoner.status === 'waiting').length}</strong></div>
        <div><Users size={18} /><span>Em formação</span><strong>{trainings.filter(training => training.status === 'active').reduce((sum, training) => sum + training.count, 0)}</strong></div>
      </div>
      <div className="section-line"><h2>Infraestrutura de apoio</h2><span>{facilities.length} INSTALAÇÕES</span></div>
      <div className="facility-grid">{facilities.map(facility => {
        const info = world.facility_catalog[facility.type], Icon = FACILITY_LABELS[facility.type].icon;
        return <article className="facility-card" key={facility.id}>
          <div className="facility-card-top"><span><Icon size={16} />{FACILITY_LABELS[facility.type].eyebrow}</span><b>{facility.operational_at > game.elapsed ? `OBRAS · ${Math.ceil((facility.operational_at-game.elapsed)/60)} MIN` : `NÍVEL ${facility.level}`}</b></div>
          <h3>{facility.name}</h3><p>{facility.city} · {info.name}</p>
          <div className="facility-meter"><span>{facility.type === 'hospital' ? 'Camas ocupadas' : facility.type === 'prison' ? 'Celas ocupadas' : 'Lugares em uso'}</span><strong>{occupancy(facility)}/{facility.capacity}</strong><i><b style={{ width:`${Math.min(100, occupancy(facility) / facility.capacity * 100)}%` }} /></i></div>
          {facility.type==='hospital'&&<div className="hospital-specialties"><div>{(facility.specialties||['urgency']).map(id=><span key={id}>{world.hospital_specialties.find(item=>item.id===id)?.name||id}</span>)}</div>{world.hospital_specialties.some(item=>!(facility.specialties||[]).includes(item.id))&&<label>Nova especialidade<select value={specialtyChoices[facility.id]||world.hospital_specialties.find(item=>!(facility.specialties||[]).includes(item.id))?.id} onChange={event=>setSpecialtyChoices(current=>({...current,[facility.id]:event.target.value}))}>{world.hospital_specialties.filter(item=>!(facility.specialties||[]).includes(item.id)).map(item=><option value={item.id} key={item.id}>{item.name} · {money(item.cost)}</option>)}</select><button onClick={()=>run('add_hospital_specialty',{facility_id:facility.id,specialty_id:specialtyChoices[facility.id]||world.hospital_specialties.find(item=>!(facility.specialties||[]).includes(item.id))?.id},'Especialidade hospitalar disponível.')}><Plus size={13}/> Instalar</button></label>}</div>}
          <button disabled={busy || facility.operational_at > game.elapsed || game.money < 3500 * facility.level} onClick={() => run('upgrade_facility', { facility_id:facility.id }, 'Instalação ampliada.')}><ArrowUpRight size={14} /> Ampliar · {money(3500 * facility.level)}</button>
        </article>;
      })}{!facilities.length && <div className="operations-empty"><Building2 size={28} /><strong>A rede ainda não tem instalações de apoio</strong><p>Constrói instalações de apoio para o transporte hospitalar, a custódia de detidos e a formação de equipas.</p></div>}</div>
    </>}

    {tab === 'aftercare' && <>
      <div className="queue-board">
        <section><div className="section-line"><h2>Vítimas</h2><span>{patients.filter(patient => !['discharged'].includes(patient.status)).length} ATIVAS</span></div>
          <div className="case-list">{patients.filter(patient => patient.status !== 'discharged').map(patient => <article key={patient.id}>
            <span className={`case-severity s${patient.severity}`}>G{patient.severity}</span><div><strong>{patient.incident}</strong><small>{patient.city} · {patient.needs_doctor ? 'Apoio médico necessário' : 'Transporte hospitalar'} · {patient.specialty === 'trauma' ? 'Trauma' : 'Urgência'}</small></div>
            <span className={`case-status ${patient.status}`}>{patient.status === 'waiting' ? 'Aguarda transporte' : patient.status === 'transporting' ? 'Em transporte' : 'Internada'}</span>
            {patient.status === 'waiting' && <div className="case-action"><select value={destinationFor(patient,hospitals)} onChange={event => setDestinations(current => ({...current,[patient.id]:event.target.value}))}>{hospitals.map(hospital => <option value={hospital.id} key={hospital.id}>{hospital.name}</option>)}</select><Button disabled={busy || !hospitals.length} onClick={() => run('transport_patient', { patient_id:patient.id, facility_id:destinationFor(patient,hospitals) }, 'Transporte hospitalar iniciado.')}><CarFront size={14} /> Transportar</Button></div>}
          </article>)}{!patients.some(patient => patient.status !== 'discharged') && <div className="operations-empty compact"><HeartPulse size={23} /><p>Sem vítimas a aguardar.</p></div>}</div>
        </section>
        <section><div className="section-line"><h2>Detidos</h2><span>{prisoners.filter(prisoner => prisoner.status !== 'released').length} ATIVOS</span></div>
          <div className="case-list">{prisoners.filter(prisoner => prisoner.status !== 'released').map(prisoner => <article key={prisoner.id}>
            <span className="case-severity custody"><ShieldCheck size={14} /></span><div><strong>{prisoner.incident}</strong><small>{prisoner.city} · Custódia policial</small></div>
            <span className={`case-status ${prisoner.status}`}>{prisoner.status === 'waiting' ? 'Aguarda transporte' : prisoner.status === 'transporting' ? 'Em transporte' : 'Em cela'}</span>
            {prisoner.status === 'waiting' && <div className="case-action"><select value={destinationFor(prisoner,prisons)} onChange={event => setDestinations(current => ({...current,[prisoner.id]:event.target.value}))}>{prisons.map(prison => <option value={prison.id} key={prison.id}>{prison.name}</option>)}</select><Button disabled={busy || !prisons.length} onClick={() => run('transport_prisoner', { prisoner_id:prisoner.id, facility_id:destinationFor(prisoner,prisons) }, 'Transporte de detido iniciado.')}><CarFront size={14} /> Transportar</Button></div>}
          </article>)}{!prisoners.some(prisoner => prisoner.status !== 'released') && <div className="operations-empty compact"><ShieldCheck size={23} /><p>Sem detidos a aguardar.</p></div>}</div>
        </section>
      </div>
    </>}

    {tab === 'training' && <>
      <div className="training-console">
        <div><span className="page-eyebrow">PLANO DE FORMAÇÃO</span><h2>Formação de equipas</h2><p>Inscreve os elementos nos cursos necessários aos meios especializados. Durante a formação, ficam indisponíveis para o serviço.</p></div>
        <label>Curso<select value={course} onChange={event => chooseCourse(event.target.value)}>{world.training_catalog.map(item => <option value={item.id} key={item.id}>{item.name} · {SERVICE[item.service].name}</option>)}</select></label>
        <label>Base<select value={trainingBase} onChange={event => setTrainingBase(event.target.value)}>{compatibleBases.map(base => <option value={base.id} key={base.id}>{base.name}</option>)}</select></label>
        <label>Elementos<input type="number" min="1" max="5" value={trainingCount} onChange={event => setTrainingCount(event.target.value)} /></label>
        <Button disabled={busy || !academy || !trainingBase || game.money < (selectedCourse?.cost || 0) * trainingCount} onClick={() => run('start_training', { base_id:trainingBase, course, count:Number(trainingCount) }, 'Formação iniciada.')}><Users size={15} />{academy ? `Iniciar · ${money((selectedCourse?.cost || 0) * trainingCount)}` : 'Requer escola de formação'}</Button>
      </div>
      <div className="section-line"><h2>Formações em curso</h2><span>{trainings.filter(item => item.status === 'active').length} CURSOS</span></div>
      <div className="training-list">{trainings.filter(item => item.status === 'active').map(item => <article key={item.id}><Clock3 size={18} /><div><strong>{world.training_catalog.find(course => course.id === item.course)?.name}</strong><small>{game.bases.find(base => base.id === item.base_id)?.name} · {item.count} elemento(s)</small></div><b>{duration(item.completes_at-game.elapsed)}</b></article>)}{!trainings.some(item => item.status === 'active') && <div className="operations-empty compact"><Users size={23} /><p>Sem formações em curso.</p></div>}</div>
      <div className="section-line"><h2>Qualificações disponíveis</h2><span>PESSOAL FORMADO</span></div>
      <div className="qualification-grid">{game.bases.map(base => <article key={base.id}><ServiceIcon service={base.service} size={18} /><div><strong>{base.name}</strong><small>{Object.entries(base.qualifications || {}).filter(([,count]) => count).map(([id,count]) => `${world.training_catalog.find(course => course.id === id)?.name}: ${count}`).join(' · ') || 'Sem qualificações especializadas'}</small></div></article>)}</div>
      <div className="section-line"><h2>Efetivo individual</h2><span>{game.personnel?.length || 0} ELEMENTOS</span></div>
      <div className="personnel-grid">{(game.personnel||[]).map(person=>{const base=game.bases.find(item=>item.id===person.base_id),unit=game.units.find(item=>item.id===person.unit_id);return <article key={person.id}><span className={`person-status ${person.status}`}/><div><strong>{person.name}</strong><small>{base?.name} · {unit?unit.name:person.status==='training'?'Em formação':'Disponível'}{person.qualifications?.length?` · ${person.qualifications.map(id=>world.training_catalog.find(course=>course.id===id)?.name||id).join(', ')}`:''}</small></div><button disabled={busy||!!person.unit_id||person.status!=='available'} title="Dispensar elemento" aria-label={`Dispensar ${person.name}`} onClick={()=>act('dismiss_personnel',{person_id:person.id})}><UserMinus size={14}/></button></article>})}</div>
    </>}

    {tab === 'automation' && <div className="automation-grid">
      <section><div className="section-line"><h2>Patrulhas</h2><span>POSICIONAMENTO DINÂMICO</span></div><p className="section-copy">Uma patrulha responde a partir do ponto onde está posicionada, reduzindo o tempo de chegada nessa zona.</p>
        <div className="patrol-list">{game.units.filter(unit => unit.service === 'police').map(unit => <article key={unit.id}><CarFront size={17} /><div><strong>{unit.name}</strong><small>{STATUS[unit.status] || unit.status} · {game.bases.find(base => base.id === unit.base_id)?.name}</small></div><button disabled={busy || !['available','patrol'].includes(unit.status)} className={unit.status === 'patrol' ? 'active' : ''} onClick={() => run('toggle_patrol', { unit_id:unit.id }, unit.status === 'patrol' ? 'Viatura recolhida.' : 'Patrulha iniciada.')}>{unit.status === 'patrol' ? 'Recolher' : 'Patrulhar'}</button></article>)}</div>
      </section>
      <section><div className="section-line"><h2>Regulamentos de alarme e resposta</h2><span>RAR</span></div><p className="section-copy">Define conjuntos de meios e mobiliza-os através do regulamento adequado à ocorrência.</p>
        <div className="arr-list">{(game.arrs || []).map(item => <article key={item.id}><Target size={16} /><div><strong>{item.name}</strong><small>{[...Object.entries(item.resources||{}).filter(([,count]) => count).map(([service,count]) => `${count} ${SERVICE[service].short}`),...Object.entries(item.vehicles||{}).filter(([,count])=>count).map(([type,count])=>`${count} ${Object.values(world.vehicle_catalog).flat().find(vehicle=>vehicle.id===type)?.name||type}`)].join(' · ')}</small></div>{!String(item.id).startsWith('arr-') && <button aria-label={`Eliminar ${item.name}`} onClick={() => act('delete_arr',{arr_id:item.id})}><Trash2 size={14} /></button>}</article>)}</div>
        <div className="arr-builder advanced"><input placeholder="Nome do regulamento" value={arr.name} onChange={event => setArr(current => ({...current,name:event.target.value}))} />{Object.keys(SERVICE).map(service => <label key={service}>{SERVICE[service].short}<input type="number" min="0" max="9" value={arr[service]} onChange={event => setArr(current => ({...current,[service]:event.target.value}))} /></label>)}<div className="arr-vehicle-builder"><strong>VIATURAS ESPECÍFICAS</strong>{Object.entries(world.vehicle_catalog).flatMap(([service,vehicles])=>vehicles.map(vehicle=><label key={vehicle.id}><span style={{color:SERVICE[service].color}}>{vehicle.name}</span><input type="number" min="0" max="9" value={arr.vehicles[vehicle.id]||0} onChange={event=>setArr(current=>({...current,vehicles:{...current.vehicles,[vehicle.id]:event.target.value}}))}/></label>))}</div><Button disabled={busy} onClick={async () => {if(await run('save_arr',{...arr},'RAR guardado.'))setArr({name:'',fire:1,medical:0,police:0,vehicles:{}});}}><Plus size={14} /> Guardar RAR</Button></div>
        <div className="section-line"><h2>Grupos de meios</h2><span>VIATURAS CONCRETAS</span></div>
        <div className="arr-list">{(game.unit_groups||[]).map(group=><article key={group.id}><CarFront size={16}/><div><strong>{group.name}</strong><small>{group.unit_ids.map(id=>game.units.find(unit=>unit.id===id)?.name).filter(Boolean).join(' · ')}</small></div><button aria-label={`Eliminar ${group.name}`} onClick={()=>act('delete_unit_group',{group_id:group.id})}><Trash2 size={14}/></button></article>)}</div>
        <div className="arr-builder advanced unit-group-builder"><input placeholder="Nome do grupo" value={unitGroup.name} onChange={event=>setUnitGroup(current=>({...current,name:event.target.value}))}/><div className="arr-vehicle-builder"><strong>VIATURAS DO GRUPO</strong>{game.units.map(unit=><label key={unit.id}><span style={{color:SERVICE[unit.service].color}}>{unit.name}</span><input type="checkbox" checked={unitGroup.unit_ids.includes(unit.id)} onChange={()=>setUnitGroup(current=>({...current,unit_ids:current.unit_ids.includes(unit.id)?current.unit_ids.filter(id=>id!==unit.id):[...current.unit_ids,unit.id]}))}/></label>)}</div><Button disabled={busy||!unitGroup.name.trim()||!unitGroup.unit_ids.length} onClick={async()=>{if(await run('save_unit_group',unitGroup,'Grupo de meios guardado.'))setUnitGroup({name:'',unit_ids:[]});}}><Plus size={14}/> Guardar grupo</Button></div>
      </section>
    </div>}

    <Dialog open={buildOpen} onOpenChange={setBuildOpen}><DialogContent className="game-modal"><div className="modal-eyebrow"><Building2 size={15} /> INFRAESTRUTURA DE APOIO</div><DialogTitle>Construir instalação</DialogTitle><DialogDescription>Estas instalações desbloqueiam transporte, internamento, custódia e formação.</DialogDescription><label className="field-label">Centro de Comando<select value={commandCenterId} onChange={event=>setCommandCenterId(event.target.value)}>{(game.command_centers||[]).filter(center=>center.active!==false).map(center=><option value={center.id} key={center.id}>{center.name}</option>)}</select></label><label className="field-label">Tipo<select value={facilityType} onChange={event => setFacilityType(event.target.value)}>{Object.entries(world.facility_catalog).map(([id,item]) => <option value={id} key={id}>{item.name}</option>)}</select></label><label className="field-label">Localização<select value={site} onChange={event => setSite(event.target.value)}>{world.sites.map(option => <option value={option.id} key={option.id} disabled={facilities.some(facility => facility.type === facilityType && facility.node === option.node)}>{option.name}</option>)}</select></label><div className="purchase-total"><span>Capacidade inicial</span><b>{definition.capacity}</b><strong>{money(buildPrice)}</strong></div><Button className="primary-button" disabled={busy || !commandCenterId || game.money < buildPrice} onClick={build}><Building2 size={16} /> Construir {definition.name.toLowerCase()}</Button></DialogContent></Dialog>
  </main>;
}
