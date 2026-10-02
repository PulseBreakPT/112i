const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

export const ACHIEVEMENT_RARITIES = {
  common:{id:'common',label:'Comum',money:100,xp:8},
  uncommon:{id:'uncommon',label:'Incomum',money:225,xp:15},
  rare:{id:'rare',label:'Rara',money:450,xp:30},
  epic:{id:'epic',label:'Épica',money:900,xp:55},
  legendary:{id:'legendary',label:'Lendária',money:1800,xp:100},
};

export const ACHIEVEMENT_GROUPS = {
  operations:'Operações',
  fire:'Bombeiros',
  medical:'INEM',
  police:'Polícia',
  excellence:'Excelência',
  career:'Carreira',
  economy:'Economia',
  network:'Rede',
};

const SCALE = {
  long:[1,3,5,10,20,35,50,75,100,150,225,325,450,600,800,1050,1350,1750,2250,3000],
  medium:[1,2,3,5,8,12,18,25,35,50,70,95,125,165,215,280,365,475,620,800],
  rare:[1,2,3,4,5,7,10,14,20,28,40,55,75,100,135,180,240,320,425,550],
  ultra:[1,2,3,4,5,6,8,10,13,17,22,28,36,46,60,78,100,130,170,220],
  network:[1,2,3,4,5,6,8,10,12,15,18,22,27,33,40,48,58,70,85,100],
  fleet:[1,2,3,4,5,6,8,10,12,15,18,22,27,33,40,48,58,70,85,100],
  people:[5,8,10,12,15,18,22,26,31,37,44,52,61,72,85,100,120,145,175,210],
  reputation:[10,25,50,75,100,150,225,300,400,525,675,850,1050,1300,1600,1950,2350,2800,3300,4000],
  xp:[200,500,1000,2000,3500,5000,7500,10000,15000,22500,32500,45000,60000,80000,105000,135000,175000,225000,300000,400000],
  money:[5000,10000,20000,35000,50000,75000,100000,150000,225000,325000,450000,600000,800000,1000000,1300000,1700000,2200000,2800000,3600000,5000000],
  contribution:[100,500,1000,2500,5000,7500,10000,15000,22500,32500,45000,60000,80000,100000,135000,175000,225000,300000,400000,550000],
  streak:[2,3,4,5,6,8,10,12,15,18,22,27,33,40,50,62,75,90,110,140],
};

