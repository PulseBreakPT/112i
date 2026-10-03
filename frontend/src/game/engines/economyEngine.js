import { PORTUGAL_ECONOMY, capitalQuote } from '../portugalEconomy';

export const ECONOMY = Object.freeze({
  startingCash: PORTUGAL_ECONOMY.startingBudget,
  reserveFloor: PORTUGAL_ECONOMY.reserveFloor,
  fundingInterval: PORTUGAL_ECONOMY.fundingInterval,
  upkeepInterval: PORTUGAL_ECONOMY.upkeepInterval,
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

export const missionPayout = (game, incident, basePayout) => {
  const base=Math.max(0,Math.round(basePayout||0));
  const responseDeadline=incident.response_deadline||incident.deadline||incident.created;
  const responseAt=incident.response_arrived_at||game.elapsed||responseDeadline;
  const window=Math.max(1,responseDeadline-(incident.created||0));
  const speed=Math.max(0,Math.min(1,(responseDeadline-responseAt)/window));
  const triage=incident.call_result?.correct===true?.08:0;
  const performance=1.10+speed*.12+triage;
  return Math.round(base*performance);
};
