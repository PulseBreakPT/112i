import { PORTUGAL_ECONOMY } from './portugalEconomy';
import { payCost, reserveFloor } from './engines/economyEngine';

export const LOGISTICS_STOCKS = Object.freeze([
  {id:'fuel',name:'Combustível',group:'Frota',unit:'L',pack:100,unit_price:PORTUGAL_ECONOMY.dieselPerLitre,critical:true,services:['fire','medical','police'],description:'Gasóleo operacional para viaturas terrestres e geradores.'},
  {id:'adblue',name:'AdBlue',group:'Frota',unit:'L',pack:20,unit_price:.95,services:['fire','medical','police'],description:'Redutor SCR para viaturas diesel modernas.'},
  {id:'fire_water',name:'Água de combate',group:'Bombeiros',unit:'L',pack:1000,unit_price:PORTUGAL_ECONOMY.waterPerLitre,critical:true,services:['fire'],description:'Reserva técnica para enchimento e sustentação inicial de meios de incêndio.'},
  {id:'foam',name:'Espuma',group:'Bombeiros',unit:'L',pack:20,unit_price:PORTUGAL_ECONOMY.foamPerLitre,critical:true,services:['fire'],description:'Concentrado de espuma para incêndios urbanos, industriais e hidrocarbonetos.'},
  {id:'breathing_air',name:'Ar respirável',group:'Bombeiros',unit:'carga',pack:1,unit_price:8,critical:true,services:['fire'],description:'Recarga de garrafas de ar comprimido para proteção respiratória.'},
  {id:'hazmat',name:'HazMat',group:'Bombeiros',unit:'kit',pack:1,unit_price:95,services:['fire'],description:'Absorventes, neutralizantes, filtros e consumíveis de descontaminação.'},
  {id:'rescue',name:'Material de resgate',group:'Bombeiros',unit:'kit',pack:1,unit_price:38,services:['fire'],description:'Discos, lâminas, correntes, marcação e consumíveis de salvamento técnico.'},
  {id:'medical_oxygen',name:'Oxigénio medicinal',group:'INEM',unit:'garrafa',pack:1,unit_price:PORTUGAL_ECONOMY.oxygenBottleAverage,critical:true,services:['medical'],description:'Garrafas/cargas equivalentes de oxigénio medicinal para emergência.'},
  {id:'medical',name:'Material médico',group:'INEM',unit:'kit',pack:10,unit_price:12,critical:true,services:['medical'],description:'Seringas, cateteres, soros, pensos e consumíveis clínicos gerais.'},
  {id:'medicines',name:'Medicamentos',group:'INEM',unit:'dose-kit',pack:10,unit_price:18,critical:true,services:['medical'],description:'Lotes operacionais de fármacos de emergência e suporte avançado.'},
  {id:'trauma',name:'Trauma',group:'INEM',unit:'kit',pack:5,unit_price:22,services:['medical'],description:'Hemostáticos, torniquetes, pensos torácicos, talas e imobilização.'},
  {id:'airway',name:'Via aérea',group:'INEM',unit:'kit',pack:5,unit_price:18,services:['medical'],description:'Tubos, dispositivos supraglóticos, filtros e circuitos respiratórios.'},
  {id:'diagnostics',name:'Diagnóstico',group:'INEM',unit:'teste',pack:20,unit_price:6,services:['medical'],description:'Elétrodos, pads, tiras de glicemia e consumíveis de monitorização.'},
  {id:'disposable_ppe',name:'EPI descartável',group:'Proteção',unit:'conjunto',pack:50,unit_price:3.5,critical:true,services:['fire','medical','police'],description:'Luvas, máscaras, batas e proteção de utilização única.'},
  {id:'police',name:'Material policial',group:'PSP',unit:'kit',pack:20,unit_price:5,critical:true,services:['police'],description:'Fita policial, sinalização, lacres e consumíveis de patrulha/custódia.'},
  {id:'forensics',name:'Material forense',group:'PSP',unit:'kit',pack:20,unit_price:8,services:['police'],description:'Sacos de prova, zaragatoas, selos e consumíveis de investigação.'},
  {id:'provisions',name:'Alimentação e água',group:'Logística',unit:'refeição',pack:20,unit_price:11.6,services:['fire','medical','police'],description:'Refeições e hidratação para operações prolongadas.'},
  {id:'general_logistics',name:'Logística geral',group:'Logística',unit:'kit',pack:20,unit_price:4.5,services:['fire','medical','police'],description:'Limpeza, resíduos, embalagem, etiquetagem e apoio operacional.'},
]);

