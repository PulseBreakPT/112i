import { useMemo, useState } from 'react';
import {
  Activity, BookOpen, Building2, CarFront, CheckCircle2, ChevronRight, CircleDollarSign,
  GraduationCap, HeartPulse, Layers3, LockKeyhole, MapPin, Radio, Search,
  ShieldCheck, Siren, Users, Wrench
} from 'lucide-react';
import { buildIncidentDoctrine, MISSION_CATEGORIES, RARITY_LEVELS } from './engines/missionDoctrine';
import './Wiki.css';

const SERVICE_META = {
  fire: { label:'Bombeiros', icon:Siren },
  medical: { label:'Emergência médica', icon:HeartPulse },
  police: { label:'Polícia', icon:ShieldCheck },
  multi: { label:'Operação conjunta', icon:Layers3 },
  all: { label:'Todos os serviços', icon:Radio },
};

const SECTIONS = [
  ['overview','Visão geral',BookOpen],
  ['missions','Missões',Radio],
  ['vehicles','Viaturas',CarFront],
  ['buildings','Edifícios',Building2],
  ['training','Formação',GraduationCap],
  ['systems','Sistemas',Wrench],
  ['progression','Progressão',Activity],
];

const money = value => new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
const duration = seconds => {
  const value=Math.max(0,Number(seconds)||0);
  if(value>=3600)return Math.round(value/3600)+' h';
  return Math.round(value/60)+' min';
};
const serviceLabel = service => SERVICE_META[service]?.label || service || 'Operação';
const rangeLabel = range => Array.isArray(range) ? (range[0]===range[1] ? String(range[0]) : range[0]+'–'+range[1]) : '—';
const requirementLevel = definition => {
  const complexity=Object.values(definition.min||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const specialist=(definition.extension||[]).length+(definition.vehicle||[]).length;
  return Math.max(1,Math.min(6,Math.ceil(complexity/2)+(specialist?1:0)));
};
const humanize = text => String(text||'').replaceAll('-',' ').replace(/\b\w/g,char=>char.toUpperCase());

function ServiceBadge({service}){
  const Meta=SERVICE_META[service]||SERVICE_META.multi;
  const Icon=Meta.icon;
  return <span className="wiki-service-badge" data-service={service||'multi'}><Icon size={13}/>{Meta.label}</span>;
}

function StatusBadge({unlocked,labelUnlocked='Desbloqueado',labelLocked='Bloqueado'}){
  return <span className="wiki-status" data-unlocked={unlocked?'true':'false'}>
    {unlocked?<CheckCircle2 size={13}/>:<LockKeyhole size={13}/>}
    {unlocked?labelUnlocked:labelLocked}
  </span>;
}

function Stat({label,value,detail,icon:Icon}){
  return <div className="wiki-stat">
    {Icon&&<Icon size={17}/>}
    <div><small>{label}</small><strong>{value}</strong>{detail&&<span>{detail}</span>}</div>
  </div>;
}

function ChipList({items=[],nameFor=id=>humanize(id),empty='Nenhum'}){
  if(!items.length)return <span className="wiki-empty-inline">{empty}</span>;
  return <div className="wiki-chip-list">{items.map(item=><span key={String(item)}>{nameFor(item)}</span>)}</div>;
}

export default function Wiki({game,world}){
  const [section,setSection]=useState('overview');
  const [query,setQuery]=useState('');
  const [service,setService]=useState('all');
  const [selected,setSelected]=useState(null);

  const scenarioMap=useMemo(()=>Object.fromEntries((world.scenarios||[]).map((scenario,index)=>[index,scenario])),[world.scenarios]);
  const vehicles=useMemo(()=>Object.entries(world.vehicle_catalog||{}).flatMap(([vehicleService,list])=>
    list.map(vehicle=>({...vehicle,service:vehicleService,type:'vehicle'}))
  ),[world.vehicle_catalog]);
  const vehicleMap=useMemo(()=>Object.fromEntries(vehicles.map(vehicle=>[vehicle.id,vehicle])),[vehicles]);
  const activeExtensions=useMemo(()=>new Set((game.bases||[]).flatMap(base=>(base.extensions||[]).filter(item=>item.active).map(item=>item.id))),[game.bases]);

  const missions=useMemo(()=>(world.mission_definitions||[]).map(definition=>{
    const scenario=scenarioMap[definition.scenario]||{};
    const doctrine=buildIncidentDoctrine(definition,{
      title:definition.name,
      service:scenario.service,
      priority:scenario.priority,
      needs:scenario.needs||definition.min,
      description:scenario.description,
    });
    const level=requirementLevel(definition);
    const unlocked=(game.progression?.unlocked_missions||[]).includes(definition.scenario);
    const primaryService=scenario.service||Object.keys(scenario.needs||definition.min||{})[0]||'multi';
    return {
      ...definition,
      type:'mission',
      scenarioData:scenario,
      doctrine,
      requiredLevel:level,
      unlocked,
      service:primaryService,
    };
  }),[world.mission_definitions,scenarioMap,game.progression]);

  const facilities=useMemo(()=>Object.entries(world.facility_catalog||{}).map(([id,item])=>({id,...item,type:'facility'})),[world.facility_catalog]);
  const trainings=useMemo(()=>(world.training_catalog||[]).map(item=>({...item,type:'training'})),[world.training_catalog]);
  const serviceBuildings=useMemo(()=>Object.entries(world.services||{}).map(([id,item])=>({
    id,
    ...item,
    type:'base',
    current:(game.bases||[]).filter(base=>base.service===id).length,
    extensions:(world.extensions||{})[id]||[],
    specializations:(world.specializations||{})[id]||[],
  })),[world.services,world.extensions,world.specializations,game.bases]);

  const vehicleUnlocked=vehicle=>{
    if((game.level||1)<(vehicle.level||1))return false;
    if(vehicle.extension&&!activeExtensions.has(vehicle.extension))return false;
    return true;
  };

  const missionMatches=(mission,text)=>{
    const haystack=[
      mission.name, mission.difficulty, mission.doctrine?.rarity_label, mission.doctrine?.category_label,
      mission.poi, mission.scenarioData?.description, serviceLabel(mission.service),
      ...(mission.vehicle||[]).map(id=>vehicleMap[id]?.name||id),
      ...(mission.doctrine?.recommended_vehicle_types||[]).map(id=>vehicleMap[id]?.name||id),
    ].join(' ').toLowerCase();
    return haystack.includes(text);
  };
  const genericMatches=(item,text)=>[
    item.name,item.id,item.service,serviceLabel(item.service),item.training,item.extension,
    ...(item.capabilities||[]),...(item.equipment||[]),...(item.equipment_installed||[])
  ].join(' ').toLowerCase().includes(text);

  const filterText=query.trim().toLowerCase();
  const filteredMissions=missions.filter(item=>(service==='all'||item.service===service||Object.keys(item.scenarioData?.needs||{}).includes(service))&&(!filterText||missionMatches(item,filterText)));
  const filteredVehicles=vehicles.filter(item=>(service==='all'||item.service===service)&&(!filterText||genericMatches(item,filterText)));
  const filteredBuildings=[...serviceBuildings,...facilities].filter(item=>(service==='all'||item.service===service||item.service==='all'||item.id===service)&&(!filterText||genericMatches(item,filterText)));
  const filteredTrainings=trainings.filter(item=>(service==='all'||item.service===service)&&(!filterText||genericMatches(item,filterText)));

  const choose=(type,id)=>setSelected({type,id});
  const selectedMission=selected?.type==='mission'?missions.find(item=>item.scenario===selected.id):null;
  const selectedVehicle=selected?.type==='vehicle'?vehicles.find(item=>item.id===selected.id):null;
  const selectedBuilding=selected?.type==='base'?serviceBuildings.find(item=>item.id===selected.id):selected?.type==='facility'?facilities.find(item=>item.id===selected.id):null;
  const selectedTraining=selected?.type==='training'?trainings.find(item=>item.id===selected.id):null;

  const currentSectionLabel=SECTIONS.find(item=>item[0]===section)?.[1]||'Wiki';
  const unlockedMissionCount=missions.filter(item=>item.unlocked).length;
  const unlockedVehicleCount=vehicles.filter(vehicleUnlocked).length;
  const completedTrainings=(game.trainings||[]).filter(item=>item.status==='completed').length;

  const vehicleName=id=>vehicleMap[id]?.name||humanize(id);
  const serviceRequirement=needs=>Object.entries(needs||{}).map(([key,value])=>serviceLabel(key)+' × '+value);

  const renderMissionDetail=mission=>{
    const scenario=mission.scenarioData||{},doctrine=mission.doctrine||{};
    return <div className="wiki-detail-content">
      <div className="wiki-detail-title"><div><small>MISSÃO #{mission.scenario}</small><h2>{mission.name}</h2></div><StatusBadge unlocked={mission.unlocked}/></div>
      <div className="wiki-detail-tags"><ServiceBadge service={mission.service}/><span>{doctrine.rarity_label}</span><span>{doctrine.category_label}</span></div>
      {scenario.description&&<p className="wiki-detail-description">{scenario.description}</p>}
      <div className="wiki-detail-stats">
        <Stat label="Nível sugerido" value={mission.requiredLevel}/>
        <Stat label="Risco" value={(doctrine.risk_score||0)+'/100'}/>
        <Stat label="Recompensa" value={scenario.reward?money(scenario.reward):'Variável'} icon={CircleDollarSign}/>
        <Stat label="Experiência" value={scenario.xp?scenario.xp+' XP':'Variável'}/>
      </div>
      <section><h3>Resposta operacional</h3>
        <dl className="wiki-definition-list">
          <div><dt>Meios por serviço</dt><dd><ChipList items={serviceRequirement(scenario.needs||mission.min)} nameFor={value=>value}/></dd></div>
          <div><dt>Viaturas obrigatórias</dt><dd><ChipList items={doctrine.mandatory_vehicle_types} nameFor={vehicleName}/></dd></div>
          <div><dt>Viaturas recomendadas</dt><dd><ChipList items={doctrine.recommended_vehicle_types} nameFor={vehicleName}/></dd></div>
          <div><dt>Apoio útil</dt><dd><ChipList items={doctrine.support_vehicle_types} nameFor={vehicleName}/></dd></div>
          <div><dt>Formação obrigatória</dt><dd><ChipList items={doctrine.mandatory_trainings} /></dd></div>
        </dl>
      </section>
      <section><h3>Geração e consequências</h3>
        <dl className="wiki-definition-list">
          <div><dt>Edifícios mínimos</dt><dd><ChipList items={serviceRequirement(mission.min)} nameFor={value=>value}/></dd></div>
          <div><dt>Extensões</dt><dd><ChipList items={mission.extension||[]}/></dd></div>
          <div><dt>POI</dt><dd>{mission.poi?humanize(mission.poi):'Qualquer localização compatível'}</dd></div>
          <div><dt>Vítimas possíveis</dt><dd>{rangeLabel(mission.victims)}</dd></div>
          <div><dt>Detidos possíveis</dt><dd>{rangeLabel(mission.prisoners)}</dd></div>
          <div><dt>Deterioração clínica</dt><dd>{duration(doctrine.clinical_interval)}</dd></div>
          <div><dt>Peso de geração</dt><dd>{mission.weight||'—'}</dd></div>
          {mission.false_alarm_chance!=null&&<div><dt>Falso alarme</dt><dd>{Math.round(mission.false_alarm_chance*100)}%</dd></div>}
        </dl>
      </section>
      {scenario.caller&&<section><h3>Triagem telefónica</h3><div className="wiki-callout"><Radio size={16}/><p>{scenario.caller}</p></div>
        {Array.isArray(scenario.choices)&&<div className="wiki-choice-list">{scenario.choices.map((choice,index)=><div key={choice} data-correct={index===scenario.correct?'true':'false'}>{index===scenario.correct?<CheckCircle2 size={14}/>:<span>{index+1}</span>}<p>{choice}</p></div>)}</div>}
      </section>}
    </div>;
  };

  const renderVehicleDetail=vehicle=>{
    const unlocked=vehicleUnlocked(vehicle);
    const equipment=vehicle.equipment_installed||vehicle.equipment||[];
    return <div className="wiki-detail-content">
      <div className="wiki-detail-title"><div><small>{vehicle.id.toUpperCase()}</small><h2>{vehicle.name}</h2></div><StatusBadge unlocked={unlocked}/></div>
      <div className="wiki-detail-tags"><ServiceBadge service={vehicle.service}/><span>Nível {vehicle.level}</span>{vehicle.vehicle_class&&<span>{humanize(vehicle.vehicle_class)}</span>}</div>
      <div className="wiki-vehicle-hero">
        <img src={process.env.PUBLIC_URL+'/assets/vehicles/'+vehicle.id+'.webp'} alt="" onError={event=>{event.currentTarget.style.display='none';}}/>
        <div><strong>{money(vehicle.price)}</strong><span>{vehicle.crew} elementos de guarnição</span></div>
      </div>
      <div className="wiki-detail-stats">
        <Stat label="Fiabilidade" value={(vehicle.reliability??0)+'%'}/>
        <Stat label="Preparação" value={(vehicle.preparation_time??0)+' s'}/>
        <Stat label="Alcance recomendado" value={(vehicle.recommended_response_km??0)+' km'}/>
        <Stat label="Custo / km" value={money(vehicle.operating_cost_per_km||0)}/>
      </div>
      <section><h3>Características técnicas</h3><dl className="wiki-definition-list">
        <div><dt>Classe</dt><dd>{humanize(vehicle.vehicle_class)}</dd></div>
        <div><dt>Dimensão</dt><dd>{humanize(vehicle.size_class)}</dd></div>
        <div><dt>Velocidade operacional</dt><dd>{Math.round((vehicle.speed_multiplier||1)*100)}%</dd></div>
        <div><dt>Manobrabilidade</dt><dd>{vehicle.maneuverability??'—'}/100</dd></div>
        <div><dt>Todo-o-terreno</dt><dd>{vehicle.offroad??'—'}/100</dd></div>
        <div><dt>Resistência meteorológica</dt><dd>{vehicle.weather_resistance??'—'}/100</dd></div>
        <div><dt>Combustível</dt><dd>{vehicle.fuel_capacity_l??'—'} L · {vehicle.fuel_consumption_l_100km??'—'} L/100 km</dd></div>
        <div><dt>Capacidade de doentes</dt><dd>{vehicle.patient_capacity||0}</dd></div>
        <div><dt>Capacidade de detidos</dt><dd>{vehicle.detainee_capacity||0}</dd></div>
        <div><dt>Extensão necessária</dt><dd>{vehicle.extension?humanize(vehicle.extension):'Nenhuma'}</dd></div>
        <div><dt>Formação</dt><dd>{vehicle.training?humanize(vehicle.training):'Formação geral'}</dd></div>
      </dl></section>
      <section><h3>Capacidades</h3><ChipList items={vehicle.capabilities||[]}/></section>
      <section><h3>Equipamento</h3><ChipList items={equipment}/></section>
    </div>;
  };

  const renderBuildingDetail=item=>{
    if(item.type==='facility')return <div className="wiki-detail-content">
      <div className="wiki-detail-title"><div><small>INSTALAÇÃO</small><h2>{item.name}</h2></div></div>
      <div className="wiki-detail-tags"><ServiceBadge service={item.service}/></div>
      <div className="wiki-detail-stats"><Stat label="Construção" value={money(item.cost)}/><Stat label="Capacidade base" value={item.capacity}/></div>
      <section><h3>Função</h3><p className="wiki-detail-description">{item.id==='hospital'?'Recebe vítimas transportadas e suporta especialidades clínicas.':item.id==='prison'?'Recebe detidos transportados pelas unidades policiais.':'Permite formar efetivos para funções e meios especializados.'}</p></section>
    </div>;
    return <div className="wiki-detail-content">
      <div className="wiki-detail-title"><div><small>BASE OPERACIONAL</small><h2>{item.name}</h2></div></div>
      <div className="wiki-detail-tags"><ServiceBadge service={item.id}/><span>{item.current} construída(s)</span></div>
      <div className="wiki-detail-stats"><Stat label="Custo base" value={money(item.base_price)}/><Stat label="Viatura inicial" value={item.short}/></div>
      <section><h3>Extensões</h3><div className="wiki-stack">{item.extensions.map(extension=><article key={extension.id}><div><strong>{extension.name}</strong><span>Nível {extension.level}</span></div><b>{money(extension.cost)}</b></article>)}</div></section>
      <section><h3>Especializações</h3><ChipList items={item.specializations.map(entry=>entry.name)} nameFor={value=>value}/></section>
    </div>;
  };

  const renderTrainingDetail=item=>{
    const relevant=(game.trainings||[]).filter(training=>training.training===item.id||training.type===item.id);
    const completed=relevant.filter(training=>training.status==='completed').reduce((sum,training)=>sum+(training.count||1),0);
    const active=relevant.filter(training=>training.status==='active').reduce((sum,training)=>sum+(training.count||1),0);
    return <div className="wiki-detail-content">
      <div className="wiki-detail-title"><div><small>FORMAÇÃO</small><h2>{item.name}</h2></div></div>
      <div className="wiki-detail-tags"><ServiceBadge service={item.service}/></div>
      <div className="wiki-detail-stats"><Stat label="Custo / elemento" value={money(item.cost)}/><Stat label="Duração" value={duration(item.duration)}/><Stat label="Concluídas" value={completed}/><Stat label="Em curso" value={active}/></div>
    </div>;
  };

  const detail=selectedMission?renderMissionDetail(selectedMission):selectedVehicle?renderVehicleDetail(selectedVehicle):selectedBuilding?renderBuildingDetail(selectedBuilding):selectedTraining?renderTrainingDetail(selectedTraining):null;

  const missionCard=mission=><button className="wiki-card wiki-mission-card" key={mission.scenario} onClick={()=>choose('mission',mission.scenario)} data-selected={selectedMission?.scenario===mission.scenario?'true':'false'}>
    <div className="wiki-card-top"><span>#{mission.scenario}</span><StatusBadge unlocked={mission.unlocked}/></div>
    <h3>{mission.name}</h3>
    <div className="wiki-card-meta"><ServiceBadge service={mission.service}/><span>{mission.doctrine.rarity_label}</span><span>Risco {mission.doctrine.risk_score}</span></div>
    <div className="wiki-card-foot"><span>Nível {mission.requiredLevel}</span><span>{mission.scenarioData?.reward?money(mission.scenarioData.reward):mission.difficulty||mission.doctrine.category_label}</span><ChevronRight size={15}/></div>
  </button>;

  const vehicleCard=vehicle=><button className="wiki-card wiki-vehicle-card" key={vehicle.id} onClick={()=>choose('vehicle',vehicle.id)} data-selected={selectedVehicle?.id===vehicle.id?'true':'false'}>
    <div className="wiki-card-image"><img src={process.env.PUBLIC_URL+'/assets/vehicles/'+vehicle.id+'.webp'} alt="" onError={event=>{event.currentTarget.style.display='none';}}/><CarFront size={28}/></div>
    <div className="wiki-card-top"><ServiceBadge service={vehicle.service}/><StatusBadge unlocked={vehicleUnlocked(vehicle)}/></div>
    <h3>{vehicle.name}</h3>
    <div className="wiki-card-meta"><span>Nível {vehicle.level}</span><span>{vehicle.crew} elementos</span>{vehicle.training&&<span>{humanize(vehicle.training)}</span>}</div>
    <div className="wiki-card-foot"><strong>{money(vehicle.price)}</strong><span>{vehicle.recommended_response_km} km recomendados</span><ChevronRight size={15}/></div>
  </button>;

  const buildingCard=item=><button className="wiki-card" key={item.type+'-'+item.id} onClick={()=>choose(item.type,item.id)} data-selected={selectedBuilding?.id===item.id?'true':'false'}>
    <div className="wiki-card-top"><ServiceBadge service={item.type==='base'?item.id:item.service}/><span>{item.type==='base'?'BASE':'INSTALAÇÃO'}</span></div>
    <h3>{item.name}</h3>
    <div className="wiki-card-meta">{item.type==='base'?<><span>{item.current} construída(s)</span><span>{item.extensions.length} extensões</span></>:<><span>Capacidade {item.capacity}</span><span>{serviceLabel(item.service)}</span></>}</div>
    <div className="wiki-card-foot"><strong>{money(item.type==='base'?item.base_price:item.cost)}</strong><ChevronRight size={15}/></div>
  </button>;

  const trainingCard=item=><button className="wiki-card" key={item.id} onClick={()=>choose('training',item.id)} data-selected={selectedTraining?.id===item.id?'true':'false'}>
    <div className="wiki-card-top"><ServiceBadge service={item.service}/><GraduationCap size={15}/></div>
    <h3>{item.name}</h3>
    <div className="wiki-card-meta"><span>{duration(item.duration)}</span><span>{money(item.cost)} / elemento</span></div>
    <div className="wiki-card-foot"><span>{humanize(item.id)}</span><ChevronRight size={15}/></div>
  </button>;

  return <div className="management-page wiki-page">
    <header className="page-heading wiki-heading">
      <div><span className="page-eyebrow">BASE DE CONHECIMENTO OPERACIONAL</span><h1>Wiki Distrito 112</h1><p>Dados vivos do próprio jogo: ocorrências, meios, edifícios, formação e regras de progressão.</p></div>
      <div className="wiki-version"><BookOpen size={16}/><span>Enciclopédia interna</span><strong>{missions.length+vehicles.length+facilities.length+trainings.length}</strong></div>
    </header>

    <div className="wiki-summary">
      <Stat label="Missões" value={missions.length} detail={unlockedMissionCount+' desbloqueadas'} icon={Radio}/>
      <Stat label="Viaturas" value={vehicles.length} detail={unlockedVehicleCount+' disponíveis'} icon={CarFront}/>
      <Stat label="Bases + instalações" value={serviceBuildings.length+facilities.length} detail={(game.bases||[]).length+' bases construídas'} icon={Building2}/>
      <Stat label="Formações" value={trainings.length} detail={completedTrainings+' concluídas'} icon={GraduationCap}/>
    </div>

    <nav className="wiki-tabs" aria-label="Secções da wiki">
      {SECTIONS.map(([id,label,Icon])=><button key={id} className={section===id?'active':''} onClick={()=>{setSection(id);setSelected(null);}}><Icon size={15}/><span>{label}</span></button>)}
    </nav>

    {!['overview','systems','progression'].includes(section)&&<div className="wiki-tools">
      <label className="wiki-search"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder={'Pesquisar em '+currentSectionLabel.toLowerCase()+'…'} data-testid="wiki-search"/></label>
      <div className="wiki-service-filter">
        {['all','fire','medical','police'].map(id=><button key={id} className={service===id?'active':''} onClick={()=>setService(id)}>{id==='all'?'Todos':serviceLabel(id)}</button>)}
      </div>
    </div>}

    {section==='overview'&&<div className="wiki-overview">
      <section className="wiki-intro-panel">
        <div><span className="page-eyebrow">ESTADO ATUAL</span><h2>Nível {game.level} · {unlockedMissionCount}/{missions.length} missões acessíveis</h2><p>A wiki lê os mesmos catálogos e a mesma doutrina usados pela simulação. Quando novas missões, viaturas ou formações forem adicionadas aos dados do jogo, aparecem aqui automaticamente.</p></div>
        <div className="wiki-readiness-ring"><strong>{Math.round((unlockedMissionCount/Math.max(1,missions.length))*100)}%</strong><span>catálogo de missões desbloqueado</span></div>
      </section>
      <div className="wiki-overview-grid">
        <button onClick={()=>setSection('missions')}><Radio/><div><strong>Missões</strong><span>Raridade, risco, requisitos, vítimas, viaturas e triagem.</span></div><ChevronRight/></button>
        <button onClick={()=>setSection('vehicles')}><CarFront/><div><strong>Viaturas</strong><span>Preço, guarnição, capacidades, consumos, equipamento e formação.</span></div><ChevronRight/></button>
        <button onClick={()=>setSection('buildings')}><Building2/><div><strong>Edifícios</strong><span>Bases, instalações, custos, capacidades e extensões.</span></div><ChevronRight/></button>
        <button onClick={()=>setSection('training')}><GraduationCap/><div><strong>Formação</strong><span>Qualificações especializadas, duração e custo por elemento.</span></div><ChevronRight/></button>
        <button onClick={()=>setSection('systems')}><Wrench/><div><strong>Sistemas</strong><span>Raridades, categorias e lógica de desbloqueio das ocorrências.</span></div><ChevronRight/></button>
        <button onClick={()=>setSection('progression')}><Activity/><div><strong>Progressão</strong><span>Estado atual da rede, carreira e capacidade operacional.</span></div><ChevronRight/></button>
      </div>
      <section className="wiki-recent-unlocks"><div className="section-line"><h2>Missões disponíveis no teu nível</h2><span>{unlockedMissionCount} de {missions.length}</span></div><div className="wiki-card-grid">{missions.filter(item=>item.unlocked).slice(0,6).map(missionCard)}</div></section>
    </div>}

    {section==='missions'&&<div className="wiki-content-layout"><div className="wiki-card-grid">{filteredMissions.map(missionCard)}{!filteredMissions.length&&<div className="wiki-empty">Nenhuma missão corresponde aos filtros.</div>}</div>{detail&&<aside className="wiki-detail">{detail}</aside>}</div>}
    {section==='vehicles'&&<div className="wiki-content-layout"><div className="wiki-card-grid">{filteredVehicles.map(vehicleCard)}{!filteredVehicles.length&&<div className="wiki-empty">Nenhuma viatura corresponde aos filtros.</div>}</div>{detail&&<aside className="wiki-detail">{detail}</aside>}</div>}
    {section==='buildings'&&<div className="wiki-content-layout"><div className="wiki-card-grid">{filteredBuildings.map(buildingCard)}{!filteredBuildings.length&&<div className="wiki-empty">Nenhum edifício corresponde aos filtros.</div>}</div>{detail&&<aside className="wiki-detail">{detail}</aside>}</div>}
    {section==='training'&&<div className="wiki-content-layout"><div className="wiki-card-grid">{filteredTrainings.map(trainingCard)}{!filteredTrainings.length&&<div className="wiki-empty">Nenhuma formação corresponde aos filtros.</div>}</div>{detail&&<aside className="wiki-detail">{detail}</aside>}</div>}

    {section==='systems'&&<div className="wiki-systems">
      <section className="wiki-system-panel"><div className="section-line"><h2>Raridades das ocorrências</h2><span>A mesma tabela usada pelo motor</span></div><div className="wiki-rarity-grid">
        {Object.entries(RARITY_LEVELS).map(([level,item])=><article key={level} data-rarity={level}><div><small>NÍVEL {level}</small><strong>{item.label}</strong></div><dl><div><dt>Frequência</dt><dd>{item.frequency}</dd></div><div><dt>Multiplicador</dt><dd>×{item.reward_multiplier.toFixed(2)}</dd></div><div><dt>Clínica</dt><dd>{duration(item.clinical_interval)}</dd></div></dl></article>)}
      </div></section>
      <section className="wiki-system-panel"><div className="section-line"><h2>Categorias</h2><span>{Object.keys(MISSION_CATEGORIES).length} tipologias</span></div><div className="wiki-category-grid">{Object.entries(MISSION_CATEGORIES).map(([id,label])=><article key={id}><span>{humanize(id)}</span><strong>{label}</strong><b>{missions.filter(item=>item.doctrine.category===id).length}</b></article>)}</div></section>
      <section className="wiki-system-panel"><div className="section-line"><h2>Lógica de desbloqueio</h2><span>Aplicada automaticamente</span></div><div className="wiki-logic-flow">
        <article><b>01</b><div><strong>Presença de serviços</strong><p>É necessária pelo menos uma base de cada serviço envolvido na definição da missão.</p></div></article>
        <article><b>02</b><div><strong>Complexidade operacional</strong><p>O nível necessário cresce com o total de edifícios mínimos e com requisitos especializados.</p></div></article>
        <article><b>03</b><div><strong>Local compatível</strong><p>Missões associadas a POI só entram no sorteio quando existe um ponto compatível na área operacional.</p></div></article>
        <article><b>04</b><div><strong>Sorteio por raridade e peso</strong><p>Primeiro é escolhida a classe de raridade disponível; depois o peso individual decide a ocorrência.</p></div></article>
      </div></section>
    </div>}

    {section==='progression'&&<div className="wiki-progression">
      <section className="wiki-intro-panel"><div><span className="page-eyebrow">PERFIL OPERACIONAL</span><h2>Nível {game.level} · {game.xp%200}/200 XP para o próximo ciclo</h2><p>A capacidade de gerar ocorrências aumenta com a carreira e com a expansão territorial, sem penalizar a construção repetida da mesma base.</p></div><div className="wiki-readiness-ring"><strong>{game.trust}%</strong><span>confiança operacional</span></div></section>
      <div className="wiki-progress-grid">
        <Stat label="Orçamento" value={money(game.money)} icon={CircleDollarSign}/>
        <Stat label="Centros de comando" value={(game.command_centers||[]).filter(item=>item.active!==false).length}/>
        <Stat label="Bases" value={(game.bases||[]).length}/>
        <Stat label="Frota" value={(game.units||[]).length}/>
        <Stat label="Efetivo" value={(game.personnel||[]).length} icon={Users}/>
        <Stat label="Ocorrências resolvidas" value={game.completed||0} icon={CheckCircle2}/>
      </div>
      <section className="wiki-system-panel"><div className="section-line"><h2>Rede por serviço</h2><span>Estado atual</span></div><div className="wiki-service-progress">
        {serviceBuildings.map(item=><article key={item.id}><ServiceBadge service={item.id}/><strong>{item.current} base(s)</strong><span>{(game.units||[]).filter(unit=>unit.service===item.id).length} viaturas</span><span>{(game.personnel||[]).filter(person=>person.service===item.id).length} elementos</span><b>Próxima base: {money(game.progression?.next_building_costs?.[item.id]||item.base_price)}</b></article>)}
      </div></section>
      <section className="wiki-system-panel"><div className="section-line"><h2>POI conhecidos</h2><span>{(world.pois||[]).length} pontos</span></div><div className="wiki-poi-grid">{(world.pois||[]).map(poi=><article key={poi.id}><MapPin size={15}/><div><strong>{poi.name}</strong><span>{humanize(poi.type)} · {poi.city}</span></div></article>)}</div></section>
    </div>}
  </div>;
}
