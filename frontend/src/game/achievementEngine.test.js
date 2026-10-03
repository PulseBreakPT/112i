import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_TOTAL,
  achievementMetricSnapshot,
  recordAchievementIncident,
  recordAchievementTransport,
  recordAchievementTriage,
  syncAchievements,
} from './achievementEngine';

const baseGame = () => ({
  elapsed:0,
  money:2500000,
  xp:0,
  level:1,
  completed:0,
  earned:0,
  expenses:0,
  public_funding:0,
  debt_relief:0,
  asset_sales:0,
  reputation:0,
  history:[],
  medals:[],
  operations_metrics:{trained:0,transported:0},
  bases:[
    {id:'f',service:'fire',level:1,capacity:2,extensions:[]},
    {id:'m',service:'medical',level:1,capacity:2,extensions:[]},
    {id:'p',service:'police',level:1,capacity:2,extensions:[]},
  ],
  units:Array.from({length:6},(_,index)=>({id:String(index),advanced:false,enabled:true})),
  personnel:Array.from({length:22},(_,index)=>({id:String(index),experience:0})),
  command_centers:[{id:'c',active:true}],
  facilities:[],
  complexes:[],
  cooperation:{contribution:0},
});

describe('1000 achievement system', () => {
  test('catalog contains exactly 1000 unique achievements', () => {
    expect(ACHIEVEMENT_TOTAL).toBe(1000);
    expect(ACHIEVEMENT_CATALOG).toHaveLength(1000);
    expect(new Set(ACHIEVEMENT_CATALOG.map(item=>item.id)).size).toBe(1000);
  });

  test('rarity distribution creates a long-tail progression', () => {
    const counts=ACHIEVEMENT_CATALOG.reduce((out,item)=>({...out,[item.rarity]:(out[item.rarity]||0)+1}),{});
    expect(counts).toEqual({common:250,uncommon:250,rare:200,epic:200,legendary:100});
  });

  test('total rewards remain bounded compared with long-term operational income', () => {
    const money=ACHIEVEMENT_CATALOG.reduce((sum,item)=>sum+item.reward_money,0);
    const xp=ACHIEVEMENT_CATALOG.reduce((sum,item)=>sum+item.reward_xp,0);
    expect(money).toBeGreaterThan(3000000);
    expect(money).toBeLessThan(10000000);
    expect(xp).toBeGreaterThan(15000);
    expect(xp).toBeLessThan(40000);
  });

  test('a fresh career receives no free achievement reward', () => {
    const game=baseGame();
    const unlocked=syncAchievements(game);
    expect(unlocked).toHaveLength(0);
    expect(game.money).toBe(2500000);
    expect(game.xp).toBe(0);
  });

  test('operational events feed the correct permanent metrics', () => {
    const game=baseGame();
    recordAchievementTriage(game,true);
    recordAchievementTransport(game,'patient',2);
    recordAchievementTransport(game,'prisoner',1);
    recordAchievementIncident(game,{service:'fire',category:'urban_fire',rarity_level:4,escalation_stage:0,false_alarm:false},true,{score:98});
    const metrics=achievementMetricSnapshot(game);
    expect(metrics.triage_correct).toBe(1);
    expect(metrics.patients_transported).toBe(2);
    expect(metrics.prisoners_transported).toBe(1);
    expect(metrics.service_fire).toBe(1);
    expect(metrics.category_urban_fire).toBe(1);
    expect(metrics.rarity4plus).toBe(1);
    expect(metrics.performance98).toBe(1);
    expect(metrics.no_escalation).toBe(1);
  });

  test('achievement rewards are applied once and never farmed by repeated syncs', () => {
    const game=baseGame();
    game.completed=1;
    recordAchievementIncident(game,{service:'fire',category:'urban_fire',rarity_level:1,escalation_stage:0,false_alarm:false},true,{score:80});
    const first=syncAchievements(game);
    expect(first.length).toBeGreaterThan(0);
    const afterFirst={money:game.money,xp:game.xp,count:Object.keys(game.achievement_state.unlocked).length};
    const second=syncAchievements(game);
    expect(second).toHaveLength(0);
    expect(game.money).toBe(afterFirst.money);
    expect(game.xp).toBe(afterFirst.xp);
    expect(Object.keys(game.achievement_state.unlocked)).toHaveLength(afterFirst.count);
  });
});
