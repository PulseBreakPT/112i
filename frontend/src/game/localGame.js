import { EXTENSIONS, SPECIALIZATIONS, VEHICLE_CATALOG, POIS, MISSION_DEFINITIONS, weightedMission, progressionSnapshot, nextBuildingCost } from './progression';
import { NEW_SCENARIOS } from './expansionContent';

const SAVE_KEY = 'nexo112-offline-save-v1';

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
const TRAINING_CATALOG = [
  {id:'hazmat',name:'Matérias perigosas',service:'fire',duration:420,cost:700},
  {id:'advanced-care',name:'Suporte avançado de vida',service:'medical',duration:360,cost:800},
  {id:'triage',name:'Triagem e catástrofe',service:'medical',duration:480,cost:900},
  {id:'canine',name:'Unidade cinotécnica',service:'police',duration:360,cost:650},
  {id:'public-order',name:'Ordem pública',service:'police',duration:420,cost:750},
];
const DEFAULT_ARRS = [
  {id:'arr-incendio',name:'Incêndio urbano',resources:{fire:2,medical:1,police:0}},
  {id:'arr-acidente',name:'Acidente rodoviário',resources:{fire:1,medical:1,police:1}},
  {id:'arr-medica',name:'Emergência médica',resources:{fire:0,medical:1,police:0}},
];

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
  mode:'portugal-offline-v3', name:'Portugal', center:[-8.616,41.156], zoom:13.1,
  map_style:'https://tiles.openfreemap.org/styles/liberty',
  services:SERVICES,
  extensions:EXTENSIONS,
  specializations:SPECIALIZATIONS,
  vehicle_catalog:VEHICLE_CATALOG,
  mission_definitions:MISSION_DEFINITIONS,
  facility_catalog:FACILITY_CATALOG,
  training_catalog:TRAINING_CATALOG,
  pois:POIS.map(poi => ({...poi,...POINTS[poi.node]})),
  sites:siteIds.map(id => ({...POINTS[id], unlock_level: POINTS[id].land !== 'mainland' ? 4 : ['Porto','Braga','Aveiro'].includes(POINTS[id].city) ? 1 : 3})),
  regions:[
    {id:'porto',name:'Porto',center:[-8.616,41.156],zoom:13.1},
    {id:'mainland',name:'Continente',bounds:[[-9.6,36.9],[-6.1,42.2]]},
    {id:'madeira',name:'Madeira',bounds:[[-17.3,32.6],[-16.25,33.15]]},
    {id:'azores',name:'Açores',bounds:[[-31.4,36.85],[-24.8,39.8]]},
  ],
  routing:{provider:'Estimativa local / OpenStreetMap',live_traffic:false,notice:'Estimativas locais sem trânsito em direto.'},
};

