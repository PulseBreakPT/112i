import { PORTUGAL_ECONOMY } from './portugalEconomy';

export const NEW_VEHICLES = {
  fire: [
    { id:'command-unit', name:'VCOT · Comando Tático', level:2, price:PORTUGAL_ECONOMY.vehicles['command-unit'], crew:3, training:'command' },
    { id:'tanker', name:'VTTF · Tanque Tático Florestal', level:2, price:PORTUGAL_ECONOMY.vehicles.tanker, crew:3, extension:'wildfire', training:'wildfire' },
    { id:'light-wildfire', name:'VLCI · Combate Ligeiro', level:2, price:PORTUGAL_ECONOMY.vehicles['light-wildfire'], crew:3, extension:'wildfire', training:'wildfire' },
    { id:'heavy-rescue', name:'VSAT · Salvamento e Desencarceramento', level:3, price:PORTUGAL_ECONOMY.vehicles['heavy-rescue'], crew:5, training:'rescue' },
    { id:'aerial-platform', name:'VE · Plataforma Elevatória', level:3, price:PORTUGAL_ECONOMY.vehicles['aerial-platform'], crew:3, extension:'aerial' },
  ],
  medical: [
    { id:'patient-transport', name:'Ambulância de Transporte', level:1, price:PORTUGAL_ECONOMY.vehicles['patient-transport'], crew:2 },
    { id:'siv', name:'SIV · Suporte Imediato de Vida', level:2, price:PORTUGAL_ECONOMY.vehicles.siv, crew:2, extension:'advanced-care', training:'advanced-care' },
    { id:'medical-motorcycle', name:'MEM · Motociclo de Emergência Médica', level:2, price:PORTUGAL_ECONOMY.vehicles['medical-motorcycle'], crew:1, extension:'advanced-care', training:'advanced-care' },
    { id:'umipe', name:'UMIPE · Intervenção Psicológica', level:3, price:PORTUGAL_ECONOMY.vehicles.umipe, crew:2, training:'psychology' },
    { id:'tip', name:'TIP · Transporte Pediátrico', level:3, price:PORTUGAL_ECONOMY.vehicles.tip, crew:3, training:'pediatric-transport' },
    { id:'medical-helicopter', name:'HEM · Helicóptero de Emergência Médica', level:4, price:PORTUGAL_ECONOMY.vehicles['medical-helicopter'], crew:4, extension:'advanced-care', training:'aeromedical' },
  ],
  police: [
    { id:'traffic-unit', name:'Unidade de Trânsito', level:1, price:PORTUGAL_ECONOMY.vehicles['traffic-unit'], crew:2, training:'traffic' },
    { id:'investigation-unit', name:'Investigação Criminal', level:2, price:PORTUGAL_ECONOMY.vehicles['investigation-unit'], crew:2, training:'investigation' },
    { id:'prisoner-van', name:'Transporte de Detidos', level:2, price:PORTUGAL_ECONOMY.vehicles['prisoner-van'], crew:3, training:'custody' },
    { id:'tactical-unit', name:'Unidade Tática', level:3, price:PORTUGAL_ECONOMY.vehicles['tactical-unit'], crew:6, extension:'public-order', training:'public-order' },
  ],
};