const FAMILIES = [
  {id:'operations-total',group:'operations',title:'Central em Movimento',description:'ocorrências resolvidas com sucesso',scale:'long',metric:'completed'},
  {id:'fire-total',group:'fire',title:'Linha Vermelha',description:'ocorrências dos Bombeiros resolvidas',scale:'medium',metric:'service_fire'},
  {id:'medical-total',group:'medical',title:'Cada Segundo Conta',description:'ocorrências do INEM resolvidas',scale:'medium',metric:'service_medical'},
  {id:'police-total',group:'police',title:'Manter a Ordem',description:'ocorrências policiais resolvidas',scale:'medium',metric:'service_police'},
  {id:'urban-fire',group:'fire',title:'Fogo Urbano',description:'incêndios urbanos controlados',scale:'medium',metric:'category_urban_fire'},
  {id:'wildfire',group:'fire',title:'Frente Rural',description:'incêndios rurais ou florestais controlados',scale:'rare',metric:'category_wildfire'},
  {id:'road',group:'operations',title:'Estrada Segura',description:'acidentes rodoviários resolvidos',scale:'medium',metric:'category_road'},
  {id:'rescue',group:'fire',title:'Salvamento Técnico',description:'operações de salvamento concluídas',scale:'rare',metric:'category_rescue'},
  {id:'water-rescue',group:'fire',title:'Linha de Água',description:'salvamentos aquáticos concluídos',scale:'rare',metric:'category_water_rescue'},
  {id:'medical-emergency',group:'medical',title:'Emergência Clínica',description:'emergências médicas resolvidas',scale:'medium',metric:'category_medical'},
  {id:'crime',group:'police',title:'Combate ao Crime',description:'ocorrências criminais resolvidas',scale:'medium',metric:'category_crime'},
  {id:'public-order',group:'police',title:'Ordem Pública',description:'operações de ordem pública concluídas',scale:'rare',metric:'category_public_order'},
  {id:'search',group:'police',title:'Busca e Localização',description:'operações de busca concluídas',scale:'rare',metric:'category_search'},
  {id:'hazmat',group:'fire',title:'Zona Quente',description:'ocorrências de matérias perigosas resolvidas',scale:'rare',metric:'category_hazmat'},
  {id:'explosives',group:'police',title:'Ameaça Neutralizada',description:'ocorrências com explosivos resolvidas',scale:'ultra',metric:'category_explosives'},
  {id:'disaster',group:'operations',title:'Comando de Catástrofe',description:'catástrofes resolvidas',scale:'ultra',metric:'category_disaster'},
  {id:'multi',group:'operations',title:'Resposta Conjunta',description:'operações multiagência concluídas',scale:'ultra',metric:'category_multi'},
  {id:'rarity-four',group:'excellence',title:'Resposta Crítica',description:'ocorrências de raridade 4 ou superior resolvidas',scale:'medium',metric:'rarity4plus'},
  {id:'rarity-five',group:'excellence',title:'Grande Ocorrência',description:'ocorrências de raridade 5 ou superior resolvidas',scale:'rare',metric:'rarity5plus'},
  {id:'rarity-six',group:'excellence',title:'Estado de Catástrofe',description:'ocorrências de raridade 6 resolvidas',scale:'ultra',metric:'rarity6'},
  {id:'performance-90',group:'excellence',title:'Resposta de Elite',description:'operações terminadas com avaliação de 90 ou mais',scale:'medium',metric:'performance90'},
  {id:'performance-98',group:'excellence',title:'Execução Excecional',description:'operações terminadas com avaliação de 98 ou mais',scale:'rare',metric:'performance98'},
  {id:'clean-response',group:'excellence',title:'Sem Agravamento',description:'ocorrências resolvidas sem escalada operacional',scale:'medium',metric:'no_escalation'},
  {id:'triage',group:'medical',title:'Triagem Certa',description:'chamadas triadas corretamente',scale:'medium',metric:'triage_correct'},
  {id:'false-alarm',group:'operations',title:'Verificação Confirmada',description:'falsos alarmes corretamente encerrados',scale:'rare',metric:'false_alarms'},
  {id:'patient-transport',group:'medical',title:'Cadeia de Sobrevivência',description:'vítimas transportadas para unidades de saúde',scale:'medium',metric:'patients_transported'},
  {id:'prisoner-transport',group:'police',title:'Custódia Segura',description:'detidos transportados para instalações prisionais',scale:'medium',metric:'prisoners_transported'},
  {id:'training',group:'career',title:'Doutrina Operacional',description:'elementos que concluíram formação',scale:'medium',metric:'trained'},
  {id:'medals',group:'excellence',title:'Mérito Operacional',description:'medalhas operacionais conquistadas',scale:'ultra',metric:'medals'},
  {id:'streak',group:'excellence',title:'Turno Impecável',description:'maior sequência de ocorrências resolvidas sem falhar',scale:'streak',metric:'best_success_streak'},
  {id:'reputation',group:'career',title:'Reconhecimento Nacional',description:'pontos de reputação acumulados',scale:'reputation',metric:'reputation'},
  {id:'operational-xp',group:'career',title:'Experiência de Comando',description:'XP operacional obtido fora das conquistas',scale:'xp',metric:'operational_xp'},
  {id:'earned',group:'economy',title:'Receita Operacional',description:'euros de receita operacional gerada',scale:'money',metric:'earned',unit:'€'},
  {id:'expenses',group:'economy',title:'Máquina Operacional',description:'euros geridos em despesas operacionais',scale:'money',metric:'expenses',unit:'€'},
  {id:'public-funding',group:'economy',title:'Financiamento da Rede',description:'euros recebidos em financiamento público',scale:'money',metric:'public_funding',unit:'€'},
  {id:'debt-relief',group:'economy',title:'Recuperação Financeira',description:'euros de dívida operacional regularizada',scale:'money',metric:'debt_relief',unit:'€'},
  {id:'asset-sales',group:'economy',title:'Gestão de Património',description:'euros recuperados através de venda de viaturas',scale:'money',metric:'asset_sales',unit:'€'},
  {id:'network-level',group:'network',title:'Rede em Crescimento',description:'níveis acumulados em todas as bases',scale:'network',metric:'network_level'},
  {id:'fire-network',group:'fire',title:'Comando de Bombeiros',description:'níveis acumulados nas bases de Bombeiros',scale:'network',metric:'fire_network'},
  {id:'medical-network',group:'medical',title:'Rede Médica',description:'níveis acumulados nas bases do INEM',scale:'network',metric:'medical_network'},
  {id:'police-network',group:'police',title:'Rede Policial',description:'níveis acumulados nas bases policiais',scale:'network',metric:'police_network'},
  {id:'garage-capacity',group:'network',title:'Capacidade de Frota',description:'lugares de garagem disponíveis na rede',scale:'fleet',metric:'garage_capacity'},
  {id:'advanced-units',group:'network',title:'Frota Especializada',description:'viaturas especializadas em serviço',scale:'fleet',metric:'advanced_units'},
  {id:'personnel',group:'career',title:'Corpo Operacional',description:'elementos ao serviço da rede',scale:'people',metric:'personnel'},
  {id:'personnel-experience',group:'career',title:'Experiência Coletiva',description:'pontos de experiência acumulados pelo efetivo',scale:'xp',metric:'personnel_experience'},
  {id:'command-centers',group:'network',title:'Comando Territorial',description:'Centros de Comando ativos',scale:'network',metric:'command_centers'},
  {id:'facility-capacity',group:'network',title:'Rede de Apoio',description:'capacidade total de hospitais, prisões e escolas',scale:'people',metric:'facility_capacity'},
  {id:'extensions',group:'network',title:'Especialização da Rede',description:'extensões de base ativas',scale:'network',metric:'extensions'},
  {id:'complexes',group:'network',title:'Complexos Operacionais',description:'complexos operacionais criados',scale:'network',metric:'complexes'},
  {id:'cooperation',group:'network',title:'Rede Nacional 112',description:'euros contribuídos para a cooperação nacional',scale:'contribution',metric:'cooperation',unit:'€'},
];