const uid = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
const clone = value => structuredClone(value);
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const log = (g,text,kind='info') => { g.logs.unshift({id:uid(),text,kind,time:g.elapsed}); g.logs=g.logs.slice(0,50); };
const WEATHER = [
  {id:'clear',label:'Céu limpo',factor:1},
  {id:'rain',label:'Chuva',factor:1.18},
  {id:'storm',label:'Tempestade',factor:1.38},
  {id:'fog',label:'Nevoeiro',factor:1.25},
];
const TRAFFIC = [
  {id:'light',label:'Trânsito fluido',factor:1},
  {id:'moderate',label:'Trânsito moderado',factor:1.16},
  {id:'heavy',label:'Trânsito intenso',factor:1.34},
];
const freshConditions = elapsed => {
  const weather = WEATHER[Math.floor(Math.random()*WEATHER.length)];
  const traffic = TRAFFIC[Math.floor(Math.random()*TRAFFIC.length)];
  const hour = (14 + Math.floor((32*60+elapsed)/3600)) % 24;
  return {weather:weather.id,weather_label:weather.label,weather_factor:weather.factor,traffic:traffic.id,traffic_label:traffic.label,traffic_factor:traffic.factor,roadworks:Math.random()<.22,night:hour>=20||hour<7,updated_at:elapsed};
};
const conditionsFactor = c => (c?.weather_factor||1)*(c?.traffic_factor||1)*(c?.roadworks?1.12:1)*(c?.night?1.06:1);
const distanceMeters = (a,b) => {
  const rad=n=>n*Math.PI/180, R=6371000, dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
};
export function estimateRoute(originId,destinationId,conditions=null){
  const a=POINTS[originId], b=POINTS[destinationId];
  if(!a||!b) throw new Error('Localização desconhecida.');
  const distance=Math.max(600,Math.round(distanceMeters(a,b)*1.28));
  const duration=Math.max(45,Math.round(distance/13.5*conditionsFactor(conditions)));
  const coordinates=Array.from({length:7},(_,i)=>{const t=i/6; const bend=Math.sin(Math.PI*t)*0.0012; return [a.lng+(b.lng-a.lng)*t+bend,a.lat+(b.lat-a.lat)*t+bend*.35];});
  return {coordinates,times:coordinates.map((_,i)=>duration*i/6),distance,duration,source:'Estimativa local'};
}
const makeBase=(service,point)=>({...point,id:uid(),service,node:point.id,name:`${SERVICES[service].name} · ${point.name}`,level:1,capacity:2,staff_capacity:14,personnel:service==='fire'?10:6,extensions:[],specialization:'general'});
const assignedPersonnel=(g,baseId)=>g.units.filter(u=>u.base_id===baseId).reduce((sum,u)=>sum+(u.crew_assigned||0),0);
const trainingPersonnel=(g,baseId)=>(g.trainings||[]).filter(t=>t.base_id===baseId&&t.status==='active').reduce((sum,t)=>sum+t.count,0);
const freePersonnel=(g,base)=>Math.max(0,(base.personnel||0)-assignedPersonnel(g,base.id)-trainingPersonnel(g,base.id));
const facilityOccupancy=(g,facility)=>facility.type==='hospital'?(g.patients||[]).filter(p=>p.hospital_id===facility.id&&['transporting','admitted'].includes(p.status)).length:(g.prisoners||[]).filter(p=>p.prison_id===facility.id&&['transporting','detained'].includes(p.status)).length;
const makeFacility=(type,point)=>({id:uid(),type,node:point.id,name:`${FACILITY_CATALOG[type].name} · ${point.name}`,city:point.city,land:point.land,lng:point.lng,lat:point.lat,level:1,capacity:FACILITY_CATALOG[type].capacity,specialties:type==='hospital'?['urgency']:[]});
const vehicleDefinition=(service,type)=>VEHICLE_CATALOG[service]?.find(v=>v.id===type)||VEHICLE_CATALOG[service]?.[0];
const addUnit=(g,base,vehicleType=null)=>{
  const definition=vehicleDefinition(base.service,vehicleType);
  const crewAvailable=freePersonnel(g,base);
  const crew=Math.min(definition.crew,crewAvailable);
  const number=1+g.units.filter(u=>u.service===base.service).length;
  g.units.push({id:uid(),name:`${definition.name}-${String(number).padStart(2,'0')}`,service:base.service,vehicle_type:definition.id,base_id:base.id,node:base.node,lng:base.lng,lat:base.lat,x:base.lng,y:base.lat,land:base.land,status:crew>=definition.crew?'available':'uncrewed',incident_id:null,route:[],route_times:[],travel:0,travel_total:0,route_distance:0,advanced:definition.id!==VEHICLE_CATALOG[base.service][0].id,crew_required:definition.crew,crew_assigned:crew,training:definition.training||null,condition:100,fatigue:0,repair_until:0,rest_until:0});
};
const refreshProgression=g=>{g.progression=progressionSnapshot(g,SERVICES);return g;};
const rollRange=value=>{const [min,max]=value||[0,0];return min+Math.floor(Math.random()*(Math.max(min,max)-min+1));};
const spawn=(g,scenarioIndex=null,nodeId=null)=>{
  const definition=scenarioIndex===null?weightedMission(g):MISSION_DEFINITIONS.find(item=>item.scenario===scenarioIndex);
  const choice=definition?.scenario??1;
  const s=SCENARIOS[choice]||SCENARIOS[1];
  let point=nodeId?POINTS[nodeId]:null;
  if(!point&&definition?.poi){
    const coveredCities=new Set(g.bases.map(b=>b.city));
    const candidates=POIS.filter(p=>p.type===definition.poi&&coveredCities.has(p.city)).map(p=>POINTS[p.node]).filter(Boolean);
    point=candidates[Math.floor(Math.random()*candidates.length)];
  }
  if(!point){
    const cities=[...new Set(g.bases.map(b=>b.city))];
    const city=cities[Math.floor(Math.random()*cities.length)]||'Porto';
    const occupied=new Set(g.incidents.map(i=>i.node));
    const candidates=places.filter(p=>p.city===city&&!occupied.has(p.id));
    const fallback=places.filter(p=>p.city===city);
    point=(candidates.length?candidates:fallback)[Math.floor(Math.random()*Math.max(1,(candidates.length||fallback.length)))]||POINTS['porto-aliados'];
  }
  const requiredPersonnel=Object.values(s.needs).reduce((sum,n)=>sum+n*2,0);
  g.incidents.push({...clone(s),id:uid(),number:g.sequence++,scenario:choice,definition:definition?.name||s.title,difficulty:definition?.difficulty||({1:'Difícil',2:'Média',3:'Fácil'}[s.priority]),casualties:rollRange(definition?.victims),detainees:rollRange(definition?.prisoners),required_vehicle_types:[...(definition?.vehicle||[])],required_personnel:requiredPersonnel,node:point.id,lng:point.lng,lat:point.lat,x:point.lng,y:point.lat,land:point.land,address:point.name,district:point.city,status:'waiting',created:g.elapsed,deadline:g.elapsed+({1:900,2:1200,3:1500}[s.priority]),assigned:[],progress:0,call_answered:false,escalated:false,false_alarm:Math.random()<.08,call:{text:s.caller,choices:s.choices}});
  log(g,`Nova ocorrência em ${point.city}: ${s.title}.`,'alert');
};
export function newGame(){
  const g={id:uid(),mode:'portugal-offline-v4',city:'Porto',money:24500,xp:0,level:1,trust:98,elapsed:0,speed:1,completed:0,failed:0,earned:0,expenses:0,next_spawn:180,next_upkeep:300,sequence:101,incidents:[],units:[],bases:[],facilities:[],patients:[],prisoners:[],trainings:[],arrs:clone(DEFAULT_ARRS),logs:[],history:[],conditions:freshConditions(0),saved_at:new Date().toISOString()};
  [['fire','porto-boavista'],['medical','porto-asprela'],['police','porto-bonfim']].forEach(([service,key])=>{const base=makeBase(service,POINTS[key]);g.bases.push(base);addUnit(g,base);addUnit(g,base);});
  spawn(g,0,'porto-aliados'); spawn(g,1,'porto-trindade'); spawn(g,2,'porto-batalha');
  refreshProgression(g);
  log(g,'Portugal · Central do Porto operacional. Modo local ativo.','success');
  return g;
}
const startRoute=(unit,plan,status,destination)=>{unit.status=status;unit.route=plan.coordinates;unit.route_times=plan.times;unit.travel=0;unit.travel_total=plan.duration;unit.route_distance=plan.distance;unit.destination=destination;unit.lng=plan.coordinates[0][0];unit.lat=plan.coordinates[0][1];unit.x=unit.lng;unit.y=unit.lat;};
const locate=unit=>{
  const times=unit.route_times||[], points=unit.route||[];
  if(points.length<2||times.length<2)return;
  const elapsed=Math.min(unit.travel,unit.travel_total); let i=0;
  while(i<times.length-2&&times[i+1]<=elapsed)i++;
  const span=times[i+1]-times[i], t=span?Math.max(0,Math.min(1,(elapsed-times[i])/span)):1;
  unit.lng=points[i][0]+(points[i+1][0]-points[i][0])*t; unit.lat=points[i][1]+(points[i+1][1]-points[i][1])*t; unit.x=unit.lng;unit.y=unit.lat;
};
const returnToBase=(g,unit)=>{const base=g.bases.find(b=>b.id===unit.base_id);unit.incident_id=null;startRoute(unit,estimateRoute(unit.node,base.node,g.conditions),'returning',base.node);};
const createAftercare=(g,incident)=>{
  if(incident.false_alarm)return;
  const hospitals=g.facilities.filter(f=>f.type==='hospital'&&facilityOccupancy(g,f)<f.capacity);
  const prisons=g.facilities.filter(f=>f.type==='prison'&&facilityOccupancy(g,f)<f.capacity);
  if((incident.casualties||0)>0&&hospitals.length){
    const count=incident.casualties;
    for(let index=0;index<count;index++){const severity=1+Math.floor(Math.random()*3);g.patients.push({id:uid(),incident:incident.title,source_node:incident.node,city:incident.district,severity,specialty:severity===3?'trauma':'urgency',needs_doctor:severity===3,status:'waiting',created:g.elapsed,hospital_id:null});}
    log(g,`${count} vítima(s) aguardam transporte hospitalar.`,'alert');
  }
  if((incident.detainees||0)>0&&prisons.length){
    const count=incident.detainees;
    for(let index=0;index<count;index++)g.prisoners.push({id:uid(),incident:incident.title,source_node:incident.node,city:incident.district,status:'waiting',created:g.elapsed,prison_id:null});
    log(g,`${count} detido(s) aguardam transporte.`,'alert');
  }
};
const resolveIncident=(g,incident,success)=>{
  const trustFactor=.8+g.trust/500;
  const payout=success?(incident.false_alarm?Math.round(incident.reward*.25):Math.round(incident.reward*trustFactor)):0;
  log(g,`${incident.title} — ${success?(incident.false_alarm?'falso alarme confirmado.':'resolvida.'):'prazo de resposta excedido.'}`,success?'success':'alert');
  g.history.unshift({id:incident.id,title:incident.title,service:incident.service,success,reward:payout,time:g.elapsed});g.history=g.history.slice(0,100);
  g.units.filter(u=>u.incident_id===incident.id).forEach(u=>{u.fatigue=Math.min(100,(u.fatigue||0)+24);u.condition=Math.max(10,(u.condition||100)-6);returnToBase(g,u);});
  if(success){g.money+=payout;g.earned+=payout;g.xp+=incident.false_alarm?20:incident.xp;g.completed++;g.trust=Math.min(100,g.trust+(incident.false_alarm?0:1));createAftercare(g,incident);}
  else{const penalty=Math.min(g.money,Math.round(incident.reward*.08));g.money-=penalty;g.expenses+=penalty;g.failed++;g.trust=Math.max(0,g.trust-6);}
  g.incidents=g.incidents.filter(i=>i.id!==incident.id);
};
const operationalUnit=unit=>['available','patrol'].includes(unit.status);
const mobilize=(g,incident,units)=>{
  requireValue(units.length&&units.every(operationalUnit),'Não existem meios disponíveis para este despacho.');
  requireValue(units.every(unit=>unit.land===incident.land),'Sem ligação rodoviária para esta ocorrência.');
  units.forEach(unit=>{const plan=estimateRoute(unit.node,incident.node,g.conditions);startRoute(unit,plan,'enroute',incident.node);unit.incident_id=incident.id;if(!incident.assigned.includes(unit.id))incident.assigned.push(unit.id);});
  incident.status='enroute';incident.deadline=Math.max(incident.deadline,g.elapsed+Math.max(...units.map(unit=>unit.travel_total))+180);log(g,`${units.length} unidade(s) mobilizada(s). Estimativa local ativa.`);
};
export function tickGame(input,seconds){
  const g=clone(input), dt=seconds*g.speed;if(!dt)return g;g.elapsed+=dt;
  if(g.elapsed-(g.conditions?.updated_at||0)>=180){g.conditions=freshConditions(g.elapsed);log(g,`Condições atualizadas: ${g.conditions.weather_label.toLowerCase()}, ${g.conditions.traffic_label.toLowerCase()}${g.conditions.roadworks?' e obras na rede viária':''}.`);}
  g.units.forEach(u=>{
    if(u.status==='transporting'&&g.elapsed>=u.transport_until){
      const facility=g.facilities.find(f=>f.id===u.transport_facility_id);
      if(u.transport_kind==='patient'){const patient=g.patients.find(p=>p.id===u.task_id);if(patient){patient.status='admitted';patient.admitted_at=g.elapsed;patient.discharge_at=g.elapsed+240+patient.severity*120;log(g,`Vítima admitida em ${facility?.name||'hospital'}.`,'success');}}
      else{const prisoner=g.prisoners.find(p=>p.id===u.task_id);if(prisoner){prisoner.status='detained';prisoner.detained_at=g.elapsed;prisoner.release_at=g.elapsed+480;log(g,`Detido entregue em ${facility?.name||'instalação prisional'}.`,'success');}}
      u.node=facility?.node||u.node;u.task_id=null;u.transport_kind=null;u.transport_facility_id=null;returnToBase(g,u);return;
    }
    if(u.status==='broken'&&g.elapsed>=u.repair_until){const base=g.bases.find(b=>b.id===u.base_id);u.status='available';u.node=base.node;u.lng=base.lng;u.lat=base.lat;u.condition=75;log(g,`${u.name} reparada e novamente disponível.`,'success');return;}
    if(u.status==='resting'&&g.elapsed>=u.rest_until){u.status='available';u.fatigue=0;log(g,`Tripulação da ${u.name} terminou o descanso.`);return;}
    if(!['enroute','returning'].includes(u.status))return;
    u.travel=Math.min(u.travel_total,u.travel+dt);locate(u);
    if(u.status==='enroute'&&(u.condition||100)<45&&Math.random()<dt/900){u.status='broken';u.repair_until=g.elapsed+120;u.incident_id=null;u.route=[];u.route_times=[];const cost=450;g.money=Math.max(0,g.money-cost);g.expenses+=cost;log(g,`Avaria na ${u.name}. Reparação iniciada (-${cost} €).`,'alert');return;}
    if(u.travel<u.travel_total)return;u.node=u.destination;
    if(u.status==='returning'){if((u.fatigue||0)>=70){u.status='resting';u.rest_until=g.elapsed+90;}else u.status='available';u.incident_id=null;u.route=[];u.route_times=[];}
    else{u.status='onscene';log(g,`${u.name} no local da ocorrência.`);}
  });
  g.trainings.forEach(training=>{if(training.status==='active'&&g.elapsed>=training.completes_at){training.status='completed';const base=g.bases.find(b=>b.id===training.base_id);if(base){base.qualifications=base.qualifications||{};base.qualifications[training.course]=(base.qualifications[training.course]||0)+training.count;}const course=TRAINING_CATALOG.find(item=>item.id===training.course);log(g,`Formação concluída: ${course?.name||training.course} · ${training.count} elemento(s).`,'success');}});
  g.patients.forEach(patient=>{if(patient.status==='admitted'&&g.elapsed>=patient.discharge_at){patient.status='discharged';patient.closed_at=g.elapsed;g.money+=250;g.earned+=250;}});
  g.prisoners.forEach(prisoner=>{if(prisoner.status==='detained'&&g.elapsed>=prisoner.release_at){prisoner.status='released';prisoner.closed_at=g.elapsed;}});
  g.patients=g.patients.filter(patient=>!patient.closed_at||g.elapsed-patient.closed_at<600);
  g.prisoners=g.prisoners.filter(prisoner=>!prisoner.closed_at||g.elapsed-prisoner.closed_at<600);
  [...g.incidents].forEach(inc=>{
    const escalationAt=inc.created+(inc.deadline-inc.created)*.55;
    if(!inc.escalated&&g.elapsed>=escalationAt&&inc.status==='waiting'){inc.escalated=true;inc.priority=Math.max(1,inc.priority-1);inc.reward=Math.round(inc.reward*1.2);if(inc.service==='fire')inc.needs.fire=Math.min(2,(inc.needs.fire||0)+1);inc.deadline+=180;log(g,`${inc.title} agravou-se: prioridade e meios necessários atualizados.`,'alert');}
    const assigned=g.units.filter(u=>u.incident_id===inc.id);
    const onscene=assigned.filter(u=>u.status==='onscene');
    const servicesReady=Object.entries(inc.needs).every(([service,count])=>onscene.filter(u=>u.service===service).length>=count);
    const vehiclesReady=(inc.required_vehicle_types||[]).every(type=>onscene.some(u=>u.vehicle_type===type));
    const personnelReady=onscene.reduce((sum,u)=>sum+(u.crew_assigned||0),0)>=(inc.required_personnel||0);
    const ready=servicesReady&&vehiclesReady&&personnelReady;
    if(ready){inc.status='onscene';const pace=inc.false_alarm?45:(assigned.some(u=>u.advanced)?120:180);inc.progress=Math.min(100,inc.progress+dt*(100/pace));}
    if(inc.progress>=100)resolveIncident(g,inc,true);else if(g.elapsed>=inc.deadline&&!ready)resolveIncident(g,inc,false);
  });
  g.level=1+Math.floor(g.xp/200);
  if(g.elapsed>=g.next_upkeep){const cost=g.units.length*75+g.bases.length*100+g.facilities.length*125;g.money=Math.max(0,g.money-cost);g.expenses+=cost;g.next_upkeep=g.elapsed+300;log(g,`Custos operacionais do turno: -${cost} €.`);}
  refreshProgression(g);
  if(g.elapsed>=g.next_spawn){const cap=g.progression.mission_cap;if(g.incidents.length<cap)spawn(g);if(g.level>=3&&g.incidents.length<Math.max(1,cap-2)&&Math.random()<.28)spawn(g);g.next_spawn=g.elapsed+Math.max(100,210-g.level*8);}
  return refreshProgression(g);
}
export function applyAction(input,kind,data={}){
  let g=clone(input);
  if(kind==='reset')return newGame();
  if(kind==='speed'){requireValue([0,1,2,5].includes(data.speed),'Velocidade inválida.');g.speed=data.speed;}
  else if(kind==='answer'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc&&!inc.call_answered,'Chamada já encerrada.');requireValue(Number.isInteger(data.choice)&&data.choice>=0&&data.choice<3,'Escolha inválida.');const s=SCENARIOS[inc.scenario],correct=data.choice===s.correct;inc.call_answered=true;inc.call_result={correct,feedback:correct?s.feedback:'Orientação insegura. A central corrigiu a indicação. Prioriza a segurança do interlocutor.',xp:correct?25:0};g.xp+=correct?25:0;g.trust=Math.min(100,Math.max(0,g.trust+(correct?1:-3)));inc.deadline+=correct?60:-45;g.level=1+Math.floor(g.xp/200);log(g,`Chamada #${inc.number} triada.${correct?' +25 XP':' Orientação corrigida.'}`,correct?'success':'alert');}
  else if(kind==='dispatch'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc,'Ocorrência já encerrada.');const ids=data.unit_ids||[],units=g.units.filter(u=>ids.includes(u.id));requireValue(ids.length&&units.length===new Set(ids).size,'Seleciona unidades disponíveis.');for(const service of new Set(units.map(u=>u.service))){const allocated=g.units.filter(u=>u.service===service&&u.incident_id===inc.id).length;requireValue(allocated+units.filter(u=>u.service===service).length<=(inc.needs[service]||0),'Envia apenas os meios necessários.');}mobilize(g,inc,units);}
  else if(kind==='dispatch_arr'){
    const inc=g.incidents.find(i=>i.id===data.incident_id),arr=g.arrs.find(item=>item.id===data.arr_id);requireValue(inc&&arr,'Ocorrência ou regulamento inválido.');
    const pool=g.units.filter(unit=>operationalUnit(unit)&&unit.land===inc.land);const chosen=[];
    for(const [service,need] of Object.entries(inc.needs)){const already=g.units.filter(unit=>unit.incident_id===inc.id&&unit.service===service).length;const count=Math.min(Math.max(0,need-already),arr.resources[service]||0);const specific=(inc.required_vehicle_types||[]).map(type=>pool.find(unit=>unit.service===service&&unit.vehicle_type===type&&!chosen.includes(unit))).filter(Boolean);specific.slice(0,count).forEach(unit=>chosen.push(unit));pool.filter(unit=>unit.service===service&&!chosen.includes(unit)).slice(0,Math.max(0,count-specific.length)).forEach(unit=>chosen.push(unit));}
    requireValue(chosen.length,'O RAR não encontrou meios compatíveis disponíveis.');mobilize(g,inc,chosen);
  }
  else if(kind==='buy_vehicle'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const fallback=data.advanced?VEHICLE_CATALOG[base.service]?.[1]?.id:VEHICLE_CATALOG[base.service]?.[0]?.id;
    const definition=vehicleDefinition(base.service,data.vehicle_type||fallback);
    requireValue(definition,'Tipo de veículo inválido.');
    requireValue((base.level||1)>=definition.level,`Melhora a base para o nível ${definition.level}.`);
    if(definition.extension)requireValue((base.extensions||[]).some(ext=>ext.id===definition.extension&&ext.active),`Ativa a extensão ${definition.extension} nesta base.`);
    requireValue(g.units.filter(u=>u.base_id===base.id).length<(base.capacity||2),'Garagem cheia.');
    requireValue(freePersonnel(g,base)>=definition.crew,`Recruta pelo menos ${definition.crew} elementos disponíveis.`);
    if(definition.training)requireValue((base.qualifications?.[definition.training]||0)>=definition.crew,`Forma ${definition.crew} elementos em ${TRAINING_CATALOG.find(course=>course.id===definition.training)?.name||definition.training}.`);
    requireValue(g.money>=definition.price,'Orçamento insuficiente.');
    g.money-=definition.price;g.expenses+=definition.price;addUnit(g,base,definition.id);log(g,`Nova unidade ${definition.name} adquirida para ${base.name}.`,'success');
  }
  else if(kind==='build_base'){
    const service=data.service,site=POINTS[data.site_id];requireValue(SERVICES[service]&&site,'Seleciona um serviço e local válidos.');
    const unlock=site.land!=='mainland'?4:['Porto','Braga','Aveiro'].includes(site.city)?1:3;
    requireValue(g.level>=unlock,`Esta região desbloqueia no nível ${unlock}.`);
    requireValue(!g.bases.some(b=>b.node===site.node&&b.service===service),'Este serviço já tem uma base neste local.');
    const price=nextBuildingCost(g,service,SERVICES[service].base_price);requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;g.bases.push(makeBase(service,site));log(g,`Nova base construída em ${site.name}.`,'success');
  }
  else if(kind==='upgrade_base'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const level=base.level||1;requireValue(level<10,'A base já atingiu o nível máximo.');
    const price=Math.round(2800*Math.pow(level,1.55));requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;base.level=level+1;base.capacity=(base.capacity||2)+1;base.staff_capacity=(base.staff_capacity||14)+5;log(g,`${base.name} melhorada para o nível ${base.level}.`,'success');
  }
  else if(kind==='toggle_extension'){
    const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');
    const definition=EXTENSIONS[base.service]?.find(ext=>ext.id===data.extension_id);requireValue(definition,'Extensão inválida.');
    requireValue((base.level||1)>=definition.level,`Esta extensão requer nível ${definition.level}.`);
    base.extensions=base.extensions||[];const current=base.extensions.find(ext=>ext.id===definition.id);
    if(current){current.active=!current.active;log(g,`${definition.name} ${current.active?'ativada':'desativada'} em ${base.name}.`);}
    else{requireValue(g.money>=definition.cost,'Orçamento insuficiente.');g.money-=definition.cost;g.expenses+=definition.cost;base.extensions.push({id:definition.id,active:true});log(g,`${definition.name} instalada em ${base.name}.`,'success');}
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
    const price=amount*450;requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;base.personnel=(base.personnel||0)+amount;log(g,`${amount} novos elementos recrutados para ${base.name}.`,'success');
  }
  else if(kind==='build_facility'){
    const type=data.type,site=POINTS[data.site_id],definition=FACILITY_CATALOG[type];requireValue(definition&&site,'Seleciona uma instalação e localização válidas.');
    requireValue(!g.facilities.some(facility=>facility.type===type&&facility.node===site.node),'Esta instalação já existe neste local.');
    const price=Math.round(definition.cost*(1+g.facilities.length*.12));requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;g.facilities.push(makeFacility(type,site));log(g,`${definition.name} construída em ${site.name}.`,'success');
  }
  else if(kind==='upgrade_facility'){
    const facility=g.facilities.find(item=>item.id===data.facility_id);requireValue(facility,'Instalação inválida.');const price=3500*(facility.level||1);requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;facility.level=(facility.level||1)+1;facility.capacity+=facility.type==='academy'?5:3;log(g,`${facility.name} ampliada para o nível ${facility.level}.`,'success');
  }
  else if(kind==='transport_patient'){
    const patient=g.patients.find(item=>item.id===data.patient_id&&item.status==='waiting'),hospital=g.facilities.find(item=>item.id===data.facility_id&&item.type==='hospital');requireValue(patient&&hospital,'Vítima ou hospital inválido.');
    requireValue(facilityOccupancy(g,hospital)<hospital.capacity,'Hospital sem camas disponíveis.');const unit=g.units.filter(item=>item.service==='medical'&&operationalUnit(item)&&item.land===hospital.land).sort((a,b)=>distanceMeters(a,POINTS[patient.source_node])-distanceMeters(b,POINTS[patient.source_node]))[0];requireValue(unit,'Sem ambulâncias disponíveis.');
    patient.status='transporting';patient.hospital_id=hospital.id;unit.status='transporting';unit.task_id=patient.id;unit.transport_kind='patient';unit.transport_facility_id=hospital.id;unit.transport_until=g.elapsed+120;log(g,`${unit.name} iniciou transporte para ${hospital.name}.`);
  }
  else if(kind==='transport_prisoner'){
    const prisoner=g.prisoners.find(item=>item.id===data.prisoner_id&&item.status==='waiting'),prison=g.facilities.find(item=>item.id===data.facility_id&&item.type==='prison');requireValue(prisoner&&prison,'Detido ou instalação inválida.');
    requireValue(facilityOccupancy(g,prison)<prison.capacity,'Sem células disponíveis.');const unit=g.units.filter(item=>item.service==='police'&&operationalUnit(item)&&item.land===prison.land)[0];requireValue(unit,'Sem viaturas policiais disponíveis.');
    prisoner.status='transporting';prisoner.prison_id=prison.id;unit.status='transporting';unit.task_id=prisoner.id;unit.transport_kind='prisoner';unit.transport_facility_id=prison.id;unit.transport_until=g.elapsed+100;log(g,`${unit.name} iniciou transporte de detido.`);
  }
  else if(kind==='start_training'){
    const base=g.bases.find(item=>item.id===data.base_id),course=TRAINING_CATALOG.find(item=>item.id===data.course);const count=Math.max(1,Math.min(5,Number(data.count)||1));requireValue(base&&course&&base.service===course.service,'Base ou formação inválida.');
    requireValue(g.facilities.some(facility=>facility.type==='academy'),'Constrói primeiro uma escola de formação.');requireValue(freePersonnel(g,base)>=count,'Não existem elementos livres suficientes.');const price=course.cost*count;requireValue(g.money>=price,'Orçamento insuficiente.');
    g.money-=price;g.expenses+=price;g.trainings.push({id:uid(),base_id:base.id,course:course.id,count,status:'active',started:g.elapsed,completes_at:g.elapsed+course.duration});log(g,`Formação iniciada: ${course.name} · ${count} elemento(s).`);
  }
  else if(kind==='toggle_patrol'){
    const unit=g.units.find(item=>item.id===data.unit_id&&item.service==='police');requireValue(unit&&['available','patrol'].includes(unit.status),'Viatura policial indisponível.');
    const base=g.bases.find(item=>item.id===unit.base_id);if(unit.status==='patrol'){unit.status='available';unit.node=base.node;unit.lng=base.lng;unit.lat=base.lat;log(g,`${unit.name} regressou à esquadra.`);}else{const options=places.filter(point=>point.city===base.city&&point.id!==base.node);const point=options[Math.floor(Math.random()*options.length)]||base;unit.status='patrol';unit.node=point.id;unit.lng=point.lng;unit.lat=point.lat;log(g,`${unit.name} iniciou patrulhamento em ${point.name}.`);}
  }
  else if(kind==='save_arr'){
    const name=String(data.name||'').trim().slice(0,32),resources={fire:Math.max(0,Math.min(9,Number(data.fire)||0)),medical:Math.max(0,Math.min(9,Number(data.medical)||0)),police:Math.max(0,Math.min(9,Number(data.police)||0))};requireValue(name&&Object.values(resources).some(Boolean),'Define um nome e pelo menos um meio.');
    const existing=data.id&&g.arrs.find(item=>item.id===data.id);if(existing){existing.name=name;existing.resources=resources;}else g.arrs.push({id:uid(),name,resources});log(g,`RAR guardado: ${name}.`,'success');
  }
  else if(kind==='delete_arr'){requireValue(!String(data.arr_id).startsWith('arr-'),'Os RAR base não podem ser eliminados.');g.arrs=g.arrs.filter(item=>item.id!==data.arr_id);}
  else if(kind==='new_incident'){refreshProgression(g);requireValue(g.incidents.length<g.progression.mission_cap,`Limite de ${g.progression.mission_cap} ocorrências ativas atingido.`);spawn(g);}
  else if(kind!=='save')throw new Error('Ação desconhecida.');
  refreshProgression(g);g.saved_at=new Date().toISOString();return g;
}
export function loadLocalGame(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(saved?.mode?.startsWith('portugal-offline')){
      const fresh=newGame();
      const merged={...fresh,...saved,mode:'portugal-offline-v4',expenses:saved.expenses||0,next_upkeep:saved.next_upkeep||saved.elapsed+300,conditions:saved.conditions||freshConditions(saved.elapsed||0),facilities:saved.facilities||[],patients:saved.patients||[],prisoners:saved.prisoners||[],trainings:saved.trainings||[],arrs:saved.arrs?.length?saved.arrs:clone(DEFAULT_ARRS)};
      merged.bases=(saved.bases||fresh.bases).map(base=>{const count=(saved.units||fresh.units).filter(unit=>unit.base_id===base.id).length;return {level:1,capacity:Math.max(2,count),staff_capacity:14,personnel:base.service==='fire'?10:6,extensions:[],specialization:'general',qualifications:{},...base};});
      merged.units=(saved.units||fresh.units).map(unit=>{const definition=vehicleDefinition(unit.service,unit.vehicle_type||(unit.advanced?VEHICLE_CATALOG[unit.service]?.[1]?.id:null));return {condition:100,fatigue:0,repair_until:0,rest_until:0,vehicle_type:definition.id,crew_required:definition.crew,crew_assigned:definition.crew,...unit};});
      merged.incidents=(saved.incidents||[]).map(incident=>({escalated:false,false_alarm:false,difficulty:{1:'Difícil',2:'Média',3:'Fácil'}[incident.priority]||'Média',casualties:0,detainees:0,required_vehicle_types:[],required_personnel:Object.values(incident.needs||{}).reduce((sum,n)=>sum+n*2,0),...incident}));
      return refreshProgression(merged);
    }
  }catch{}
  return newGame();
}
export function saveLocalGame(game){const saved={...game,saved_at:new Date().toISOString()};localStorage.setItem(SAVE_KEY,JSON.stringify(saved));return saved;}