const GROUPS = [
  { difficulty:'Fácil', tier:1, service:'fire', titles:[
    'Contentor de lixo em chamas','Pequeno incêndio numa cozinha','Fumo num quadro elétrico','Árvore caída na estrada',
    'Derrame de combustível ligeiro','Alarme de incêndio residencial','Animal preso num muro','Fogueira descontrolada',
  ]},
  { difficulty:'Fácil', tier:1, service:'medical', titles:[
    'Crise de ansiedade','Entorse na via pública','Febre elevada','Reação alérgica ligeira',
    'Corte com hemorragia controlada','Desidratação num parque','Pessoa com tonturas',
  ]},
  { difficulty:'Fácil', tier:1, service:'police', titles:[
    'Furto numa loja','Discussão entre vizinhos','Veículo mal estacionado','Ruído excessivo noturno',
    'Pessoa suspeita junto a residências','Danos num veículo estacionado','Carteira desaparecida',
  ]},
  { difficulty:'Fácil', tier:1, service:'multi', titles:[
    'Pequena colisão num cruzamento','Queda de estrutura publicitária','Evacuação preventiva de edifício',
  ]},

  { difficulty:'Média', tier:2, service:'fire', titles:[
    'Incêndio numa garagem','Fuga de gás residencial','Acidente com vítima encarcerada','Incêndio numa oficina',
    'Cheia numa cave','Incêndio florestal nascente','Resgate num poço','Fogo num autocarro',
    'Queda de andaime',
  ]},
  { difficulty:'Média', tier:2, service:'medical', titles:[
    'Dor torácica súbita','Acidente doméstico grave','Intoxicação alimentar coletiva','Parto iminente',
    'Acidente desportivo','Queimadura moderada','Pessoa diabética inconsciente',
  ]},
  { difficulty:'Média', tier:2, service:'police', titles:[
    'Assalto com fuga','Perseguição de veículo','Agressão na via pública','Desaparecimento de menor',
    'Condução perigosa','Roubo de automóvel','Suspeito barricado',
  ]},
  { difficulty:'Média', tier:2, service:'multi', titles:[
    'Colisão entre três viaturas','Incêndio num restaurante','Explosão doméstica','Atropelamento numa avenida',
    'Incidente numa escola','Queda de varanda','Fuga de gás num comércio',
  ]},

  { difficulty:'Difícil', tier:3, service:'fire', titles:[
    'Incêndio industrial','Fogo num edifício de seis pisos','Derrame químico numa fábrica','Incêndio florestal em propagação',
    'Explosão num armazém','Resgate aquático noturno','Colapso parcial de habitação',
  ]},
  { difficulty:'Difícil', tier:3, service:'medical', titles:[
    'Paragem cardiorrespiratória múltipla','Acidente com motociclistas','Intoxicação por monóxido de carbono',
    'Emergência pediátrica grave','Queda de grande altura','Surto num lar de idosos',
  ]},
  { difficulty:'Difícil', tier:3, service:'police', titles:[
    'Assalto à mão armada','Sequestro em curso','Motim num estabelecimento','Operação contra tráfico',
    'Ameaça com explosivo','Confronto entre grupos',
  ]},
  { difficulty:'Difícil', tier:3, service:'multi', titles:[
    'Descarrilamento ferroviário','Incêndio num centro comercial','Acidente com matérias perigosas',
    'Explosão numa estação de serviço','Colisão em túnel','Incidente num evento desportivo',
  ]},

  { difficulty:'Extrema', tier:4, service:'fire', titles:[
    'Grande incêndio petroquímico','Incêndio florestal fora de controlo','Colapso de edifício residencial',
    'Explosão num terminal portuário','Incêndio em aeronave','Catástrofe num complexo industrial',
  ]},
  { difficulty:'Extrema', tier:4, service:'medical', titles:[
    'Incidente com dezenas de vítimas','Emergência médica num festival','Colapso sanitário regional',
    'Acidente rodoviário em massa','Evacuação médica de hospital',
  ]},
  { difficulty:'Extrema', tier:4, service:'police', titles:[
    'Ataque coordenado na cidade','Crise com múltiplos reféns','Motim de grande dimensão',
    'Operação tática de alto risco','Fuga coletiva de detidos',
  ]},
  { difficulty:'Extrema', tier:4, service:'multi', titles:[
    'Sismo com colapsos urbanos','Tempestade com vítimas e inundações',
    'Acidente aéreo em zona urbana','Emergência nacional no distrito',
  ]},
];