const rarityForIndex = index => index < 5 ? 'common' : index < 10 ? 'uncommon' : index < 14 ? 'rare' : index < 18 ? 'epic' : 'legendary';
const GROUP_REWARD_FACTOR = {operations:1,fire:1,medical:1,police:1,excellence:1.12,career:.72,economy:.45,network:.68};
const roundMoney = value => Math.max(50,Math.round(value/25)*25);
const roundXp = value => Math.max(5,Math.round(value/5)*5);

export const ACHIEVEMENT_CATALOG = FAMILIES.flatMap(family =>
  SCALE[family.scale].map((target,index)=>{
    const rarity=rarityForIndex(index),base=ACHIEVEMENT_RARITIES[rarity],factor=(GROUP_REWARD_FACTOR[family.group]||1)*(1+(index%5)*.08);
    return {
      id:`${family.id}-${String(index+1).padStart(2,'0')}`,
      family:family.id,
      group:family.group,
      title:`${family.title} ${ROMAN[index]}`,
      description:`Atinge ${target.toLocaleString('pt-PT')}${family.unit?' '+family.unit:''} em ${family.description}.`,
      metric:family.metric,
      unit:family.unit||null,
      target,
      step:index+1,
      rarity,
      rarity_label:base.label,
      reward_money:roundMoney(base.money*factor),
      reward_xp:roundXp(base.xp*factor),
    };
  })
);

export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_CATALOG.length;

const emptyMetrics = () => ({
  service_completed:{fire:0,medical:0,police:0},
  category_completed:{},
  rarity4plus:0,
  rarity5plus:0,
  rarity6:0,
  performance90:0,
  performance98:0,
  no_escalation:0,
  triage_correct:0,
  false_alarms:0,
  patients_transported:0,
  prisoners_transported:0,
  current_success_streak:0,
  best_success_streak:0,
});

