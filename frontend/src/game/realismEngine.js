import { reserveFloor, payCost } from './engines/economyEngine';
import { LOGISTICS_STOCKS, ensureLogisticsState, logisticsCapacity, consumeBaseStock } from './logisticsEngine';

const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,Number(value)||0));
const daySeconds=86400;
const uid=(prefix='real')=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const hash=value=>{let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;};
const simulatedDate=game=>new Date(Date.parse(game.calendar_started_at||game.saved_at||new Date().toISOString())+Math.max(0,Number(game.elapsed)||0)*1000);
const localParts=value=>{
  const date=value instanceof Date?value:new Date(value);
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const get=type=>parts.find(part=>part.type===type)?.value;
  return {weekday:get('weekday'),year:+get('year'),month:+get('month'),day:+get('day'),hour:+get('hour'),minute:+get('minute')};
};
const dateKey=date=>{const p=localParts(date);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;};
const weekKey=date=>{const d=new Date(Date.UTC(localParts(date).year,localParts(date).month-1,localParts(date).day));const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10);};

export const REALISM_MODULES=Object.freeze({
  shifts:'Turnos e escalas',
  fatigue:'Fadiga e horas extra',
  certifications:'Recertificações',
  fleet_lifecycle:'Ciclo de vida da frota',
  procurement:'Contratação e prazos',
  hospitals:'Hospitais vivos',
  fog:'Informação progressiva 112',
  tactics:'Comando tático',
  coverage:'Cobertura territorial',
  mutual_aid:'Apoio mútuo',
  planned_events:'Eventos planeados',
  communications:'Comunicações e contingência',
  audits:'Auditorias operacionais',
  regional_risk:'Risco territorial',
  persistent_cases:'Casos policiais persistentes',
  after_action:'After Action Review',
  sustainability:'Energia e sustentabilidade',
});

export const REALISM_DEFAULTS=Object.freeze({
  mode:'realistic',
  modules:Object.freeze(Object.fromEntries(Object.keys(REALISM_MODULES).map(key=>[key,true]))),
  auto_crew:true,
  auto_hospital_diversion:true,
  auto_recertification_warning:true,
  minimum_coverage_percent:45,
  maintenance_policy:'balanced',
  procurement_policy:'public',
  communications_redundancy:'normal',
});

export const SHIFT_MODELS=Object.freeze({
  fire:[
    {id:'F-A',name:'Turno A',start:8,end:20},
    {id:'F-B',name:'Turno B',start:20,end:8},
  ],
  medical:[
    {id:'M-A',name:'Manhã',start:8,end:16},
    {id:'M-B',name:'Tarde',start:16,end:24},
    {id:'M-C',name:'Noite',start:0,end:8},
  ],
  police:[
    {id:'P-A',name:'Manhã',start:7,end:15},
    {id:'P-B',name:'Tarde',start:15,end:23},
    {id:'P-C',name:'Noite',start:23,end:7},
  ],
});

export const TACTICAL_OPTIONS=Object.freeze({
  urban_fire:[
    {id:'offensive',name:'Ataque ofensivo',speed:1.18,risk:1.18,resources:1.18,description:'Ataque interior rápido; mais eficaz mas exige segurança e equipas suficientes.'},
    {id:'balanced',name:'Ataque combinado',speed:1,risk:1,resources:1,description:'Equilíbrio entre ataque, busca, ventilação e proteção.'},
    {id:'defensive',name:'Ataque defensivo',speed:.72,risk:.62,resources:.82,description:'Prioriza segurança, contenção e proteção de exposições.'},
  ],
  wildfire:[
    {id:'direct',name:'Ataque direto',speed:1.13,risk:1.14,resources:1.12,description:'Intervenção próxima da frente quando as condições o permitem.'},
    {id:'anchor',name:'Ancoragem e flancos',speed:1,risk:.82,resources:.96,description:'Progressão sustentada a partir de ponto seguro.'},
    {id:'indirect',name:'Ataque indireto',speed:.78,risk:.58,resources:.72,description:'Linhas de contenção, defesa de pontos sensíveis e menor exposição.'},
  ],
  medical:[
    {id:'load-go',name:'Load and go',speed:1.08,risk:1.05,resources:1.08,description:'Intervenção curta no local e transporte prioritário.'},
    {id:'stay-play',name:'Stay and play',speed:.88,risk:.82,resources:1.14,description:'Estabilização avançada antes do transporte.'},
    {id:'triage',name:'Triagem estruturada',speed:.94,risk:.76,resources:.96,description:'Prioriza triagem, setores e evacuação ordenada.'},
  ],
  crime:[
    {id:'contain',name:'Conter e negociar',speed:.82,risk:.62,resources:.9,description:'Perímetro, comunicação e redução do risco.'},
    {id:'intercept',name:'Interceção',speed:1.12,risk:1.12,resources:1,description:'Ação rápida para impedir fuga ou agravamento.'},
    {id:'investigate',name:'Preservar e investigar',speed:.9,risk:.76,resources:1.04,description:'Preserva prova e recolhe informação antes de avançar.'},
  ],
  public_order:[
    {id:'deescalate',name:'Desescalada',speed:.82,risk:.58,resources:.9,description:'Comunicação, separação e contenção progressiva.'},
    {id:'contain',name:'Contenção',speed:1,risk:.82,resources:1,description:'Perímetros, setores e reserva de intervenção.'},
    {id:'intervene',name:'Intervenção',speed:1.15,risk:1.18,resources:1.12,description:'Reposição rápida da ordem com maior exposição operacional.'},
  ],
  hazmat:[
    {id:'isolate',name:'Isolar e identificar',speed:.8,risk:.52,resources:.9,description:'Cria zonas, identifica substância e controla acessos.'},
    {id:'controlled',name:'Entrada controlada',speed:1,risk:.78,resources:1.12,description:'Equipas protegidas entram com controlo de descontaminação.'},
    {id:'rescue',name:'Resgate prioritário',speed:1.14,risk:1.22,resources:1.2,description:'Prioriza vítimas quando o risco é aceitável.'},
  ],
  default:[
    {id:'cautious',name:'Prudente',speed:.88,risk:.72,resources:.92,description:'Reduz exposição e preserva capacidade.'},
    {id:'balanced',name:'Equilibrado',speed:1,risk:1,resources:1,description:'Doutrina operacional equilibrada.'},
    {id:'rapid',name:'Resposta rápida',speed:1.12,risk:1.14,resources:1.08,description:'Prioriza resolução rápida com maior exposição.'},
  ],
});

const activeShift=(service,hour)=>{
  const shifts=SHIFT_MODELS[service]||SHIFT_MODELS.police;
  return shifts.find(shift=>shift.start<shift.end?(hour>=shift.start&&hour<shift.end):(hour>=shift.start||hour<shift.end))||shifts[0];
};
const shiftForPerson=person=>{
  const shifts=SHIFT_MODELS[person.service]||SHIFT_MODELS.police;
  const index=Math.abs(Number(person.profile_index)||0)%shifts.length;
  return shifts[index];
};
const personOnDuty=(person,date,elapsed)=>{
  if(person.status==='training')return false;
  if((person.sick_until||0)>elapsed||(person.leave_until||0)>elapsed)return false;
  if((person.recalled_until||0)>elapsed)return true;
  const hour=localParts(date).hour;
  return shiftForPerson(person).id===activeShift(person.service,hour).id;
};

const defaultCertificationValidity=id=>{
  if(['hazmat','advanced-care','triage','aeromedical','pediatric-transport','public-order','explosives'].includes(id))return 365;
  if(['command','investigation','canine'].includes(id))return 730;
  return 545;
};

const ensurePerson= (game,person)=>{
  person.shift_code=person.shift_code||shiftForPerson(person).id;
  person.contract_hours=person.contract_hours||35;
  person.overtime_minutes=person.overtime_minutes||0;
  person.recalled_until=person.recalled_until||0;
  person.leave_until=person.leave_until||0;
  person.sick_until=person.sick_until||0;
  person.certifications=person.certifications||{};
  for(const qualification of person.qualifications||[]){
    if(!person.certifications[qualification])person.certifications[qualification]={
      id:qualification,
      awarded_at:person.recruited_at||0,
      expires_at:(person.recruited_at||game.elapsed||0)+defaultCertificationValidity(qualification)*daySeconds,
      status:'valid',
    };
  }
  person.duty_state=person.duty_state||'off-duty';
  return person;
};

const ensureUnit=(game,unit)=>{
  const currentYear=localParts(simulatedDate(game)).year||2026;
  if(!unit.manufactured_year){
    const age=Math.floor(hash(unit.id||unit.name)*6);
    unit.manufactured_year=Math.max(2000,currentYear-age);
  }
  unit.inspection_due_at=unit.inspection_due_at||((game.elapsed||0)+(90+Math.floor(hash(unit.id)*275))*daySeconds);
  unit.inspection_overdue=!!unit.inspection_overdue;
  unit.tyre_condition=clamp(unit.tyre_condition??(88-Math.floor(hash(unit.id+'tyre')*16)),0,100);
  unit.brake_condition=clamp(unit.brake_condition??(90-Math.floor(hash(unit.id+'brake')*12)),0,100);
  unit.battery_condition=clamp(unit.battery_condition??(92-Math.floor(hash(unit.id+'battery')*15)),0,100);
  unit.insurance=unit.insurance||{type:'public-fleet',deductible:500,active:true,claims:0};
  unit.energy_type=unit.energy_type||(['medical-motorcycle'].includes(unit.vehicle_type)?'petrol':'diesel');
  unit.preferred_crew_ids=unit.preferred_crew_ids||[...(unit.personnel_ids||[])];
  unit.operational_personnel_ids=unit.operational_personnel_ids||[...(unit.personnel_ids||[])];
  return unit;
};

const ensureHospital=facility=>{
  if(facility.type!=='hospital')return facility;
  facility.external_occupancy=clamp(facility.external_occupancy??0,0,Math.max(0,(facility.capacity||0)-1));
  facility.ed_pressure=clamp(facility.ed_pressure??35);
  facility.handover_minutes=Math.max(5,Number(facility.handover_minutes)||12);
  facility.diversion=facility.diversion||false;
  facility.specialty_status=facility.specialty_status||{};
  (facility.specialties||[]).forEach(id=>{facility.specialty_status[id]=facility.specialty_status[id]||'open';});
  return facility;
};

