const SAVE_KEY = 'nexo112-offline-save-v1';

const SERVICES = {
  fire: { name: 'Bombeiros', vehicle: 'Veículo de combate a incêndios', short: 'VFCI', price: 5000, base_price: 10000 },
  medical: { name: 'Emergência médica', vehicle: 'Ambulância de socorro', short: 'ABSC', price: 4000, base_price: 8000 },
  police: { name: 'Polícia', vehicle: 'Carro-patrulha', short: 'PSP', price: 3000, base_price: 8000 },
};

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
];

export const WORLD = {
  mode:'portugal-offline-v1', name:'Portugal', center:[-8.616,41.156], zoom:13.1,
  map_style:'https://tiles.openfreemap.org/styles/liberty',
  services:SERVICES, sites:siteIds.map(id => ({...POINTS[id], unlock_level: POINTS[id].land !== 'mainland' ? 4 : ['Porto','Braga','Aveiro'].includes(POINTS[id].city) ? 1 : 3})),
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
const makeBase=(service,point)=>({...point,id:uid(),service,node:point.id,name:`${SERVICES[service].name} · ${point.name}`});
const addUnit=(g,base,advanced=false)=>{
  const number=1+g.units.filter(u=>u.service===base.service).length;
  const prefix=advanced&&base.service==='medical'?'VMER':SERVICES[base.service].short+(advanced?'-E':'');
  g.units.push({id:uid(),name:`${prefix}-${String(number).padStart(2,'0')}`,service:base.service,base_id:base.id,node:base.node,lng:base.lng,lat:base.lat,x:base.lng,y:base.lat,land:base.land,status:'available',incident_id:null,route:[],route_times:[],travel:0,travel_total:0,route_distance:0,advanced,condition:100,fatigue:0,repair_until:0,rest_until:0});
};
const spawn=(g,scenarioIndex=null,nodeId=null)=>{
  let point;
  if(nodeId) point=POINTS[nodeId];
  else {
    const cities=[...new Set(g.bases.map(b=>b.city))];
    const city=cities[Math.floor(Math.random()*cities.length)]||'Porto';
    const occupied=new Set(g.incidents.map(i=>i.node));
    const candidates=places.filter(p=>p.city===city&&!occupied.has(p.id));
    point=(candidates.length?candidates:places.filter(p=>p.city===city))[Math.floor(Math.random()*Math.max(1,(candidates.length||places.filter(p=>p.city===city).length)))];
  }
  const coverage=new Set(g.bases.filter(b=>b.city===point.city).map(b=>b.service));
  const possible=SCENARIOS.map((s,i)=>[s,i]).filter(([s])=>Object.keys(s.needs).every(n=>coverage.has(n)));
  const choice=scenarioIndex===null?(possible[Math.floor(Math.random()*possible.length)]?.[1]??4):scenarioIndex;
  const s=SCENARIOS[choice];
  g.incidents.push({...clone(s),id:uid(),number:g.sequence++,scenario:choice,node:point.id,lng:point.lng,lat:point.lat,x:point.lng,y:point.lat,land:point.land,address:point.name,district:point.city,status:'waiting',created:g.elapsed,deadline:g.elapsed+({1:900,2:1200,3:1500}[s.priority]),assigned:[],progress:0,call_answered:false,escalated:false,false_alarm:Math.random()<.08,call:{text:s.caller,choices:s.choices}});
  log(g,`Nova ocorrência em ${point.city}: ${s.title}.`,'alert');
};
export function newGame(){
  const g={id:uid(),mode:'portugal-offline-v2',city:'Porto',money:24500,xp:0,level:1,trust:98,elapsed:0,speed:1,completed:0,failed:0,earned:0,expenses:0,next_spawn:180,next_upkeep:300,sequence:101,incidents:[],units:[],bases:[],logs:[],history:[],conditions:freshConditions(0),saved_at:new Date().toISOString()};
  [['fire','porto-boavista'],['medical','porto-asprela'],['police','porto-bonfim']].forEach(([service,key])=>{const base=makeBase(service,POINTS[key]);g.bases.push(base);addUnit(g,base);addUnit(g,base);});
  spawn(g,0,'porto-aliados'); spawn(g,1,'porto-trindade'); spawn(g,2,'porto-batalha');
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
const resolveIncident=(g,incident,success)=>{
  const trustFactor=.8+g.trust/500;
  const payout=success?(incident.false_alarm?Math.round(incident.reward*.25):Math.round(incident.reward*trustFactor)):0;
  log(g,`${incident.title} — ${success?(incident.false_alarm?'falso alarme confirmado.':'resolvida.'):'prazo de resposta excedido.'}`,success?'success':'alert');
  g.history.unshift({id:incident.id,title:incident.title,service:incident.service,success,reward:payout,time:g.elapsed});g.history=g.history.slice(0,100);
  g.units.filter(u=>u.incident_id===incident.id).forEach(u=>{u.fatigue=Math.min(100,(u.fatigue||0)+24);u.condition=Math.max(10,(u.condition||100)-6);returnToBase(g,u);});
  if(success){g.money+=payout;g.earned+=payout;g.xp+=incident.false_alarm?20:incident.xp;g.completed++;g.trust=Math.min(100,g.trust+(incident.false_alarm?0:1));}
  else{const penalty=Math.min(g.money,Math.round(incident.reward*.08));g.money-=penalty;g.expenses+=penalty;g.failed++;g.trust=Math.max(0,g.trust-6);}
  g.incidents=g.incidents.filter(i=>i.id!==incident.id);
};
export function tickGame(input,seconds){
  const g=clone(input), dt=seconds*g.speed;if(!dt)return g;g.elapsed+=dt;
  if(g.elapsed-(g.conditions?.updated_at||0)>=180){g.conditions=freshConditions(g.elapsed);log(g,`Condições atualizadas: ${g.conditions.weather_label.toLowerCase()}, ${g.conditions.traffic_label.toLowerCase()}${g.conditions.roadworks?' e obras na rede viária':''}.`);}
  g.units.forEach(u=>{
    if(u.status==='broken'&&g.elapsed>=u.repair_until){const base=g.bases.find(b=>b.id===u.base_id);u.status='available';u.node=base.node;u.lng=base.lng;u.lat=base.lat;u.condition=75;log(g,`${u.name} reparada e novamente disponível.`,'success');return;}
    if(u.status==='resting'&&g.elapsed>=u.rest_until){u.status='available';u.fatigue=0;log(g,`Tripulação da ${u.name} terminou o descanso.`);return;}
    if(!['enroute','returning'].includes(u.status))return;
    u.travel=Math.min(u.travel_total,u.travel+dt);locate(u);
    if(u.status==='enroute'&&(u.condition||100)<45&&Math.random()<dt/900){u.status='broken';u.repair_until=g.elapsed+120;u.incident_id=null;u.route=[];u.route_times=[];const cost=450;g.money=Math.max(0,g.money-cost);g.expenses+=cost;log(g,`Avaria na ${u.name}. Reparação iniciada (-${cost} €).`,'alert');return;}
    if(u.travel<u.travel_total)return;u.node=u.destination;
    if(u.status==='returning'){if((u.fatigue||0)>=70){u.status='resting';u.rest_until=g.elapsed+90;}else u.status='available';u.incident_id=null;u.route=[];u.route_times=[];}
    else{u.status='onscene';log(g,`${u.name} no local da ocorrência.`);}
  });
  [...g.incidents].forEach(inc=>{
    const escalationAt=inc.created+(inc.deadline-inc.created)*.55;
    if(!inc.escalated&&g.elapsed>=escalationAt&&inc.status==='waiting'){inc.escalated=true;inc.priority=Math.max(1,inc.priority-1);inc.reward=Math.round(inc.reward*1.2);if(inc.service==='fire')inc.needs.fire=Math.min(2,(inc.needs.fire||0)+1);inc.deadline+=180;log(g,`${inc.title} agravou-se: prioridade e meios necessários atualizados.`,'alert');}
    const assigned=g.units.filter(u=>u.incident_id===inc.id),ready=Object.entries(inc.needs).every(([service,count])=>assigned.filter(u=>u.service===service&&u.status==='onscene').length>=count);
    if(ready){inc.status='onscene';const pace=inc.false_alarm?45:(assigned.some(u=>u.advanced)?120:180);inc.progress=Math.min(100,inc.progress+dt*(100/pace));}
    if(inc.progress>=100)resolveIncident(g,inc,true);else if(g.elapsed>=inc.deadline&&!ready)resolveIncident(g,inc,false);
  });
  g.level=1+Math.floor(g.xp/200);
  if(g.elapsed>=g.next_upkeep){const cost=g.units.length*75+g.bases.length*100;g.money=Math.max(0,g.money-cost);g.expenses+=cost;g.next_upkeep=g.elapsed+300;log(g,`Custos operacionais do turno: -${cost} €.`);}
  if(g.elapsed>=g.next_spawn){if(g.incidents.length<7)spawn(g);if(g.level>=3&&g.incidents.length<5&&Math.random()<.28)spawn(g);g.next_spawn=g.elapsed+Math.max(100,210-g.level*8);}
  return g;
}
export function applyAction(input,kind,data={}){
  let g=clone(input);
  if(kind==='reset')return newGame();
  if(kind==='speed'){requireValue([0,1,2,5].includes(data.speed),'Velocidade inválida.');g.speed=data.speed;}
  else if(kind==='answer'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc&&!inc.call_answered,'Chamada já encerrada.');requireValue(Number.isInteger(data.choice)&&data.choice>=0&&data.choice<3,'Escolha inválida.');const s=SCENARIOS[inc.scenario],correct=data.choice===s.correct;inc.call_answered=true;inc.call_result={correct,feedback:correct?s.feedback:'Orientação insegura. A central corrigiu a indicação. Prioriza a segurança do interlocutor.',xp:correct?25:0};g.xp+=correct?25:0;g.trust=Math.min(100,Math.max(0,g.trust+(correct?1:-3)));inc.deadline+=correct?60:-45;g.level=1+Math.floor(g.xp/200);log(g,`Chamada #${inc.number} triada.${correct?' +25 XP':' Orientação corrigida.'}`,correct?'success':'alert');}
  else if(kind==='dispatch'){const inc=g.incidents.find(i=>i.id===data.incident_id);requireValue(inc,'Ocorrência já encerrada.');const ids=data.unit_ids||[],units=g.units.filter(u=>ids.includes(u.id));requireValue(ids.length&&units.length===new Set(ids).size&&units.every(u=>u.status==='available'),'Seleciona unidades disponíveis.');for(const service of new Set(units.map(u=>u.service))){const allocated=g.units.filter(u=>u.service===service&&u.incident_id===inc.id).length;requireValue(allocated+units.filter(u=>u.service===service).length<=(inc.needs[service]||0),'Envia apenas os meios necessários.');}requireValue(units.every(u=>u.land===inc.land),'Sem ligação rodoviária para esta ocorrência.');units.forEach(u=>{const plan=estimateRoute(u.node,inc.node,g.conditions);startRoute(u,plan,'enroute',inc.node);u.incident_id=inc.id;inc.assigned.push(u.id);});inc.status='enroute';inc.deadline=Math.max(inc.deadline,g.elapsed+Math.max(...units.map(u=>u.travel_total))+180);log(g,`${units.length} unidade(s) mobilizada(s). Estimativa local ativa.`);}
  else if(kind==='buy_vehicle'){const base=g.bases.find(b=>b.id===data.base_id);requireValue(base,'Base inválida.');const advanced=data.advanced===true;requireValue(!advanced||g.level>=2,'Unidades especializadas disponíveis no nível 2.');requireValue(g.units.filter(u=>u.base_id===base.id).length<6,'Garagem cheia.');const price=SERVICES[base.service].price*(advanced?2:1);requireValue(g.money>=price,'Orçamento insuficiente.');g.money-=price;addUnit(g,base,advanced);log(g,`Nova unidade adquirida: ${base.name}.`,'success');}
  else if(kind==='build_base'){const service=data.service,site=POINTS[data.site_id];requireValue(SERVICES[service]&&site,'Seleciona um serviço e local válidos.');const unlock=site.land!=='mainland'?4:['Porto','Braga','Aveiro'].includes(site.city)?1:3;requireValue(g.level>=unlock,`Esta região desbloqueia no nível ${unlock}.`);requireValue(!g.bases.some(b=>b.node===site.node&&b.service===service),'Este serviço já tem uma base neste local.');const price=SERVICES[service].base_price;requireValue(g.money>=price,'Orçamento insuficiente.');g.money-=price;g.bases.push(makeBase(service,site));log(g,`Nova base construída em ${site.name}.`,'success');}
  else if(kind==='new_incident'){requireValue(g.incidents.length<7,'Limite de 7 ocorrências ativas atingido.');spawn(g);}
  else if(kind!=='save')throw new Error('Ação desconhecida.');
  g.saved_at=new Date().toISOString();return g;
}
export function loadLocalGame(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY));if(saved?.mode?.startsWith('portugal-offline')){const base=newGame();return {...base,...saved,mode:'portugal-offline-v2',expenses:saved.expenses||0,next_upkeep:saved.next_upkeep||saved.elapsed+300,conditions:saved.conditions||freshConditions(saved.elapsed||0),units:(saved.units||base.units).map(u=>({condition:100,fatigue:0,repair_until:0,rest_until:0,...u})),incidents:(saved.incidents||[]).map(i=>({escalated:false,false_alarm:false,...i}))};}}catch{}return newGame();}
export function saveLocalGame(game){const saved={...game,saved_at:new Date().toISOString()};localStorage.setItem(SAVE_KEY,JSON.stringify(saved));return saved;}
