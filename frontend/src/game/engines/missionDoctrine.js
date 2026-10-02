// Doutrina operacional central das ocorrências do Distrito 112.
// Mantém raridade, tipologia, requisitos, deterioração clínica e desempenho
// coerentes em todo o catálogo de missões, incluindo conteúdo gerado.

const unique = values => [...new Set((values || []).filter(Boolean))];
const normalise = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const has = (text, terms) => terms.some(term => text.includes(term));

export const RARITY_LEVELS = {
  1:{id:'common',label:'Comum',frequency:45,reward_multiplier:1.00,clinical_interval:330,first_escalation_ratio:.62,second_escalation_ratio:.90},
  2:{id:'reinforced',label:'Reforçada',frequency:28,reward_multiplier:1.04,clinical_interval:285,first_escalation_ratio:.58,second_escalation_ratio:.86},
  3:{id:'serious',label:'Grave',frequency:15,reward_multiplier:1.08,clinical_interval:240,first_escalation_ratio:.55,second_escalation_ratio:.83},
  4:{id:'critical',label:'Crítica',frequency:7,reward_multiplier:1.14,clinical_interval:205,first_escalation_ratio:.50,second_escalation_ratio:.79},
  5:{id:'major',label:'Grande Ocorrência',frequency:4,reward_multiplier:1.22,clinical_interval:170,first_escalation_ratio:.46,second_escalation_ratio:.74},
  6:{id:'catastrophe',label:'Catástrofe',frequency:1,reward_multiplier:1.35,clinical_interval:135,first_escalation_ratio:.42,second_escalation_ratio:.68},
};

export const MISSION_CATEGORIES = {
  urban_fire:'Incêndio urbano',
  wildfire:'Incêndio rural/florestal',
  road:'Acidente rodoviário',
  rescue:'Salvamento',
  water_rescue:'Salvamento aquático',
  medical:'Emergência médica',
  police_patrol:'Patrulhamento policial',
  traffic:'Trânsito',
  crime:'Criminalidade',
  public_order:'Ordem pública',
  search:'Busca e localização',
  explosives:'Explosivos',
  hazmat:'Matérias perigosas',
  infrastructure:'Infraestruturas',
  weather:'Meteorologia severa',
  disaster:'Catástrofe',
  multi:'Operação conjunta',
};

const VEHICLE_TRAINING = {
  'wildfire-unit':'wildfire',
  tanker:'wildfire',
  'heavy-rescue':'rescue',
  'command-unit':'command',
  'hazmat-unit':'hazmat',
  vmer:'advanced-care',
  'medical-helicopter':'aeromedical',
  'mass-casualty-unit':'triage',
  'canine-unit':'canine',
  'traffic-unit':'traffic',
  'prisoner-van':'custody',
  'riot-unit':'public-order',
  'tactical-unit':'public-order',
};

export function categoryFor(title, service='fire'){
  const text=normalise(title);
  if(has(text,['sismo','catastrofe','emergencia nacional','acidente aereo em zona urbana','colapso sanitario regional']))return 'disaster';
  if(has(text,['tempestade','cheia','inundacao','temporal']))return 'weather';
  if(has(text,['incendio florestal','incendio rural','vegetacao','fogueira descontrolada','mata']))return 'wildfire';
  if(has(text,['quimic','materias perigosas','petroquim','fuga de gas','monoxido de carbono']))return 'hazmat';
  if(has(text,['explosivo','bomba','engenho']))return 'explosives';
  if(has(text,['afogamento','aquatico','na agua','no mar','rio','praia fluvial']))return 'water_rescue';
  if(has(text,['colisao','despiste','atropelamento','motocic','mota','rodoviario','tunel','veiculo','transito','perseguicao']))return 'road';
  if(has(text,['incendio','fumo','fogo','explosao domestica','alarme de incendio']))return 'urban_fire';
  if(has(text,['resgate','colapso','soterrad','poco','andaime','varanda','estrutura','queda de grande altura','queda em obra']))return 'rescue';
  if(has(text,['motim','disturbio','confronto entre grupos','manifestacao','evento desportivo']))return 'public_order';
  if(has(text,['desaparecid','busca de pessoa','desaparecimento']))return 'search';
  if(has(text,['assalto','roubo','sequestro','trafico','barricad','furto','agressao','violencia domestica']))return 'crime';
  if(has(text,['arvore caida','fachada','poste','telhado']))return 'infrastructure';
  if(service==='medical')return 'medical';
  if(service==='police')return 'police_patrol';
  if(service==='fire')return 'rescue';
  return 'multi';
}