export function ensureRealismState(game){
  game.realism={
    ...REALISM_DEFAULTS,
    ...(game.realism||{}),
    modules:{...REALISM_DEFAULTS.modules,...(game.realism?.modules||{})},
    metrics:{
      overtime_minutes:0,
      callbacks:0,
      sick_days:0,
      expired_certifications:0,
      procurement_spend:0,
      mutual_aid_calls:0,
      audits_failed:0,
      communication_minutes_degraded:0,
      handover_minutes:0,
      uncovered_minutes:0,
      ...(game.realism?.metrics||{}),
    },
  };
  game.vehicle_procurements=game.vehicle_procurements||[];
  game.used_vehicle_market=game.used_vehicle_market||[];
  game.operational_audits=game.operational_audits||[];
  game.strategic_objectives=game.strategic_objectives||[];
  game.planned_public_events=game.planned_public_events||[];
  game.police_cases=game.police_cases||[];
  game.mutual_aid=game.mutual_aid||[];
  game.after_action_reports=game.after_action_reports||[];
  game.coverage_state=game.coverage_state||{};
  game.regional_trust=game.regional_trust||{};
  game.infrastructure_state=game.infrastructure_state||{power:'normal',communications:'normal',sirensp:'normal',backup_power:true};
  game.risk_forecast=game.risk_forecast||{};
  game.cost_centers=game.cost_centers||{by_base:{},by_service:{fire:0,medical:0,police:0}};
  game.sustainability_state={diesel_litres:0,petrol_litres:0,electric_kwh:0,co2_kg:0,charging_points:0,...(game.sustainability_state||{})};
  game.media_state={scrutiny:0,last_event_at:0,...(game.media_state||{})};
  game.operational_layers={coverage:true,hospitals:true,risk:true,incidents:true,hydrants:false,road_closures:true,...(game.operational_layers||{})};
  game.drone_assets=game.drone_assets||[];
  game.drone_missions=game.drone_missions||[];
  (game.personnel||[]).forEach(person=>ensurePerson(game,person));
  (game.units||[]).forEach(unit=>ensureUnit(game,unit));
  (game.facilities||[]).forEach(ensureHospital);
  (game.incidents||[]).forEach(incident=>{if(!incident.realism_seeded)seedIncidentRealism(game,incident,()=>hash(incident.id));});
  return game;
}

const reportedNeeds=(actual={},confidence=.45,random=Math.random)=>{
  const entries=Object.entries(actual);
  const result={};
  for(const [service,count] of entries){
    const actualCount=Math.max(0,Number(count)||0);
    if(!actualCount){result[service]=0;continue;}
    const noise=random()<confidence?0:(random()<.5?-1:1);
    result[service]=Math.max(0,actualCount+noise);
  }
  return result;
};

export function seedIncidentRealism(game,incident,random=Math.random){
  if(incident.realism_seeded)return incident;
  const mode=game.realism?.mode||'realistic',intelBias=mode==='assisted'?18:mode==='hardcore'?-10:0,locationBias=mode==='assisted'?15:mode==='hardcore'?-8:0;
  const confidence=clamp(32+random()*26+intelBias,18,82);
  incident.realism_seeded=true;
  incident.intel_confidence=Math.round(confidence);
  incident.location_confidence=Math.round(clamp(45+random()*38+locationBias,25,96));
  incident.intel_revealed=false;
  incident.reported_needs=reportedNeeds(incident.needs,confidence/100,random);
  incident.reported_casualties=Math.max(0,Math.round((incident.casualties||0)+(random()<.4?(random()<.5?-1:1):0)));
  incident.caller_reports=[{
    id:uid('caller'),
    time:game.elapsed||0,
    reliability:Math.round(45+random()*45),
    text:incident.call?.text||incident.description||'Pedido de socorro recebido.',
  }];
  incident.reconnaissance={complete:false,started_at:null,completed_at:null};
  incident.command_structure={established:false,commander_unit_id:null,sectors:[]};
  incident.tactical_plan={option:'balanced',set_at:null};
  incident.operational_zones=incident.category==='hazmat'?{hot:false,warm:false,cold:false}:null;
  incident.water_supply=incident.service==='fire'?{source:incident.district&&['Porto','Lisboa','Braga','Aveiro','Faro'].includes(incident.district)?'hydrant-network':'mobile-supply',continuous:false,estimated_lpm:0}:null;
  incident.road_closure=false;
  incident.cost_ledger={fuel:0,consumables:0,overtime:0,repairs:0,external_support:0,total:0};
  incident.timeline=[{time:game.elapsed||0,type:'call',text:'Chamada recebida pela central.'}];
  return incident;
}

export function revealIncidentIntel(incident,amount=25,source='central'){
  incident.intel_confidence=clamp((incident.intel_confidence||35)+amount,0,100);
  if(incident.intel_confidence>=78){
    incident.reported_needs={...(incident.needs||{})};
    incident.reported_casualties=incident.casualties||0;
    incident.intel_revealed=true;
  }else if(incident.intel_confidence>=58){
    incident.reported_needs=Object.fromEntries(Object.entries(incident.needs||{}).map(([service,count])=>[service,Math.max(0,(Number(count)||0)+(hash(incident.id+service+incident.intel_confidence)>.7?1:0))]));
    incident.reported_casualties=Math.max(0,(incident.casualties||0)+(hash(incident.id+'victims')>.75?1:0));
  }
  incident.timeline=[...(incident.timeline||[]),{time:incident.created||0,type:'intel',text:`Informação atualizada por ${source} · confiança ${Math.round(incident.intel_confidence)}%.`}].slice(-30);
  return incident;
}

export function onCallTriage(game,incident,correct){
  ensureRealismState(game);
  revealIncidentIntel(incident,correct?28:10,'triagem 112');
  incident.location_confidence=clamp((incident.location_confidence||55)+(correct?24:8),0,100);
  if(correct&&incident.caller_reports?.length<3&&hash(incident.id+'second-caller')>.48){
    incident.caller_reports.push({
      id:uid('caller'),
      time:game.elapsed,
      reliability:Math.round(55+hash(incident.id+'reliability')*40),
      text:'Segundo contacto confirma parte da informação e acrescenta referências do local.',
    });
    revealIncidentIntel(incident,12,'segunda chamada');
  }
  return incident;
}

export const tacticalOptionsFor=incident=>TACTICAL_OPTIONS[incident?.category]||(
  incident?.service==='medical'?TACTICAL_OPTIONS.medical:
  incident?.service==='police'?TACTICAL_OPTIONS.crime:
  TACTICAL_OPTIONS.default
);

export function tacticalModifier(incident){
  const options=tacticalOptionsFor(incident);
  return options.find(option=>option.id===incident?.tactical_plan?.option)||options.find(option=>option.id==='balanced')||options[0];
}

export function markReconnaissance(game,incident,unit){
  if(!incident||incident.reconnaissance?.complete)return;
  incident.reconnaissance={complete:true,started_at:incident.reconnaissance?.started_at||game.elapsed,completed_at:game.elapsed,unit_id:unit?.id||null};
  revealIncidentIntel(incident,100,'reconhecimento no local');
  incident.location_confidence=100;
  if(incident.category==='hazmat')incident.operational_zones={hot:true,warm:true,cold:true};
  if(incident.water_supply&&unit?.service==='fire'){
    incident.water_supply.continuous=incident.water_supply.source==='hydrant-network';
    incident.water_supply.estimated_lpm=incident.water_supply.continuous?1200:450;
  }
  incident.timeline.push({time:game.elapsed,type:'recon',text:'Reconhecimento concluído; situação operacional confirmada.'});
}

const allocateCrews=(game)=>{
  if(game.realism?.modules?.shifts===false||game.realism?.auto_crew===false)return;
  const date=simulatedDate(game);
  for(const person of game.personnel||[]){
    ensurePerson(game,person);
    const operational=personOnDuty(person,date,game.elapsed||0);
    person.duty_state=(person.sick_until||0)>game.elapsed?'sick':(person.leave_until||0)>game.elapsed?'leave':operational?((person.recalled_until||0)>game.elapsed?'recalled':'on-duty'):'off-duty';
    if(person.status!=='training'&&!person.unit_id){
      person.status=['on-duty','recalled'].includes(person.duty_state)?'available':person.duty_state;
    }
  }

  for(const base of game.bases||[]){
    const units=(game.units||[]).filter(unit=>unit.base_id===base.id&&unit.enabled!==false);
    const fieldUnits=units.filter(unit=>!['available','uncrewed','offshift','resting','maintenance'].includes(unit.status));
    const fieldCrew=new Set(fieldUnits.flatMap(unit=>unit.personnel_ids||[]));
    const pool=(game.personnel||[])
      .filter(person=>person.base_id===base.id&&person.duty_state!=='off-duty'&&person.duty_state!=='leave'&&person.duty_state!=='sick'&&person.status!=='training'&&!fieldCrew.has(person.id))
      .sort((a,b)=>(b.skill||0)-(a.skill||0));

    for(const unit of units.filter(unit=>['available','uncrewed','offshift'].includes(unit.status))){
      (unit.personnel_ids||[]).forEach(id=>{const person=game.personnel.find(item=>item.id===id);if(person&&person.unit_id===unit.id){person.unit_id=null;if(person.status!=='training')person.status=['on-duty','recalled'].includes(person.duty_state)?'available':person.duty_state;}});
      const required=Math.max(1,unit.crew_required||1),training=unit.training;
      const eligible=pool.filter(person=>!person.unit_id&&(!training||(person.qualifications||[]).includes(training)));
      const selected=eligible.slice(0,required);
      unit.personnel_ids=selected.map(person=>person.id);
      unit.operational_personnel_ids=[...unit.personnel_ids];
      unit.crew_assigned=selected.length;
      selected.forEach(person=>{person.unit_id=unit.id;person.status='assigned';});
      if(selected.length>=required)unit.status='available';
      else unit.status='offshift';
    }
  }
};

