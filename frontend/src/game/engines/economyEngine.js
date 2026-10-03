import { PORTUGAL_ECONOMY, capitalQuote, weeklyEmployerCost, weeklyBuildingFixedCost } from '../portugalEconomy';

export const ECONOMY = Object.freeze({
  startingCash: PORTUGAL_ECONOMY.startingBudget,
  reserveFloor: PORTUGAL_ECONOMY.reserveFloor,
  fundingInterval: PORTUGAL_ECONOMY.fundingInterval,
});

export const reserveFloor = game => Math.max(
  ECONOMY.reserveFloor,
  PORTUGAL_ECONOMY.reserveFloor + Math.max(0,(game.level||1)-1)*25000
);

const addSupport = (game, amount, reason, log, bucket='public_funding') => {
  const value=Math.max(0,Math.round(amount||0));
  if(!value)return 0;
  game.money=(game.money||0)+value;
  game[bucket]=(game[bucket]||0)+value;
  game.last_public_funding_at=game.elapsed||0;
  if(log)log(game,`Financiamento público: +${value.toLocaleString('pt-PT')} € · ${reason}.`,'success');
  return value;
};

export const ensureReserve = (game, log, reason='reserva operacional') => {
  const floor=reserveFloor(game);
  if((game.money||0)>=floor)return 0;
  return addSupport(game,floor-(game.money||0),reason,log);
};

export const payCost = (game, amount, {label='despesa operacional',log=null,protectReserve=true}={}) => {
  const cost=Math.max(0,Math.round(Number(amount)||0));
  if(!cost)return {cost:0,support:0,ok:true};
  let support=0;
  if(protectReserve){
    const floor=reserveFloor(game);
    const projected=(game.money||0)-cost;
    if(projected<floor)support=addSupport(game,floor-projected,`continuidade de ${label}`,log);
  }
  if((game.money||0)<cost)return {cost,support,ok:false};
  game.money=Math.max(0,(game.money||0)-cost);
  game.expenses=(game.expenses||0)+cost;
  return {cost,support,ok:true};
};

export const payCapitalCost = (game, netAmount, {
  land='mainland',
  kind='equipment',
  label='investimento',
  log=null,
}={}) => {
  const quote=capitalQuote(netAmount,land,kind);
  const floor=reserveFloor(game);
  if((game.money||0)-quote.own<floor)return {...quote,ok:false,required_cash:quote.own+floor};
  game.money=Math.max(0,(game.money||0)-quote.own);
  game.expenses=(game.expenses||0)+quote.own;
  game.capital_investment=(game.capital_investment||0)+quote.total;
  game.capital_grants=(game.capital_grants||0)+quote.grant;
  game.vat_paid=(game.vat_paid||0)+quote.vat;
  if(log)log(
    game,
    `${label}: investimento ${quote.total.toLocaleString('pt-PT')} € · comparticipação pública ${quote.grant.toLocaleString('pt-PT')} € · esforço próprio ${quote.own.toLocaleString('pt-PT')} €.`,
    'success'
  );
  return {...quote,ok:true};
};

export const weeklyFixedCostBreakdown = game => {
  const complexDiscount=(kind,id)=>Math.max(
    0,
    ...(game.complexes||[])
      .filter(complex=>complex.shared_services!==false&&(complex[kind]||[]).includes(id))
      .map(complex=>Math.max(0,Math.min(.35,Number(complex.operating_cost_discount)||0)))
  );

  const salaries=(game.personnel||[]).reduce(
    (sum,person)=>sum+weeklyEmployerCost(person.salary||PORTUGAL_ECONOMY.salaries[person.service]),
    0
  );

  const bases=(game.bases||[])
    .filter(base=>base.enabled!==false)
    .reduce((sum,base)=>sum+weeklyBuildingFixedCost(base.service)*(1-complexDiscount('base_ids',base.id)),0);

  const facilities=(game.facilities||[])
    .filter(facility=>facility.enabled!==false)
    .reduce((sum,facility)=>sum+weeklyBuildingFixedCost(facility.type)*(1-complexDiscount('facility_ids',facility.id)),0);

  const commandCenters=(game.command_centers||[])
    .filter(center=>center.active!==false)
    .reduce(sum=>sum+weeklyBuildingFixedCost('command_center'),0);

  const hemContracts=(game.units||[])
    .filter(unit=>unit.enabled!==false&&unit.vehicle_type==='medical-helicopter')
    .reduce(sum=>sum+PORTUGAL_ECONOMY.hemWeeklyContract,0);

  const insurance=(game.units||[])
    .filter(unit=>unit.enabled!==false&&unit.insurance?.active!==false)
    .reduce((sum,unit)=>{
      const annualRate=unit.insurance?.type==='comprehensive'?.025:unit.insurance?.type==='self-insured'?.003:.012;
      return sum+(unit.purchase_price||0)*annualRate/52;
    },0);

  const rounded={
    salaries:Math.round(salaries),
    bases:Math.round(bases),
    facilities:Math.round(facilities),
    command_centers:Math.round(commandCenters),
    hem_contracts:Math.round(hemContracts),
    insurance:Math.round(insurance),
  };
  return {...rounded,total:Object.values(rounded).reduce((sum,value)=>sum+value,0)};
};