export function rarityLevelFor(definition={},scenario={}){
  const title=normalise(definition.name || scenario.title);
  let level=definition.tier ? ({1:1,2:2,3:4,4:5}[definition.tier] || 1) : scenario.priority===1 ? 3 : scenario.priority===2 ? 2 : 1;
  if(has(title,['sismo','catastrofe','emergencia nacional','acidente aereo em zona urbana','colapso sanitario regional']))level=6;
  else if(has(title,['dezenas de vitimas','grande incendio petroquimico','fora de controlo','terminal portuario','evacuacao medica de hospital','multiplos refens','ataque coordenado','grande dimensao']))level=Math.max(level,5);
  else if(has(title,['mao armada','sequestro','explosao','derrame quimico','edificio de seis pisos','paragem cardiorrespiratoria','incendio industrial','ameaca com explosivo']))level=Math.max(level,4);
  if(scenario.title==='Incidente com múltiplas vítimas'||definition.scenario===10)level=Math.max(level,5);
  return Math.max(1,Math.min(6,level));
}

function requirementSets(definition,scenario,category,rarity){
  const text=normalise(definition.name || scenario.title);
  const mandatory=[...(definition.vehicle||[])],recommended=[],support=[];

  if(category==='urban_fire'){
    mandatory.push('fire-engine');
    if(has(text,['edificio alto','seis pisos','apartamento','pessoas nas janelas']))mandatory.push('ladder');
    if(rarity>=4)recommended.push('command-unit');
    if((scenario.needs?.medical||0)>0)support.push('ambulance');
  }
  if(category==='wildfire'){
    if(rarity>=2)mandatory.push('wildfire-unit');else recommended.push('wildfire-unit');
    recommended.push('tanker');
    if(rarity>=5)mandatory.push('command-unit');else if(rarity>=3)recommended.push('command-unit');
  }
  if(category==='hazmat'){
    if(rarity>=4)mandatory.push('hazmat-unit');else recommended.push('hazmat-unit');
    support.push('fire-engine');
    if(rarity>=4)recommended.push('command-unit');
  }
  if(category==='road'){
    if(has(text,['encarcer','capot','tres viaturas','autocarro','em massa','ferroviario','descarrilamento']))mandatory.push('heavy-rescue');
    recommended.push('traffic-unit');
    if((scenario.needs?.medical||0)>0)recommended.push(rarity>=4?'vmer':'ambulance');
    if(rarity>=5)recommended.push('command-unit');
  }
  if(category==='rescue'){
    if(rarity>=2)recommended.push('heavy-rescue');
    if(has(text,['altura','andaime','varanda','edificio']))recommended.push('aerial-platform');
    if(rarity>=5)mandatory.push('command-unit');
  }
  if(category==='water_rescue'){
    recommended.push('vmer','command-unit');
    if(rarity>=4)support.push('medical-helicopter');
  }
  if(category==='medical'){
    mandatory.push('ambulance');
    if(has(text,['inconsciente','toracica','cardiorrespiratoria','pediatrica grave','queimadura','parto','avc','enfarte']))mandatory.push('vmer');
    if(rarity>=5)mandatory.push('mass-casualty-unit');else if(rarity>=4)recommended.push('mass-casualty-unit');
    if(rarity>=5)support.push('medical-helicopter');
  }
  if(category==='search'){
    mandatory.push('patrol');
    if(rarity>=2)recommended.push('canine-unit');
  }
  if(category==='crime'){
    mandatory.push('patrol');
    if(has(text,['mao armada','refem','sequestro','barricad','alto risco']))mandatory.push('tactical-unit');
    if((definition.prisoners?.[1]||0)>0)recommended.push('prisoner-van');
  }
  if(category==='public_order'){
    mandatory.push('patrol');
    if(rarity>=3)mandatory.push('riot-unit');else recommended.push('riot-unit');
    if(rarity>=4)support.push('tactical-unit');
  }
  if(category==='explosives'){
    mandatory.push('patrol','tactical-unit');
    recommended.push('command-unit');
  }
  if(category==='traffic'){
    mandatory.push('traffic-unit');
    support.push('patrol');
  }
  if(category==='police_patrol')mandatory.push('patrol');
  if(category==='infrastructure')recommended.push('heavy-rescue');
  if(category==='weather'){
    recommended.push('command-unit','heavy-rescue');
    support.push('tanker','wildfire-unit','ambulance','traffic-unit');
  }
  if(category==='disaster'){
    mandatory.push('command-unit','mass-casualty-unit');
    recommended.push('heavy-rescue','vmer','tactical-unit');
    support.push('medical-helicopter','aerial-platform','tanker');
  }

  const mandatory_vehicle_types=unique(mandatory);
  const recommended_vehicle_types=unique(recommended).filter(id=>!mandatory_vehicle_types.includes(id));
  const support_vehicle_types=unique(support).filter(id=>!mandatory_vehicle_types.includes(id)&&!recommended_vehicle_types.includes(id));
  const mandatory_trainings=unique(mandatory_vehicle_types.map(id=>VEHICLE_TRAINING[id]));
  const recommended_trainings=unique(recommended_vehicle_types.map(id=>VEHICLE_TRAINING[id])).filter(id=>!mandatory_trainings.includes(id));
  return {mandatory_vehicle_types,recommended_vehicle_types,support_vehicle_types,mandatory_trainings,recommended_trainings};
}