const processAbsenceWeek=(game,date,log)=>{
  const key=weekKey(date);
  if(game.realism.last_absence_week===key)return;
  game.realism.last_absence_week=key;
  for(const person of game.personnel||[]){
    if(person.status==='training'||(person.sick_until||0)>game.elapsed||(person.leave_until||0)>game.elapsed)continue;
    const chance=.008+(100-(person.health??100))*.00015+(person.stress||0)*.00008;
    if(hash(person.id+key)<chance){
      const duration=(4+Math.round(hash(key+person.id+'dur')*20))*3600;
      person.sick_until=game.elapsed+duration;
      person.duty_state='sick';
      game.realism.metrics.sick_days+=duration/daySeconds;
      if(log)log(game,`${person.name} ficou temporariamente indisponível por baixa médica.`,'alert');
    }
  }
};

const processCertifications=(game,log)=>{
  if(game.realism?.modules?.certifications===false)return;
  for(const person of game.personnel||[]){
    ensurePerson(game,person);
    for(const [id,record] of Object.entries(person.certifications||{})){
      if((person.qualifications||[]).includes(id)&&record.status!=='valid'){
        record.status='valid';
        record.expires_at=game.elapsed+defaultCertificationValidity(id)*daySeconds;
      }
      if(record.status==='valid'&&game.elapsed>=record.expires_at){
        record.status='expired';
        person.expired_qualifications=[...new Set([...(person.expired_qualifications||[]),id])];
        person.qualifications=(person.qualifications||[]).filter(item=>item!==id);
        game.realism.metrics.expired_certifications++;
        if(log)log(game,`Recertificação necessária: ${person.name} · ${id}.`,'alert');
      }else if(record.status==='valid'&&record.expires_at-game.elapsed<30*daySeconds){
        record.warning=true;
      }
    }
    for(const qualification of person.qualifications||[]){
      if(!person.certifications[qualification])person.certifications[qualification]={id:qualification,awarded_at:game.elapsed,expires_at:game.elapsed+defaultCertificationValidity(qualification)*daySeconds,status:'valid'};
    }
  }
};

const processFleetLifecycle=(game,dt,log)=>{
  if(game.realism?.modules?.fleet_lifecycle===false)return;
  const year=localParts(simulatedDate(game)).year||2026;
  for(const unit of game.units||[]){
    ensureUnit(game,unit);
    const age=Math.max(0,year-(unit.manufactured_year||year));
    unit.age_years=age;
    const wear=clamp(unit.wear||0);
    unit.tyre_condition=clamp(100-wear*.72-(unit.mileage_km||0)/1800-age*.5);
    unit.brake_condition=clamp(100-wear*.55-(unit.mileage_km||0)/2500-age*.4);
    unit.battery_condition=clamp(100-age*4-(unit.operating_hours||0)/900-wear*.25);
    unit.lifecycle_risk=clamp(age*3+wear*.45+(unit.maintenance_due?15:0)+(unit.inspection_overdue?20:0));
    if(game.elapsed>=unit.inspection_due_at){
      if(!unit.inspection_overdue&&log)log(game,`Inspeção operacional vencida: ${unit.name}.`,'alert');
      unit.inspection_overdue=true;
    }
    if(unit.inspection_overdue&&game.elapsed-unit.inspection_due_at>30*daySeconds&&['available','uncrewed','offshift'].includes(unit.status))unit.status='inspection_hold';
  }
};

const hospitalPressure=(game,facility)=>{
  const date=simulatedDate(game),p=localParts(date),hour=p.hour;
  const rush=((hour>=10&&hour<=13)||(hour>=18&&hour<=22)) ? .18 : 0;
  const night=hour<7 ? .08 : 0;
  const weather=game.conditions?.weather==='storm' ? .18 : game.conditions?.weather==='rain' ? .08 : 0;
  const seasonal=[7,8].includes(p.month) ? .08 : [12,1].includes(p.month) ? .06 : 0;
  const wave=hash(`${facility.id}:${dateKey(date)}:${Math.floor(hour/4)}`)*.18;
  return clamp(28+(rush+night+weather+seasonal+wave)*100,15,94);
};

const processHospitals=(game,log)=>{
  if(game.realism?.modules?.hospitals===false)return;
  for(const facility of (game.facilities||[]).filter(item=>item.type==='hospital'&&item.enabled!==false)){
    ensureHospital(facility);
    const previous=facility.ed_pressure||0;
    facility.ed_pressure=hospitalPressure(game,facility);
    const capacity=Math.max(1,facility.capacity||1);
    facility.external_occupancy=Math.min(Math.max(0,capacity-1),Math.round(capacity*(facility.ed_pressure/100)*.62));
    facility.handover_minutes=Math.round(8+facility.ed_pressure*.42);
    facility.diversion=facility.manual_diversion===true||facility.ed_pressure>=88;
    for(const specialty of facility.specialties||[]){
      const key=`${facility.id}:${specialty}:${dateKey(simulatedDate(game))}`;
      const sample=hash(key);facility.specialty_status[specialty]=sample<.006?'closed':sample<.035?'limited':'open';
    }
    if(previous<88&&facility.ed_pressure>=88&&log)log(game,`${facility.name}: urgência em forte pressão; transporte deve considerar alternativas.`,'alert');
  }
};

const baseCoverage=(game,base,service)=>{
  const units=(game.units||[]).filter(unit=>unit.service===service&&unit.base_id===base.id&&unit.enabled!==false);
  const ready=units.filter(unit=>['available','patrol','staged'].includes(unit.status)&&(unit.condition||100)>30).length;
  const all=units.length;
  return all?Math.round(ready/all*100):0;
};

export function coverageSnapshot(game){
  const services=['fire','medical','police'],byService={};
  for(const service of services){
    const bases=(game.bases||[]).filter(base=>base.service===service&&base.enabled!==false);
    const values=bases.map(base=>{const coverage=baseCoverage(game,base,service),available=(game.units||[]).filter(unit=>unit.base_id===base.id&&unit.service===service&&['available','patrol','staged'].includes(unit.status)).length;return {base_id:base.id,name:base.name,city:base.city,coverage,available,response_band:available>=2&&coverage>=70?'<8 min':available>=1?'8–15 min':'>30 min'};});
    const score=values.length?Math.round(values.reduce((sum,item)=>sum+item.coverage,0)/values.length):0;
    byService[service]={score,bases:values,uncovered:values.filter(item=>item.coverage<35)};
  }
  const overall=Math.round(services.reduce((sum,service)=>sum+byService[service].score,0)/services.length);
  return {overall,by_service:byService,generated_at:game.elapsed||0};
}

const processCoverage=(game,dt,log)=>{
  if(game.realism?.modules?.coverage===false)return;
  const previous=game.coverage_state?.overall??100;
  game.coverage_state=coverageSnapshot(game);
  if(game.coverage_state.overall<(game.realism.minimum_coverage_percent||45))game.realism.metrics.uncovered_minutes+=dt/60;
  if(previous>=45&&game.coverage_state.overall<45&&log)log(game,`Cobertura territorial degradada: ${game.coverage_state.overall}%.`,'alert');
  const recommendations=[];
  for(const [service,data] of Object.entries(game.coverage_state.by_service||{})){
    for(const low of data.uncovered||[]){
      const donors=data.bases.filter(item=>item.coverage>=70&&item.available>=2).sort((a,b)=>b.coverage-a.coverage);
      if(donors[0])recommendations.push({id:`${service}:${low.base_id}`,service,from_base_id:donors[0].base_id,to_base_id:low.base_id,text:`Reposicionar temporariamente um meio de ${donors[0].name} para reforçar ${low.name}.`});
    }
  }
  game.coverage_recommendations=recommendations.slice(0,8);
};

const processCommunications=(game,dt,log)=>{
  if(game.realism?.modules?.communications===false)return;
  const previous=game.infrastructure_state.communications;
  const storm=game.conditions?.weather==='storm';
  const redundancy=game.realism.communications_redundancy;
  const threshold=redundancy==='high' ? .985 : redundancy==='low' ? .94 : .97;
  const sample=hash(`${dateKey(simulatedDate(game))}:${Math.floor((game.elapsed||0)/300)}:comms`);
  game.infrastructure_state.communications=storm&&sample>threshold?'degraded':'normal';
  game.infrastructure_state.sirensp=game.infrastructure_state.communications==='degraded'&&sample>.992?'fallback':'normal';
  if(game.infrastructure_state.communications!=='normal')game.realism.metrics.communication_minutes_degraded+=dt/60;
  if(previous!==game.infrastructure_state.communications&&log)log(game,game.infrastructure_state.communications==='degraded'?'Comunicações degradadas: ativados canais de contingência.':'Comunicações normalizadas.',game.infrastructure_state.communications==='degraded'?'alert':'success');
};

const seasonalRisk=(game,service)=>{
  const p=localParts(simulatedDate(game)),month=p.month,hour=p.hour;
  let risk=1;
  if(service==='fire'){if([6,7,8,9].includes(month))risk+=.3;if(hour>=12&&hour<=19)risk+=.12;if(game.conditions?.weather==='storm')risk+=.08;}
  if(service==='medical'){if([7,8].includes(month))risk+=.14;if(hour>=10&&hour<=22)risk+=.1;if(game.conditions?.weather==='storm')risk+=.12;}
  if(service==='police'){if([7,8,12].includes(month))risk+=.12;if(hour>=18||hour<3)risk+=.16;}
  return Number(risk.toFixed(2));
};