export function ensureAchievementMetrics(game){
  if(game.achievement_metrics?.version===1)return game.achievement_metrics;
  const metrics=emptyMetrics();
  const history=[...(game.history||[])].reverse();
  history.forEach(item=>{
    if(!item.success){metrics.current_success_streak=0;return;}
    if(metrics.service_completed[item.service]!==undefined)metrics.service_completed[item.service]++;
    if(item.category)metrics.category_completed[item.category]=(metrics.category_completed[item.category]||0)+1;
    const rarity=Number(item.rarity_level)||1;
    if(rarity>=4)metrics.rarity4plus++;
    if(rarity>=5)metrics.rarity5plus++;
    if(rarity>=6)metrics.rarity6++;
    if((item.performance_score||0)>=90)metrics.performance90++;
    if((item.performance_score||0)>=98)metrics.performance98++;
    metrics.current_success_streak++;
    metrics.best_success_streak=Math.max(metrics.best_success_streak,metrics.current_success_streak);
  });
  game.achievement_metrics={version:1,...metrics,...(game.achievement_metrics||{})};
  return game.achievement_metrics;
}

export function recordAchievementIncident(game,incident,success,performance={}){
  const metrics=ensureAchievementMetrics(game);
  if(!success){metrics.current_success_streak=0;return metrics;}
  if(metrics.service_completed[incident.service]!==undefined)metrics.service_completed[incident.service]++;
  const category=incident.category||'multi';
  metrics.category_completed[category]=(metrics.category_completed[category]||0)+1;
  const rarity=Number(incident.rarity_level)||1;
  if(rarity>=4)metrics.rarity4plus++;
  if(rarity>=5)metrics.rarity5plus++;
  if(rarity>=6)metrics.rarity6++;
  if((performance.score||0)>=90)metrics.performance90++;
  if((performance.score||0)>=98)metrics.performance98++;
  if((incident.escalation_stage||0)===0)metrics.no_escalation++;
  if(incident.false_alarm)metrics.false_alarms++;
  metrics.current_success_streak=(metrics.current_success_streak||0)+1;
  metrics.best_success_streak=Math.max(metrics.best_success_streak||0,metrics.current_success_streak);
  return metrics;
}

export function recordAchievementTriage(game,correct){
  if(correct)ensureAchievementMetrics(game).triage_correct++;
}

export function recordAchievementTransport(game,kind,count=1){
  const metrics=ensureAchievementMetrics(game),value=Math.max(0,Number(count)||0);
  if(kind==='patient')metrics.patients_transported+=value;
  if(kind==='prisoner')metrics.prisoners_transported+=value;
}

export function achievementMetricSnapshot(game){
  const m=ensureAchievementMetrics(game);
  const category=id=>m.category_completed?.[id]||0;
  const service=id=>m.service_completed?.[id]||0;
  return {
    completed:game.completed||0,
    service_fire:service('fire'),
    service_medical:service('medical'),
    service_police:service('police'),
    category_urban_fire:category('urban_fire'),
    category_wildfire:category('wildfire'),
    category_road:category('road'),
    category_rescue:category('rescue'),
    category_water_rescue:category('water_rescue'),
    category_medical:category('medical'),
    category_crime:category('crime'),
    category_public_order:category('public_order'),
    category_search:category('search'),
    category_hazmat:category('hazmat'),
    category_explosives:category('explosives'),
    category_disaster:category('disaster'),
    category_multi:category('multi'),
    rarity4plus:m.rarity4plus||0,
    rarity5plus:m.rarity5plus||0,
    rarity6:m.rarity6||0,
    performance90:m.performance90||0,
    performance98:m.performance98||0,
    no_escalation:m.no_escalation||0,
    triage_correct:m.triage_correct||0,
    false_alarms:m.false_alarms||0,
    patients_transported:m.patients_transported||0,
    prisoners_transported:m.prisoners_transported||0,
    trained:game.operations_metrics?.trained||0,
    medals:game.medals?.length||0,
    best_success_streak:m.best_success_streak||0,
    reputation:game.reputation||0,
    operational_xp:Math.max(0,(game.xp||0)-(game.achievement_state?.xp_awarded||0)),
    earned:game.earned||0,
    expenses:game.expenses||0,
    public_funding:game.public_funding||0,
    debt_relief:game.debt_relief||0,
    asset_sales:game.asset_sales||0,
    network_level:(game.bases||[]).reduce((sum,item)=>sum+(item.level||1),0),
    fire_network:(game.bases||[]).filter(item=>item.service==='fire').reduce((sum,item)=>sum+(item.level||1),0),
    medical_network:(game.bases||[]).filter(item=>item.service==='medical').reduce((sum,item)=>sum+(item.level||1),0),
    police_network:(game.bases||[]).filter(item=>item.service==='police').reduce((sum,item)=>sum+(item.level||1),0),
    garage_capacity:(game.bases||[]).reduce((sum,item)=>sum+(item.capacity||0),0),
    advanced_units:(game.units||[]).filter(item=>item.advanced&&item.enabled!==false).length,
    personnel:(game.personnel||[]).length,
    personnel_experience:(game.personnel||[]).reduce((sum,item)=>sum+(item.experience||0),0),
    command_centers:(game.command_centers||[]).filter(item=>item.active!==false).length,
    facility_capacity:(game.facilities||[]).filter(item=>item.enabled!==false).reduce((sum,item)=>sum+(item.capacity||0),0),
    extensions:(game.bases||[]).reduce((sum,item)=>sum+(item.extensions||[]).filter(extension=>extension.active).length,0),
    complexes:(game.complexes||[]).length,
    cooperation:game.cooperation?.contribution||0,
  };
}