export function buildIncidentDoctrine(definition={},scenario={}){
  const rarity_level=rarityLevelFor(definition,scenario),rarity=RARITY_LEVELS[rarity_level];
  const category=categoryFor(definition.name||scenario.title,scenario.service);
  const requirements=requirementSets(definition,scenario,category,rarity_level);
  const serviceCount=Object.values(scenario.needs||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const specialistPressure=requirements.mandatory_vehicle_types.length+requirements.mandatory_trainings.length*.5;
  const risk_score=Math.round(Math.min(100,10+rarity_level*12+serviceCount*4+specialistPressure*3));
  return {
    rarity_level,rarity_id:rarity.id,rarity_label:rarity.label,rarity_frequency:rarity.frequency,
    category,category_label:MISSION_CATEGORIES[category]||'Operação',risk_score,
    reward_multiplier:rarity.reward_multiplier,clinical_interval:rarity.clinical_interval,
    first_escalation_ratio:rarity.first_escalation_ratio,second_escalation_ratio:rarity.second_escalation_ratio,
    ...requirements,
  };
}

const VICTIM_LEVELS=['light','moderate','severe','critical','pcr'];
const VICTIM_WEIGHTS={
  1:[.65,.30,.05,0,0],
  2:[.35,.40,.20,.05,0],
  3:[.15,.35,.35,.13,.02],
  4:[.10,.25,.35,.25,.05],
  5:[.05,.15,.35,.35,.10],
  6:[.02,.08,.25,.45,.20],
};

export function initialiseVictimStates(count=0,rarity=1,random=Math.random){
  const result={light:0,moderate:0,severe:0,critical:0,pcr:0},weights=VICTIM_WEIGHTS[Math.max(1,Math.min(6,rarity))]||VICTIM_WEIGHTS[1];
  for(let i=0;i<Math.max(0,Number(count)||0);i++){
    let roll=random(),index=weights.length-1;
    for(let j=0;j<weights.length;j++){roll-=weights[j];if(roll<=0){index=j;break;}}
    result[VICTIM_LEVELS[index]]++;
  }
  return result;
}

export function deteriorateVictimStates(states={},random=Math.random){
  const next={light:0,moderate:0,severe:0,critical:0,pcr:0,...states};
  const candidates=VICTIM_LEVELS.slice(0,-1).filter(level=>(next[level]||0)>0);
  if(!candidates.length)return next;
  const weighted=[];
  candidates.forEach((level,index)=>{for(let i=0;i<(next[level]||0)*(index+1);i++)weighted.push(level);});
  const selected=weighted[Math.floor(random()*weighted.length)]||candidates[candidates.length-1],index=VICTIM_LEVELS.indexOf(selected);
  next[selected]=Math.max(0,next[selected]-1);next[VICTIM_LEVELS[index+1]]=(next[VICTIM_LEVELS[index+1]]||0)+1;
  return next;
}

export function escalationRequirementsFor(incident){
  const rarity=incident.rarity_level||3;
  if(incident.category==='disaster')return {needs:{fire:1,medical:1,police:1},vehicles:['command-unit','mass-casualty-unit'],trainings:['command','triage']};
  if(incident.service==='fire')return {needs:{fire:1},vehicles:rarity>=5?['command-unit']:[],trainings:rarity>=5?['command']:[]};
  if(incident.service==='medical')return {needs:{medical:1},vehicles:rarity>=5?['mass-casualty-unit']:[],trainings:rarity>=5?['triage']:[]};
  if(incident.service==='police')return {needs:{police:1},vehicles:incident.category==='public_order'?['riot-unit']:rarity>=5?['tactical-unit']:[],trainings:incident.category==='public_order'?['public-order']:[]};
  return null;
}

export function missionPerformance(incident,assignedUnits=[],elapsed=0){
  const responseWindow=Math.max(1,(incident.response_deadline||incident.deadline||elapsed)-(incident.created||0));
  const responseAt=incident.response_arrived_at||elapsed,responseRatio=Math.max(0,(responseAt-(incident.created||0))/responseWindow);
  const mandatory=incident.required_vehicle_types||[],mandatoryReady=mandatory.every(type=>assignedUnits.some(unit=>unit.vehicle_type===type));
  const serviceNeed=Object.values(incident.needs||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const recommended=(incident.recommended_vehicle_types||[]).filter(type=>assignedUnits.some(unit=>unit.vehicle_type===type)).length;
  let bonus=0;const reasons=[];
  if(responseRatio<=.5){bonus+=.10;reasons.push('resposta muito rápida');}else if(responseRatio<=.75){bonus+=.05;reasons.push('resposta rápida');}
  if(mandatoryReady){bonus+=.10;reasons.push('despacho adequado');}
  if(!(incident.escalation_stage>0)){bonus+=.05;reasons.push('sem agravamento');}
  if(assignedUnits.length<=serviceNeed+Math.max(1,recommended)){bonus+=.05;reasons.push('uso eficiente de meios');}
  const deteriorationPenalty=Math.min(.16,(incident.clinical_deteriorations||0)*.025);
  const multiplier=Math.max(.84,Math.min(1.35,1+bonus-deteriorationPenalty));
  const score=Math.max(0,Math.min(100,Math.round(70+bonus*100-deteriorationPenalty*120-(incident.escalation_stage||0)*6)));
  return {score,multiplier:Number(multiplier.toFixed(3)),bonus:Number(bonus.toFixed(3)),deterioration_penalty:Number(deteriorationPenalty.toFixed(3)),reasons};
}