const processRiskForecast=game=>{
  if(game.realism?.modules?.regional_risk===false)return;
  const date=simulatedDate(game),month=localParts(date).month;
  const regional={};
  for(const base of game.bases||[]){
    const key=base.city||base.land||'Portugal';if(regional[key])continue;
    const southern=/Faro|Albufeira|Loulé|Portimão|Lagos/i.test(key),interior=/Évora|Beja|Bragança|Castelo Branco|Guarda|Portalegre/i.test(key),island=['madeira','sao-miguel','terceira','azores'].includes(base.land);
    const summer=[6,7,8,9].includes(month);
    regional[key]={
      fire:Number((seasonalRisk(game,'fire')+(summer&&(southern||interior)?.22:0)).toFixed(2)),
      medical:Number((seasonalRisk(game,'medical')+(summer&&southern?.18:0)+(island?.04:0)).toFixed(2)),
      police:Number((seasonalRisk(game,'police')+(summer&&southern?.16:0)).toFixed(2)),
    };
  }
  game.risk_forecast={
    fire:{index:seasonalRisk(game,'fire'),label:seasonalRisk(game,'fire')>=1.35?'Elevado':'Normal'},
    medical:{index:seasonalRisk(game,'medical'),label:seasonalRisk(game,'medical')>=1.25?'Elevado':'Normal'},
    police:{index:seasonalRisk(game,'police'),label:seasonalRisk(game,'police')>=1.25?'Elevado':'Normal'},
    regional,updated_at:game.elapsed,
  };
};

const eventTemplates=[
  {id:'football',name:'Jogo de futebol',risk:'public_order',services:{medical:1,police:2},months:[1,2,3,4,5,8,9,10,11,12]},
  {id:'festival',name:'Festival / concerto',risk:'multi',services:{fire:1,medical:2,police:2},months:[5,6,7,8,9]},
  {id:'demonstration',name:'Manifestação',risk:'public_order',services:{medical:1,police:3},months:[1,2,3,4,5,6,7,8,9,10,11,12]},
  {id:'beach',name:'Dispositivo balnear',risk:'water_rescue',services:{fire:1,medical:1,police:1},months:[6,7,8,9]},
];

const processPlannedEvents=(game,log)=>{
  if(game.realism?.modules?.planned_events===false)return;
  const date=simulatedDate(game),key=dateKey(date),month=localParts(date).month;
  if(game.realism.last_public_event_day===key)return;
  game.realism.last_public_event_day=key;
  const candidates=eventTemplates.filter(item=>item.months.includes(month));
  const template=candidates[Math.floor(hash(key+'event')*candidates.length)];
  if(!template||hash(key+'spawn')<.46)return;
  const center=(game.command_centers||[]).filter(item=>item.active!==false)[Math.floor(hash(key+'center')*Math.max(1,(game.command_centers||[]).filter(item=>item.active!==false).length))]||game.command_centers?.[0];
  const event={id:uid('event'),type:template.id,name:template.name,risk:template.risk,command_center_id:center?.id||null,starts_at:game.elapsed+Math.round((3+hash(key+'lead')*8)*3600),ends_at:game.elapsed+Math.round((6+hash(key+'end')*10)*3600),recommended:{...template.services},prepositioned:{fire:0,medical:0,police:0},prepositioned_unit_ids:[],status:'planned',created_at:game.elapsed};
  game.planned_public_events.unshift(event);
  game.planned_public_events=game.planned_public_events.slice(0,30);
  if(log)log(game,`Evento planeado: ${event.name}. Prepara cobertura preventiva.`,'info');
};

const processPublicEvents=(game,log,spawn)=>{
  for(const event of game.planned_public_events||[]){
    if(event.status==='planned'&&game.elapsed>=event.starts_at){event.status='active';if(log)log(game,`${event.name} iniciou. Dispositivo preventivo em avaliação.`,'info');}
    if(event.status==='active'&&game.elapsed>=event.ends_at){
      event.status='completed';event.completed_at=game.elapsed;
      for(const unitId of event.prepositioned_unit_ids||[]){const unit=game.units.find(item=>item.id===unitId);if(unit&&unit.status==='event_standby'){unit.status='available';delete unit.public_event_id;}}
      event.prepositioned_unit_ids=[];event.prepositioned={fire:0,medical:0,police:0};
    }
    if(event.status!=='active'||event.risk_event_spawned)continue;
    const totalRecommended=Object.values(event.recommended||{}).reduce((a,b)=>a+b,0),totalReady=Object.values(event.prepositioned||{}).reduce((a,b)=>a+b,0);
    const gap=Math.max(0,totalRecommended-totalReady);
    if(gap&&game.elapsed-event.starts_at>600&&hash(event.id+Math.floor((game.elapsed-event.starts_at)/600))<.12*gap){
      event.risk_event_spawned=true;
      event.uncovered=true;
      const scenarioByRisk={public_order:5,multi:10,water_rescue:4},scenario=scenarioByRisk[event.risk]??3;
      const center=(game.command_centers||[]).find(item=>item.id===event.command_center_id)||game.command_centers?.[0];
      const created=spawn?.(scenario,center?.center_node,center?.id);
      if(created){
        created.title=`${event.name} · ocorrência associada`;
        created.definition=created.title;
        created.public_event_id=event.id;
        created.event_uncovered=true;
        created.reward=Math.round((created.reward||0)*.9);
        created.timeline=[...(created.timeline||[]),{time:game.elapsed,type:'event',text:`Ocorrência associada a ${event.name}.`}].slice(-30);
      }
      if(log)log(game,`${event.name}: dispositivo preventivo insuficiente; foi gerada pressão operacional adicional.`,'alert');
    }
  }
};

const processAudits=(game,log)=>{
  if(game.realism?.modules?.audits===false)return;
  const key=weekKey(simulatedDate(game));
  if(game.realism.last_audit_week===key)return;
  game.realism.last_audit_week=key;
  const findings=[];
  for(const base of game.bases||[]){
    const lowStocks=LOGISTICS_STOCKS.filter(stock=>{
      const cap=logisticsCapacity(base,stock.id),value=base.logistics?.stock?.[stock.id]||0;
      return stock.critical&&cap&&value/cap<.15;
    }).map(item=>item.name);
    if(lowStocks.length)findings.push({severity:'major',entity_id:base.id,text:`${base.name}: stock crítico baixo (${lowStocks.slice(0,3).join(', ')}).`});
  }
  for(const unit of game.units||[]){
    if(unit.inspection_overdue)findings.push({severity:'major',entity_id:unit.id,text:`${unit.name}: inspeção operacional vencida.`});
    else if(unit.maintenance_due)findings.push({severity:'minor',entity_id:unit.id,text:`${unit.name}: manutenção programada pendente.`});
  }
  for(const person of game.personnel||[]){
    if((person.expired_qualifications||[]).length)findings.push({severity:'major',entity_id:person.id,text:`${person.name}: qualificação expirada.`});
  }
  const audit={id:uid('audit'),week:key,time:game.elapsed,findings,status:findings.length?'action-required':'compliant',score:Math.max(0,100-findings.filter(f=>f.severity==='major').length*9-findings.filter(f=>f.severity==='minor').length*3)};
  game.operational_audits.unshift(audit);game.operational_audits=game.operational_audits.slice(0,26);
  if(findings.length){game.realism.metrics.audits_failed++;if(log)log(game,`Auditoria semanal: ${findings.length} não conformidade(s), score ${audit.score}%.`,'alert');}
  else if(log)log(game,'Auditoria semanal concluída sem não conformidades.','success');
};

const objectiveTemplates=[
  {id:'coverage',title:'Cobertura operacional ≥ 70%',metric:'coverage',target:70},
  {id:'stock',title:'Reduzir ruturas críticas a zero',metric:'stock_shortages',target:0},
  {id:'fleet',title:'Disponibilidade da frota ≥ 80%',metric:'fleet_availability',target:80},
  {id:'hospital',title:'Evitar saturação hospitalar grave',metric:'hospital_pressure',target:85},
  {id:'response',title:'Manter confiança pública ≥ 90%',metric:'trust',target:90},
];

const processBudgetCycle=game=>{
  const year=localParts(simulatedDate(game)).year||2026;
  if(game.budget_cycle?.year===year)return;
  const bases=(game.bases||[]).filter(item=>item.enabled!==false).length,facilities=(game.facilities||[]).filter(item=>item.enabled!==false).length,personnel=(game.personnel||[]).length;
  const auditScore=game.operational_audits?.[0]?.score??90,trust=game.trust??90;
  const approved=Math.round((1800000+bases*420000+facilities*600000+personnel*22000)*(0.85+trust/500)*(0.9+auditScore/1000)/1000)*1000;
  game.budget_cycle={year,approved_envelope:approved,approved_at:game.elapsed,capital_priority:auditScore<70?'compliance':game.coverage_state?.overall<55?'coverage':'renewal',note:'Envelope anual de referência; a tesouraria recebe dotações periódicas. Não é uma cobrança anual.'};
};

const processObjectives=game=>{
  const year=localParts(simulatedDate(game)).year;
  if(game.realism.objective_year!==year||!(game.strategic_objectives||[]).length){
    game.realism.objective_year=year;
    game.strategic_objectives=objectiveTemplates.map(template=>({...template,id:`${template.id}-${year}`,year,status:'active',progress:0}));
  }
  const coverage=game.coverage_state?.overall||0;
  const shortages=game.logistics_metrics?.shortages||0;
  const fleet=(game.units||[]).length?Math.round((game.units||[]).filter(unit=>['available','patrol','staged'].includes(unit.status)).length/game.units.length*100):0;
  const hospital=Math.max(0,...(game.facilities||[]).filter(item=>item.type==='hospital').map(item=>item.ed_pressure||0));
  for(const objective of game.strategic_objectives){
    if(objective.metric==='coverage')objective.progress=coverage;
    if(objective.metric==='stock_shortages')objective.progress=shortages;
    if(objective.metric==='fleet_availability')objective.progress=fleet;
    if(objective.metric==='hospital_pressure')objective.progress=hospital;
    if(objective.metric==='trust')objective.progress=game.trust||0;
    objective.met=objective.metric==='stock_shortages'?objective.progress<=objective.target:objective.metric==='hospital_pressure'?objective.progress<=objective.target:objective.progress>=objective.target;
  }
};