export const chargeWeeklyFixedCosts = (game, billingKey, log=null) => {
  const breakdown=weeklyFixedCostBreakdown(game);
  const result=payCost(game,breakdown.total,{label:'encargos fixos semanais',log});
  game.weekly_fixed_expenses=(game.weekly_fixed_expenses||0)+breakdown.total;
  game.last_weekly_fixed_cost_key=billingKey;
  game.weekly_fixed_cost_history=[
    {
      id:`weekly-${billingKey}`,
      week:billingKey,
      charged_at:game.elapsed||0,
      total:breakdown.total,
      breakdown,
      support:result.support||0,
    },
    ...(game.weekly_fixed_cost_history||[]),
  ].slice(0,104);
  if(log)log(
    game,
    `Encargos fixos semanais · ${billingKey}: -${breakdown.total.toLocaleString('pt-PT')} € · salários ${breakdown.salaries.toLocaleString('pt-PT')} € · instalações ${(breakdown.bases+breakdown.facilities+breakdown.command_centers).toLocaleString('pt-PT')} € · contratos ${breakdown.hem_contracts.toLocaleString('pt-PT')} €.`,
    'info'
  );
  return breakdown;
};

export const publicFundingAmount = game => {
  const operationalBases=(game.bases||[]).filter(base=>base.enabled!==false).length;
  const facilities=(game.facilities||[]).filter(facility=>facility.enabled!==false).length;
  const commands=(game.command_centers||[]).filter(center=>center.active!==false).length;
  const personnel=(game.personnel||[]).length;
  const trustFactor=.90+Math.max(0,Math.min(100,game.trust||0))/500;
  const reputationFactor=1+Math.min(.20,Math.max(0,Number(game.reputation)||0)/2500);
  const network=220000+operationalBases*70000+facilities*55000+Math.max(0,commands-1)*100000+personnel*2500;
  return Math.round(network*trustFactor*reputationFactor);
};

export const applyPeriodicFunding = (game, log) => {
  const next=game.next_public_funding??ECONOMY.fundingInterval;
  if((game.elapsed||0)<next)return 0;
  const amount=publicFundingAmount(game);
  addSupport(game,amount,'dotação periódica da rede de emergência',log);
  if((game.operating_debt||0)>0){
    const relief=Math.min(game.operating_debt,Math.max(25000,Math.round(amount*.25)));
    game.operating_debt=Math.max(0,game.operating_debt-relief);
    game.debt_relief=(game.debt_relief||0)+relief;
    if(log)log(game,`Regularização financeira: ${relief.toLocaleString('pt-PT')} € de dívida operacional amortizada.`,'success');
  }
  game.next_public_funding=(game.elapsed||0)+ECONOMY.fundingInterval;
  return amount;
};

const MISSION_COMPENSATION_BANDS = Object.freeze({
  1:{base:900,min:1200,max:4000,payoutMax:5000},
  2:{base:1600,min:2200,max:6500,payoutMax:8000},
  3:{base:2800,min:3500,max:10000,payoutMax:13000},
  4:{base:5000,min:6500,max:18000,payoutMax:24000},
  5:{base:9000,min:12000,max:35000,payoutMax:45000},
  6:{base:16000,min:25000,max:65000,payoutMax:85000},
});

const MISSION_CATEGORY_FACTOR = Object.freeze({
  disaster:1.55,
  hazmat:1.25,
  explosives:1.25,
  weather:1.15,
  multi:1.15,
  water_rescue:1.10,
  public_order:1.10,
  rescue:1.08,
  urban_fire:1.05,
  wildfire:1.05,
  road:1.04,
  medical:1.00,
  crime:1.00,
  traffic:.96,
  police_patrol:.94,
  search:1.00,
  infrastructure:1.05,
});

export const missionCompensationBase = incident => {
  const rarity=Math.max(1,Math.min(6,Number(incident?.rarity_level)||1));
  const band=MISSION_COMPENSATION_BANDS[rarity];
  const needs=Object.values(incident?.needs||{}).reduce((sum,count)=>sum+Math.max(0,Number(count)||0),0);
  const activeServices=Object.values(incident?.needs||{}).filter(count=>(Number(count)||0)>0).length;
  const mandatoryVehicles=new Set([...(incident?.required_vehicle_types||[]),...(incident?.contingency_vehicle_types||[])]).size;
  const mandatoryTrainings=new Set([...(incident?.required_trainings||[]),...(incident?.contingency_trainings||[])]).size;
  const casualties=Math.min(20,Math.max(0,Number(incident?.casualties)||0));
  const detainees=Math.min(20,Math.max(0,Number(incident?.detainees)||0));
  const risk=Math.max(0,Math.min(100,Number(incident?.risk_score)||0));
  const categoryFactor=MISSION_CATEGORY_FACTOR[incident?.category]||1;
  const operational=
    band.base+
    needs*450+
    Math.max(0,activeServices-1)*700+
    mandatoryVehicles*550+
    mandatoryTrainings*300+
    casualties*350+
    detainees*175+
    risk*10;
  const adjusted=operational*categoryFactor;
  return Math.round(Math.max(band.min,Math.min(band.max,adjusted))/50)*50;
};

export const missionCompensationBand = rarity => {
  const level=Math.max(1,Math.min(6,Number(rarity)||1));
  return {...MISSION_COMPENSATION_BANDS[level]};
};

export const missionPayout = (game, incident, basePayout) => {
  const base=Math.max(0,Math.round(basePayout||0));
  const rarity=Math.max(1,Math.min(6,Number(incident?.rarity_level)||1));
  const cap=MISSION_COMPENSATION_BANDS[rarity].payoutMax;
  const triage=incident.call_result?.correct===true?.03:0;
  const coordinated=1+triage;
  return Math.round(Math.min(cap,base*coordinated)/50)*50;
};