const VEHICLES = {
  fire: {
    1: [],
    2: ['tanker','heavy-rescue','wildfire-unit'],
    3: ['command-unit','ladder','hazmat-unit','aerial-platform'],
    4: ['command-unit','tanker','heavy-rescue','aerial-platform','hazmat-unit'],
  },
  medical: {
    1: [],
    2: ['patient-transport','siv','medical-motorcycle','vmer'],
    3: ['siv','vmer','umipe','tip','mass-casualty-unit'],
    4: ['medical-helicopter','mass-casualty-unit','vmer'],
  },
  police: {
    1: [],
    2: ['traffic-unit','investigation-unit','prisoner-van','canine-unit'],
    3: ['riot-unit','tactical-unit','canine-unit','investigation-unit'],
    4: ['tactical-unit','riot-unit','prisoner-van'],
  },
  multi: {
    1: [],
    2: ['heavy-rescue','vmer','traffic-unit'],
    3: ['command-unit','mass-casualty-unit','tactical-unit'],
    4: ['aerial-platform','medical-helicopter','tactical-unit'],
  },
};

const EXTENSION_FOR = {
  'wildfire-unit':'wildfire',
  'light-wildfire':'wildfire',
  tanker:'wildfire',
  ladder:'aerial',
  'aerial-platform':'aerial',
  'hazmat-unit':'hazmat',
  vmer:'advanced-care',
  siv:'advanced-care',
  'medical-motorcycle':'advanced-care',
  'medical-helicopter':'advanced-care',
  'mass-casualty-unit':'mass-casualty',
  'canine-unit':'canine',
  'riot-unit':'public-order',
  'tactical-unit':'public-order',
};

const POIS = {
  fire:['industrial','forest','retail','port'],
  medical:['school','retail','hospital'],
  police:['retail','school','forest'],
  multi:['industrial','retail','port','airport'],
};

const CALLS = {
  fire:{
    caller:'Consigo ver fumo e chamas. A situação está a piorar rapidamente.',
    choices:['Afaste-se, avise outras pessoas e aguarde num local seguro.','Aproxime-se para confirmar a origem.','Entre no local para recuperar objetos.'],
    correct:0,
    feedback:'O interlocutor afastou-se e indicou um acesso seguro às equipas.',
  },
  medical:{
    caller:'Há pessoas feridas e não sei se consigo ajudá-las em segurança.',
    choices:['Mantenha a zona segura, verifique a respiração e siga as instruções.','Dê comida e água a todas as vítimas.','Transporte imediatamente as vítimas no seu veículo.'],
    correct:0,
    feedback:'A primeira avaliação foi comunicada e as vítimas permaneceram acompanhadas.',
  },
  police:{
    caller:'Há uma situação perigosa e algumas pessoas estão muito alteradas.',
    choices:['Mantenha distância, procure abrigo e descreva os envolvidos.','Confronte os suspeitos até a polícia chegar.','Siga os envolvidos sem ser visto.'],
    correct:0,
    feedback:'O interlocutor permaneceu protegido e transmitiu uma descrição útil.',
  },
  multi:{
    caller:'O local está caótico. Há fumo, feridos e pessoas a tentar sair.',
    choices:['Afaste-se dos perigos, liberte os acessos e indique o número de vítimas.','Entre novamente para procurar outras pessoas.','Bloqueie a estrada com o seu veículo.'],
    correct:0,
    feedback:'Os acessos ficaram livres e a central recebeu uma estimativa inicial.',
  },
};