const refreshUsedMarket=(game,vehicleCatalog)=>{
  const key=`${weekKey(simulatedDate(game))}:used-market`;
  if(game.realism.used_market_key===key&&game.used_vehicle_market?.length)return;
  game.realism.used_market_key=key;
  const all=Object.entries(vehicleCatalog||{}).flatMap(([service,list])=>(list||[]).map(item=>({...item,service})));
  game.used_vehicle_market=all.filter((_,index)=>hash(key+index)>.58).slice(0,10).map((definition,index)=>{
    const age=3+Math.floor(hash(key+definition.id+'age')*14);
    const condition=Math.round(55+hash(key+definition.id+'condition')*35);
    const price=Math.round((definition.price||0)*Math.max(.18,.75-age*.028)*(condition/100)/500)*500;
    return {id:`used-${key}-${index}`,vehicle_type:definition.id,service:definition.service,name:definition.name,age,condition,mileage_km:Math.round((30000+hash(key+definition.id+'km')*220000)/1000)*1000,price,status:'available'};
  });
};

export const procurementLead = definition=>{
  const cls=definition?.vehicle_class;
  if(cls==='air')return {contract_days:365,game_seconds:1800};
  if(definition?.id==='ladder'||definition?.id==='aerial-platform')return {contract_days:300,game_seconds:1500};
  if(['heavy','special'].includes(cls))return {contract_days:180,game_seconds:900};
  return {contract_days:90,game_seconds:480};
};

export function queueVehicleProcurement(game,base,definition,purchase,{used=false,usedOffer=null}={}){
  ensureRealismState(game);
  const lead=used?{contract_days:14,game_seconds:180}:procurementLead(definition);
  const order={id:uid('proc'),base_id:base.id,service:base.service,vehicle_type:definition.id,name:definition.name,status:'ordered',ordered_at:game.elapsed,contract_days:lead.contract_days,delivery_at:game.elapsed+lead.game_seconds,total_investment:purchase?.total||usedOffer?.price||definition.price,own_contribution:purchase?.own||usedOffer?.price||definition.price,grant:purchase?.grant||0,used,used_condition:usedOffer?.condition||100,used_mileage_km:usedOffer?.mileage_km||0,used_age:usedOffer?.age||0};
  game.vehicle_procurements.unshift(order);game.realism.metrics.procurement_spend+=order.own_contribution;
  return order;
}

const processProcurement=(game,{addUnit,vehicleDefinition,log}={})=>{
  for(const order of game.vehicle_procurements||[]){
    if(order.status!=='ordered'||game.elapsed<order.delivery_at)continue;
    const base=game.bases.find(item=>item.id===order.base_id),definition=vehicleDefinition?.(order.service,order.vehicle_type);
    if(!base||!definition){order.status='cancelled';continue;}
    if(game.units.filter(unit=>unit.base_id===base.id).length>=(base.capacity||2)){order.status='awaiting-garage';continue;}
    const before=game.units.length;addUnit?.(game,base,order.vehicle_type);
    const unit=game.units[game.units.length-1];
    if(game.units.length>before&&unit){
      order.status='delivered';order.delivered_at=game.elapsed;unit.procurement_id=order.id;
      if(order.used){unit.condition=order.used_condition;unit.mileage_km=order.used_mileage_km;unit.manufactured_year=(localParts(simulatedDate(game)).year||2026)-order.used_age;unit.wear=clamp(100-order.used_condition*.72,8,65);unit.next_maintenance_km=unit.mileage_km+2500;}
      if(log)log(game,`${definition.name} entregue em ${base.name} após processo de aquisição.`,'success');
    }
  }
  for(const order of game.vehicle_procurements||[]){
    if(order.status==='awaiting-garage'){
      const base=game.bases.find(item=>item.id===order.base_id);
      if(base&&game.units.filter(unit=>unit.base_id===base.id).length<(base.capacity||2)){order.status='ordered';order.delivery_at=game.elapsed;}
    }
  }
};

const processDroneMissions=(game,log)=>{
  for(const mission of game.drone_missions||[]){
    if(mission.status!=='active'||game.elapsed<mission.completes_at)continue;
    const asset=game.drone_assets.find(item=>item.id===mission.drone_id),incident=game.incidents.find(item=>item.id===mission.incident_id);
    mission.status='completed';mission.completed_at=game.elapsed;
    if(asset){asset.status='available';asset.missions=(asset.missions||0)+1;asset.battery=Math.max(10,(asset.battery??100)-22);}
    if(incident){
      revealIncidentIntel(incident,38,'drone');
      incident.aerial_recon=true;
      incident.timeline=[...(incident.timeline||[]),{time:game.elapsed,type:'drone',text:'Reconhecimento aéreo por drone concluído.'}].slice(-30);
      if(log)log(game,`${incident.title}: drone concluiu reconhecimento; inteligência atualizada para ${Math.round(incident.intel_confidence||0)}%.`,'success');
    }
  }
  for(const asset of game.drone_assets||[]){
    if(asset.status==='available'&&(asset.battery??100)<100)asset.battery=Math.min(100,(asset.battery??100)+.03);
  }
};

const processMutualAid=(game,{log}={})=>{
  for(const aid of game.mutual_aid||[]){
    if(aid.status==='requested'&&game.elapsed>=aid.arrives_at){
      aid.status='active';aid.activated_at=game.elapsed;
      const incident=(game.incidents||[]).find(item=>item.id===aid.incident_id);
      if(incident){
        incident.external_support=incident.external_support||{fire:0,medical:0,police:0};
        incident.external_support[aid.service]=(incident.external_support[aid.service]||0)+aid.units;
        incident.needs[aid.service]=Math.max(0,(incident.needs?.[aid.service]||0)-aid.units);
        incident.required_personnel=Math.max(1,Object.values(incident.needs||{}).reduce((sum,count)=>sum+count*2,0));
        incident.timeline=[...(incident.timeline||[]),{time:game.elapsed,type:'mutual-aid',text:`Apoio externo chegou: ${aid.units} meio(s) de ${aid.service}.`}].slice(-30);
      }
      if(log)log(game,`Apoio mútuo chegou: ${aid.name} · ${aid.units} meio(s).`,'success');
    }
    if(['requested','active'].includes(aid.status)&&game.elapsed>=aid.ends_at){aid.status='completed';aid.completed_at=game.elapsed;if(log)log(game,`Apoio mútuo concluído: ${aid.name}.`,'info');}
  }
};

const processHandover=(game,{returnToBase,log}={})=>{
  for(const unit of game.units||[]){
    if(unit.status!=='hospital_handover'||game.elapsed<(unit.handover_until||Infinity))continue;
    game.realism.metrics.handover_minutes+=(unit.handover_duration||0)/60;
    unit.handover_until=0;unit.handover_duration=0;
    returnToBase?.(game,unit);
    if(log)log(game,`${unit.name}: transferência clínica concluída; unidade regressa à disponibilidade.`,'success');
  }
};

export function beginHospitalHandover(game,unit,facility,returnToBase){
  ensureRealismState(game);ensureHospital(facility);
  if(unit.service!=='medical'||facility?.type!=='hospital'){returnToBase?.(game,unit);return 0;}
  const minutes=Math.max(8,facility.handover_minutes||12);
  const duration=Math.round(minutes*60);
  unit.status='hospital_handover';unit.handover_duration=duration;unit.handover_until=game.elapsed+duration;unit.route=[];unit.route_times=[];unit.travel=0;unit.travel_total=0;
  return duration;
}

const updateRegionalTrust=game=>{
  for(const base of game.bases||[]){
    const key=base.city||base.land||'Portugal';
    if(!game.regional_trust[key])game.regional_trust[key]={fire:90,medical:90,police:90};
    const service=base.service,coverage=game.coverage_state?.by_service?.[service]?.bases?.find(item=>item.base_id===base.id)?.coverage??50;
    const current=game.regional_trust[key][service]??90;
    game.regional_trust[key][service]=Number(clamp(current+(coverage>=65 ? .02 : coverage<35 ? -.05 : 0),0,100).toFixed(2));
  }
};

const updatePowerAndEnergy=(game,log)=>{
  const previous=game.infrastructure_state.power;
  const storm=game.conditions?.weather==='storm',sample=hash(`${dateKey(simulatedDate(game))}:${Math.floor(game.elapsed/600)}:power`);
  game.infrastructure_state.power=storm&&sample>.985?'grid-failure':'normal';
  if(game.infrastructure_state.power==='grid-failure'&&!game.infrastructure_state.backup_power){
    (game.command_centers||[]).forEach(center=>center.active=false);
  }
  if(previous!==game.infrastructure_state.power&&log)log(game,game.infrastructure_state.power==='grid-failure'?'Falha de energia na rede: geradores de contingência ativados.':'Rede elétrica estabilizada.',game.infrastructure_state.power==='grid-failure'?'alert':'success');
};

