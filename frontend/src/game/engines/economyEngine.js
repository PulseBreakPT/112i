export const ECONOMY = Object.freeze({
  startingCash: 40000,
  reserveFloor: 5000,
  fundingInterval: 600,
  upkeepInterval: 600,
});

export const reserveFloor = game => Math.max(ECONOMY.reserveFloor, 3500 + (game.level || 1) * 250);

const addSupport = (game, amount, reason, log) => {
  const value=Math.max(0,Math.round(amount||0));
  if(!value)return 0;
  game.money=(game.money||0)+value;
  game.public_funding=(game.public_funding||0)+value;
  game.last_public_funding_at=game.elapsed||0;
  if(log)log(game,`Financiamento público: +${value} € · ${reason}.`,'success');
  return value;
};

export const ensureReserve = (game, log, reason='reserva operacional') => {
  const floor=reserveFloor(game);
  if((game.money||0)>=floor)return 0;
  return addSupport(game,floor-(game.money||0),reason,log);
};

export const payCost = (game, amount, {label='despesa operacional',log=null,protectReserve=true}={}) => {
  const cost=Math.max(0,Math.round(Number(amount)||0));
  if(!cost)return {cost:0,support:0};
  let support=0;
  if(protectReserve){
    const floor=reserveFloor(game);
    const projected=(game.money||0)-cost;
    if(projected<floor)support=addSupport(game,floor-projected,`cofinanciamento de ${label}`,log);
  }
  game.money=Math.max(0,(game.money||0)-cost);
  game.expenses=(game.expenses||0)+cost;
  return {cost,support};
};

export const publicFundingAmount = game => {
  const operationalBases=(game.bases||[]).filter(base=>base.enabled!==false).length;
  const facilities=(game.facilities||[]).filter(facility=>facility.enabled!==false).length;
  const commands=(game.command_centers||[]).filter(center=>center.active!==false).length;
  const trustFactor=.8+Math.max(0,Math.min(100,game.trust||0))/250;
  const reputationFactor=1+Math.min(.15,Math.max(0,Number(game.reputation)||0)/2000);
  const network=1800+operationalBases*180+facilities*140+Math.max(0,commands-1)*300;
  return Math.round(network*trustFactor*reputationFactor);
};

export const applyPeriodicFunding = (game, log) => {
  const next=game.next_public_funding??ECONOMY.fundingInterval;
  if((game.elapsed||0)<next)return 0;
  const amount=publicFundingAmount(game);
  addSupport(game,amount,'dotação periódica da rede de emergência',log);
  if((game.operating_debt||0)>0){
    const relief=Math.min(game.operating_debt,Math.max(500,Math.round(amount*.35)));
    game.operating_debt=Math.max(0,game.operating_debt-relief);
    game.debt_relief=(game.debt_relief||0)+relief;
    if(log)log(game,`Regularização financeira: ${relief} € de dívida operacional amortizada.`,'success');
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
  const performance=1.18+speed*.14+triage;
  return Math.round(base*performance);
};