export const LOGISTICS_STOCK_MAP = Object.freeze(Object.fromEntries(LOGISTICS_STOCKS.map(item=>[item.id,item])));

export const LOGISTICS_SUPPLIERS = Object.freeze([
  {id:'framework',name:'Acordo-quadro público',price_factor:.92,lead_seconds:360,reliability:.99,min_order:250,description:'Melhor preço para reposição planeada; entrega mais lenta.'},
  {id:'regional',name:'Distribuidor regional',price_factor:1,lead_seconds:180,reliability:.97,min_order:100,description:'Equilíbrio entre preço e prazo para a operação corrente.'},
  {id:'express',name:'Fornecimento de emergência',price_factor:1.25,lead_seconds:60,reliability:.995,min_order:50,description:'Entrega prioritária para ruturas de stock; custo superior.'},
]);

export const LOGISTICS_SUPPLIER_MAP = Object.freeze(Object.fromEntries(LOGISTICS_SUPPLIERS.map(item=>[item.id,item])));

const serviceCapacityFactor=(stock,service)=>{
  if(stock.services.includes(service))return 1;
  if(['fuel','adblue','disposable_ppe','provisions','general_logistics'].includes(stock.id))return .45;
  return .12;
};

const BASE_CAPACITY = Object.freeze({
  fuel:5000,adblue:400,fire_water:50000,foam:4000,breathing_air:160,hazmat:120,rescue:180,
  medical_oxygen:200,medical:700,medicines:450,trauma:300,airway:250,diagnostics:500,
  disposable_ppe:1000,police:500,forensics:300,provisions:800,general_logistics:800,
});

export const logisticsCapacity = (base,stockId) => {
  const stock=LOGISTICS_STOCK_MAP[stockId];
  if(!stock)return 0;
  const level=Math.max(1,Number(base?.level)||1);
  const factor=serviceCapacityFactor(stock,base?.service||'fire');
  return Math.max(stock.pack,Math.round((BASE_CAPACITY[stockId]||100)*factor*(1+(level-1)*.22)));
};

const initialPercent=stockId=>['fuel','fire_water','medical_oxygen','medical','police','disposable_ppe'].includes(stockId)?.78:.62;

export const logisticsPackPrice = (stockId,supplierId='regional',packs=1,land='mainland') => {
  const stock=LOGISTICS_STOCK_MAP[stockId],supplier=LOGISTICS_SUPPLIER_MAP[supplierId]||LOGISTICS_SUPPLIER_MAP.regional;
  if(!stock)return null;
  const quantity=stock.pack*Math.max(1,Math.floor(Number(packs)||1));
  const raw=quantity*stock.unit_price*supplier.price_factor;
  const bulk=raw>=50000?.90:raw>=10000?.94:raw>=2500?.97:1;
  const island=['madeira','sao-miguel','terceira','azores'].includes(land);
  const transport=raw*(island?.12:.025);
  const subtotal=raw*bulk;
  const total=Math.max(supplier.min_order,Math.round((subtotal+transport)*100)/100);
  return {stock_id:stockId,supplier_id:supplier.id,packs:Math.max(1,Math.floor(Number(packs)||1)),quantity,unit:stock.unit,subtotal:Math.round(subtotal*100)/100,transport:Math.round(transport*100)/100,total,bulk_discount:1-bulk};
};

export const logisticsLeadSeconds = (supplierId,land='mainland') => {
  const supplier=LOGISTICS_SUPPLIER_MAP[supplierId]||LOGISTICS_SUPPLIER_MAP.regional;
  const island=['madeira','sao-miguel','terceira','azores'].includes(land);
  return Math.round(supplier.lead_seconds*(island?1.65:1));
};

export function ensureBaseLogistics(base){
  base.logistics=base.logistics||{};
  base.logistics.stock=base.logistics.stock||{};
  base.logistics.policy=base.logistics.policy||{};
  for(const item of LOGISTICS_STOCKS){
    const capacity=logisticsCapacity(base,item.id);
    if(!Number.isFinite(Number(base.logistics.stock[item.id])))base.logistics.stock[item.id]=Math.round(capacity*initialPercent(item.id));
    else base.logistics.stock[item.id]=Math.max(0,Math.min(capacity,Number(base.logistics.stock[item.id])||0));
    base.logistics.policy[item.id]={
      enabled:item.critical===true,
      min_percent:item.critical?30:20,
      target_percent:item.critical?80:70,
      supplier_id:'framework',
      ...(base.logistics.policy[item.id]||{}),
    };
  }
  base.logistics.auto_reorder=base.logistics.auto_reorder!==false;
  base.logistics.auto_express_critical=base.logistics.auto_express_critical!==false;
  return base.logistics;
}