export function tickRealism(game,dt,{log=null,addUnit=null,vehicleDefinition=null,vehicleCatalog=null,returnToBase=null,spawn=null}={}){
  ensureRealismState(game);
  ensureLogisticsState(game);
  const date=simulatedDate(game);
  allocateCrews(game);
  processAbsenceWeek(game,date,log);
  processCertifications(game,log);
  processFleetLifecycle(game,dt,log);
  processHospitals(game,log);
  processCoverage(game,dt,log);
  processCommunications(game,dt,log);
  processRiskForecast(game);
  processPlannedEvents(game,log);
  processPublicEvents(game,log,spawn);
  processAudits(game,log);
  processBudgetCycle(game);
  processObjectives(game);
  processPoliceCases(game,dt,log);
  processIncidentDynamics(game,dt,log);
  processSustainability(game);
  updateRegionalTrust(game);
  updatePowerAndEnergy(game,log);
  refreshUsedMarket(game,vehicleCatalog);
  processProcurement(game,{addUnit,vehicleDefinition,log});
  processDroneMissions(game,log);
  processMutualAid(game,{log});
  processHandover(game,{returnToBase,log});

  for(const unit of game.units||[]){
    if(!['enroute','onscene','transporting','patrol','staging_enroute','event_standby'].includes(unit.status))continue;
    for(const id of unit.personnel_ids||[]){
      const person=game.personnel.find(item=>item.id===id);if(!person)continue;
      if(!personOnDuty(person,date,game.elapsed)){person.overtime_minutes=(person.overtime_minutes||0)+dt/60;game.realism.metrics.overtime_minutes+=dt/60;}
    }
  }

  for(const incident of game.incidents||[]){
    if(incident.status==='onscene'&&!incident.reconnaissance?.complete){
      const first=(game.units||[]).find(unit=>unit.incident_id===incident.id&&unit.status==='onscene');
      if(first)markReconnaissance(game,incident,first);
    }
    if(incident.status==='onscene'&&!incident.command_structure?.established){
      const commandUnit=(game.units||[]).find(unit=>unit.incident_id===incident.id&&unit.status==='onscene'&&['command-unit'].includes(unit.vehicle_type));
      const anyUnit=(game.units||[]).find(unit=>unit.incident_id===incident.id&&unit.status==='onscene');
      if(commandUnit||((incident.rarity_level||1)<=3&&anyUnit)){
        const commandVehicle=commandUnit||anyUnit,crew=(commandVehicle?.personnel_ids||[]).map(id=>game.personnel.find(person=>person.id===id)).filter(Boolean).sort((a,b)=>(b.leadership||0)-(a.leadership||0));
        incident.command_structure={established:true,commander_unit_id:commandVehicle?.id||null,commander_person_id:crew[0]?.id||null,sectors:(incident.rarity_level||1)>=5?['Operações','Socorro','Logística']:['Operações']};
        incident.timeline=[...(incident.timeline||[]),{time:game.elapsed,type:'command',text:'Comando da ocorrência estabelecido.'}].slice(-30);
      }
    }
    if(incident.category==='hazmat'&&incident.status==='onscene'&&incident.operational_zones&&!incident.operational_zones.hot){
      incident.operational_zones={hot:true,warm:true,cold:true};
    }
  }
  return game;
}

export function incidentOperationalCost(game,incident,assignedUnits=[]){
  const fuel=assignedUnits.reduce((sum,unit)=>sum+Math.max(0,unit.route_distance||0)/1000*Math.max(1,unit.fuel_consumption_l_100km||12)/100*2.221,0);
  const consumables=(incident.rarity_level||1)*65+(incident.casualties||0)*80+assignedUnits.length*28;
  const overtime=assignedUnits.reduce((sum,unit)=>{
    const current=(unit.personnel_ids||[]).reduce((minutes,id)=>minutes+(game.personnel.find(person=>person.id===id)?.overtime_minutes||0),0);
    const delta=Math.max(0,current-(unit.dispatch_overtime_start||0));
    const crew=(unit.personnel_ids||[]).map(id=>game.personnel.find(person=>person.id===id)).filter(Boolean);
    const hourly=crew.length?crew.reduce((value,person)=>value+((person.salary||1500)/160),0)/crew.length:10;
    return sum+delta/60*hourly*1.5;
  },0);
  const repairs=assignedUnits.reduce((sum,unit)=>sum+(unit.wear||0)*1.4,0);
  const external=(game.mutual_aid||[]).filter(item=>item.incident_id===incident.id).reduce((sum,item)=>sum+(item.cost||0),0);
  const total=fuel+consumables+overtime+repairs+external;
  return {fuel:Math.round(fuel),consumables:Math.round(consumables),overtime:Math.round(overtime),repairs:Math.round(repairs),external_support:Math.round(external),total:Math.round(total)};
}

const createPoliceCase=(game,incident,success)=>{
  if(!['crime','search','explosives','public_order','police_patrol'].includes(incident.category)&&incident.service!=='police')return null;
  if(incident.false_alarm)return null;
  const caseFile={
    id:uid('case'),incident_id:incident.id,title:incident.title,category:incident.category,status:success?'investigation':'urgent',
    created_at:game.elapsed,priority:incident.priority||2,progress:success?18:5,evidence:Math.max(0,Math.round((incident.rarity_level||1)*.8+(incident.detainees||0))),
    suspects:Math.max(0,incident.detainees||0)+(incident.category==='crime'?1:0),detainees:incident.detainees||0,
    leads:{
      witnesses:1+Math.floor(hash(incident.id+'witness')*4),
      cctv:hash(incident.id+'cctv')>.35,
      plate:hash(incident.id+'plate')>.58,
      forensics:hash(incident.id+'forensics')>.28,
    },
    assigned_priority:false,last_update_at:game.elapsed,closed_at:null,
  };
  game.police_cases=[caseFile,...(game.police_cases||[])].slice(0,100);
  return caseFile;
};

const processPoliceCases=(game,dt,log)=>{
  if(game.realism?.modules?.persistent_cases===false)return;
  for(const file of game.police_cases||[]){
    if(!['investigation','urgent'].includes(file.status))continue;
    const investigators=(game.personnel||[]).filter(person=>person.service==='police'&&(person.qualifications||[]).includes('investigation')&&['on-duty','recalled'].includes(person.duty_state)).length;
    const investigationUnits=(game.units||[]).filter(unit=>unit.service==='police'&&unit.vehicle_type==='investigation-unit'&&['available','patrol','staged'].includes(unit.status)).length;
    const pace=(.015+investigators*.006+investigationUnits*.01)*(file.assigned_priority?1.6:1);
    file.progress=Math.min(100,(file.progress||0)+dt*pace);
    if(game.elapsed-(file.last_evidence_at||file.created_at)>600&&file.progress<85){
      file.last_evidence_at=game.elapsed;
      const chance=.18+investigators*.03+(file.assigned_priority?.08:0);
      if(hash(file.id+Math.floor(game.elapsed/600))<chance){file.evidence=(file.evidence||0)+1;file.progress=Math.min(100,file.progress+6);}
    }
    if(file.progress>=100){
      file.status='closed';file.closed_at=game.elapsed;
      game.trust=Math.min(100,(game.trust||0)+.25);
      if(log)log(game,`Caso encerrado: ${file.title} · prova recolhida: ${file.evidence} item(ns).`,'success');
    }
  }
};

const processIncidentDynamics=(game,dt,log)=>{
  for(const incident of game.incidents||[]){
    const tactic=tacticalModifier(incident);
    incident.consumption_multiplier=tactic?.resources||1;
    if(['urban_fire','wildfire'].includes(incident.category)||incident.service==='fire'){
      const storm=game.conditions?.weather==='storm',rain=game.conditions?.weather==='rain';
      incident.fire_state=incident.fire_state||{
        intensity:Math.min(100,25+(incident.rarity_level||1)*10),
        spread:0,structural_risk:10,
        wind_kmh:Math.round((storm?45:rain?18:8)+hash(incident.id+'wind')*(storm?35:22)),
        humidity_percent:Math.round((rain?72:storm?58:28)+hash(incident.id+'humidity')*(rain?20:32)),
        fuel_load:Math.round(35+(incident.rarity_level||1)*8+hash(incident.id+'fuel')*25),
        slope_percent:incident.category==='wildfire'?Math.round(hash(incident.id+'slope')*38):0,
        floors:incident.category==='urban_fire'?1+Math.floor(hash(incident.id+'floors')*12):1,
        vertical_spread:0,
        front_m:incident.category==='wildfire'?80+Math.round(hash(incident.id+'front')*260):0,
      };
      const windFactor=1+Math.max(0,(incident.fire_state.wind_kmh||0)-15)/90;
      const humidityFactor=Math.max(.55,1.2-(incident.fire_state.humidity_percent||50)/100*.65);
      const slopeFactor=1+(incident.fire_state.slope_percent||0)/120;
      const weatherFactor=storm?1.14:rain?.72:1;
      const spreadPhysics=windFactor*humidityFactor*slopeFactor*weatherFactor*Math.max(.65,(incident.fire_state.fuel_load||50)/55);
      const controlled=incident.status==='onscene'&&incident.progress>0;
      const waterSupport=incident.water_supply?.continuous?1.18:1;
      const delta=dt*(controlled?-0.018*waterSupport:0.012)*spreadPhysics*(tactic?.risk||1);
      incident.fire_state.intensity=clamp(incident.fire_state.intensity+delta,0,100);
      incident.fire_state.spread=clamp((incident.fire_state.spread||0)+dt*(controlled?.0025:.0085)*spreadPhysics,0,100);
      incident.fire_state.structural_risk=clamp((incident.fire_state.structural_risk||0)+dt*(incident.fire_state.intensity/100)*.0035*(incident.fire_state.floors>5?1.22:1),0,100);
      if(incident.category==='urban_fire')incident.fire_state.vertical_spread=clamp((incident.fire_state.vertical_spread||0)+dt*(controlled?.001:.0055)*windFactor,0,100);
      if(incident.category==='wildfire')incident.fire_state.front_m=Math.max(20,(incident.fire_state.front_m||80)+dt*(controlled?-.08:.24)*spreadPhysics);
      if(incident.fire_state.structural_risk>75&&!incident.structural_warning){incident.structural_warning=true;if(log)log(game,`${incident.title}: risco estrutural elevado.`,'alert');}
    }
    if(incident.category==='hazmat'){
      incident.hazmat_state=incident.hazmat_state||{contamination_radius_m:60,identified:false,decon_ready:false};
      if(incident.reconnaissance?.complete)incident.hazmat_state.identified=true;
      if(incident.operational_zones?.hot)incident.hazmat_state.decon_ready=true;
      if(!incident.hazmat_state.decon_ready)incident.hazmat_state.contamination_radius_m=Math.min(1200,incident.hazmat_state.contamination_radius_m+dt*.06*(game.conditions?.weather==='storm'?1.5:1));
    }
    if(incident.category==='road'&&(incident.rarity_level||0)>=4&&incident.reconnaissance?.complete)incident.road_closure=true;
    if((incident.rarity_level||0)>=6||incident.category==='disaster'){
      incident.disaster_state=incident.disaster_state||{phase:0,phases:['Impacto','Busca e salvamento','Estabilização','Recuperação'],started_at:incident.created||game.elapsed};
      const targetPhase=Math.min(3,Math.floor((incident.progress||0)/30));
      if(targetPhase>incident.disaster_state.phase){
        incident.disaster_state.phase=targetPhase;
        incident.timeline=[...(incident.timeline||[]),{time:game.elapsed,type:'phase',text:`Fase: ${incident.disaster_state.phases[targetPhase]}.`}].slice(-30);
        if(log)log(game,`${incident.title}: transição para ${incident.disaster_state.phases[targetPhase]}.`,'info');
      }
    }
    const onscene=(game.units||[]).filter(unit=>unit.incident_id===incident.id&&unit.status==='onscene');
    for(const unit of onscene){
      unit.onscene_since=unit.onscene_since||game.elapsed;
      const operationalSeconds=game.elapsed-unit.onscene_since;
      if(operationalSeconds>1800&&!unit.rotation_due){
        unit.rotation_due=true;
        unit.fatigue=Math.min(100,(unit.fatigue||0)+8);
        if(log)log(game,`${unit.name}: rendição de equipa recomendada por operação prolongada.`,'alert');
      }
      const provisionInterval=Math.floor(operationalSeconds/900);
      if(provisionInterval>(unit.last_provision_interval||0)){
        unit.last_provision_interval=provisionInterval;
        const base=game.bases.find(item=>item.id===unit.base_id);
        if(base)consumeBaseStock(base,'provisions',Math.max(1,unit.crew_assigned||1));
      }
    }
  }
};