const CURATED_PORTUGAL_MISSIONS = [
  { title:'Incêndio rural com vento forte', service:'fire', tier:2, difficulty:'Média', needs:{fire:2,medical:1,police:1}, vehicle:['wildfire-unit','tanker'], extension:['wildfire'], poi:'forest', victims:[0,2], prisoners:[0,0], weight:9, description:'Frente de fogo rural com vento variável, habitações dispersas em risco e acessos estreitos.' },
  { title:'Despiste na EN125 com encarcerado', service:'multi', tier:2, difficulty:'Média', needs:{fire:2,medical:1,police:1}, vehicle:['heavy-rescue','traffic-unit'], poi:'retail', victims:[1,3], prisoners:[0,0], weight:8, description:'Despiste numa via nacional com vítima encarcerada, combustível no piso e trânsito a acumular.' },
  { title:'Queda em obra com ferido grave', service:'medical', tier:2, difficulty:'Média', needs:{medical:2,fire:1}, vehicle:['vmer'], extension:['advanced-care'], poi:'industrial', victims:[1,2], prisoners:[0,0], weight:8, description:'Trabalhador caiu de uma estrutura elevada. Acesso ao local condicionado por materiais de obra.' },
  { title:'Afogamento na praia fluvial', service:'multi', tier:3, difficulty:'Difícil', needs:{fire:2,medical:2,police:1}, vehicle:['vmer','command-unit'], extension:['advanced-care'], poi:'port', victims:[1,3], prisoners:[0,0], weight:5, description:'Pessoa retirada da água em estado crítico, com multidão junto ao acesso principal.' },
  { title:'Violência doméstica com risco ativo', service:'police', tier:2, difficulty:'Média', needs:{police:2,medical:1}, vehicle:['patrol'], poi:'retail', victims:[0,1], prisoners:[1,2], weight:8, description:'Ocorrência sensível em habitação com risco para vítima e equipas. Requer perímetro e transporte de detido.' },
  { title:'Alarme falso em escola', service:'multi', tier:1, difficulty:'Fácil', needs:{fire:1,police:1}, vehicle:[], poi:'school', victims:[0,0], prisoners:[0,0], weight:10, false_alarm_chance:.45, description:'Alarme automático ativado numa escola. É preciso confirmar segurança e repor normalidade.' },
  { title:'Acidente de mota em rotunda', service:'multi', tier:2, difficulty:'Média', needs:{medical:2,police:1,fire:1}, vehicle:['traffic-unit'], poi:'retail', victims:[1,2], prisoners:[0,0], weight:8, description:'Motociclista projetado para a via, com risco de novo acidente e necessidade de gestão de trânsito.' },
  { title:'Incêndio em apartamento com escadas cheias de fumo', service:'fire', tier:3, difficulty:'Difícil', needs:{fire:3,medical:1,police:1}, vehicle:['ladder'], extension:['aerial'], poi:'retail', victims:[1,4], prisoners:[0,0], weight:5, description:'Fumo em caixa de escadas, moradores nas janelas e necessidade de acesso em altura.' },
  { title:'AVC suspeito com défice neurológico', service:'medical', tier:2, difficulty:'Média', needs:{medical:2}, vehicle:['siv'], extension:['advanced-care'], poi:'retail', victims:[1,1], prisoners:[0,0], weight:8, description:'Défice neurológico súbito compatível com AVC. Avaliação diferenciada e transporte prioritário.' },
  { title:'Síndrome coronária aguda', service:'medical', tier:2, difficulty:'Média', needs:{medical:2}, vehicle:['siv'], extension:['advanced-care'], poi:'retail', victims:[1,1], prisoners:[0,0], weight:8, description:'Dor torácica com sinais de gravidade. Necessária monitorização e suporte diferenciado.' },
  { title:'Paragem cardiorrespiratória na via pública', service:'medical', tier:3, difficulty:'Difícil', needs:{medical:3}, vehicle:['vmer','siv'], extension:['advanced-care'], poi:'retail', victims:[1,1], prisoners:[0,0], weight:5, description:'Vítima em paragem cardiorrespiratória. Requer suporte avançado, coordenação e evacuação rápida.' },
  { title:'Emergência obstétrica com complicações', service:'medical', tier:3, difficulty:'Difícil', needs:{medical:3}, vehicle:['siv','vmer'], extension:['advanced-care'], poi:'hospital', victims:[1,2], prisoners:[0,0], weight:4, description:'Emergência obstétrica com sinais de risco materno-fetal e necessidade de cuidados diferenciados.' },
  { title:'Emergência psicológica complexa', service:'multi', tier:2, difficulty:'Média', needs:{medical:1,police:1}, vehicle:['umipe','patrol'], poi:'retail', victims:[0,1], prisoners:[0,0], weight:6, description:'Situação psicológica complexa com necessidade de abordagem especializada e segurança no local.' },
  { title:'Apoio psicológico após evento traumático', service:'medical', tier:2, difficulty:'Média', needs:{medical:1}, vehicle:['umipe'], poi:'retail', victims:[0,2], prisoners:[0,0], weight:5, description:'Intervenção psicológica após um evento traumático com familiares e testemunhas no local.' },
  { title:'Transferência pediátrica crítica inter-hospitalar', service:'medical', tier:3, difficulty:'Difícil', needs:{medical:2}, vehicle:['tip'], poi:'hospital', victims:[1,1], prisoners:[0,0], weight:4, description:'Doente pediátrico crítico necessita de transferência diferenciada entre unidades hospitalares.' },
  { title:'Investigação de cena de crime', service:'police', tier:2, difficulty:'Média', needs:{police:2}, vehicle:['investigation-unit'], poi:'retail', victims:[0,1], prisoners:[0,1], weight:7, description:'Preservação de vestígios, recolha de informação e diligências de investigação no local.' },
  { title:'Incêndio tecnológico em complexo industrial', service:'fire', tier:3, difficulty:'Difícil', needs:{fire:4,medical:2,police:1}, vehicle:['hazmat-unit','fire-engine','command-unit'], extension:['hazmat'], poi:'industrial', victims:[1,5], prisoners:[0,0], weight:4, description:'Incêndio industrial com risco tecnológico, fumos perigosos e necessidade de comando dedicado.' },
  { title:'Frente florestal junto a habitações', service:'fire', tier:3, difficulty:'Difícil', needs:{fire:4,medical:1,police:1}, vehicle:['wildfire-unit','tanker','command-unit'], extension:['wildfire'], poi:'forest', victims:[0,4], prisoners:[0,0], weight:5, description:'Frente ativa aproxima-se de habitações, exigindo ataque, abastecimento de água e coordenação tática.' },
  { title:'Resgate técnico em estrutura colapsada', service:'multi', tier:3, difficulty:'Difícil', needs:{fire:3,medical:2,police:1}, vehicle:['heavy-rescue','command-unit'], poi:'industrial', victims:[1,6], prisoners:[0,0], weight:4, description:'Estrutura parcialmente colapsada com pessoas presas e acesso técnico condicionado.' },
];