export function ensureLogisticsState(game){
  game.supply_orders=game.supply_orders||[];
  game.logistics_metrics={ordered:0,delivered:0,auto_orders:0,spent:0,shortages:0,...(game.logistics_metrics||{})};
  game.next_logistics_check=game.next_logistics_check??60;
  (game.bases||[]).forEach(ensureBaseLogistics);
  return game;
}

export const baseStockPercent=(base,stockId)=>{
  ensureBaseLogistics(base);
  const capacity=logisticsCapacity(base,stockId);
  return capacity?Math.max(0,Math.min(100,(base.logistics.stock[stockId]||0)/capacity*100)):0;
};

export const inboundStock=(game,baseId,stockId)=>(game.supply_orders||[])
  .filter(order=>order.base_id===baseId&&order.stock_id===stockId&&['pending','transit'].includes(order.status))
  .reduce((sum,order)=>sum+(order.quantity||0),0);

export function consumeBaseStock(base,stockId,amount){
  ensureBaseLogistics(base);
  const requested=Math.max(0,Number(amount)||0),available=Math.max(0,Number(base.logistics.stock[stockId])||0),used=Math.min(requested,available);
  base.logistics.stock[stockId]=Math.max(0,available-used);
  return {requested,used,shortage:Math.max(0,requested-used)};
}

export const stockKeyForUnitResource=(service,key)=>{
  if(key==='fuel')return 'fuel';
  if(key==='water')return 'fire_water';
  if(key==='foam')return 'foam';
  if(key==='oxygen')return 'medical_oxygen';
  if(key==='medical')return 'medical';
  if(key==='equipment')return service==='police'?'police':'general_logistics';
  return key;
};

export function baseOperationalStockReady(base,service){
  ensureBaseLogistics(base);
  const critical=service==='fire'?['breathing_air','disposable_ppe']:
    service==='medical'?['medical_oxygen','medical','medicines','disposable_ppe']:
    ['police','disposable_ppe'];
  return critical.every(id=>(base.logistics.stock[id]||0)>0);
}