export function applyOperationalRisk(game,incident,units,random=Math.random,log=null){
  const tactic=tacticalModifier(incident),rarity=incident.rarity_level||1;
  let injuries=0;
  for(const unit of units||[]){
    const crew=(unit.personnel_ids||[]).map(id=>game.personnel.find(person=>person.id===id)).filter(Boolean);
    for(const person of crew){
      const fatigue=(person.fatigue||0)/100,healthRisk=(100-(person.health??100))/100;
      const modeFactor=game.realism?.mode==='hardcore'?1.4:game.realism?.mode==='assisted'?.55:1;
      const baseChance=.0015*rarity*(tactic?.risk||1)*modeFactor*(1+fatigue*.8+healthRisk*.7);
      if(random()<baseChance){
        const hours=6+Math.round(random()*66);
        person.sick_until=Math.max(person.sick_until||0,game.elapsed+hours*3600);
        person.health=clamp((person.health??100)-(4+rarity*1.5),20,100);
        person.injuries=(person.injuries||0)+1;person.duty_state='sick';injuries++;
        if(log)log(game,`Acidente de trabalho: ${person.name} ficará indisponível durante cerca de ${hours} h.`,'alert');
      }
    }
  }
  return injuries;
}

const processSustainability=game=>{
  if(game.realism?.modules?.sustainability===false)return;
  for(const unit of game.units||[]){
    const current=Math.max(0,Number(unit.mileage_km)||0),previous=Math.max(0,Number(unit.sustainability_mileage_km)||0),delta=Math.max(0,current-previous);
    if(!delta)continue;
    unit.sustainability_mileage_km=current;
    if(unit.energy_type==='electric'){
      const kwh=delta*(Number(unit.energy_kwh_100km)||22)/100;game.sustainability_state.electric_kwh+=kwh;
    }else{
      const litres=delta*Math.max(1,Number(unit.fuel_consumption_l_100km)||12)/100;
      if(unit.energy_type==='petrol'){game.sustainability_state.petrol_litres+=litres;game.sustainability_state.co2_kg+=litres*2.31;}
      else{game.sustainability_state.diesel_litres+=litres;game.sustainability_state.co2_kg+=litres*2.68;}
    }
  }
};

export function buildAfterActionReport(game,incident,performance,assignedUnits,success){
  const costs=incidentOperationalCost(game,incident,assignedUnits);
  const firstDispatch=Math.min(...assignedUnits.map(unit=>unit.dispatched_at||Infinity));
  const firstArrival=incident.response_arrived_at||null;
  const responseSeconds=firstArrival&&Number.isFinite(firstDispatch)?Math.max(0,firstArrival-firstDispatch):null;
  const report={
    id:uid('aar'),incident_id:incident.id,title:incident.title,time:game.elapsed,success,
    rarity:incident.rarity_level||1,category:incident.category,performance_score:performance?.score||0,
    intel_confidence:incident.intel_confidence||0,tactic:incident.tactical_plan?.option||'balanced',
    response_seconds:responseSeconds,units:assignedUnits.length,casualties:incident.casualties||0,detainees:incident.detainees||0,
    escalations:incident.escalation_stage||0,clinical_deteriorations:incident.clinical_deteriorations||0,costs,
    lessons:[],
  };
  if((incident.intel_confidence||0)<60)report.lessons.push('Reforçar recolha de informação inicial e chamadas complementares.');
  if((incident.escalation_stage||0)>0)report.lessons.push('A ocorrência agravou-se antes da estabilização operacional.');
  if((performance?.score||0)<75)report.lessons.push('Rever tempos, meios e coordenação do despacho.');
  if(costs.external_support>0)report.lessons.push('Foi necessário apoio externo; rever cobertura territorial.');
  if(!report.lessons.length)report.lessons.push('Resposta dentro dos parâmetros operacionais definidos.');
  game.after_action_reports=[report,...(game.after_action_reports||[])].slice(0,100);
  const uniqueBases=[...new Set((assignedUnits||[]).map(unit=>unit.base_id).filter(Boolean))],share=uniqueBases.length?Math.round(report.costs.total/uniqueBases.length):0;
  uniqueBases.forEach(baseId=>{game.cost_centers.by_base[baseId]=(game.cost_centers.by_base[baseId]||0)+share;});
  const services=[...new Set((assignedUnits||[]).map(unit=>unit.service).filter(Boolean))],serviceShare=services.length?Math.round(report.costs.total/services.length):0;
  services.forEach(service=>{game.cost_centers.by_service[service]=(game.cost_centers.by_service[service]||0)+serviceShare;});
  report.base_ids=uniqueBases;report.services=services;
  createPoliceCase(game,incident,success);
  if(!success||(performance?.score||0)<60||(incident.rarity_level||0)>=6&&success===false){
    game.media_state.scrutiny=clamp((game.media_state.scrutiny||0)+(incident.rarity_level||1)*4,0,100);
    game.media_state.last_event_at=game.elapsed;
  }else game.media_state.scrutiny=clamp((game.media_state.scrutiny||0)-.5,0,100);
  return report;
}

export function dispatchExplanation(game,incident,units=[]){
  return units.map(unit=>{
    const base=game.bases.find(item=>item.id===unit.base_id),coverage=game.coverage_state?.by_service?.[unit.service]?.bases?.find(item=>item.base_id===base?.id)?.coverage??0;
    const reasons=[
      `estado ${unit.status}`,
      `${Math.round(unit.resources?.fuel??100)}% combustível`,
      `${Math.round(unit.condition??100)}% condição`,
      `cobertura da base ${coverage}%`,
    ];
    if(unit.training)reasons.push(`qualificação ${unit.training}`);
    return {unit_id:unit.id,name:unit.name,reasons,text:`${unit.name}: ${reasons.join(' · ')}.`};
  });
}

