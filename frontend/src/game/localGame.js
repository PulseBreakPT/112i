import { EXTENSIONS, SPECIALIZATIONS, VEHICLE_CATALOG, POIS, MISSION_DEFINITIONS, weightedMission, progressionSnapshot, nextBuildingCost } from './progression';
import { NEW_SCENARIOS } from './expansionContent';
import { applyAdvancedAction, initializeAdvancedState, tickAdvancedState } from './advancedSimulation';
import { distanceMeters, fetchRoadRoute as fetchRoadRouteEngine, freshConditions, reverseRoute, RISK_ZONES } from './engines/mapEngine';
import { facilityOccupancy, hospitalCanReceive } from './engines/hospitalEngine';
import { operationalPhasesFor, generatedEvolution, vehicleTraining as vehicleTrainingEngine, requiredTrainingsFor as requiredTrainingsForEngine, trainedOnScene, mergeIncidentRequirements, readinessFor, PHASE_REQUIREMENTS } from './engines/missionEngine';
import { operationalUnit, hasOperationalResources, selectArrUnitIds as selectArrUnitIdsEngine, selectRecommendedUnitIds as selectRecommendedUnitIdsEngine } from './engines/dispatchEngine';
import { locate, returnToBase, startRoute } from './engines/unitEngine';

import { GAME_SAVE_KEY as SAVE_KEY } from './storageCompatibility';

const SERVICES = {
  fire: { name: 'Bombeiros', vehicle: 'Veículo de combate a incêndios', short: 'VFCI', price: 5000, base_price: 10000 },
  medical: { name: 'Emergência médica', vehicle: 'Ambulância de socorro', short: 'ABSC', price: 4000, base_price: 8000 },
  police: { name: 'Polícia', vehicle: 'Carro-patrulha', short: 'PSP', price: 3000, base_price: 8000 },
};

const FACILITY_CATALOG = {
  hospital: { name:'Hospital', cost:6000, capacity:5, service:'medical' },
  prison: { name:'Estabelecimento prisional', cost:5000, capacity:6, service:'police' },
  academy: { name:'Escola de formação', cost:4500, capacity:10, service:'all' },
};
const HOSPITAL_SPECIALTIES = [
  {id:'urgency',name:'Urgência geral',cost:0},{id:'trauma',name:'Trauma',cost:2800},{id:'burns',name:'Queimados',cost:3200},{id:'pediatrics',name:'Pediatria',cost:2500},{id:'cardiology',name:'Cardiologia',cost:3000},{id:'neurology',name:'Neurologia',cost:3400},{id:'obstetrics',name:'Obstetrícia',cost:2700},{id:'intensive-care',name:'Cuidados intensivos',cost:4200},
];
const TRAINING_CATALOG = [
  {id:'hazmat',name:'Matérias perigosas',service:'fire',duration:420,cost:700},
  {id:'rescue',name:'Desencarceramento e salvamento',service:'fire',duration:390,cost:720},
  {id:'wildfire',name:'Combate rural/florestal',service:'fire',duration:360,cost:650},
  {id:'command',name:'Comando e coordenação',service:'fire',duration:540,cost:1000},
  {id:'advanced-care',name:'Suporte avançado de vida',service:'medical',duration:360,cost:800},
  {id:'triage',name:'Triagem e catástrofe',service:'medical',duration:480,cost:900},
  {id:'aeromedical',name:'Evacuação aeromédica',service:'medical',duration:540,cost:1100},
  {id:'canine',name:'Unidade cinotécnica',service:'police',duration:360,cost:650},
  {id:'traffic',name:'Trânsito e cortes de via',service:'police',duration:300,cost:550},
  {id:'custody',name:'Transporte de detidos',service:'police',duration:300,cost:500},
  {id:'investigation',name:'Investigação criminal',service:'police',duration:420,cost:760},
  {id:'public-order',name:'Ordem pública',service:'police',duration:420,cost:750},
];
const DEFAULT_ARRS = [
  {id:'arr-incendio',name:'Incêndio urbano',resources:{fire:2,medical:1,police:0}},
  {id:'arr-acidente',name:'Acidente rodoviário',resources:{fire:1,medical:1,police:1}},
  {id:'arr-medica',name:'Emergência médica',resources:{fire:0,medical:1,police:0}},
];
const makeCareerTasks = g => [
  {id:uid(),type:'completed',title:'Resolver 3 ocorrências',target:3,baseline:g.completed||0,progress:0,reward:1200,claimed:false},
  {id:uid(),type:'earned',title:'Gerar 5 000 € em receita',target:5000,baseline:g.earned||0,progress:0,reward:900,claimed:false},
  {id:uid(),type:'personnel',title:'Recrutar 2 elementos',target:2,baseline:g.personnel?.length||0,progress:0,reward:600,claimed:false},
];
const PERSONNEL_NAMES = ['Ana Silva','Miguel Santos','Inês Costa','João Ferreira','Mariana Oliveira','Rui Pereira','Beatriz Martins','Diogo Rodrigues','Sofia Almeida','Tiago Sousa','Catarina Fernandes','André Gomes','Leonor Lopes','Pedro Marques','Marta Ribeiro','Gonçalo Carvalho','Carolina Teixeira','Bruno Correia','Matilde Neves','Hugo Monteiro'];

const places = [
  ['porto-boavista','Boavista · Porto',-8.6306,41.1578,'Porto','mainland'],
  ['porto-asprela','Asprela · Porto',-8.6045,41.1807,'Porto','mainland'],
  ['porto-bonfim','Bonfim · Porto',-8.6006,41.1499,'Porto','mainland'],
  ['porto-aliados','Avenida dos Aliados',-8.6110,41.1496,'Porto','mainland'],
  ['porto-cedofeita','Rua de Cedofeita',-8.6188,41.1537,'Porto','mainland'],
  ['porto-trindade','Trindade',-8.6089,41.1537,'Porto','mainland'],
  ['porto-batalha','Praça da Batalha',-8.6067,41.1458,'Porto','mainland'],
  ['porto-campanha','Campanhã · Porto',-8.5860,41.1496,'Porto','mainland'],
  ['porto-foz','Foz do Douro · Porto',-8.6711,41.1514,'Porto','mainland'],
  ['gaia','Vila Nova de Gaia',-8.6080,41.1294,'Porto','mainland'],
  ['matosinhos','Matosinhos',-8.6826,41.1821,'Porto','mainland'],
  ['maia','Maia',-8.6199,41.2350,'Porto','mainland'],
  ['braga','Braga',-8.4201,41.5500,'Braga','mainland'],
  ['aveiro','Aveiro',-8.6455,40.6404,'Aveiro','mainland'],
  ['coimbra','Coimbra',-8.4292,40.2100,'Coimbra','mainland'],
  ['lisboa','Lisboa · Marquês de Pombal',-9.1493,38.7253,'Lisboa','mainland'],
  ['faro','Faro',-7.9304,37.0194,'Faro','mainland'],
  ['funchal','Funchal · Madeira',-16.9100,32.6495,'Funchal','madeira'],
  ['machico','Machico · Madeira',-16.7660,32.7190,'Funchal','madeira'],
  ['ponta-delgada','Ponta Delgada · Açores',-25.6670,37.7415,'São Miguel','sao-miguel'],
  ['ribeira-grande','Ribeira Grande · Açores',-25.5200,37.8210,'São Miguel','sao-miguel'],
  ['angra','Angra do Heroísmo · Açores',-27.2180,38.6550,'Terceira','terceira'],
  ['praia-vitoria','Praia da Vitória · Açores',-27.0690,38.7300,'Terceira','terceira'],
].map(([id,name,lng,lat,city,land]) => ({ id, node:id, name, lng, lat, x:lng, y:lat, city, land }));
const POINTS = Object.fromEntries(places.map(p => [p.id, p]));
const siteIds = ['porto-campanha','porto-foz','gaia','matosinhos','maia','braga','aveiro','coimbra','lisboa','faro','funchal','ponta-delgada','angra'];

const SCENARIOS = [
  { title:'Incêndio num armazém', service:'fire', priority:1, needs:{fire:1,medical:1}, reward:2400, xp:100, description:'Fumo intenso num armazém. Um funcionário poderá estar no interior. Risco de propagação aos edifícios adjacentes.', caller:'Estou à porta do armazém. Há imenso fumo e o meu colega ainda não saiu! Devo entrar para o procurar?', choices:['Afaste-se do edifício e aguarde as equipas no exterior.','Entre e procure o seu colega.','Abra todas as portas do armazém.'], correct:0, feedback:'O civil afastou-se para um local seguro. A equipa recebeu a indicação de uma possível vítima.' },
  { title:'Pessoa inconsciente', service:'medical', priority:1, needs:{medical:1}, reward:1500, xp:80, description:'Uma pessoa perdeu os sentidos na via pública. É necessária uma equipa de emergência médica.', caller:'O meu pai caiu no passeio e não me responde. Estou muito assustado. O que faço?', choices:['Dê-lhe um copo de água.','Mantenha a calma. Diga-me se ele respira normalmente.','Deixe-o sozinho e procure ajuda.'], correct:1, feedback:'O interlocutor manteve a calma e confirmou a respiração. Informação transmitida à equipa médica.' },
  { title:'Assalto a estabelecimento', service:'police', priority:2, needs:{police:1}, reward:1200, xp:60, description:'Alarme acionado numa loja. O suspeito foi visto junto à entrada.', caller:'Acabaram de assaltar a minha loja! Acho que o homem ainda está cá. Posso ir atrás dele?', choices:['Persiga o suspeito.','Saia para tirar uma fotografia.','Fique num local seguro e descreva o suspeito.'], correct:2, feedback:'Descrição recebida. O comerciante permaneceu em segurança.' },
  { title:'Colisão rodoviária', service:'fire', priority:1, needs:{fire:1,medical:1,police:1}, reward:3800, xp:130, description:'Dois veículos envolvidos. Uma vítima encarcerada. É necessário cortar o trânsito e prestar socorro.', caller:'Houve um acidente. Um condutor não consegue sair e há combustível no chão.', choices:['Afaste-se do combustível e não mova os feridos.','Puxe o condutor para fora.','Aproxime-se da fuga.'], correct:0, feedback:'Zona sinalizada à distância. Informação transmitida aos bombeiros.' },
  { title:'Incêndio em vegetação', service:'fire', priority:2, needs:{fire:1}, reward:1700, xp:70, description:'Foco de incêndio junto a zona arborizada. Vento moderado.', caller:'Vejo chamas atrás do parque. O vento leva o fogo para as casas!', choices:['Tente apagar sozinho.','Afaste-se e indique um acesso seguro.','Espere para ver.'], correct:1, feedback:'Acesso seguro identificado. Equipa informada da direção do vento.' },
  { title:'Distúrbios na praça', service:'police', priority:3, needs:{police:1}, reward:900, xp:50, description:'Confronto entre dois grupos. Pedida presença policial preventiva.', caller:'Estão várias pessoas a discutir à frente do café.', choices:['Intervenha.','Afaste-se e aguarde a patrulha.','Aproxime-se e filme.'], correct:1, feedback:'O interlocutor afastou-se. A patrulha recebeu a localização.' },
  { title:'Queda na via pública', service:'medical', priority:2, needs:{medical:1}, reward:1100, xp:60, description:'Pessoa idosa com lesão na perna após uma queda.', caller:'A minha vizinha caiu e tem muitas dores. Devo levantá-la?', choices:['Ajude-a a caminhar.','Não a mova e aguarde o socorro.','Deixe-a sozinha.'], correct:1, feedback:'A vítima ficou acompanhada e não foi mobilizada.' },
  { title:'Incêndio em edifício alto', service:'fire', priority:1, needs:{fire:2,medical:1}, reward:5200, xp:190, description:'Fogo num piso elevado com pessoas retidas. É indispensável acesso em altura.', caller:'Há fumo nas escadas e pessoas nas janelas dos pisos superiores!', choices:['Use o elevador para sair.','Feche a porta, vá para uma janela e aguarde instruções.','Desça pelas escadas cheias de fumo.'], correct:1, feedback:'Os ocupantes ficaram isolados do fumo e sinalizaram a sua posição.' },
  { title:'Derrame químico industrial', service:'fire', priority:1, needs:{fire:2,medical:1,police:1}, reward:7600, xp:260, description:'Fuga de produto químico numa zona industrial. É necessária descontaminação e isolamento.', caller:'Um contentor rompeu-se e há uma nuvem estranha junto ao armazém.', choices:['Aproxime-se para ler o rótulo.','Afaste-se contra o vento e impeça outras pessoas de entrar.','Tente tapar a fuga.'], correct:1, feedback:'A área foi isolada e a direção da nuvem foi comunicada às equipas.' },
  { title:'Busca de pessoa desaparecida', service:'police', priority:2, needs:{police:2}, reward:4100, xp:160, description:'Pessoa vulnerável desaparecida junto a uma zona arborizada. Unidade cinotécnica recomendada.', caller:'O meu familiar saiu há horas e o telemóvel ficou em casa.', choices:['Espere até amanhã.','Reúna uma descrição, roupa e último local conhecido.','Procure sozinho dentro da mata.'], correct:1, feedback:'Os dados essenciais foram recolhidos e enviados às patrulhas.' },
  { title:'Incidente com múltiplas vítimas', service:'medical', priority:1, needs:{medical:3,fire:1,police:1}, reward:9800, xp:340, description:'Várias vítimas num evento público. É necessária triagem e coordenação interagências.', caller:'Há muitas pessoas feridas e toda a gente está a correr!', choices:['Mova todas as vítimas para o mesmo local.','Mantenha uma via livre e indique perigos imediatos.','Abandone o local sem dar referências.'], correct:1, feedback:'Foi criada uma zona de acesso e as equipas receberam uma primeira estimativa de vítimas.' },
  ...NEW_SCENARIOS,
];