const orderId=()=>`supply-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function createOrder(game,{base,stockId,packs,supplierId,auto=false},log=()=>{}){
  const stock=LOGISTICS_STOCK_MAP[stockId],supplier=LOGISTICS_SUPPLIER_MAP[supplierId]||LOGISTICS_SUPPLIER_MAP.regional;
  if(!stock||!base)throw new Error('Artigo ou base logística inválida.');
  ensureBaseLogistics(base);
  const quote=logisticsPackPrice(stockId,supplier.id,packs,base.land);
  const capacity=logisticsCapacity(base,stockId),current=base.logistics.stock[stockId]||0,inbound=inboundStock(game,base.id,stockId);
  if(current+inbound+quote.quantity>capacity+stock.pack*.01)throw new Error('A encomenda excede a capacidade disponível do armazém.');
  if((game.money||0)-quote.total<reserveFloor(game))throw new Error('Orçamento insuficiente mantendo a reserva operacional.');
  const payment=payCost(game,quote.total,{label:`encomenda logística · ${stock.name}`,log,protectReserve:false});
  if(!payment.ok)throw new Error('Não foi possível processar a encomenda.');
  const lead=logisticsLeadSeconds(supplier.id,base.land);
  const order={id:orderId(),base_id:base.id,stock_id:stockId,supplier_id:supplier.id,packs:quote.packs,quantity:quote.quantity,unit:stock.unit,subtotal:quote.subtotal,transport:quote.transport,total:quote.total,status:'transit',auto,created_at:game.elapsed||0,arrives_at:(game.elapsed||0)+lead};
  game.supply_orders.unshift(order);
  game.logistics_metrics.ordered+=quote.quantity;
  game.logistics_metrics.spent+=quote.total;
  if(auto)game.logistics_metrics.auto_orders++;
  log(game,`Encomenda ${auto?'automática ':''}emitida: ${stock.name} · ${quote.quantity.toLocaleString('pt-PT')} ${stock.unit} · ${quote.total.toLocaleString('pt-PT')} € · ${supplier.name}.`,'success');
  return order;
}

const affordableAutoPacks=(game,base,stockId,desired,supplierId)=>{
  const stock=LOGISTICS_STOCK_MAP[stockId];
  if(!stock)return 0;
  let packs=Math.max(1,Math.ceil(desired/stock.pack));
  const capacity=logisticsCapacity(base,stockId),current=base.logistics.stock[stockId]||0,inbound=inboundStock(game,base.id,stockId);
  packs=Math.min(packs,Math.max(0,Math.floor((capacity-current-inbound)/stock.pack)));
  while(packs>0){
    const quote=logisticsPackPrice(stockId,supplierId,packs,base.land);
    if((game.money||0)-quote.total>=reserveFloor(game))return packs;
    packs--;
  }
  return 0;
};

export function tickLogistics(game,log=()=>{}){
  ensureLogisticsState(game);
  for(const order of game.supply_orders){
    if(order.status!=='transit'||(game.elapsed||0)<order.arrives_at)continue;
    const base=game.bases.find(item=>item.id===order.base_id);
    if(!base){order.status='cancelled';continue;}
    ensureBaseLogistics(base);
    const capacity=logisticsCapacity(base,order.stock_id);
    const before=base.logistics.stock[order.stock_id]||0;
    const received=Math.max(0,Math.min(order.quantity,capacity-before));
    base.logistics.stock[order.stock_id]=before+received;
    order.received=received;order.status='delivered';order.delivered_at=game.elapsed||0;
    game.logistics_metrics.delivered+=received;
    log(game,`Entrega logística concluída em ${base.name}: ${LOGISTICS_STOCK_MAP[order.stock_id]?.name||order.stock_id} +${received.toLocaleString('pt-PT')} ${order.unit}.`,'success');
  }

  if((game.elapsed||0)<(game.next_logistics_check||0))return game;
  game.next_logistics_check=(game.elapsed||0)+60;
  for(const base of (game.bases||[]).filter(item=>item.enabled!==false)){
    ensureBaseLogistics(base);
    if(!base.logistics.auto_reorder)continue;
    for(const item of LOGISTICS_STOCKS){
      const policy=base.logistics.policy[item.id];
      if(!policy?.enabled)continue;
      const capacity=logisticsCapacity(base,item.id),current=base.logistics.stock[item.id]||0,inbound=inboundStock(game,base.id,item.id);
      const effective=current+inbound,threshold=capacity*Math.max(0,Math.min(95,policy.min_percent||0))/100;
      if(effective>threshold)continue;
      const target=capacity*Math.max(policy.min_percent||0,Math.min(100,policy.target_percent||70))/100;
      const desired=Math.max(0,target-effective);
      const criticallyLow=capacity>0&&current/capacity<.12;
      const supplierId=criticallyLow&&base.logistics.auto_express_critical?'express':(policy.supplier_id||'framework');
      const packs=affordableAutoPacks(game,base,item.id,desired,supplierId);
      if(packs>0)createOrder(game,{base,stockId:item.id,packs,supplierId,auto:true},log);
    }
  }
  game.supply_orders=(game.supply_orders||[]).slice(0,250);
  return game;
}

const incidentConsumption=(incident,service,unitCount)=>{
  const rarity=Math.max(1,Math.min(6,Number(incident?.rarity_level)||1)),victims=Math.max(0,Number(incident?.casualties)||0),detainees=Math.max(0,Number(incident?.detainees)||0),category=incident?.category;
  if(service==='fire')return {
    breathing_air:Math.max(.25,unitCount*.3*rarity),
    disposable_ppe:Math.max(.2,unitCount*.25),
    rescue:['road','rescue','water_rescue','disaster'].includes(category)?Math.max(1,rarity*.6):0,
    hazmat:category==='hazmat'?Math.max(1,rarity*.8):0,
    provisions:rarity>=5?unitCount*2:0,
    general_logistics:rarity>=4?unitCount:0,
  };
  if(service==='medical')return {
    medical:Math.max(1,unitCount*2+victims*1.4),
    medicines:Math.max(.5,victims*(rarity>=3?1.1:.45)),
    trauma:['road','rescue','disaster','multi','water_rescue'].includes(category)?Math.max(1,victims*.8):Math.max(0,victims*.2),
    airway:Math.max(0,victims*(rarity>=4?.55:.18)),
    diagnostics:Math.max(1,victims*.9+unitCount),
    disposable_ppe:Math.max(1,unitCount*2+victims),
    provisions:rarity>=5?unitCount*2:0,
    general_logistics:rarity>=4?unitCount:0,
  };
  return {
    police:Math.max(1,unitCount*1.5+detainees*.5),
    forensics:['crime','search','explosives'].includes(category)?Math.max(1,rarity*.6+detainees*.3):0,
    disposable_ppe:Math.max(.5,unitCount*.5),
    provisions:rarity>=5?unitCount*2:0,
    general_logistics:rarity>=4?unitCount:0,
  };
};

export function consumeIncidentLogistics(game,incident,assignedUnits,log=()=>{}){
  ensureLogisticsState(game);
  const usageFactor=incident?.false_alarm?.18:1;
  const byBase=new Map();
  for(const unit of assignedUnits||[]){
    if(!byBase.has(unit.base_id))byBase.set(unit.base_id,[]);
    byBase.get(unit.base_id).push(unit);
  }
  let totalShortage=0;
  for(const [baseId,units] of byBase){
    const base=game.bases.find(item=>item.id===baseId);
    if(!base)continue;
    for(const service of ['fire','medical','police']){
      const serviceUnits=units.filter(unit=>unit.service===service);
      if(!serviceUnits.length)continue;
      const usage=incidentConsumption(incident,service,serviceUnits.length);
      for(const [stockId,amount] of Object.entries(usage)){
        if(amount<=0)continue;
        const result=consumeBaseStock(base,stockId,amount*usageFactor);
        totalShortage+=result.shortage;
      }
    }
  }
  if(totalShortage>0){
    game.logistics_metrics.shortages+=Math.ceil(totalShortage);
    log(game,`A ocorrência consumiu reservas acima do stock disponível em ${Math.ceil(totalShortage)} unidade(s). Revê a logística das bases.`,'alert');
  }
  return totalShortage;
}

export function applyLogisticsAction(game,kind,data={},log=()=>{}){
  ensureLogisticsState(game);
  if(kind==='place_supply_order'){
    const base=game.bases.find(item=>item.id===data.base_id);
    createOrder(game,{base,stockId:data.stock_id,packs:data.packs,supplierId:data.supplier_id||'regional',auto:false},log);
    return true;
  }
  if(kind==='update_supply_policy'){
    const base=game.bases.find(item=>item.id===data.base_id);
    if(!base)throw new Error('Base inválida.');
    ensureBaseLogistics(base);
    if(data.auto_reorder!==undefined)base.logistics.auto_reorder=!!data.auto_reorder;
    if(data.auto_express_critical!==undefined)base.logistics.auto_express_critical=!!data.auto_express_critical;
    if(data.stock_id){
      const policy=base.logistics.policy[data.stock_id];
      if(!policy)throw new Error('Stock inválido.');
      if(data.enabled!==undefined)policy.enabled=!!data.enabled;
      if(data.min_percent!==undefined)policy.min_percent=Math.max(0,Math.min(90,Math.round(Number(data.min_percent)||0)));
      if(data.target_percent!==undefined)policy.target_percent=Math.max(policy.min_percent,Math.min(100,Math.round(Number(data.target_percent)||0)));
      if(data.supplier_id!==undefined&&LOGISTICS_SUPPLIER_MAP[data.supplier_id])policy.supplier_id=data.supplier_id;
    }
    log(game,`Política logística atualizada em ${base.name}.`,'success');
    return true;
  }
  if(kind==='cancel_supply_order'){
    const order=game.supply_orders.find(item=>item.id===data.order_id);
    if(!order||order.status!=='transit')throw new Error('A encomenda já não pode ser cancelada.');
    if((game.elapsed||0)-order.created_at>30)throw new Error('O fornecedor já processou a encomenda.');
    order.status='cancelled';order.cancelled_at=game.elapsed||0;
    const refund=Math.round(order.total*.95);
    game.money=(game.money||0)+refund;
    game.logistics_metrics.spent=Math.max(0,(game.logistics_metrics.spent||0)-refund);
    log(game,`Encomenda cancelada · reembolso ${refund.toLocaleString('pt-PT')} €.`,'success');
    return true;
  }
  return false;
}