export function applyRealismAction(game,kind,data={},ctx={}){
  ensureRealismState(game);
  const log=ctx.log||(()=>{});
  if(kind==='set_realism_mode'){
    const mode=['assisted','realistic','hardcore'].includes(data.mode)?data.mode:'realistic';
    game.realism.mode=mode;
    game.realism.minimum_coverage_percent=mode==='hardcore'?60:mode==='assisted'?30:45;
    log(game,`Modo de realismo alterado para ${mode}.`,'success');
    return true;
  }
  if(kind==='toggle_realism_module'){
    if(!(data.module in REALISM_MODULES))throw new Error('Módulo de realismo inválido.');
    game.realism.modules[data.module]=!!data.enabled;log(game,`${REALISM_MODULES[data.module]}: ${data.enabled?'ativo':'desativado'}.`,'success');return true;
  }
  if(kind==='acquire_drone'){
    const center=game.command_centers.find(item=>item.id===data.command_center_id&&item.active!==false);if(!center)throw new Error('Centro de Comando inválido.');
    const cost=12000;if((game.money||0)-cost<reserveFloor(game))throw new Error('Orçamento insuficiente para aquisição de drone.');
    payCost(game,cost,{label:'drone operacional térmico',log,protectReserve:false});
    game.drone_assets.push({id:uid('drone'),name:`UAS ${String(game.drone_assets.length+1).padStart(2,'0')}`,command_center_id:center.id,status:'available',battery:100,thermal:true,cost,missions:0,acquired_at:game.elapsed});
    log(game,`${center.name}: drone térmico operacional adquirido.`,'success');return true;
  }
  if(kind==='deploy_drone'){
    const incident=game.incidents.find(item=>item.id===data.incident_id);if(!incident)throw new Error('Ocorrência inválida.');
    if(['storm','fog'].includes(game.conditions?.weather))throw new Error('Condições meteorológicas impedem operação segura do drone.');
    const center=game.command_centers.find(item=>item.id===incident.command_center_id)||game.command_centers?.[0];
    const drone=game.drone_assets.find(item=>item.command_center_id===center?.id&&item.status==='available'&&(item.battery??100)>=25);
    if(!drone)throw new Error('Não existe drone disponível com bateria suficiente neste comando.');
    drone.status='deployed';drone.incident_id=incident.id;
    game.drone_missions.unshift({id:uid('uas-mission'),drone_id:drone.id,incident_id:incident.id,status:'active',started_at:game.elapsed,completes_at:game.elapsed+90});
    log(game,`${drone.name} lançado para reconhecimento de ${incident.title}.`,'success');return true;
  }
    if(kind==='set_incident_tactic'){
    const incident=game.incidents.find(item=>item.id===data.incident_id);if(!incident)throw new Error('Ocorrência inválida.');
    const option=tacticalOptionsFor(incident).find(item=>item.id===data.option);if(!option)throw new Error('Tática inválida para esta ocorrência.');
    incident.tactical_plan={option:option.id,set_at:game.elapsed};incident.timeline=[...(incident.timeline||[]),{time:game.elapsed,type:'command',text:`Tática definida: ${option.name}.`}].slice(-30);log(game,`${incident.title}: ${option.name} definida pelo comando.`,'success');return true;
  }
  if(kind==='recall_personnel'){
    const base=game.bases.find(item=>item.id===data.base_id);if(!base)throw new Error('Base inválida.');
    const count=Math.max(1,Math.min(20,Number(data.count)||1)),duration=Math.max(2,Math.min(24,Number(data.hours)||8))*3600;
    const candidates=(game.personnel||[]).filter(person=>person.base_id===base.id&&person.duty_state==='off-duty'&&person.status!=='training').sort((a,b)=>(a.fatigue||0)-(b.fatigue||0)).slice(0,count);
    if(!candidates.length)throw new Error('Não existem elementos fora de serviço disponíveis para chamada.');
    candidates.forEach(person=>{person.recalled_until=game.elapsed+duration;person.duty_state='recalled';});
    game.realism.metrics.callbacks+=candidates.length;log(game,`Chamada extraordinária: ${candidates.length} elemento(s) convocados para ${base.name}.`,'alert');return true;
  }
  if(kind==='schedule_leave'){
    const person=game.personnel.find(item=>item.id===data.person_id);if(!person)throw new Error('Elemento inválido.');
    const days=Math.max(1,Math.min(30,Number(data.days)||1));person.leave_until=game.elapsed+days*daySeconds;person.duty_state='leave';log(game,`${person.name}: férias/licença registadas por ${days} dia(s).`,'info');return true;
  }
  if(kind==='perform_vehicle_inspection'){
    const unit=game.units.find(item=>item.id===data.unit_id);if(!unit||!['available','inspection_hold','uncrewed','offshift'].includes(unit.status))throw new Error('A viatura tem de estar parada para inspeção.');
    const cost=Math.max(80,Math.round((unit.purchase_price||50000)*.0015));if((game.money||0)-cost<reserveFloor(game))throw new Error('Orçamento insuficiente mantendo a reserva operacional.');
    payCost(game,cost,{label:'inspeção operacional',log,protectReserve:false});unit.inspection_due_at=game.elapsed+365*daySeconds;unit.inspection_overdue=false;if(unit.status==='inspection_hold')unit.status='uncrewed';log(game,`${unit.name}: inspeção concluída.`,'success');return true;
  }
  if(kind==='buy_used_vehicle'){
    const offer=(game.used_vehicle_market||[]).find(item=>item.id===data.offer_id&&item.status==='available'),base=game.bases.find(item=>item.id===data.base_id);
    if(!offer||!base||base.service!==offer.service)throw new Error('Oferta ou base incompatível.');
    const reserved=(game.vehicle_procurements||[]).filter(order=>order.base_id===base.id&&['ordered','awaiting-garage'].includes(order.status)).length;
    if((game.units||[]).filter(unit=>unit.base_id===base.id).length+reserved>=(base.capacity||2))throw new Error('Sem capacidade de garagem disponível ou já reservada.');
    if((game.money||0)-offer.price<reserveFloor(game))throw new Error('Orçamento insuficiente mantendo a reserva operacional.');
    payCost(game,offer.price,{label:`aquisição usada · ${offer.name}`,log,protectReserve:false});
    const definition=ctx.vehicleDefinition?.(offer.service,offer.vehicle_type);if(!definition)throw new Error('Definição de viatura indisponível.');
    queueVehicleProcurement(game,base,definition,{total:offer.price,own:offer.price,grant:0},{used:true,usedOffer:offer});offer.status='sold';log(game,`${offer.name} usada adjudicada; aguarda inspeção e entrega.`,'success');return true;
  }
  if(kind==='set_vehicle_insurance'){
    const unit=game.units.find(item=>item.id===data.unit_id);if(!unit)throw new Error('Viatura inválida.');
    const type=['public-fleet','comprehensive','self-insured'].includes(data.type)?data.type:'public-fleet';
    unit.insurance=unit.insurance||{};
    unit.insurance.type=type;unit.insurance.active=true;unit.insurance.deductible=type==='comprehensive'?250:type==='self-insured'?0:500;
    log(game,`${unit.name}: regime de seguro atualizado para ${type}.`,'success');
    return true;
  }
    if(kind==='request_mutual_aid'){
    const service=data.service,base=game.bases.find(item=>item.id===data.base_id),incident=game.incidents.find(item=>item.id===data.incident_id);
    if(!['fire','medical','police'].includes(service)||!base)throw new Error('Pedido de apoio inválido.');
    const units=Math.max(1,Math.min(5,Number(data.units)||1)),cost=units*(service==='medical'?2800:service==='fire'?3500:2200);
    if((game.money||0)-cost<reserveFloor(game))throw new Error('Orçamento insuficiente para apoio mútuo.');
    payCost(game,cost,{label:'apoio mútuo operacional',log,protectReserve:false});
    const aid={id:uid('aid'),service,base_id:base.id,incident_id:incident?.id||null,name:`Reforço externo ${service}`,units,cost,status:'requested',requested_at:game.elapsed,arrives_at:game.elapsed+180,ends_at:game.elapsed+7200};
    game.mutual_aid.unshift(aid);game.realism.metrics.mutual_aid_calls++;if(incident){incident.cost_ledger.external_support=(incident.cost_ledger.external_support||0)+cost;}log(game,`Apoio mútuo solicitado: ${units} meio(s) de ${service}.`,'success');return true;
  }
  if(kind==='set_event_preposition'){
    const event=game.planned_public_events.find(item=>item.id===data.event_id);if(!event||event.status==='completed')throw new Error('Evento inválido ou já concluído.');
    const service=data.service;if(!['fire','medical','police'].includes(service))throw new Error('Serviço inválido.');
    const target=Math.max(0,Math.min(9,Number(data.count)||0));
    event.prepositioned_unit_ids=event.prepositioned_unit_ids||[];
    const current=event.prepositioned_unit_ids.map(id=>game.units.find(unit=>unit.id===id)).filter(unit=>unit?.service===service);
    if(target>current.length){
      const inOtherEvents=new Set((game.planned_public_events||[]).filter(item=>item.id!==event.id&&item.status!=='completed').flatMap(item=>item.prepositioned_unit_ids||[]));
      const candidates=(game.units||[]).filter(unit=>unit.service===service&&unit.enabled!==false&&unit.status==='available'&&!inOtherEvents.has(unit.id));
      const preferred=candidates.sort((a,b)=>{
        const aBase=game.bases.find(base=>base.id===a.base_id),bBase=game.bases.find(base=>base.id===b.base_id);
        return Number(bBase?.command_center_id===event.command_center_id)-Number(aBase?.command_center_id===event.command_center_id);
      }).slice(0,target-current.length);
      if(preferred.length<target-current.length)throw new Error('Não existem meios disponíveis suficientes sem comprometer os já mobilizados.');
      for(const unit of preferred){unit.status='event_standby';unit.public_event_id=event.id;event.prepositioned_unit_ids.push(unit.id);}
    }else if(target<current.length){
      for(const unit of current.slice(target)){unit.status='available';delete unit.public_event_id;event.prepositioned_unit_ids=event.prepositioned_unit_ids.filter(id=>id!==unit.id);}
    }
    event.prepositioned[service]=target;
    log(game,`${event.name}: ${target} meio(s) reais de ${service} reservados no dispositivo preventivo.`,'success');return true;
  }
  if(kind==='set_communications_redundancy'){
    const value=['low','normal','high'].includes(data.value)?data.value:'normal';game.realism.communications_redundancy=value;
    const cost=value==='high'?25000:value==='normal'?5000:0;if(cost&&((game.money||0)-cost<reserveFloor(game)))throw new Error('Orçamento insuficiente para redundância adicional.');
    if(cost)payCost(game,cost,{label:'redundância de comunicações',log,protectReserve:false});log(game,'Política de redundância de comunicações atualizada.','success');return true;
  }
  if(kind==='acknowledge_audit'){
    const audit=game.operational_audits.find(item=>item.id===data.audit_id);if(!audit)throw new Error('Auditoria inválida.');audit.acknowledged=true;audit.acknowledged_at=game.elapsed;return true;
  }
  if(kind==='set_hospital_diversion'){
    const hospital=game.facilities.find(item=>item.id===data.facility_id&&item.type==='hospital');if(!hospital)throw new Error('Hospital inválido.');
    hospital.manual_diversion=!!data.enabled;hospital.diversion=!!data.enabled||hospital.ed_pressure>=88;log(game,`${hospital.name}: desvio ${hospital.diversion?'ativo':'desativado'}.`,'info');return true;
  }
  if(kind==='prioritize_police_case'){
    const file=game.police_cases.find(item=>item.id===data.case_id);if(!file)throw new Error('Caso policial inválido.');
    game.police_cases.forEach(item=>{if(item.status!=='closed')item.assigned_priority=false;});file.assigned_priority=true;log(game,`Investigação priorizada: ${file.title}.`,'success');return true;
  }
  if(kind==='install_ev_charger'){
    const base=game.bases.find(item=>item.id===data.base_id);if(!base)throw new Error('Base inválida.');
    const count=Math.max(1,Math.min(8,Number(data.count)||1)),cost=count*25000;
    if((game.money||0)-cost<reserveFloor(game))throw new Error('Orçamento insuficiente para infraestrutura de carregamento.');
    payCost(game,cost,{label:'carregadores de frota elétrica',log,protectReserve:false});base.ev_chargers=(base.ev_chargers||0)+count;game.sustainability_state.charging_points=(game.sustainability_state.charging_points||0)+count;log(game,`${base.name}: ${count} ponto(s) de carregamento instalados.`,'success');return true;
  }
  if(kind==='toggle_operational_layer'){
    if(!(data.layer in game.operational_layers))throw new Error('Camada operacional inválida.');
    game.operational_layers[data.layer]=!!data.enabled;return true;
  }
    if(kind==='set_infrastructure_backup'){
    game.infrastructure_state.backup_power=!!data.enabled;log(game,`Energia de contingência ${data.enabled?'ativada':'desativada'}.`,'success');return true;
  }
  return false;
}