export const WORLD = {
  mode:'portugal-offline-v5', name:'Portugal', center:[-8.616,41.156], zoom:13.1,
  map_style:'https://tiles.openfreemap.org/styles/liberty',
  services:SERVICES,
  extensions:EXTENSIONS,
  specializations:SPECIALIZATIONS,
  vehicle_catalog:VEHICLE_CATALOG,
  mission_definitions:MISSION_DEFINITIONS,
  facility_catalog:FACILITY_CATALOG,
  training_catalog:TRAINING_CATALOG,
  hospital_specialties:HOSPITAL_SPECIALTIES,
  pois:POIS.map(poi => ({...poi,...POINTS[poi.node]})),
  sites:siteIds.map(id => ({...POINTS[id], unlock_level: POINTS[id].land !== 'mainland' ? 4 : ['Porto','Braga','Aveiro'].includes(POINTS[id].city) ? 1 : 3})),
  command_center_sites:places.map(point => ({...point})),
  regions:[
    {id:'porto',name:'Porto',center:[-8.616,41.156],zoom:13.1},
    {id:'mainland',name:'Continente',bounds:[[-9.6,36.9],[-6.1,42.2]]},
    {id:'madeira',name:'Madeira',bounds:[[-17.3,32.6],[-16.25,33.15]]},
    {id:'azores',name:'Açores',bounds:[[-31.4,36.85],[-24.8,39.8]]},
  ],
  routing:{provider:'OSRM / OpenStreetMap',live_traffic:false,notice:'Percursos reais pela rede rodoviária, sem trânsito em direto.'},
};