export function achievementMetricValue(game,metric,snapshot=null){
  const values=snapshot||achievementMetricSnapshot(game);
  return Math.max(0,Number(values[metric])||0);
}

export function syncAchievements(game){
  ensureAchievementMetrics(game);
  const previous=game.achievement_state||{};
  const unlocked={...(previous.unlocked||{})};
  const newlyUnlocked=[];
  const metricSnapshot=achievementMetricSnapshot(game);
  const snapshotXp=metricSnapshot.operational_xp;

  for(const achievement of ACHIEVEMENT_CATALOG){
    if(unlocked[achievement.id])continue;
    const value=achievement.metric==='operational_xp'?snapshotXp:achievementMetricValue(game,achievement.metric,metricSnapshot);
    if(value<achievement.target)continue;
    unlocked[achievement.id]={unlocked_at:game.elapsed||0};
    newlyUnlocked.push(achievement);
  }

  const moneyAwarded=newlyUnlocked.reduce((sum,item)=>sum+item.reward_money,0);
  const xpAwarded=newlyUnlocked.reduce((sum,item)=>sum+item.reward_xp,0);
  if(moneyAwarded)game.money=(game.money||0)+moneyAwarded;
  if(xpAwarded)game.xp=(game.xp||0)+xpAwarded;

  game.achievement_state={
    version:1,
    unlocked,
    money_awarded:(previous.money_awarded||0)+moneyAwarded,
    xp_awarded:(previous.xp_awarded||0)+xpAwarded,
    recent:newlyUnlocked.slice(-8).map(item=>item.id),
    last_unlock_at:newlyUnlocked.length?(game.elapsed||0):(previous.last_unlock_at||0),
  };
  if(xpAwarded)game.level=1+Math.floor((game.xp||0)/200);
  return newlyUnlocked;
}

export function achievementSummary(game){
  const unlocked=game.achievement_state?.unlocked||{};
  const count=Object.keys(unlocked).filter(id=>ACHIEVEMENT_CATALOG.some(item=>item.id===id)).length;
  return {
    total:ACHIEVEMENT_TOTAL,
    unlocked:count,
    locked:ACHIEVEMENT_TOTAL-count,
    money_awarded:game.achievement_state?.money_awarded||0,
    xp_awarded:game.achievement_state?.xp_awarded||0,
  };
}

export function achievementProgress(game,achievement,snapshot=null){
  const value=achievementMetricValue(game,achievement.metric,snapshot);
  return {value,target:achievement.target,ratio:Math.min(1,value/Math.max(1,achievement.target)),unlocked:!!game.achievement_state?.unlocked?.[achievement.id]};
}
