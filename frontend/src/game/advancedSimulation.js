const id = () => globalThis.crypto?.randomUUID?.() || `adv-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const NAMES = ['Alexandre Matos','Alice Rocha','Duarte Lima','Eva Cardoso','Francisco Melo','Helena Pinto','Isaac Moreira','Lara Cunha','Martim Reis','Nádia Vieira','Óscar Tavares','Raquel Faria'];
const DEFAULT_POLICY = {
  reserve_by_service:{fire:1,medical:1,police:1},
  max_response_km:80,
  prefer_fastest:true,
  allow_returning_redirect:true,
  auto_patient_transport:false,
  auto_prisoner_transport:false,
};
const RESOURCE_PROFILE = {
  fire:{water:{capacity:3000,label:'Água',unit:'L'},foam:{capacity:300,label:'Espuma',unit:'L'},fuel:{capacity:100,label:'Combustível',unit:'%'}},
  medical:{oxygen:{capacity:100,label:'Oxigénio',unit:'%'},medical:{capacity:100,label:'Material clínico',unit:'%'},fuel:{capacity:100,label:'Combustível',unit:'%'}},
  police:{equipment:{capacity:100,label:'Equipamento',unit:'%'},fuel:{capacity:100,label:'Combustível',unit:'%'}},
};
const DAILY_TASKS = [
  {metric:'completed',title:'Resolver 4 ocorrências',target:4,reward:1100},
  {metric:'transported',title:'Concluir 2 transportes',target:2,reward:800},
  {metric:'trained',title:'Formar 2 elementos',target:2,reward:700},
];
const WEEKLY_TASKS = [
  {metric:'completed',title:'Resolver 20 ocorrências',target:20,reward:5000},
  {metric:'trust',title:'Manter confiança operacional de 95%',target:95,reward:2200},
];

const resourceState = service => Object.fromEntries(Object.entries(RESOURCE_PROFILE[service] || {}).map(([key,value]) => [key,value.capacity]));
const metricValue = (game,metric) => metric === 'completed' ? game.completed || 0 : metric === 'transported' ? game.operations_metrics?.transported || 0 : metric === 'trained' ? game.operations_metrics?.trained || 0 : metric === 'trust' ? game.trust || 0 : 0;
const makeTask = (game,task,period) => ({id:id(),...task,period,baseline:metricValue(game,task.metric),claimed:false});

export function initializeAdvancedState(game) {
  game.dispatch_policy={...DEFAULT_POLICY,...(game.dispatch_policy||{}),reserve_by_service:{...DEFAULT_POLICY.reserve_by_service,...(game.dispatch_policy?.reserve_by_service||{})}};
  game.recruitment_queue=game.recruitment_queue||[];
  game.medical_transfers=game.medical_transfers||[];
  game.next_auto_planned=game.next_auto_planned||900;
  game.operations_metrics={transported:0,trained:0,...(game.operations_metrics||{})};
  game.rotating_tasks=game.rotating_tasks||{
    cycle:Math.floor((game.elapsed||0)/86400),
    daily:DAILY_TASKS.map(task=>makeTask(game,task,'daily')),
    weekly:WEEKLY_TASKS.map(task=>makeTask(game,task,'weekly')),
  };
  game.seasonal_events=game.seasonal_events||[{id:'civil-protection-week',title:'Semana da Proteção Civil',starts_at:0,ends_at:604800,reward_multiplier:1.1,status:'active'}];
  game.cooperation={
    name:'Rede Nacional 112',
    level:1,
    funds:0,
    contribution:0,
    shared_missions:0,
    members:[{id:'operator-local',name:'Operador 01',role:'Coordenador',online:true}],
    log:[],
    chat:[],
    buildings:[],
    events:[],
    large_scale_missions:[],
    ...game.cooperation,
  };
  game.cooperation.chat=game.cooperation.chat||[];
  game.cooperation.buildings=game.cooperation.buildings||[];
  game.cooperation.events=game.cooperation.events||[];
  game.cooperation.large_scale_missions=game.cooperation.large_scale_missions||[];
  (game.command_centers||[]).forEach(center=>{center.mission_ranges={default:center.radius_km||35,...(center.mission_ranges||{})};center.spawn_zones=center.spawn_zones||[];});
  (game.bases||[]).forEach(base=>{base.mission_generation_enabled=base.mission_generation_enabled!==false;base.supply_reserve={fuel:1000,medical:500,water:20000,foam:2000,equipment:500,...(base.supply_reserve||{})};});
  (game.facilities||[]).forEach(facility=>{facility.enabled=facility.enabled!==false;facility.queue_limit=facility.queue_limit||facility.capacity||5;});
  (game.units||[]).forEach(unit=>{
    unit.shift=unit.shift||{start:0,end:24,days:[0,1,2,3,4,5,6]};
    unit.callsign=unit.callsign||unit.name;
    unit.category=unit.category||unit.service;
    unit.max_response_km=Number(unit.max_response_km)||game.dispatch_policy.max_response_km;
    unit.fixed_crew=unit.fixed_crew===true;
    unit.resources={...resourceState(unit.service),...(unit.resources||{})};
  });
  (game.personnel||[]).forEach(person=>{person.experience=person.experience||0;person.rank=person.rank||'Operacional';person.leave_until=person.leave_until||0;});
  (game.complexes||[]).forEach(complex=>{complex.shared_services=complex.shared_services!==false;complex.operating_cost_discount=complex.operating_cost_discount||.08;});
  return game;
}

const isOnShift = (unit,elapsed) => {
  const shift=unit.shift||{start:0,end:24,days:[0,1,2,3,4,5,6]},hour=((14+(32*60+elapsed)/3600)%24+24)%24,day=Math.floor(elapsed/86400)%7;
  const hours=shift.start===shift.end||shift.end===24?hour>=shift.start&&hour<24:shift.start<shift.end?hour>=shift.start&&hour<shift.end:hour>=shift.start||hour<shift.end;
  return (shift.days||[]).includes(day)&&hours;
};

const updateComplexes = game => (game.complexes||[]).forEach(complex=>{
  const bases=(game.bases||[]).filter(base=>(complex.base_ids||[]).includes(base.id));
  const facilities=(game.facilities||[]).filter(facility=>(complex.facility_ids||[]).includes(facility.id));
  const units=(game.units||[]).filter(unit=>bases.some(base=>base.id===unit.base_id));
  complex.shared={garage_capacity:bases.reduce((sum,base)=>sum+(base.capacity||0),0),garage_used:units.length,personnel:(game.personnel||[]).filter(person=>bases.some(base=>base.id===person.base_id)).length,beds:facilities.filter(item=>item.type==='hospital').reduce((sum,item)=>sum+(item.capacity||0),0),cells:facilities.filter(item=>item.type==='prison').reduce((sum,item)=>sum+(item.capacity||0),0)};
});

export function tickAdvancedState(game,dt,log=()=>{}) {
  initializeAdvancedState(game);
  const previousDay=Math.floor(((game.elapsed||0)-dt)/86400),currentDay=Math.floor((game.elapsed||0)/86400);
  if(currentDay>previousDay){
    game.rotating_tasks={cycle:currentDay,daily:DAILY_TASKS.map(task=>makeTask(game,task,'daily')),weekly:currentDay%7===0?WEEKLY_TASKS.map(task=>makeTask(game,task,'weekly')):game.rotating_tasks.weekly};
    log(game,'Novos objetivos operacionais disponíveis.','success');
  }
  if(game.elapsed>=game.next_auto_planned&&(game.command_centers||[]).length){
    const center=game.command_centers[Math.floor(Math.random()*game.command_centers.length)],events=['Evento desportivo','Festival municipal','Manifestação anunciada','Exercício de proteção civil'];
    game.planned_missions.push({id:id(),title:events[Math.floor(Math.random()*events.length)],scenario:[3,5,10][Math.floor(Math.random()*3)],node:center.center_node,command_center_id:center.id,starts_at:game.elapsed+600,status:'scheduled',created_at:game.elapsed,system_generated:true});
    game.next_auto_planned=game.elapsed+1800;log(game,'Novo evento futuro anunciado pelo sistema.','alert');
  }
  (game.recruitment_queue||[]).forEach(entry=>{
    if(entry.status!=='pending'||game.elapsed<entry.completes_at)return;
    const base=game.bases.find(item=>item.id===entry.base_id);if(!base){entry.status='cancelled';return;}
    for(let index=0;index<entry.amount;index++)game.personnel.push({id:id(),name:NAMES[(game.personnel.length+index)%NAMES.length],service:base.service,base_id:base.id,unit_id:null,status:'available',qualifications:[],fatigue:0,experience:0,rank:'Operacional',recruited_at:game.elapsed});
    base.personnel=(base.personnel||0)+entry.amount;entry.status='completed';log(game,`${entry.amount} novos elementos apresentaram-se em ${base.name}.`,'success');
  });
  (game.units||[]).forEach(unit=>{
    const onShift=isOnShift(unit,game.elapsed);
    unit.on_shift=onShift;
    if(!onShift&&unit.status==='available')unit.status='offshift';
    if(onShift&&unit.status==='offshift')unit.status=(unit.crew_assigned||0)>=(unit.crew_required||1)?'available':'uncrewed';
    if(['available','offshift','uncrewed'].includes(unit.status))Object.entries(RESOURCE_PROFILE[unit.service]||{}).forEach(([key,profile])=>{unit.resources[key]=Math.min(profile.capacity,(unit.resources[key]||0)+dt*profile.capacity/180);});
  });
  (game.patients||[]).forEach(patient=>{
    if(patient.status!=='waiting')return;
    patient.treatment_progress=Math.min(100,(patient.treatment_progress||0)+dt*(patient.severity===3?.18:.32));
    if(patient.treatment_progress>=100&&!patient.treatment_complete){patient.treatment_complete=true;patient.transport_required=patient.transport_required??(patient.severity>1||Math.random()<.58);if(!patient.transport_required){patient.status='treated';patient.closed_at=game.elapsed;game.trust=Math.min(100,(game.trust||0)+1);log(game,'Vítima tratada no local sem necessidade de transporte.','success');}else log(game,'Vítima estabilizada e pronta para transporte.');}
  });
  (game.medical_transfers||[]).forEach(transfer=>{if(transfer.status==='scheduled'&&game.elapsed>=transfer.ready_at)transfer.status='waiting';});
  (game.seasonal_events||[]).forEach(event=>{event.status=game.elapsed<event.starts_at?'scheduled':game.elapsed<=event.ends_at?'active':'completed';});
  updateComplexes(game);
  return game;
}

const assert = (condition,message) => {if(!condition)throw new Error(message);};
export function applyAdvancedAction(game,kind,data,log=()=>{}) {
  initializeAdvancedState(game);
  if(kind==='update_dispatch_policy'){
    game.dispatch_policy={...game.dispatch_policy,...data,reserve_by_service:{...game.dispatch_policy.reserve_by_service,...(data.reserve_by_service||{})}};log(game,'Política de mobilização atualizada.','success');return true;
  }
  if(kind==='queue_recruitment'){
    const base=game.bases.find(item=>item.id===data.base_id),amount=Math.max(1,Math.min(10,Number(data.amount)||1));assert(base,'Base inválida.');assert((base.personnel||0)+(game.recruitment_queue||[]).filter(item=>item.base_id===base.id&&item.status==='pending').reduce((sum,item)=>sum+item.amount,0)+amount<=(base.staff_capacity||14),'Capacidade de pessoal atingida.');const cost=amount*300;assert(game.money>=cost,'Orçamento insuficiente.');game.money-=cost;game.expenses+=cost;game.recruitment_queue.push({id:id(),base_id:base.id,amount,cost,status:'pending',created_at:game.elapsed,completes_at:game.elapsed+180+amount*30});log(game,`Recrutamento iniciado em ${base.name}.`,'success');return true;
  }
  if(kind==='transfer_personnel'){
    const person=game.personnel.find(item=>item.id===data.person_id),target=game.bases.find(item=>item.id===data.base_id);assert(person&&target&&person.service===target.service,'Transferência incompatível.');assert(!person.unit_id&&person.status==='available','O elemento tem de estar livre.');assert((target.personnel||0)<(target.staff_capacity||14),'Base de destino sem capacidade.');const origin=game.bases.find(item=>item.id===person.base_id);if(origin)origin.personnel=Math.max(0,(origin.personnel||0)-1);target.personnel=(target.personnel||0)+1;person.base_id=target.id;log(game,`${person.name} transferido para ${target.name}.`,'success');return true;
  }
  if(kind==='update_advanced_unit'){
    const unit=game.units.find(item=>item.id===data.unit_id);assert(unit,'Viatura inválida.');if(data.shift)unit.shift={...unit.shift,...data.shift,start:Number(data.shift.start),end:Number(data.shift.end)};if(data.callsign!==undefined)unit.callsign=String(data.callsign).trim()||unit.name;if(data.category!==undefined)unit.category=String(data.category).trim()||unit.service;if(data.max_response_km!==undefined)unit.max_response_km=Math.max(1,Number(data.max_response_km)||1);if(data.fixed_crew!==undefined)unit.fixed_crew=!!data.fixed_crew;log(game,`${unit.name}: configuração operacional atualizada.`,'success');return true;
  }
  if(kind==='toggle_building_generation'){
    const building=[...(game.bases||[]),...(game.facilities||[])].find(item=>item.id===data.building_id);assert(building,'Edifício inválido.');building.mission_generation_enabled=data.enabled!==false;building.enabled=data.enabled!==false;log(game,`${building.name}: ${data.enabled===false?'suspenso':'reativado'}.`,data.enabled===false?'alert':'success');return true;
  }
  if(kind==='set_mission_range'){
    const center=game.command_centers.find(item=>item.id===data.command_center_id);assert(center,'Centro de Comando inválido.');center.mission_ranges={...center.mission_ranges,[data.mission_key]:Math.max(2,Math.min(200,Number(data.radius_km)||center.radius_km))};log(game,`${center.name}: raio específico atualizado.`,'success');return true;
  }
  if(kind==='add_spawn_zone'){
    const center=game.command_centers.find(item=>item.id===data.command_center_id);assert(center,'Centro de Comando inválido.');const points=(data.points||[]).map(point=>({lng:Number(point.lng),lat:Number(point.lat)})).filter(point=>Number.isFinite(point.lng)&&Number.isFinite(point.lat));assert(points.length>=3,'A zona necessita de pelo menos três pontos.');center.spawn_zones.push({id:id(),name:String(data.name||'Zona operacional'),mission_key:data.mission_key||'default',points,enabled:true});log(game,'Zona personalizada de geração criada.','success');return true;
  }
  if(kind==='schedule_critical_transfer'){
    const patient=game.patients.find(item=>item.id===data.patient_id);assert(patient&&patient.status==='admitted','Doente não disponível para transferência.');const origin=game.facilities.find(item=>item.id===patient.hospital_id),target=game.facilities.find(item=>item.id===data.facility_id);assert(origin&&target&&origin.id!==target.id&&target.type==='hospital','Hospital de destino inválido.');const transfer={id:id(),patient_id:patient.id,source_node:origin.node,target_facility_id:target.id,specialty:data.specialty||patient.specialty,status:'scheduled',ready_at:game.elapsed+60,critical:patient.severity===3};game.medical_transfers.push(transfer);patient.status='transfer_scheduled';log(game,'Transferência inter-hospitalar crítica agendada.','success');return true;
  }
  if(kind==='claim_rotating_task'){
    const task=[...(game.rotating_tasks.daily||[]),...(game.rotating_tasks.weekly||[])].find(item=>item.id===data.task_id);assert(task&&!task.claimed,'Objetivo inválido.');const progress=Math.max(0,metricValue(game,task.metric)-(task.metric==='trust'?0:task.baseline||0));assert(progress>=task.target,'Objetivo ainda não concluído.');task.claimed=true;game.money+=task.reward;game.earned+=task.reward;log(game,`Objetivo concluído: ${task.title}.`,'success');return true;
  }
  if(kind==='contribute_cooperation'){
    const amount=Math.max(100,Math.round(Number(data.amount)||0));assert(game.money>=amount,'Orçamento insuficiente.');game.money-=amount;game.cooperation.funds+=amount;game.cooperation.contribution+=amount;game.cooperation.level=1+Math.floor(game.cooperation.funds/10000);game.cooperation.log.unshift({id:id(),text:`Contribuição operacional de ${amount} €.`,time:game.elapsed});log(game,'Contribuição registada na rede cooperativa.','success');return true;
  }
  if(kind==='send_alliance_message'){
    const text=String(data.text||'').trim().slice(0,180);assert(text,'Escreve uma mensagem para a rede.');game.cooperation.chat.unshift({id:id(),author:'Operador 01',text,time:game.elapsed});game.cooperation.chat=game.cooperation.chat.slice(0,40);game.cooperation.log.unshift({id:id(),text:'Mensagem enviada no canal operacional.',time:game.elapsed});return true;
  }
  if(kind==='build_alliance_facility'){
    const type=String(data.type||'hospital'),name=String(data.name||'').trim().slice(0,48)||({hospital:'Hospital partilhado',prison:'Celas partilhadas',academy:'Escola partilhada'}[type]||'Instalação partilhada');
    const catalog={hospital:{cost:9000,capacity:8},prison:{cost:7500,capacity:10},academy:{cost:6500,capacity:12}};const definition=catalog[type];assert(definition,'Tipo de instalação inválido.');assert(game.cooperation.funds>=definition.cost,'Fundos cooperativos insuficientes.');game.cooperation.funds-=definition.cost;game.cooperation.buildings.push({id:id(),type,name,capacity:definition.capacity,level:1,enabled:true,created_at:game.elapsed});game.cooperation.log.unshift({id:id(),text:`Instalação coletiva criada: ${name}.`,time:game.elapsed});log(game,`${name} disponível na rede cooperativa.`,'success');return true;
  }
  if(kind==='upgrade_alliance_facility'){
    const building=game.cooperation.buildings.find(item=>item.id===data.building_id);assert(building,'Instalação coletiva inválida.');const cost=3500*(building.level||1);assert(game.cooperation.funds>=cost,'Fundos cooperativos insuficientes.');game.cooperation.funds-=cost;building.level=(building.level||1)+1;building.capacity+=building.type==='academy'?6:4;game.cooperation.log.unshift({id:id(),text:`${building.name} ampliada para nível ${building.level}.`,time:game.elapsed});log(game,`${building.name} ampliada pela rede cooperativa.`,'success');return true;
  }
  if(kind==='rebalance_complex'){
    const complex=game.complexes.find(item=>item.id===data.complex_id);assert(complex,'Complexo inválido.');const bases=game.bases.filter(base=>(complex.base_ids||[]).includes(base.id));assert(bases.length>1,'O complexo necessita de pelo menos duas bases.');for(const service of ['fire','medical','police']){const serviceBases=bases.filter(base=>base.service===service);if(serviceBases.length<2)continue;const people=game.personnel.filter(person=>serviceBases.some(base=>base.id===person.base_id)&&!person.unit_id&&person.status==='available');people.forEach((person,index)=>{person.base_id=serviceBases[index%serviceBases.length].id;});serviceBases.forEach(base=>{base.personnel=game.personnel.filter(person=>person.base_id===base.id).length;});}updateComplexes(game);log(game,`${complex.name}: efetivo livre redistribuído.`,'success');return true;
  }
  return false;
}

export function taskProgress(game,task){return Math.min(task.target,Math.max(0,metricValue(game,task.metric)-(task.metric==='trust'?0:task.baseline||0)));}
export { RESOURCE_PROFILE };
