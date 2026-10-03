import {
  LOGISTICS_STOCKS,
  LOGISTICS_SUPPLIERS,
  ensureLogisticsState,
  logisticsCapacity,
  logisticsPackPrice,
  applyLogisticsAction,
  tickLogistics,
  consumeIncidentLogistics,
} from './logisticsEngine';

const base=(service='fire')=>({id:'base-1',name:'Base teste',service,land:'mainland',level:1,enabled:true});
const gameWithBase=(service='fire')=>{
  const game={money:1000000,level:1,elapsed:0,bases:[base(service)],units:[],supply_orders:[],logistics_metrics:{},complexes:[]};
  ensureLogisticsState(game);
  return game;
};

describe('18-stock logistics system',()=>{
  test('contains exactly 18 unique operational stocks',()=>{
    expect(LOGISTICS_STOCKS).toHaveLength(18);
    expect(new Set(LOGISTICS_STOCKS.map(item=>item.id)).size).toBe(18);
    expect(LOGISTICS_SUPPLIERS.length).toBeGreaterThanOrEqual(3);
  });

  test('every base receives bounded stock and an auto-reorder policy for all 18 items',()=>{
    const game=gameWithBase();
    const b=game.bases[0];
    expect(Object.keys(b.logistics.stock)).toHaveLength(18);
    expect(Object.keys(b.logistics.policy)).toHaveLength(18);
    for(const stock of LOGISTICS_STOCKS){
      expect(b.logistics.stock[stock.id]).toBeGreaterThanOrEqual(0);
      expect(b.logistics.stock[stock.id]).toBeLessThanOrEqual(logisticsCapacity(b,stock.id));
    }
  });

  test('framework, regional and express suppliers change price and lead-time strategy',()=>{
    const framework=logisticsPackPrice('foam','framework',5,'mainland');
    const regional=logisticsPackPrice('foam','regional',5,'mainland');
    const express=logisticsPackPrice('foam','express',5,'mainland');
    expect(framework.total).toBeLessThan(regional.total);
    expect(express.total).toBeGreaterThan(regional.total);
  });

  test('manual procurement spends budget, creates transit and delivers into warehouse',()=>{
    const game=gameWithBase();
    const b=game.bases[0],beforeMoney=game.money,before=b.logistics.stock.fuel;
    expect(applyLogisticsAction(game,'place_supply_order',{base_id:b.id,stock_id:'fuel',packs:1,supplier_id:'regional'})).toBe(true);
    expect(game.money).toBeLessThan(beforeMoney);
    expect(game.supply_orders[0].status).toBe('transit');
    game.elapsed=game.supply_orders[0].arrives_at+1;
    tickLogistics(game);
    expect(game.supply_orders[0].status).toBe('delivered');
    expect(b.logistics.stock.fuel).toBeGreaterThan(before);
  });

  test('automatic reorder reacts to minimum stock but never breaks protected reserve',()=>{
    const game=gameWithBase();
    const b=game.bases[0];
    b.logistics.stock.fuel=0;
    game.next_logistics_check=0;
    tickLogistics(game);
    expect(game.supply_orders.some(order=>order.stock_id==='fuel'&&order.auto)).toBe(true);

    const blocked=gameWithBase();
    blocked.money=250000;
    blocked.bases[0].logistics.stock.fuel=0;
    blocked.next_logistics_check=0;
    tickLogistics(blocked);
    expect(blocked.supply_orders.some(order=>order.stock_id==='fuel')).toBe(false);
  });

  test('incident resolution consumes specialist consumables from the originating base',()=>{
    const game=gameWithBase('medical');
    const b=game.bases[0],before={
      medical:b.logistics.stock.medical,
      medicines:b.logistics.stock.medicines,
      diagnostics:b.logistics.stock.diagnostics,
      ppe:b.logistics.stock.disposable_ppe,
    };
    consumeIncidentLogistics(game,{rarity_level:4,category:'road',casualties:3,detainees:0,false_alarm:false},[
      {base_id:b.id,service:'medical'},
      {base_id:b.id,service:'medical'},
    ]);
    expect(b.logistics.stock.medical).toBeLessThan(before.medical);
    expect(b.logistics.stock.medicines).toBeLessThan(before.medicines);
    expect(b.logistics.stock.diagnostics).toBeLessThan(before.diagnostics);
    expect(b.logistics.stock.disposable_ppe).toBeLessThan(before.ppe);
  });

  test('false alarms consume materially fewer fine consumables',()=>{
    const normal=gameWithBase('police'),falseAlarm=gameWithBase('police');
    const n=normal.bases[0],f=falseAlarm.bases[0];
    const beforeN=n.logistics.stock.police,beforeF=f.logistics.stock.police;
    consumeIncidentLogistics(normal,{rarity_level:3,category:'crime',false_alarm:false},[{base_id:n.id,service:'police'}]);
    consumeIncidentLogistics(falseAlarm,{rarity_level:3,category:'crime',false_alarm:true},[{base_id:f.id,service:'police'}]);
    expect(beforeN-n.logistics.stock.police).toBeGreaterThan(beforeF-f.logistics.stock.police);
  });
});