const uid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
const randomSeed=()=>{if(globalThis.crypto?.getRandomValues){const value=new Uint32Array(1);globalThis.crypto.getRandomValues(value);return value[0]||1;}return (Date.now()>>>0)||1;};
const gameRandom=g=>{let x=(Number(g.rng_state??g.rng_seed)||1)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;g.rng_state=(x>>>0)||1;g.rng_counter=(g.rng_counter||0)+1;return g.rng_state/4294967296;};
const clone = value => globalThis.structuredClone ? globalThis.structuredClone(value) : JSON.parse(JSON.stringify(value));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const log = (g,text,kind='info') => { g.logs.unshift({id:uid(),text,kind,time:g.elapsed}); g.logs=g.logs.slice(0,50); };
export const fetchRoadRoute = (originId,destinationId,conditions=null) => fetchRoadRouteEngine(POINTS,originId,destinationId,conditions);
const makeBase=(service,point)=>({...point,id:uid(),service,node:point.id,name:`${SERVICES[service].name} · ${point.name}`,level:1,capacity:2,staff_capacity:14,personnel:service==='fire'?10:6,extensions:[],specialization:'general'});
const makeCommandCenter=(name,point,radius=35)=>({id:uid(),name,center_node:point.id,city:point.city,land:point.land,lng:point.lng,lat:point.lat,radius_km:radius,active:true,created_at:new Date().toISOString()});
const commandCenterFor=(g,id)=>g.command_centers?.find(center=>center.id===id&&center.active!==false);
const assignedPersonnel=(g,baseId)=>g.personnel?.length?g.personnel.filter(person=>person.base_id===baseId&&person.unit_id).length:g.units.filter(u=>u.base_id===baseId).reduce((sum,u)=>sum+(u.crew_assigned||0),0);
const trainingPersonnel=(g,baseId)=>g.personnel?.length?g.personnel.filter(person=>person.base_id===baseId&&person.status==='training').length:(g.trainings||[]).filter(t=>t.base_id===baseId&&t.status==='active').reduce((sum,t)=>sum+t.count,0);
const freePeople=(g,base,training=null)=>(g.personnel||[]).filter(person=>person.base_id===base.id&&!person.unit_id&&person.status==='available'&&(!training||(person.qualifications||[]).includes(training)));
const freePersonnel=(g,base)=>g.personnel?.length?freePeople(g,base).length:Math.max(0,(base.personnel||0)-assignedPersonnel(g,base.id)-trainingPersonnel(g,base.id));
const addPersonnel=(g,base,count)=>{g.personnel=g.personnel||[];const start=g.personnel.length;for(let index=0;index<count;index++)g.personnel.push({id:uid(),name:PERSONNEL_NAMES[(start+index)%PERSONNEL_NAMES.length],service:base.service,base_id:base.id,unit_id:null,status:'available',qualifications:[],fatigue:0,recruited_at:g.elapsed});};
const assignUnitCrew=(g,unit,definition)=>{if(!g.personnel?.length)return;const base=g.bases.find(item=>item.id===unit.base_id);const candidates=freePeople(g,base,definition.training||null).slice(0,definition.crew);candidates.forEach(person=>{person.unit_id=unit.id;person.status='assigned';});unit.personnel_ids=candidates.map(person=>person.id);unit.crew_assigned=candidates.length;unit.status=candidates.length>=definition.crew?'available':'uncrewed';};
const operationalFacility=(g,facility)=>facility&&(!facility.operational_at||facility.operational_at<=g.elapsed);
const makeFacility=(type,point)=>({id:uid(),type,node:point.id,name:`${FACILITY_CATALOG[type].name} · ${point.name}`,city:point.city,land:point.land,lng:point.lng,lat:point.lat,level:1,capacity:FACILITY_CATALOG[type].capacity,specialties:type==='hospital'?['urgency']:[],specialty_capacity:type==='hospital'?{urgency:FACILITY_CATALOG[type].capacity}:{}});
const vehicleDefinition=(service,type)=>VEHICLE_CATALOG[service]?.find(v=>v.id===type)||VEHICLE_CATALOG[service]?.[0];
const vehicleById=type=>Object.entries(VEHICLE_CATALOG).flatMap(([service,vehicles])=>vehicles.map(vehicle=>({...vehicle,service}))).find(vehicle=>vehicle.id===type);
const vehicleTraining=type=>vehicleTrainingEngine(type,vehicleById);
const requiredTrainingsFor=definition=>requiredTrainingsForEngine(definition,vehicleById);
const addUnit=(g,base,vehicleType=null)=>{
  const definition=vehicleDefinition(base.service,vehicleType);
  const crewAvailable=freePersonnel(g,base);
  const crew=Math.min(definition.crew,crewAvailable);
  const number=1+g.units.filter(u=>u.service===base.service).length;
  const unit={id:uid(),name:`${definition.name}-${String(number).padStart(2,'0')}`,service:base.service,vehicle_type:definition.id,base_id:base.id,node:base.node,lng:base.lng,lat:base.lat,x:base.lng,y:base.lat,land:base.land,status:crew>=definition.crew?'available':'uncrewed',enabled:true,exclude_from_arr:false,response_delay:0,max_crew:definition.crew,incident_id:null,route:[],route_times:[],travel:0,travel_total:0,route_distance:0,advanced:definition.id!==VEHICLE_CATALOG[base.service][0].id,crew_required:definition.crew,crew_assigned:crew,personnel_ids:[],training:vehicleTraining(definition.id),condition:100,fatigue:0,repair_until:0,rest_until:0};
  g.units.push(unit);assignUnitCrew(g,unit,definition);
};
const refreshMeta=g=>{(g.tasks||[]).forEach(task=>{const value=task.type==='completed'?g.completed:task.type==='earned'?g.earned:task.type==='personnel'?(g.personnel?.length||0):0;task.progress=Math.min(task.target,Math.max(0,value-(task.baseline||0)));});g.achievements=g.achievements||[];[[1,'primeira-resposta','Primeira resposta'],[10,'dez-operacoes','10 operações'],[3,'rede-nacional','Rede territorial']].forEach(([target,id,title],index)=>{const value=index===0?g.completed:index===1?g.completed:g.command_centers?.length||0;if(value>=target&&!g.achievements.some(item=>item.id===id)){g.achievements.push({id,title,unlocked_at:g.elapsed});}});return g;};
const refreshGuidance=g=>{
  g.tutorial=g.tutorial||{steps:[]};
  const steps=[
    ['answer-call','Atender e triar uma chamada',g.incidents.some(incident=>incident.call_answered)||g.completed>0],
    ['dispatch-unit','Mobilizar meios para uma ocorrência',g.units.some(unit=>['enroute','onscene','returning'].includes(unit.status))||g.completed>0],
    ['resolve-first','Resolver a primeira ocorrência',g.completed>=1],
    ['build-support','Construir hospital, prisão ou escola',g.facilities.length>0],
    ['specialize-network','Ativar uma extensão ou formação especializada',g.bases.some(base=>(base.extensions||[]).some(ext=>ext.active))||g.trainings.some(training=>training.status==='completed')],
  ];
  g.tutorial.steps=steps.map(([id,title,done])=>({id,title,done}));
  g.campaign=g.campaign||{chapter:1,goals:[]};
  const goals=[
    ['stabilize-porto','Estabilizar o distrito do Porto',g.completed,8],
    ['support-network','Criar rede de apoio com 2 instalações',g.facilities.length,2],
    ['specialized-response','Operar 3 viaturas especializadas',g.units.filter(unit=>unit.advanced).length,3],
    ['regional-command','Abrir 2 Centros de Comando',g.command_centers.filter(center=>center.active!==false).length,2],
  ];
  g.campaign.goals=goals.map(([id,title,value,target])=>({id,title,value,target,done:value>=target}));
  g.campaign.chapter=1+g.campaign.goals.filter(goal=>goal.done).length;
  return g;
};
const refreshProgression=g=>{g.progression=progressionSnapshot(g,SERVICES);refreshGuidance(g);return refreshMeta(g);};
const rollRange=(g,value)=>{const [min,max]=value||[0,0];return min+Math.floor(gameRandom(g)*(Math.max(min,max)-min+1));};
const pointInPolygon=(point,polygon=[])=>{
  if(polygon.length<3)return true;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    const intersects=((a.lat>point.lat)!==(b.lat>point.lat))&&(point.lng<(b.lng-a.lng)*(point.lat-a.lat)/((b.lat-a.lat)||Number.EPSILON)+a.lng);
    if(intersects)inside=!inside;
  }
  return inside;
};
const allowedBySpawnZones=(center,service,point)=>{
  const zones=(center?.spawn_zones||[]).filter(zone=>zone.enabled!==false&&(zone.mission_key==='default'||zone.mission_key===service));
  return !zones.length||zones.some(zone=>pointInPolygon(point,zone.points));
};
const spawn=(g,scenarioIndex=null,nodeId=null,requestedCommandCenterId=null)=>{
  const availableCenters=(g.command_centers||[]).filter(center=>center.active!==false&&g.bases.some(base=>base.command_center_id===center.id&&base.mission_generation_enabled!==false)).filter(center=>g.incidents.filter(incident=>incident.command_center_id===center.id).length<(g.progression?.command_centers?.[center.id]?.mission_cap||3));
  const commandCenter=commandCenterFor(g,requestedCommandCenterId)||availableCenters[Math.floor(gameRandom(g)*Math.max(1,availableCenters.length))]||commandCenterFor(g,g.active_command_center_id)||g.command_centers?.[0];
  const definition=scenarioIndex===null?weightedMission(g,commandCenter?.id,()=>gameRandom(g)):MISSION_DEFINITIONS.find(item=>item.scenario===scenarioIndex);
  const choice=definition?.scenario??1;
  const s=SCENARIOS[choice]||SCENARIOS[1];
  let point=nodeId?POINTS[nodeId]:null;
  if(!point&&definition?.poi){
    const coveredCities=new Set(g.bases.filter(base=>base.mission_generation_enabled!==false&&(!commandCenter||base.command_center_id===commandCenter.id)).map(b=>b.city));
    const candidates=[...POIS,...(g.player_pois||[])].filter(p=>p.type===definition.poi&&(p.command_center_id?p.command_center_id===commandCenter?.id:coveredCities.has(p.city))).map(p=>POINTS[p.node]||p).filter(point=>point&&allowedBySpawnZones(commandCenter,s.service,point));
    point=candidates[Math.floor(gameRandom(g)*candidates.length)];
  }
  if(!point){
    const areaBases=g.bases.filter(base=>base.mission_generation_enabled!==false&&(!commandCenter||base.command_center_id===commandCenter.id));
    const cities=[...new Set(areaBases.map(b=>b.city))];
    const city=cities[Math.floor(gameRandom(g)*cities.length)]||commandCenter?.city||'Porto';
    const occupied=new Set(g.incidents.map(i=>i.node));
    const specificRange=commandCenter?.mission_ranges?.[s.service]||commandCenter?.mission_ranges?.default||commandCenter?.radius_km||35;
    const withinRadius=point=>!commandCenter||distanceMeters(commandCenter,point)<=specificRange*1000;
    const candidates=places.filter(p=>withinRadius(p)&&allowedBySpawnZones(commandCenter,s.service,p)&&!occupied.has(p.id)&&(p.city===city||cities.includes(p.city)));
    const fallback=places.filter(p=>withinRadius(p)&&allowedBySpawnZones(commandCenter,s.service,p)&&(p.city===city||cities.includes(p.city)));
    point=(candidates.length?candidates:fallback)[Math.floor(gameRandom(g)*Math.max(1,(candidates.length||fallback.length)))]||POINTS['porto-aliados'];
  }
  const requiredPersonnel=Object.values(s.needs).reduce((sum,n)=>sum+n*2,0);
  const created={...clone(s),id:uid(),number:g.sequence++,scenario:choice,definition:definition?.name||s.title,difficulty:definition?.difficulty||({1:'Difícil',2:'Média',3:'Fácil'}[s.priority]),command_center_id:commandCenter?.id||null,evolution:clone(generatedEvolution(choice,s.service,s.priority)),operational_phases:operationalPhasesFor(s.service),phase_requirements_applied:[0],active_phase:0,transport_probability:s.service==='medical'?.86:.34,detention_probability:s.service==='police'?.62:.12,casualties:rollRange(g,definition?.victims),detainees:rollRange(g,definition?.prisoners),required_vehicle_types:[...(definition?.vehicle||[])],required_trainings:requiredTrainingsFor(definition),required_personnel:requiredPersonnel,node:point.id,lng:point.lng,lat:point.lat,x:point.lng,y:point.lat,land:point.land,address:point.name,district:point.city,status:'waiting',created:g.elapsed,response_deadline:g.elapsed+({1:900,2:1200,3:1500}[s.priority]),resolution_deadline:g.elapsed+({1:1800,2:2250,3:2700}[s.priority]),deadline:g.elapsed+({1:900,2:1200,3:1500}[s.priority]),assigned:[],progress:0,call_answered:false,escalated:false,false_alarm:gameRandom(g)<(definition?.false_alarm_chance??.08),call:{text:s.caller,choices:s.choices}};
  const risk=RISK_ZONES[point.id]?.[created.service]||RISK_ZONES[point.id]?.fire||1;
  created.zone_risk=RISK_ZONES[point.id]?.label||'normal';
  if(risk>1.1){created.reward=Math.round(created.reward*risk);created.response_deadline=Math.max(g.elapsed+420,created.response_deadline-Math.round((risk-1)*180));created.deadline=created.response_deadline;}
  g.incidents.push(created);
  log(g,`Nova ocorrência em ${point.city}: ${s.title}.`,'alert');
  return created;
};
export function newGame(){
  const seed=randomSeed();
  const g={id:uid(),mode:'portugal-offline-v5',rng_seed:seed,rng_state:seed,rng_counter:0,city:'Porto',money:24500,xp:0,level:1,trust:98,elapsed:0,speed:1,completed:0,failed:0,earned:0,expenses:0,operating_debt:0,next_spawn:180,next_crisis_wave:900,next_upkeep:300,sequence:101,incidents:[],units:[],bases:[],facilities:[],command_centers:[],active_command_center_id:null,player_pois:[],personnel:[],planned_missions:[],staging_areas:[],complexes:[],tasks:[],achievements:[],unit_groups:[],patients:[],prisoners:[],trainings:[],arrs:clone(DEFAULT_ARRS),logs:[],history:[],conditions:null,saved_at:new Date().toISOString()};g.conditions=freshConditions(0,null,()=>gameRandom(g));
  [['fire','porto-boavista'],['medical','porto-asprela'],['police','porto-bonfim']].forEach(([service,key])=>{const base=makeBase(service,POINTS[key]);g.bases.push(base);addUnit(g,base);addUnit(g,base);});
  g.bases.forEach(base=>addPersonnel(g,base,base.personnel||0));g.units.forEach(unit=>{unit.personnel_ids=[];unit.crew_assigned=0;assignUnitCrew(g,unit,vehicleDefinition(unit.service,unit.vehicle_type));});
  g.tasks=makeCareerTasks(g);
  const command=makeCommandCenter('Comando Metropolitano do Porto',POINTS['porto-aliados'],35);g.command_centers.push(command);g.active_command_center_id=command.id;g.bases.forEach(base=>{base.command_center_id=command.id;});
  refreshProgression(g);
  spawn(g,0,'porto-aliados',command.id); spawn(g,1,'porto-trindade',command.id); spawn(g,2,'porto-batalha',command.id);
  log(g,'Portugal · Central do Porto operacional. Modo local ativo.','success');
  return initializeAdvancedState(g);
}
const createAftercare=(g,incident,careQuality=.5)=>{
  if(incident.false_alarm)return;
  if((incident.casualties||0)>0){
    const count=incident.casualties;
    const specialtyPool=['urgency','trauma','burns','pediatrics','cardiology','neurology','obstetrics','intensive-care'];
    for(let index=0;index<count;index++){const severity=1+Math.floor(gameRandom(g)*3),specialty=severity===1?'urgency':specialtyPool[1+Math.floor(gameRandom(g)*(specialtyPool.length-1))];g.patients.push({id:uid(),incident:incident.title,source_node:incident.node,city:incident.district,severity,specialty,needs_doctor:severity===3,transport_required:severity===3||gameRandom(g)<(incident.transport_probability||.58),treatment_progress:Math.round(18+careQuality*22),care_quality:careQuality,stability:Math.max(35,100-severity*14+careQuality*8),status:'waiting',created:g.elapsed,hospital_id:null});}
    log(g,`${count} vítima(s) aguardam transporte hospitalar.`,'alert');
  }
  if((incident.detainees||0)>0){
    const count=incident.detainees;
    for(let index=0;index<count;index++)g.prisoners.push({id:uid(),incident:incident.title,source_node:incident.node,city:incident.district,status:'waiting',created:g.elapsed,prison_id:null});
    log(g,`${count} detido(s) aguardam transporte.`,'alert');
  }
};
const resolveIncident=(g,incident,success)=>{
  const medicalUnits=g.units.filter(unit=>unit.incident_id===incident.id&&unit.service==='medical'&&unit.status==='onscene');
  const medicalPeople=medicalUnits.flatMap(unit=>unit.personnel_ids||[]).map(id=>g.personnel.find(person=>person.id===id)).filter(Boolean);
  const advancedCare=medicalPeople.some(person=>(person.qualifications||[]).includes('advanced-care'));
  const careQuality=medicalUnits.length?Math.min(1.5,.65+medicalUnits.length*.15+(advancedCare ? .25 : 0)):0.35;
  const trustFactor=.8+g.trust/500;
  const seasonal=(g.seasonal_events||[]).filter(event=>event.status==='active').reduce((factor,event)=>factor*(event.reward_multiplier||1),1);
  const payout=success?(incident.false_alarm?Math.round(incident.reward*.25):Math.round(incident.reward*trustFactor*seasonal)):0;
  log(g,`${incident.title} — ${success?(incident.false_alarm?'falso alarme confirmado.':'resolvida.'):'prazo de resposta excedido.'}`,success?'success':'alert');
  g.history.unshift({id:incident.id,title:incident.title,service:incident.service,success,reward:payout,time:g.elapsed});g.history=g.history.slice(0,100);
  g.units.filter(u=>u.incident_id===incident.id).forEach(u=>{u.fatigue=Math.min(100,(u.fatigue||0)+24);u.condition=Math.max(10,(u.condition||100)-6);(u.personnel_ids||[]).forEach(personId=>{const person=g.personnel.find(item=>item.id===personId);if(person){person.experience=(person.experience||0)+(success?12:4);person.rank=person.experience>=500?'Chefe':person.experience>=200?'Graduado':'Operacional';person.fatigue=Math.min(100,(person.fatigue||0)+18);}});if(u.resources){const use=u.service==='fire'?{water:650,foam:35,fuel:8}:u.service==='medical'?{oxygen:14,medical:18,fuel:7}:{equipment:9,fuel:7};Object.entries(use).forEach(([key,value])=>{u.resources[key]=Math.max(0,(u.resources[key]||0)-value);});}returnToBase(g,u);});
  if(success){const debtPayment=Math.min(g.operating_debt||0,payout);g.operating_debt=Math.max(0,(g.operating_debt||0)-debtPayment);g.money+=payout-debtPayment;g.earned+=payout;g.xp+=incident.false_alarm?20:incident.xp;g.completed++;g.trust=Math.min(100,g.trust+(incident.false_alarm?0:1));createAftercare(g,incident,careQuality);if(!incident.false_alarm&&incident.service==='police'&&(incident.detainees>0||/assalto|roubo|sequestro|tráfico|desaparecid/i.test(incident.title))&&gameRandom(g)<.45){const next=spawn(g,9,incident.node,incident.command_center_id);if(next){next.title='Investigação complementar';next.definition=next.title;next.parent_incident_id=incident.id;next.needs={police:Math.max(1,next.needs.police||1)};mergeIncidentRequirements(g,next,{trainings:['investigation']},true);log(g,`Ocorrência subsequente criada: ${next.title}.`,'alert');}}if(!incident.false_alarm&&incident.service==='fire'&&incident.priority===1&&gameRandom(g)<.35){const next=spawn(g,4,incident.node,incident.command_center_id);if(next){next.title='Vistoria e rescaldo preventivo';next.definition=next.title;next.parent_incident_id=incident.id;next.needs={fire:1,police:incident.district==='Porto'?1:0};next.reward=Math.round(next.reward*.75);log(g,`Ocorrência subsequente criada: ${next.title}.`,'alert');}}if(incident.evolution?.type==='subsequent'&&!incident.evolution_spawned){const next=spawn(g,incident.evolution.scenario,incident.node,incident.command_center_id);if(next){next.title=incident.evolution.title;next.definition=incident.evolution.title;next.parent_incident_id=incident.id;log(g,`Ocorrência subsequente criada: ${next.title}.`,'alert');}}}
  else{const penalty=Math.min(g.money,Math.round(incident.reward*.08));g.money-=penalty;g.expenses+=penalty;g.failed++;g.trust=Math.max(0,g.trust-6);}
  g.incidents=g.incidents.filter(i=>i.id!==incident.id);
};
const mobilize=(g,incident,units,routes={},returnRoutes={})=>{
  requireValue(units.length&&units.every(unit=>operationalUnit(unit,g.dispatch_policy?.allow_returning_redirect===true)),'Não existem meios disponíveis para este despacho.');
  requireValue(units.every(unit=>unit.land===incident.land),'Sem ligação rodoviária para esta ocorrência.');
  requireValue(units.every(unit=>(unit.condition||100)>20),'Uma das viaturas precisa de manutenção antes de sair.');
  requireValue(units.every(unit=>(unit.fatigue||0)<90),'Uma das equipas precisa de descanso antes de nova mobilização.');
  requireValue(units.every(hasOperationalResources),'Uma das viaturas não tem combustível ou consumíveis suficientes.');
  requireValue(units.every(unit=>distanceMeters(unit,incident)/1000<=Math.min(Number(g.dispatch_policy?.max_response_km)||Infinity,Number(unit.max_response_km)||Infinity)),'Uma das viaturas está fora do raio máximo de resposta.');
  units.forEach(unit=>{const plan=routes[unit.id],returnPlan=returnRoutes[unit.id];requireValue(plan?.coordinates?.length>1&&plan?.times?.length===plan.coordinates.length,'Percurso rodoviário não preparado. Tenta despachar novamente.');unit.road_return_plan=returnPlan?.coordinates?.length>1?returnPlan:reverseRoute(plan);startRoute(unit,plan,'enroute',incident.node);unit.incident_id=incident.id;if(!incident.assigned.includes(unit.id))incident.assigned.push(unit.id);});
  incident.status='enroute';log(g,`${units.length} unidade(s) mobilizada(s) pela rede rodoviária.`);
};
export function selectArrUnitIds(g,incidentId,arrId){
  return selectArrUnitIdsEngine(g,incidentId,arrId,{requireValue,distanceMeters});
}
export function selectRecommendedUnitIds(g,incidentId,mode='safe'){
  return selectRecommendedUnitIdsEngine(g,incidentId,mode,{requireValue,distanceMeters,vehicleDefinition});
}
export function tickGame(input,seconds){
  const g=initializeAdvancedState(clone(input)), dt=seconds*g.speed;if(!dt)return g;g.elapsed+=dt;
  if(g.elapsed>=(g.conditions?.next_change_at||((g.conditions?.updated_at||0)+1800))){g.conditions=freshConditions(g.elapsed,g.conditions,()=>gameRandom(g));log(g,`Condições atualizadas: ${g.conditions.weather_label.toLowerCase()}, ${g.conditions.traffic_label.toLowerCase()}${g.conditions.roadworks?' e obras na rede viária':''}.`);}
  g.bases.forEach(base=>{if(base.operational_at&&g.elapsed>=base.operational_at){delete base.operational_at;log(g,`${base.name} entrou ao serviço.`,'success');}});
  g.facilities.forEach(facility=>{if(facility.operational_at&&g.elapsed>=facility.operational_at){delete facility.operational_at;log(g,`${facility.name} entrou ao serviço.`,'success');}});
  g.bases.forEach(base=>(base.extensions||[]).forEach(extension=>{if(!extension.active&&extension.completes_at&&g.elapsed>=extension.completes_at){extension.active=true;delete extension.completes_at;const definition=EXTENSIONS[base.service]?.find(item=>item.id===extension.id);log(g,`${definition?.name||extension.id} concluída em ${base.name}.`,'success');}}));
  (g.planned_missions||[]).forEach(planned=>{if(planned.status==='scheduled'&&g.elapsed>=planned.starts_at){const incident=spawn(g,planned.scenario,planned.node,planned.command_center_id);if(incident){incident.planned_mission_id=planned.id;incident.title=planned.title||incident.title;planned.status='active';planned.incident_id=incident.id;log(g,`Operação planeada iniciada: ${incident.title}.`,'alert');}}if(planned.status==='active'&&!g.incidents.some(item=>item.id===planned.incident_id))planned.status='completed';});
  (g.cooperation?.events||[]).forEach(event=>{if(event.status==='active'&&g.elapsed>=event.ends_at)event.status='completed';});
  (g.cooperation?.large_scale_missions||[]).forEach(mission=>{if(mission.status==='active'&&!g.incidents.some(item=>item.id===mission.incident_id))mission.status='completed';});
  if((g.conditions?.weather==='storm'||g.conditions?.traffic==='heavy')&&g.level>=3&&g.elapsed>=(g.next_crisis_wave||900)&&g.incidents.length<g.progression.mission_cap){
    const center=commandCenterFor(g,g.active_command_center_id)||g.command_centers?.[0],waveType=g.conditions.weather==='storm'?'Tempestade regional':'Pressão viária metropolitana',scenarios=g.conditions.weather==='storm'?[4,3,10]:[3,6,2];
    g.next_crisis_wave=g.elapsed+2400+gameRandom(g)*1200;
    g.cooperation=g.cooperation||{};g.cooperation.events=g.cooperation.events||[];
    g.cooperation.events.unshift({id:uid(),type:g.conditions.weather==='storm'?'storm':'traffic',title:waveType,command_center_id:center?.id,starts_at:g.elapsed,ends_at:g.elapsed+1800,status:'active',spawned:2,created_at:g.elapsed,system_generated:true});
    scenarios.slice(0,2).forEach((scenario,index)=>{const candidates=places.filter(point=>!center||point.land===center.land),site=candidates[Math.floor(gameRandom(g)*candidates.length)]||POINTS[center?.center_node]||POINTS['porto-aliados'];g.planned_missions.push({id:uid(),title:`${waveType} · ocorrência ${index+1}`,scenario,node:site.id,command_center_id:center?.id,starts_at:g.elapsed+45+index*75,status:'scheduled',created_at:g.elapsed,system_generated:true,crisis_wave:true});});
    log(g,`${waveType}: cadeia de ocorrências prevista pela central.`,'alert');
  }
  g.units.forEach(u=>{
    if(u.status==='transporting'&&!u.route?.length&&u.transport_until&&g.elapsed>=u.transport_until){
      const facility=g.facilities.find(f=>f.id===u.transport_facility_id);
      if(u.transport_kind==='patient'){const patient=g.patients.find(p=>p.id===u.task_id);if(patient){patient.status='admitted';patient.specialty_matched=facility?.specialties?.includes(patient.specialty)||false;patient.needs_specialist_transfer=!patient.specialty_matched&&patient.severity>=3;patient.admitted_at=g.elapsed;patient.discharge_at=g.elapsed+(patient.specialty_matched?240:360)+patient.severity*120;if(!patient.specialty_matched&&patient.severity>=2)g.trust=Math.max(0,g.trust-1);g.operations_metrics.transported++;log(g,`Vítima admitida em ${facility?.name||'hospital'}.`,'success');}}
      else if(u.transport_kind==='transfer'){const transfer=g.medical_transfers.find(item=>item.id===u.task_id),patient=transfer&&g.patients.find(item=>item.id===transfer.patient_id);if(transfer&&patient){transfer.status='completed';patient.status='admitted';patient.hospital_id=facility?.id;patient.discharge_at=g.elapsed+240+patient.severity*120;g.operations_metrics.transported++;log(g,`Transferência crítica concluída em ${facility?.name||'hospital'}.`,'success');}}
      else{const prisoner=g.prisoners.find(p=>p.id===u.task_id);if(prisoner){prisoner.status='detained';prisoner.detained_at=g.elapsed;prisoner.release_at=g.elapsed+480;g.operations_metrics.transported++;log(g,`Detido entregue em ${facility?.name||'instalação prisional'}.`,'success');}}
      u.node=facility?.node||u.node;u.task_id=null;u.transport_kind=null;u.transport_facility_id=null;returnToBase(g,u);return;
    }
    if(u.status==='broken'&&g.elapsed>=u.repair_until){const base=g.bases.find(b=>b.id===u.base_id);u.status='available';u.node=base.node;u.lng=base.lng;u.lat=base.lat;u.condition=75;log(g,`${u.name} reparada e novamente disponível.`,'success');return;}
    if(u.status==='resting'&&g.elapsed>=u.rest_until){u.status='available';u.fatigue=0;log(g,`Tripulação da ${u.name} terminou o descanso.`);return;}
    if(['available','staged','patrol'].includes(u.status)){u.fatigue=Math.max(0,(u.fatigue||0)-dt/120);(u.personnel_ids||[]).forEach(personId=>{const person=g.personnel.find(item=>item.id===personId);if(person)person.fatigue=Math.max(0,(person.fatigue||0)-dt/160);});}
    if(!['enroute','returning','transporting','patrol','staging_enroute'].includes(u.status))return;
    u.travel=Math.min(u.travel_total,u.travel+dt);locate(u);
    if(u.status==='enroute'&&(u.condition||100)<45&&gameRandom(g)<dt/900){u.status='broken';u.repair_until=g.elapsed+120;u.incident_id=null;u.route=[];u.route_times=[];const cost=450;g.money=Math.max(0,g.money-cost);g.expenses+=cost;log(g,`Avaria na ${u.name}. Reparação iniciada (-${cost} €).`,'alert');return;}
    if(u.travel<u.travel_total)return;u.node=u.destination;
    if(u.status==='returning'){if((u.fatigue||0)>=70){u.status='resting';u.rest_until=g.elapsed+90;}else u.status='available';u.incident_id=null;u.route=[];u.route_times=[];}
    else if(u.status==='staging_enroute'){u.status='staged';u.staging_area_id=u.destination;u.route=[];u.route_times=[];const staging=(g.staging_areas||[]).find(item=>item.id===u.destination);if(staging){u.node=staging.node;u.lng=staging.lng;u.lat=staging.lat;}log(g,`${u.name} posicionada na zona de concentração.`,'success');}
    else if(u.status==='transporting'){
      if(u.transport_phase==='pickup'){u.transport_phase='delivery';startRoute(u,u.transport_delivery_plan,'transporting',u.transport_facility_node);log(g,`${u.name} recolheu ${u.transport_kind==='patient'?'a vítima':u.transport_kind==='transfer'?'o doente crítico':'o detido'} e segue para a instalação.`);}
      else if(u.transport_phase==='delivery'){
        const facility=g.facilities.find(f=>f.id===u.transport_facility_id);
        if(u.transport_kind==='patient'){const patient=g.patients.find(p=>p.id===u.task_id);if(patient){patient.status='admitted';patient.specialty_matched=facility?.specialties?.includes(patient.specialty)||false;patient.needs_specialist_transfer=!patient.specialty_matched&&patient.severity>=3;patient.admitted_at=g.elapsed;patient.discharge_at=g.elapsed+(patient.specialty_matched?240:360)+patient.severity*120;if(!patient.specialty_matched&&patient.severity>=2)g.trust=Math.max(0,g.trust-1);g.operations_metrics.transported++;log(g,`Vítima admitida em ${facility?.name||'hospital'}${patient.specialty_matched?' com especialidade adequada':' sem especialidade ideal'}.`,patient.specialty_matched?'success':'alert');}}
        else if(u.transport_kind==='transfer'){const transfer=g.medical_transfers.find(item=>item.id===u.task_id),patient=transfer&&g.patients.find(item=>item.id===transfer.patient_id);if(transfer&&patient){transfer.status='completed';patient.status='admitted';patient.hospital_id=facility?.id;patient.discharge_at=g.elapsed+240+patient.severity*120;g.operations_metrics.transported++;log(g,`Transferência crítica concluída em ${facility?.name||'hospital'}.`,'success');}}
        else{const prisoner=g.prisoners.find(p=>p.id===u.task_id);if(prisoner){prisoner.status='detained';prisoner.detained_at=g.elapsed;prisoner.release_at=g.elapsed+480;g.operations_metrics.transported++;log(g,`Detido entregue em ${facility?.name||'instalação prisional'}.`,'success');}}
        u.road_return_plan=u.transport_return_plan;u.node=facility?.node||u.node;u.task_id=null;u.transport_kind=null;u.transport_phase=null;u.transport_delivery_plan=null;u.transport_return_plan=null;u.transport_facility_id=null;returnToBase(g,u);
      }
    }
    else if(u.status==='patrol'){const plans=u.patrol_plans||[];if(plans.length){u.patrol_index=((u.patrol_index||0)+1)%plans.length;const plan=plans[u.patrol_index];startRoute(u,plan,'patrol',u.patrol_nodes?.[u.patrol_index]);}else u.status='available';}
    else{u.status='onscene';log(g,`${u.name} no local da ocorrência.`);}
  });
  g.trainings.forEach(training=>{if(training.status==='active'&&g.elapsed>=training.completes_at){training.status='completed';g.operations_metrics.trained+=training.count;const base=g.bases.find(b=>b.id===training.base_id);(training.personnel_ids||[]).forEach(id=>{const person=g.personnel.find(item=>item.id===id);if(person){person.status='available';person.experience=(person.experience||0)+25;if(!(person.qualifications||[]).includes(training.course))person.qualifications=[...(person.qualifications||[]),training.course];}});if(base){base.qualifications=base.qualifications||{};base.qualifications[training.course]=g.personnel.filter(person=>person.base_id===base.id&&(person.qualifications||[]).includes(training.course)).length;}const course=TRAINING_CATALOG.find(item=>item.id===training.course);log(g,`Formação concluída: ${course?.name||training.course} · ${training.count} elemento(s).`,'success');}});
  g.patients.forEach(patient=>{if(patient.status==='admitted'&&g.elapsed>=patient.discharge_at){patient.status='discharged';patient.closed_at=g.elapsed;const reward=patient.specialty_matched?450:250;g.money+=reward;g.earned+=reward;if(patient.specialty_matched)g.trust=Math.min(100,g.trust+1);}});
  g.prisoners.forEach(prisoner=>{if(prisoner.status==='detained'&&g.elapsed>=prisoner.release_at){prisoner.status='released';prisoner.closed_at=g.elapsed;}});
  g.patients=g.patients.filter(patient=>!patient.closed_at||g.elapsed-patient.closed_at<600);
  g.prisoners=g.prisoners.filter(prisoner=>!prisoner.closed_at||g.elapsed-prisoner.closed_at<600);
  [...g.incidents].forEach(inc=>{
    const responseDeadline=inc.response_deadline||inc.deadline;const resolutionDeadline=inc.resolution_deadline||responseDeadline+900;const escalationAt=inc.created+(responseDeadline-inc.created)*.55;
    if(!inc.escalated&&g.elapsed>=escalationAt&&['waiting','enroute'].includes(inc.status)){inc.escalated=true;inc.priority=Math.max(1,inc.priority-1);inc.reward=Math.round(inc.reward*1.2);inc.casualties+=(inc.service==='medical'||inc.service==='fire')&&gameRandom(g)<.55?1:0;inc.detainees+=inc.service==='police'&&gameRandom(g)<.35?1:0;if(inc.service==='fire')inc.needs.fire=Math.min(5,(inc.needs.fire||0)+1);if(inc.evolution?.type==='expansion'){inc.previous_title=inc.title;inc.title=inc.evolution.title;inc.definition=inc.evolution.title;Object.entries(inc.evolution.add_needs||{}).forEach(([service,count])=>{inc.needs[service]=(inc.needs[service]||0)+count;});inc.required_personnel=Object.values(inc.needs).reduce((sum,count)=>sum+count*2,0);inc.reward=Math.round(inc.reward*(inc.evolution.reward_factor||1.4));inc.evolution_spawned=true;}log(g,`${inc.title} agravou-se: prioridade, vítimas ou meios necessários atualizados.`,'alert');}
    const assigned=g.units.filter(u=>u.incident_id===inc.id);
    const onscene=assigned.filter(u=>u.status==='onscene');
    const readiness=readinessFor(g,inc,onscene);
    inc.readiness=readiness;
    const ready=Object.values(readiness).every(Boolean);
    if(ready&&inc.evolution?.type==='follow_up'&&!inc.evolution_spawned&&inc.progress>=(inc.evolution.trigger_progress||50)){const follow=spawn(g,inc.evolution.scenario,inc.node,inc.command_center_id);if(follow){follow.title=inc.evolution.title;follow.definition=inc.evolution.title;follow.parent_incident_id=inc.id;inc.evolution_spawned=true;log(g,`Ocorrência associada: ${follow.title}.`,'alert');}}
    if(ready){
      if(!inc.response_arrived_at)inc.response_arrived_at=g.elapsed;
      inc.status='onscene';
      const personnel=onscene.reduce((sum,u)=>sum+(u.crew_assigned||0),0),required=Math.max(1,inc.required_personnel||1);
      const crewPeople=onscene.flatMap(unit=>unit.personnel_ids||[]).map(id=>g.personnel.find(person=>person.id===id)).filter(Boolean);
      const rankValue=rank=>rank==='Chefe'?.16:rank==='Graduado'?.08:0;
      const quality=crewPeople.length?crewPeople.reduce((sum,person)=>sum+rankValue(person.rank)+Math.min(.14,(person.experience||0)/4000)-Math.min(.28,(person.fatigue||0)/320),0)/crewPeople.length:0;
      const personnelBoost=Math.min(1.9,Math.max(.65,personnel/required+quality));
      const specialistBoost=(inc.required_vehicle_types||[]).filter(type=>onscene.some(unit=>unit.vehicle_type===type)).length*.18;
      const requiredTrainingCount=(inc.required_trainings||[]).filter(training=>trainedOnScene(g,onscene,training)).length;
      const qualified=onscene.flatMap(unit=>unit.personnel_ids||[]).map(id=>g.personnel.find(person=>person.id===id)).filter(Boolean).filter(person=>(person.qualifications||[]).length).length;
      const qualificationBoost=Math.min(.35,(qualified/Math.max(1,personnel)*.2)+(requiredTrainingCount*.15));
      const commandBoost=inc.command_center_id&&g.command_centers.some(center=>center.id===inc.command_center_id&&center.active!==false)?.08:0;
      const efficiency=Math.min(2.35,personnelBoost+specialistBoost+qualificationBoost+commandBoost);
      const pace=(inc.false_alarm?45:180)/efficiency;
      inc.operational_efficiency=Number(efficiency.toFixed(2));
      inc.progress=Math.min(100,inc.progress+dt*(100/pace));
      const nextPhase=Math.min((inc.operational_phases?.length||1)-1,Math.floor(inc.progress/25));
      if(nextPhase!==inc.active_phase){
        inc.active_phase=nextPhase;
        if(!(inc.phase_requirements_applied||[]).includes(nextPhase)){
          inc.phase_requirements_applied=[...(inc.phase_requirements_applied||[]),nextPhase];
          const phaseRules=PHASE_REQUIREMENTS[inc.service]?.[nextPhase];
          const requirements=typeof phaseRules==='function'?phaseRules(inc):phaseRules;
          if(mergeIncidentRequirements(g,inc,requirements,inc.large_scale===true)){inc.progress=Math.max(0,inc.progress-8);log(g,`${inc.title}: nova fase operacional requer meios adicionais.`,'alert');}
          else log(g,`${inc.title}: fase "${inc.operational_phases?.[nextPhase]||'seguinte'}" iniciada.`);
        }
      }
    }
    if(inc.progress>=100)resolveIncident(g,inc,true);else if(g.elapsed>=responseDeadline&&!inc.response_arrived_at)resolveIncident(g,inc,false);else if(g.elapsed>=resolutionDeadline)resolveIncident(g,inc,false);
  });
  g.level=1+Math.floor(g.xp/200);
  if(g.elapsed>=g.next_upkeep){
    const discountFor=(kind,id)=>Math.max(0,...(g.complexes||[]).filter(complex=>(complex[kind]||[]).includes(id)).map(complex=>complex.operating_cost_discount||0));
    const maintenance=g.units.reduce((sum,unit)=>{const discount=discountFor('base_ids',unit.base_id);return sum+((unit.condition<60?45:0)+(unit.fatigue>60?25:0)+75)*(1-discount);},0);
    const infrastructure=g.bases.reduce((sum,base)=>sum+100*(1-discountFor('base_ids',base.id)),0)+g.facilities.reduce((sum,facility)=>sum+125*(1-discountFor('facility_ids',facility.id)),0);
    const debtInterest=Math.round((g.operating_debt||0)*.02),cost=Math.round(maintenance+infrastructure+debtInterest),paid=Math.min(g.money,cost),shortfall=cost-paid;
    g.money-=paid;g.operating_debt=(g.operating_debt||0)+shortfall;g.expenses+=cost;
    if(shortfall>0){g.trust=Math.max(0,g.trust-Math.min(3,Math.ceil(shortfall/1500)));log(g,`Custos operacionais parcialmente pagos: ${paid} € pagos, ${shortfall} € em dívida.`,'alert');}
    else log(g,`Custos operacionais do turno: -${cost} €.`);
    g.next_upkeep=g.elapsed+300;
  }
  if(g.money<500&&g.incidents.length&&g.units.every(unit=>!operationalUnit(unit))&&!g.recovery_grant_at){g.money+=1500;g.earned+=1500;g.recovery_grant_at=g.elapsed;log(g,'Fundo de continuidade atribuído para evitar bloqueio operacional.','success');}
  refreshProgression(g);
  if(g.elapsed>=g.next_spawn){const cap=g.progression.mission_cap;if(g.incidents.length<cap)spawn(g);if(g.level>=3&&g.incidents.length<Math.max(1,cap-2)&&gameRandom(g)<.28)spawn(g);g.next_spawn=g.elapsed+Math.max(100,210-g.level*8);}
  tickAdvancedState(g,dt,log,()=>gameRandom(g));
  return refreshProgression(g);
}
export function applyAction(input,kind,data={}){
  let g=clone(input);
  if(kind==='reset')return newGame();
  if(kind==='speed'){requireValue([0,1,2,5].includes(data.speed),'Velocidade inválida.');g.speed=data.speed;}
  else if(kind==='answer'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc&&!inc.call_answered,'Chamada já encerrada.');requireValue(Number.isInteger(data.choice)&&data.choice>=0&&data.choice<3,'Escolha inválida.');const s=SCENARIOS[inc.scenario],correct=data.choice===s.correct;inc.call_answered=true;inc.call_result={correct,feedback:correct?s.feedback:'Orientação insegura. A central corrigiu a indicação. Prioriza a segurança do interlocutor.',xp:correct?25:0};g.xp+=correct?25:0;g.trust=Math.min(100,Math.max(0,g.trust+(correct?1:-3)));inc.triage_quality=correct?1:0;g.level=1+Math.floor(g.xp/200);log(g,`Chamada #${inc.number} triada.${correct?' +25 XP':' Orientação corrigida.'}`,correct?'success':'alert');}
  else if(kind==='dispatch'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc,'Ocorrência já encerrada.');const ids=data.unit_ids||[],units=g.units.filter(u=>ids.includes(u.id));requireValue(ids.length&&units.length===new Set(ids).size,'Seleciona unidades disponíveis.');if(!data.via_arr)for(const service of new Set(units.map(u=>u.service))){const allocated=g.units.filter(u=>u.service===service&&u.incident_id===inc.id).length;requireValue(allocated+units.filter(u=>u.service===service).length<=(inc.needs[service]||0),'Envia apenas os meios necessários.');}mobilize(g,inc,units,data.routes,data.return_routes);}
  else if(kind==='dispatch_arr'){
    const inc=g.incidents.find(i=>i.id===data.incident_id),ids=selectArrUnitIds(g,data.incident_id,data.arr_id),chosen=g.units.filter(unit=>ids.includes(unit.id));mobilize(g,inc,chosen,data.routes,data.return_routes);
  }
  else if(kind==='recall_unit'){
    const unit=g.units.find(item=>item.id===data.unit_id),base=unit&&g.bases.find(item=>item.id===unit.base_id);requireValue(unit&&base&&['enroute','patrol','staged','returning'].includes(unit.status),'Esta viatura não pode ser recolhida agora.');const incident=g.incidents.find(item=>item.id===unit.incident_id);if(incident)incident.assigned=(incident.assigned||[]).filter(id=>id!==unit.id);unit.incident_id=null;unit.road_return_plan=null;startRoute(unit,data.route,'returning',base.node);log(g,`${unit.name} recolhida para ${base.name}.`,'alert');
  }
  else if(kind==='redirect_unit'){
    const unit=g.units.find(item=>item.id===data.unit_id),incident=g.incidents.find(item=>item.id===data.incident_id);requireValue(unit&&incident&&['enroute','patrol','staged'].includes(unit.status)||(unit&&incident&&unit.status==='returning'&&g.dispatch_policy?.allow_returning_redirect===true),'Não é possível redirecionar esta viatura.');const previous=g.incidents.find(item=>item.id===unit.incident_id);if(previous)previous.assigned=(previous.assigned||[]).filter(id=>id!==unit.id);const base=g.bases.find(item=>item.id===unit.base_id);unit.road_return_plan=data.return_route;startRoute(unit,data.route,'enroute',incident.node);unit.incident_id=incident.id;if(!(incident.assigned||[]).includes(unit.id))incident.assigned.push(unit.id);incident.status='enroute';log(g,`${unit.name} redirecionada para ${incident.title}.`,'success');
  }
  else if(kind==='buy_vehicle'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    requireValue(!base.operational_at||base.operational_at<=g.elapsed,'Esta base ainda está em construção.');
    const fallback=data.advanced?VEHICLE_CATALOG[base.service]?.[1]?.id:VEHICLE_CATALOG[base.service]?.[0]?.id;
    const definition=vehicleDefinition(base.service,data.vehicle_type||fallback);
    requireValue(definition,'Tipo de veículo inválido.');
    requireValue((base.level||1)>=definition.level,`Melhora a base para o nível ${definition.level}.`);
    if(definition.extension)requireValue((base.extensions||[]).some(ext=>ext.id===definition.extension&&ext.active),`Ativa a extensão ${definition.extension} nesta base.`);
    requireValue(g.units.filter(u=>u.base_id===base.id).length<(base.capacity||2),'Garagem cheia.');
    requireValue(freePersonnel(g,base)>=definition.crew,`Recruta pelo menos ${definition.crew} elementos disponíveis.`);
    const neededTraining=vehicleTraining(definition.id);
    if(neededTraining)requireValue(freePeople(g,base,neededTraining).length>=definition.crew,`Forma ${definition.crew} elementos livres em ${TRAINING_CATALOG.find(course=>course.id===neededTraining)?.name||neededTraining}.`);
    requireValue(g.money>=definition.price,'Orçamento insuficiente.');
    g.money-=definition.price;g.expenses+=definition.price;addUnit(g,base,definition.id);log(g,`Nova unidade ${definition.name} adquirida para ${base.name}.`,'success');
  }
  else if(kind==='build_base'){
    const service=data.service,site=POINTS[data.site_id];requireValue(SERVICES[service]&&site,'Seleciona um serviço e local válidos.');
    const unlock=site.land!=='mainland'?4:['Porto','Braga','Aveiro'].includes(site.city)?1:3;
    requireValue(g.level>=unlock,`Esta região desbloqueia no nível ${unlock}.`);
    requireValue(!g.bases.some(b=>b.node===site.node&&b.service===service),'Este serviço já tem uma base neste local.');
    const price=nextBuildingCost(g,service,SERVICES[service].base_price);requireValue(g.money>=price,'Orçamento insuficiente.');
    const command=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id);requireValue(command,'Cria primeiro um Centro de Comando.');
    g.money-=price;g.expenses+=price;const base=makeBase(service,site);base.command_center_id=command.id;base.operational_at=g.elapsed+180;g.bases.push(base);log(g,`Construção iniciada em ${site.name}. Conclusão prevista em 3 minutos.`,'success');
  }
  else if(kind==='upgrade_base'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    requireValue(!base.operational_at||base.operational_at<=g.elapsed,'A base ainda está em construção.');
    const level=base.level||1;requireValue(level<10,'A base já atingiu o nível máximo.');
    const price=Math.round(2800*Math.pow(level,1.55));requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;base.level=level+1;base.capacity=(base.capacity||2)+1;base.staff_capacity=(base.staff_capacity||14)+5;log(g,`${base.name} melhorada para o nível ${base.level}.`,'success');
  }
  else if(kind==='toggle_extension'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const definition=EXTENSIONS[base.service]?.find(ext=>ext.id===data.extension_id);requireValue(definition,'Extensão inválida.');
    requireValue((base.level||1)>=definition.level,`Esta extensão requer nível ${definition.level}.`);
    base.extensions=base.extensions||[];const current=base.extensions.find(ext=>ext.id===definition.id);
    if(current){requireValue(!current.completes_at,'A extensão ainda está em construção.');current.active=!current.active;log(g,`${definition.name} ${current.active?'ativada':'desativada'} em ${base.name}.`);}
    else{requireValue(g.money>=definition.cost,'Orçamento insuficiente.');g.money-=definition.cost;g.expenses+=definition.cost;base.extensions.push({id:definition.id,active:false,completes_at:g.elapsed+120});log(g,`Obras iniciadas: ${definition.name} em ${base.name}.`,'success');}
  }
  else if(kind==='set_specialization'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const definition=SPECIALIZATIONS[base.service]?.find(item=>item.id===data.specialization);requireValue(definition,'Especialização inválida.');
    if(definition.extension)requireValue((base.extensions||[]).some(ext=>ext.id===definition.extension&&ext.active),'Ativa primeiro a extensão necessária.');
    base.specialization=definition.id;log(g,`${base.name}: especialização alterada para ${definition.name}.`);
  }
  else if(kind==='recruit_personnel'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const amount=Math.max(1,Math.min(5,Number(data.amount)||2));requireValue((base.personnel||0)+amount<=(base.staff_capacity||14),'Capacidade de pessoal atingida.');
    const price=amount*650;requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;base.personnel=(base.personnel||0)+amount;addPersonnel(g,base,amount);log(g,`${amount} novos elementos recrutados para ${base.name}.`,'success');
  }
  else if(kind==='dismiss_personnel'){
    const person=g.personnel.find(item=>item.id===data.person_id),base=person&&g.bases.find(item=>item.id===person.base_id);requireValue(person&&base,'Elemento inválido.');requireValue(!person.unit_id&&person.status==='available','Só podes dispensar elementos livres e fora de formação.');requireValue((base.personnel||0)>2,'A base necessita de pelo menos dois elementos.');g.personnel=g.personnel.filter(item=>item.id!==person.id);base.personnel=Math.max(0,(base.personnel||0)-1);log(g,`${person.name} deixou o efetivo de ${base.name}.`,'alert');
  }
  else if(kind==='build_facility'){
    const type=data.type,site=POINTS[data.site_id],definition=FACILITY_CATALOG[type];requireValue(definition&&site,'Seleciona uma instalação e localização válidas.');
    requireValue(!g.facilities.some(facility=>facility.type===type&&facility.node===site.node),'Esta instalação já existe neste local.');
    const price=Math.round(definition.cost*(1+g.facilities.length*.12));requireValue(g.money>=price,'Orçamento insuficiente.');
    const command=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id);requireValue(command,'Cria primeiro um Centro de Comando.');
    g.money-=price;g.expenses+=price;const facility=makeFacility(type,site);facility.command_center_id=command.id;facility.operational_at=g.elapsed+180;g.facilities.push(facility);log(g,`Construção de ${definition.name} iniciada em ${site.name}.`,'success');
  }
  else if(kind==='upgrade_facility'){
    const facility=g.facilities.find(item=>item.id===data.facility_id);requireValue(facility,'Instalação inválida.');requireValue(operationalFacility(g,facility),'A instalação ainda está em construção.');const price=3500*(facility.level||1);requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;facility.level=(facility.level||1)+1;facility.capacity+=facility.type==='academy'?5:3;if(facility.type==='hospital'){facility.specialty_capacity=facility.specialty_capacity||{urgency:facility.capacity};facility.specialty_capacity.urgency=(facility.specialty_capacity.urgency||0)+3;}log(g,`${facility.name} ampliada para o nível ${facility.level}.`,'success');
  }
  else if(kind==='add_hospital_specialty'){
    const hospital=g.facilities.find(item=>item.id===data.facility_id&&item.type==='hospital'),specialty=HOSPITAL_SPECIALTIES.find(item=>item.id===data.specialty_id);requireValue(hospital&&specialty,'Hospital ou especialidade inválida.');requireValue(operationalFacility(g,hospital),'O hospital ainda está em construção.');hospital.specialties=hospital.specialties||['urgency'];requireValue(!hospital.specialties.includes(specialty.id),'Esta especialidade já está disponível.');requireValue(g.money>=specialty.cost,'Orçamento insuficiente.');g.money-=specialty.cost;g.expenses+=specialty.cost;hospital.specialties.push(specialty.id);hospital.specialty_capacity={urgency:hospital.capacity,...(hospital.specialty_capacity||{}),[specialty.id]:Math.max(2,Math.ceil(hospital.capacity*.45))};log(g,`${specialty.name} inaugurada em ${hospital.name}.`,'success');
  }
  else if(kind==='transport_patient'){
    const patient=g.patients.find(item=>item.id===data.patient_id&&item.status==='waiting'),hospital=g.facilities.find(item=>item.id===data.facility_id&&item.type==='hospital');requireValue(patient&&hospital,'Vítima ou hospital inválido.');requireValue(operationalFacility(g,hospital),'O hospital ainda está em construção.');
    requireValue(hospitalCanReceive(g,hospital,patient,operationalFacility),'Hospital sem capacidade compatível.');const unit=g.units.find(item=>item.id===data.unit_id&&item.service==='medical'&&operationalUnit(item))||g.units.filter(item=>item.service==='medical'&&operationalUnit(item)&&item.land===hospital.land).sort((a,b)=>distanceMeters(a,POINTS[patient.source_node])-distanceMeters(b,POINTS[patient.source_node]))[0];requireValue(unit,'Sem ambulâncias disponíveis.');requireValue(data.routes?.pickup&&data.routes?.delivery&&data.routes?.back,'Rotas de transporte não preparadas.');
    patient.status='transporting';patient.hospital_id=hospital.id;unit.task_id=patient.id;unit.transport_kind='patient';unit.transport_facility_id=hospital.id;unit.transport_facility_node=hospital.node;unit.transport_phase='pickup';unit.transport_delivery_plan=data.routes.delivery;unit.transport_return_plan=data.routes.back;startRoute(unit,data.routes.pickup,'transporting',patient.source_node);log(g,`${unit.name} iniciou deslocação para recolher a vítima e seguir para ${hospital.name}.`);
  }
  else if(kind==='transport_prisoner'){
    const prisoner=g.prisoners.find(item=>item.id===data.prisoner_id&&item.status==='waiting'),prison=g.facilities.find(item=>item.id===data.facility_id&&item.type==='prison');requireValue(prisoner&&prison,'Detido ou instalação inválida.');requireValue(operationalFacility(g,prison),'A instalação ainda está em construção.');
    requireValue(facilityOccupancy(g,prison)<prison.capacity,'Sem células disponíveis.');const unit=g.units.find(item=>item.id===data.unit_id&&item.service==='police'&&operationalUnit(item))||g.units.filter(item=>item.service==='police'&&operationalUnit(item)&&item.land===prison.land)[0];requireValue(unit,'Sem viaturas policiais disponíveis.');requireValue(data.routes?.pickup&&data.routes?.delivery&&data.routes?.back,'Rotas de transporte não preparadas.');
    prisoner.status='transporting';prisoner.prison_id=prison.id;unit.task_id=prisoner.id;unit.transport_kind='prisoner';unit.transport_facility_id=prison.id;unit.transport_facility_node=prison.node;unit.transport_phase='pickup';unit.transport_delivery_plan=data.routes.delivery;unit.transport_return_plan=data.routes.back;startRoute(unit,data.routes.pickup,'transporting',prisoner.source_node);log(g,`${unit.name} iniciou deslocação para recolher o detido.`);
  }
  else if(kind==='transport_medical_transfer'){
    const transfer=g.medical_transfers.find(item=>item.id===data.transfer_id&&item.status==='waiting'),patient=transfer&&g.patients.find(item=>item.id===transfer.patient_id),hospital=transfer&&g.facilities.find(item=>item.id===transfer.target_facility_id&&item.type==='hospital'),unit=g.units.find(item=>item.id===data.unit_id&&item.service==='medical'&&operationalUnit(item));requireValue(transfer&&patient&&hospital&&unit,'Transferência ou meio indisponível.');requireValue(data.routes?.pickup&&data.routes?.delivery&&data.routes?.back,'Rotas de transferência não preparadas.');transfer.status='transporting';patient.status='transfer_transporting';unit.task_id=transfer.id;unit.transport_kind='transfer';unit.transport_facility_id=hospital.id;unit.transport_facility_node=hospital.node;unit.transport_phase='pickup';unit.transport_delivery_plan=data.routes.delivery;unit.transport_return_plan=data.routes.back;startRoute(unit,data.routes.pickup,'transporting',transfer.source_node);log(g,`${unit.name} iniciou a transferência inter-hospitalar crítica.`,'alert');
  }
  else if(kind==='start_training'){
    const base=g.bases.find(item=>item.id===data.base_id),course=TRAINING_CATALOG.find(item=>item.id===data.course);const count=Math.max(1,Math.min(5,Number(data.count)||1));requireValue(base&&course&&base.service===course.service,'Base ou formação inválida.');
    requireValue(g.facilities.some(facility=>facility.type==='academy'&&facility.command_center_id===base.command_center_id&&operationalFacility(g,facility)),'Constrói primeiro uma escola de formação operacional nesta área.');const trainees=freePeople(g,base).slice(0,count);requireValue(trainees.length>=count,'Não existem elementos livres suficientes.');const price=course.cost*count;requireValue(g.money>=price,'Orçamento insuficiente.');
    trainees.forEach(person=>{person.status='training';});g.money-=price;g.expenses+=price;g.trainings.push({id:uid(),base_id:base.id,course:course.id,count,personnel_ids:trainees.map(person=>person.id),status:'active',started:g.elapsed,completes_at:g.elapsed+course.duration});log(g,`Formação iniciada: ${course.name} · ${count} elemento(s).`);
  }
  else if(kind==='toggle_patrol'){
    const unit=g.units.find(item=>item.id===data.unit_id&&item.service==='police');requireValue(unit&&['available','patrol'].includes(unit.status),'Viatura policial indisponível.');
    const base=g.bases.find(item=>item.id===unit.base_id);if(unit.status==='patrol'){unit.patrol_plans=[];unit.patrol_nodes=[];if(data.return_route)startRoute(unit,data.return_route,'returning',base.node);else{unit.status='available';unit.node=base.node;unit.lng=base.lng;unit.lat=base.lat;}log(g,`${unit.name} regressou à esquadra.`);}else{requireValue(data.routes?.length&&data.waypoint_ids?.length,'Define uma rota de patrulha válida.');unit.patrol_plans=data.routes;unit.patrol_nodes=data.waypoint_ids;unit.patrol_index=0;startRoute(unit,data.routes[0],'patrol',data.waypoint_ids[0]);log(g,`${unit.name} iniciou patrulhamento por ${data.waypoint_ids.length} pontos.`);}
  }
  else if(kind==='save_arr'){
    const name=String(data.name||'').trim().slice(0,32),resources={fire:Math.max(0,Math.min(9,Number(data.fire)||0)),medical:Math.max(0,Math.min(9,Number(data.medical)||0)),police:Math.max(0,Math.min(9,Number(data.police)||0))},vehicles=Object.fromEntries(Object.entries(data.vehicles||{}).map(([type,count])=>[type,Math.max(0,Math.min(9,Number(count)||0))]).filter(([,count])=>count));requireValue(name&&(Object.values(resources).some(Boolean)||Object.values(vehicles).some(Boolean)),'Define um nome e pelo menos um meio.');
    const existing=data.id&&g.arrs.find(item=>item.id===data.id);if(existing){existing.name=name;existing.resources=resources;existing.vehicles=vehicles;}else g.arrs.push({id:uid(),name,resources,vehicles});log(g,`RAR guardado: ${name}.`,'success');
  }
  else if(kind==='delete_arr'){requireValue(!String(data.arr_id).startsWith('arr-'),'Os RAR base não podem ser eliminados.');g.arrs=g.arrs.filter(item=>item.id!==data.arr_id);}
  else if(kind==='save_unit_group'){
    const name=String(data.name||'').trim().slice(0,32),unitIds=[...new Set(data.unit_ids||[])].filter(id=>g.units.some(unit=>unit.id===id));requireValue(name&&unitIds.length,'Define um nome e escolhe pelo menos uma viatura.');g.unit_groups=g.unit_groups||[];const existing=data.id&&g.unit_groups.find(item=>item.id===data.id);if(existing){existing.name=name;existing.unit_ids=unitIds;}else g.unit_groups.push({id:uid(),name,unit_ids:unitIds});log(g,`Grupo de meios guardado: ${name}.`,'success');
  }
  else if(kind==='delete_unit_group'){g.unit_groups=(g.unit_groups||[]).filter(item=>item.id!==data.group_id);}
  else if(kind==='create_command_center'){
    const site=POINTS[data.site_id],name=String(data.name||'').trim().slice(0,48),radius=Math.max(5,Math.min(120,Number(data.radius_km)||35));requireValue(site&&name,'Indica um nome e uma sede válidos.');requireValue(!g.command_centers.some(center=>center.center_node===site.id),'Já existe um Centro de Comando nesta sede.');
    const price=g.command_centers.length?7500:0;requireValue(g.money>=price,'Orçamento insuficiente.');g.money-=price;g.expenses+=price;const center=makeCommandCenter(name,site,radius);g.command_centers.push(center);g.active_command_center_id=center.id;g.city=center.city;log(g,`${center.name} criado com raio operacional de ${radius} km.`,'success');
  }
  else if(kind==='update_command_center'){
    const center=commandCenterFor(g,data.command_center_id);requireValue(center,'Centro de Comando inválido.');if(data.name!==undefined){const name=String(data.name).trim().slice(0,48);requireValue(name,'O nome não pode ficar vazio.');center.name=name;}if(data.radius_km!==undefined)center.radius_km=Math.max(5,Math.min(120,Number(data.radius_km)||35));if(data.active!==undefined)center.active=!!data.active;log(g,`${center.name} atualizado.`,'success');
  }
  else if(kind==='assign_base_command'){
    const base=g.bases.find(item=>item.id===data.base_id),center=commandCenterFor(g,data.command_center_id);requireValue(base&&center,'Base ou Centro de Comando inválido.');base.command_center_id=center.id;log(g,`${base.name} atribuída a ${center.name}.`,'success');
  }
  else if(kind==='assign_facility_command'){
    const facility=g.facilities.find(item=>item.id===data.facility_id),center=commandCenterFor(g,data.command_center_id);requireValue(facility&&center,'Instalação ou Centro de Comando inválido.');facility.command_center_id=center.id;log(g,`${facility.name} atribuída a ${center.name}.`,'success');
  }
  else if(kind==='set_active_command'){
    const center=commandCenterFor(g,data.command_center_id);requireValue(center,'Centro de Comando inválido.');g.active_command_center_id=center.id;g.city=center.city;log(g,`Vista operacional alterada para ${center.name}.`);
  }
  else if(kind==='create_player_poi'){
    const fallback=POINTS[data.site_id],lng=Number(data.lng),lat=Number(data.lat),custom=data.custom===true&&data.lng!==''&&data.lat!==''&&Number.isFinite(lng)&&Number.isFinite(lat),site=custom?{id:`custom-${uid()}`,node:null,name:data.name,city:data.city||'Local personalizado',land:data.land||'mainland',lng,lat}:fallback,center=commandCenterFor(g,data.command_center_id),name=String(data.name||'').trim().slice(0,48),type=String(data.type||'').trim();requireValue(site&&center&&name&&type,'Preenche o tipo, nome, localização e Centro de Comando.');requireValue(!g.player_pois.some(poi=>poi.type===type&&distanceMeters(poi,site)<20),'Já existe um PDI deste tipo nesta localização.');POINTS[site.id]=site;g.player_pois.push({id:uid(),type,name,node:site.id,city:site.city,land:site.land,lng:site.lng,lat:site.lat,command_center_id:center.id,created_at:new Date().toISOString()});log(g,`PDI criado: ${name} (${type}).`,'success');
  }
  else if(kind==='delete_player_poi'){
    const poi=g.player_pois.find(item=>item.id===data.poi_id);requireValue(poi,'PDI inválido.');g.player_pois=g.player_pois.filter(item=>item.id!==poi.id);log(g,`PDI removido: ${poi.name}.`);
  }
  else if(kind==='create_planned_mission'){
    const center=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id),site=POINTS[data.site_id],scenario=Math.max(0,Math.min(SCENARIOS.length-1,Number(data.scenario)||0)),delay=Math.max(60,Math.min(86400,Number(data.delay)||600)),title=String(data.title||SCENARIOS[scenario].title).trim().slice(0,64);requireValue(center&&site&&title,'Preenche a operação, localização e Centro de Comando.');g.planned_missions=g.planned_missions||[];g.planned_missions.push({id:uid(),title,scenario,node:site.id,command_center_id:center.id,starts_at:g.elapsed+delay,status:'scheduled',created_at:g.elapsed});log(g,`Operação planeada: ${title}.`,'success');
  }
  else if(kind==='cancel_planned_mission'){
    const planned=(g.planned_missions||[]).find(item=>item.id===data.planned_id);requireValue(planned&&planned.status==='scheduled','Só é possível cancelar operações ainda agendadas.');planned.status='cancelled';log(g,`Operação planeada cancelada: ${planned.title}.`,'alert');
  }
  else if(kind==='share_incident_to_alliance'){
    const incident=g.incidents.find(item=>item.id===data.incident_id);requireValue(incident,'Ocorrência inválida.');requireValue(!incident.shared_with_alliance,'Esta ocorrência já foi partilhada com a rede.');g.cooperation=g.cooperation||{};g.cooperation.shared_missions=(g.cooperation.shared_missions||0)+1;g.cooperation.log=g.cooperation.log||[];incident.shared_with_alliance=true;incident.shared_at=g.elapsed;g.cooperation.log.unshift({id:uid(),text:`Ocorrência partilhada: ${incident.title}.`,time:g.elapsed});log(g,`${incident.title} partilhada com a rede cooperativa.`,'success');
  }
  else if(kind==='start_alliance_event'){
    g.cooperation=g.cooperation||{};g.cooperation.events=g.cooperation.events||[];g.cooperation.log=g.cooperation.log||[];const center=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id);requireValue(center,'Seleciona um Centro de Comando.');const type=String(data.type||'storm'),titles={storm:'Tempestade regional',unrest:'Distúrbios coordenados',mass:'Incidente de múltiplas vítimas'},scenarios={storm:[4,3,10],unrest:[5,9,2],mass:[10,3,6]},cost=type==='storm'?2500:type==='unrest'?3000:3500;requireValue((g.cooperation.funds||0)>=cost,'Fundos cooperativos insuficientes.');g.cooperation.funds-=cost;const event={id:uid(),type,title:titles[type]||'Evento cooperativo',command_center_id:center.id,starts_at:g.elapsed,ends_at:g.elapsed+10800,status:'active',spawned:0,created_at:g.elapsed};g.cooperation.events.unshift(event);for(let index=0;index<4;index++){const scenario=scenarios[type]?.[index%3]??3,site=places.filter(point=>point.city===center.city||point.land===center.land)[index%places.length]||POINTS[center.center_node];g.planned_missions.push({id:uid(),title:`${event.title} · ocorrência ${index+1}`,scenario,node:site.id,command_center_id:center.id,starts_at:g.elapsed+60+index*90,status:'scheduled',created_at:g.elapsed,alliance_event_id:event.id});}g.cooperation.log.unshift({id:uid(),text:`Evento lançado: ${event.title}.`,time:g.elapsed});log(g,`${event.title} lançado pela rede cooperativa.`,'alert');
  }
  else if(kind==='start_large_scale_mission'){
    g.cooperation=g.cooperation||{};g.cooperation.large_scale_missions=g.cooperation.large_scale_missions||[];g.cooperation.log=g.cooperation.log||[];const center=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id),site=POINTS[data.site_id]||POINTS[center?.center_node];requireValue(center&&site,'Seleciona comando e localização.');const cost=2200;requireValue((g.cooperation.funds||0)>=cost,'Fundos cooperativos insuficientes.');g.cooperation.funds-=cost;const incident=spawn(g,10,site.id,center.id);if(incident){incident.title=String(data.title||'Missão coletiva de grande escala').slice(0,64);incident.definition=incident.title;incident.shared_with_alliance=true;incident.large_scale=true;incident.needs={fire:Math.max(incident.needs.fire||0,4),medical:Math.max(incident.needs.medical||0,3),police:Math.max(incident.needs.police||0,2)};incident.required_vehicle_types=[...new Set([...(incident.required_vehicle_types||[]),'command-unit','mass-casualty-unit'])];incident.required_trainings=[...new Set([...(incident.required_trainings||[]),'triage'])];incident.required_personnel=Object.values(incident.needs).reduce((sum,count)=>sum+count*3,0);incident.reward=Math.round(incident.reward*1.8);incident.response_deadline+=300;incident.resolution_deadline+=600;incident.deadline=incident.response_deadline;g.cooperation.shared_missions=(g.cooperation.shared_missions||0)+1;g.cooperation.large_scale_missions.unshift({id:uid(),incident_id:incident.id,title:incident.title,created_at:g.elapsed,status:'active'});g.cooperation.log.unshift({id:uid(),text:`Missão coletiva criada: ${incident.title}.`,time:g.elapsed});log(g,`Missão coletiva criada: ${incident.title}.`,'alert');}
  }
  else if(kind==='create_staging_area'){
    const center=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id),site=POINTS[data.site_id],name=String(data.name||'').trim().slice(0,48);requireValue(center&&site&&name,'Indica nome, localização e Centro de Comando.');g.staging_areas=g.staging_areas||[];g.staging_areas.push({id:uid(),name,node:site.id,lng:site.lng,lat:site.lat,city:site.city,land:site.land,command_center_id:center.id,active:true,created_at:g.elapsed});log(g,`Zona de concentração criada: ${name}.`,'success');
  }
  else if(kind==='deploy_to_staging'){
    const staging=(g.staging_areas||[]).find(item=>item.id===data.staging_id&&item.active!==false),unit=g.units.find(item=>item.id===data.unit_id);requireValue(staging&&unit&&operationalUnit(unit),'Zona ou unidade indisponível.');requireValue(staging.land===unit.land,'Sem ligação rodoviária para esta zona.');requireValue(data.route?.coordinates?.length>1,'Percurso para a zona não preparado.');startRoute(unit,data.route,'staging_enroute',staging.id);log(g,`${unit.name} mobilizada para ${staging.name}.`);
  }
  else if(kind==='return_from_staging'){
    const unit=g.units.find(item=>item.id===data.unit_id&&item.status==='staged'),base=unit&&g.bases.find(item=>item.id===unit.base_id);requireValue(unit&&base,'A viatura não está numa zona de concentração.');requireValue(data.route?.coordinates?.length>1,'Percurso de regresso não preparado.');unit.staging_area_id=null;startRoute(unit,data.route,'returning',base.node);log(g,`${unit.name} regressa de concentração para ${base.name}.`);
  }
  else if(kind==='close_staging_area'){
    const staging=(g.staging_areas||[]).find(item=>item.id===data.staging_id);requireValue(staging,'Zona de concentração inválida.');requireValue(!g.units.some(unit=>unit.staging_area_id===staging.id||unit.destination===staging.id),'Retira primeiro todas as unidades desta zona.');staging.active=false;log(g,`Zona de concentração encerrada: ${staging.name}.`);
  }
  else if(kind==='create_complex'){
    const center=commandCenterFor(g,data.command_center_id)||commandCenterFor(g,g.active_command_center_id),name=String(data.name||'').trim().slice(0,48);requireValue(center&&name,'Indica um nome e Centro de Comando.');g.complexes=g.complexes||[];g.complexes.push({id:uid(),name,command_center_id:center.id,base_ids:[],facility_ids:[],created_at:g.elapsed});log(g,`Complexo operacional criado: ${name}.`,'success');
  }
  else if(kind==='toggle_complex_member'){
    const complex=(g.complexes||[]).find(item=>item.id===data.complex_id),collection=data.member_kind==='facility'?'facility_ids':'base_ids',valid=data.member_kind==='facility'?g.facilities:g.bases;requireValue(complex&&valid.some(item=>item.id===data.member_id),'Complexo ou edifício inválido.');complex[collection]=complex[collection]||[];complex[collection]=complex[collection].includes(data.member_id)?complex[collection].filter(id=>id!==data.member_id):[...complex[collection],data.member_id];log(g,`${complex.name} atualizado.`,'success');
  }
  else if(kind==='claim_task'){
    refreshMeta(g);const task=(g.tasks||[]).find(item=>item.id===data.task_id);requireValue(task&&!task.claimed&&task.progress>=task.target,'Tarefa ainda não está concluída.');task.claimed=true;task.claimed_at=g.elapsed;g.money+=task.reward;g.earned+=task.reward;log(g,`Recompensa recebida: ${task.title} (+${task.reward} €).`,'success');
  }
  else if(kind==='update_unit_settings'){
    const unit=g.units.find(item=>item.id===data.unit_id);requireValue(unit,'Viatura inválida.');if(data.enabled!==undefined){requireValue(unit.status==='available'||data.enabled,'A viatura só pode ser desativada na base.');unit.enabled=!!data.enabled;}if(data.exclude_from_arr!==undefined)unit.exclude_from_arr=!!data.exclude_from_arr;if(data.max_crew!==undefined){requireValue(unit.status==='available','A lotação só pode ser alterada na base.');const limit=Math.max(unit.crew_required||1,Math.min(12,Number(data.max_crew)||unit.crew_required||1)),base=g.bases.find(item=>item.id===unit.base_id),definition=vehicleDefinition(unit.service,unit.vehicle_type);unit.max_crew=limit;const assigned=(unit.personnel_ids||[]).map(id=>g.personnel.find(person=>person.id===id)).filter(Boolean);assigned.slice(limit).forEach(person=>{person.unit_id=null;person.status='available';});unit.personnel_ids=assigned.slice(0,limit).map(person=>person.id);freePeople(g,base,definition.training||null).slice(0,Math.max(0,limit-unit.personnel_ids.length)).forEach(person=>{person.unit_id=unit.id;person.status='assigned';unit.personnel_ids.push(person.id);});unit.crew_assigned=unit.personnel_ids.length;}if(data.response_delay!==undefined)unit.response_delay=Math.max(0,Math.min(120,Number(data.response_delay)||0));log(g,`Configuração atualizada: ${unit.name}.`,'success');
  }
  else if(kind==='repair_unit'){
    const unit=g.units.find(item=>item.id===data.unit_id);requireValue(unit&&['available','staged','resting','broken'].includes(unit.status),'A viatura tem de estar parada para manutenção.');const missing=100-(unit.condition||100),cost=Math.max(150,Math.round(missing*18));requireValue(g.money>=cost,'Orçamento insuficiente.');g.money-=cost;g.expenses+=cost;unit.condition=100;if(unit.status==='broken')unit.status='available';unit.repair_until=0;log(g,`${unit.name} recebeu manutenção completa (-${cost} €).`,'success');
  }
  else if(kind==='rest_unit'){
    const unit=g.units.find(item=>item.id===data.unit_id);requireValue(unit&&['available','staged'].includes(unit.status),'A equipa tem de estar disponível para entrar em descanso.');unit.status='resting';unit.rest_until=g.elapsed+Math.max(90,Math.round((unit.fatigue||30)*2));log(g,`Equipa da ${unit.name} entrou em descanso operacional.`);
  }
  else if(kind==='transfer_unit'){
    const unit=g.units.find(item=>item.id===data.unit_id),target=g.bases.find(item=>item.id===data.base_id);requireValue(unit&&target&&unit.service===target.service,'Seleciona uma base compatível.');requireValue(unit.status==='available','A viatura tem de estar disponível na base.');requireValue(g.units.filter(item=>item.base_id===target.id).length<(target.capacity||2),'Garagem de destino cheia.');const current=g.bases.find(item=>item.id===unit.base_id),crew=(unit.personnel_ids||[]).map(id=>g.personnel.find(item=>item.id===id)).filter(Boolean);if(unit.fixed_crew){requireValue((target.personnel||0)+crew.length<=(target.staff_capacity||14),'A base de destino não tem capacidade para a tripulação fixa.');crew.forEach(person=>{person.base_id=target.id;person.unit_id=unit.id;person.status='assigned';});if(current)current.personnel=Math.max(0,(current.personnel||0)-crew.length);target.personnel=(target.personnel||0)+crew.length;}else{crew.forEach(person=>{person.unit_id=null;person.status='available';});unit.personnel_ids=[];unit.crew_assigned=0;}unit.base_id=target.id;unit.node=target.node;unit.lng=target.lng;unit.lat=target.lat;unit.land=target.land;if(!unit.fixed_crew)assignUnitCrew(g,unit,vehicleDefinition(unit.service,unit.vehicle_type));log(g,`${unit.name} transferida de ${current?.name||'outra base'} para ${target.name}.`,'success');
  }
  else if(kind==='new_incident'){refreshProgression(g);requireValue(g.incidents.length<g.progression.mission_cap,`Limite de ${g.progression.mission_cap} ocorrências ativas atingido.`);spawn(g);}
  else if(kind!=='save'&&!applyAdvancedAction(g,kind,data,log))throw new Error('Ação desconhecida.');
  refreshProgression(g);g.saved_at=new Date().toISOString();return g;
}
export function loadLocalGame(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(saved?.mode?.startsWith('portugal-offline')){
      const fresh=newGame();
      const migratedCenters=saved.command_centers?.length?saved.command_centers:[makeCommandCenter(`Comando Operacional de ${saved.city||'Porto'}`,POINTS['porto-aliados'],35)];
      const merged={...fresh,...saved,mode:'portugal-offline-v5',rng_seed:saved.rng_seed||fresh.rng_seed,rng_state:saved.rng_state||saved.rng_seed||fresh.rng_state,rng_counter:saved.rng_counter||0,expenses:saved.expenses||0,operating_debt:saved.operating_debt||0,next_crisis_wave:saved.next_crisis_wave||saved.elapsed+900,next_upkeep:saved.next_upkeep||saved.elapsed+300,conditions:saved.conditions||freshConditions(saved.elapsed||0),command_centers:migratedCenters,active_command_center_id:saved.active_command_center_id||migratedCenters[0].id,player_pois:saved.player_pois||[],personnel:saved.personnel||[],facilities:saved.facilities||[],planned_missions:saved.planned_missions||[],staging_areas:saved.staging_areas||[],complexes:saved.complexes||[],tasks:saved.tasks?.length?saved.tasks:makeCareerTasks(saved),achievements:saved.achievements||[],unit_groups:saved.unit_groups||[],patients:saved.patients||[],prisoners:saved.prisoners||[],trainings:saved.trainings||[],arrs:saved.arrs?.length?saved.arrs:clone(DEFAULT_ARRS)};
      merged.bases=(saved.bases||fresh.bases).map(base=>{const count=(saved.units||fresh.units).filter(unit=>unit.base_id===base.id).length;return {level:1,capacity:Math.max(2,count),staff_capacity:14,personnel:base.service==='fire'?10:6,extensions:[],specialization:'general',qualifications:{},command_center_id:migratedCenters[0].id,...base};});
      merged.facilities=merged.facilities.map(facility=>({command_center_id:migratedCenters[0].id,specialty_capacity:facility.type==='hospital'?Object.fromEntries((facility.specialties||['urgency']).map(id=>[id,id==='urgency'?(facility.capacity||5):Math.max(2,Math.ceil((facility.capacity||5)*.45))])):undefined,...facility}));
      merged.units=(saved.units||fresh.units).map(unit=>{const definition=vehicleDefinition(unit.service,unit.vehicle_type||(unit.advanced?VEHICLE_CATALOG[unit.service]?.[1]?.id:null));return {condition:100,fatigue:0,repair_until:0,rest_until:0,enabled:true,exclude_from_arr:false,response_delay:0,max_crew:definition.crew,vehicle_type:definition.id,crew_required:definition.crew,crew_assigned:definition.crew,training:vehicleTraining(definition.id),...unit};});
      if(!merged.personnel.length){merged.bases.forEach(base=>addPersonnel(merged,base,base.personnel||0));merged.units.forEach(unit=>{unit.personnel_ids=[];unit.crew_assigned=0;assignUnitCrew(merged,unit,vehicleDefinition(unit.service,unit.vehicle_type));});}
      else merged.personnel=merged.personnel.map(person=>({unit_id:null,status:'available',qualifications:[],fatigue:0,...person}));
      merged.incidents=(saved.incidents||[]).map(incident=>{const responseDeadline=incident.response_deadline||incident.deadline||((incident.created||merged.elapsed)+1200);return {escalated:false,false_alarm:false,difficulty:{1:'Difícil',2:'Média',3:'Fácil'}[incident.priority]||'Média',casualties:0,detainees:0,required_vehicle_types:[],required_trainings:[],phase_requirements_applied:[incident.active_phase||0],required_personnel:Object.values(incident.needs||{}).reduce((sum,n)=>sum+n*2,0),command_center_id:migratedCenters[0].id,response_deadline:responseDeadline,resolution_deadline:incident.resolution_deadline||responseDeadline+900,deadline:responseDeadline,...incident};});
      merged.player_pois.forEach(poi=>{if(poi.node&&!POINTS[poi.node])POINTS[poi.node]={id:poi.node,node:poi.node,name:poi.name,city:poi.city,land:poi.land,lng:poi.lng,lat:poi.lat};});
      initializeAdvancedState(merged);
      return refreshProgression(merged);
    }
  }catch{}
  return newGame();
}
export function saveLocalGame(game){const saved={...game,saved_at:new Date().toISOString()};localStorage.setItem(SAVE_KEY,JSON.stringify(saved));return saved;}