const pick = (items,index) => items[index % items.length];
const range = (tier,service,type) => {
  if(type==='victims'){
    if(service==='medical') return [[1,1],[1,3],[2,5],[5,10]][tier-1];
    if(service==='multi') return [[1,2],[2,4],[3,7],[6,12]][tier-1];
    if(service==='fire') return [[0,1],[0,2],[1,4],[3,8]][tier-1];
    return [[0,1],[0,2],[1,3],[2,5]][tier-1];
  }
  if(!['police','multi'].includes(service)) return [0,0];
  return service==='police' ? [[0,1],[1,2],[1,4],[2,6]][tier-1] : [[0,1],[0,2],[1,3],[1,5]][tier-1];
};

const needsFor = (tier,service) => {
  if(service==='fire') return tier===1?{fire:1}:tier===2?{fire:2,medical:1}:tier===3?{fire:3,medical:1,police:1}:{fire:5,medical:2,police:1};
  if(service==='medical') return tier===1?{medical:1}:tier===2?{medical:2}:tier===3?{medical:3,fire:1}:{medical:5,fire:2,police:1};
  if(service==='police') return tier===1?{police:1}:tier===2?{police:2}:tier===3?{police:3,medical:1}:{police:5,medical:2,fire:1};
  return tier===1?{fire:1,medical:1,police:1}:tier===2?{fire:2,medical:2,police:1}:tier===3?{fire:3,medical:3,police:2}:{fire:5,medical:5,police:4};
};

const buildingsFor = (tier,service) => {
  if(service==='multi') return {fire:tier,medical:tier,police:Math.max(1,tier-1)};
  return {[service]:tier,...(tier>=3?{[service==='medical'?'fire':'medical']:1}:{})};
};

let missionIndex=0;
export const NEW_MISSION_DEFINITIONS = [];
export const NEW_SCENARIOS = [];

GROUPS.forEach(group => group.titles.forEach((title,localIndex)=>{
  const {tier,service,difficulty}=group;
  const vehiclePool=VEHICLES[service][tier];
  const requiredVehicle=tier===1?[]:[pick(vehiclePool,localIndex)];
  if(tier===4&&vehiclePool.length>1)requiredVehicle.push(pick(vehiclePool,localIndex+2));
  const extensions=[...new Set(requiredVehicle.map(id=>EXTENSION_FOR[id]).filter(Boolean))];
  const victims=range(tier,service,'victims');
  const prisoners=range(tier,service,'prisoners');
  const needs=needsFor(tier,service);
  const primary=service==='multi'?(title.includes('polícia')?'police':title.includes('médic')?'medical':'fire'):service;
  const reward=[900,2200,5200,9800][tier-1]+localIndex*[110,170,260,420][tier-1];
  const scenario=11+missionIndex++;
  NEW_MISSION_DEFINITIONS.push({
    scenario,name:title,difficulty,tier,min:buildingsFor(tier,service),extension:extensions,vehicle:requiredVehicle,
    poi:pick(POIS[service],localIndex),victims,prisoners,weight:[15,10,6,3][tier-1],
  });
  const call=CALLS[service];
  NEW_SCENARIOS.push({
    title,service:primary,priority:tier>=3?1:tier===2?2:3,needs,reward,xp:[45,90,180,320][tier-1]+localIndex*4,
    description:`${title}. Operação de dificuldade ${difficulty.toLowerCase()}, com coordenação de ${Object.keys(needs).length} serviço(s).`,
    caller:call.caller,choices:call.choices,correct:call.correct,feedback:call.feedback,
  });
}));

CURATED_PORTUGAL_MISSIONS.forEach((mission,localIndex) => {
  const scenario=11+missionIndex++;
  const call=CALLS[mission.service === 'multi' ? 'multi' : mission.service];
  NEW_MISSION_DEFINITIONS.push({
    scenario,
    name:mission.title,
    difficulty:mission.difficulty,
    tier:mission.tier,
    min:buildingsFor(mission.tier,mission.service),
    extension:mission.extension || [...new Set((mission.vehicle||[]).map(id=>EXTENSION_FOR[id]).filter(Boolean))],
    vehicle:mission.vehicle || [],
    poi:mission.poi,
    victims:mission.victims,
    prisoners:mission.prisoners,
    weight:mission.weight,
    false_alarm_chance:mission.false_alarm_chance,
  });
  NEW_SCENARIOS.push({
    title:mission.title,
    service:mission.service === 'multi' ? 'fire' : mission.service,
    priority:mission.tier>=3?1:mission.tier===2?2:3,
    needs:mission.needs,
    reward:[2200,5000,12000,28000][mission.tier-1]+localIndex*100,
    xp:[55,115,230,380][mission.tier-1]+localIndex*5,
    description:mission.description,
    caller:call.caller,
    choices:call.choices,
    correct:call.correct,
    feedback:call.feedback,
  });
});

export const EXPANSION_COUNTS = {
  vehicles:Object.values(NEW_VEHICLES).flat().length,
  missions:NEW_MISSION_DEFINITIONS.length,
};
