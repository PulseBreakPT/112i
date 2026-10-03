import {
  missionCompensationBase,
  missionCompensationBand,
  missionPayout,
  weeklyFixedCostBreakdown,
} from './economyEngine';

const incident = overrides => ({
  rarity_level:1,
  category:'medical',
  needs:{medical:1},
  required_vehicle_types:['ambulance'],
  contingency_vehicle_types:[],
  required_trainings:[],
  contingency_trainings:[],
  casualties:0,
  detainees:0,
  risk_score:25,
  created:0,
  response_deadline:900,
  response_arrived_at:300,
  call_result:{correct:true},
  ...overrides,
});

describe('balanced incident compensation', () => {
  test('common incidents stay in a modest operational reimbursement band', () => {
    const value=missionCompensationBase(incident({}));
    const band=missionCompensationBand(1);
    expect(value).toBeGreaterThanOrEqual(band.min);
    expect(value).toBeLessThanOrEqual(band.max);
  });

  test('rarity and multi-agency complexity materially increase compensation', () => {
    const common=missionCompensationBase(incident({}));
    const major=missionCompensationBase(incident({
      rarity_level:5,
      category:'multi',
      needs:{fire:3,medical:2,police:2},
      required_vehicle_types:['fire-engine','command-unit','mass-casualty-unit'],
      required_trainings:['command','triage'],
      casualties:8,
      detainees:2,
      risk_score:88,
    }));
    expect(major).toBeGreaterThan(common*4);
    expect(major).toBeLessThanOrEqual(missionCompensationBand(5).max);
  });

  test('victims and specialist requirements increase compensation without bypassing rarity caps', () => {
    const simple=missionCompensationBase(incident({rarity_level:4,category:'hazmat',risk_score:70}));
    const complex=missionCompensationBase(incident({
      rarity_level:4,
      category:'hazmat',
      needs:{fire:3,medical:1,police:1},
      contingency_vehicle_types:['hazmat-unit','command-unit'],
      contingency_trainings:['hazmat','command'],
      casualties:6,
      risk_score:95,
    }));
    expect(complex).toBeGreaterThan(simple);
    expect(complex).toBeLessThanOrEqual(missionCompensationBand(4).max);
  });

  test('catastrophes can pay substantially more but never finance unlimited growth', () => {
    const catastrophe=missionCompensationBase(incident({
      rarity_level:6,
      category:'disaster',
      needs:{fire:5,medical:5,police:4},
      required_vehicle_types:['command-unit','mass-casualty-unit','heavy-rescue'],
      contingency_vehicle_types:['medical-helicopter','aerial-platform'],
      required_trainings:['command','triage'],
      casualties:20,
      detainees:5,
      risk_score:100,
    }));
    const band=missionCompensationBand(6);
    expect(catastrophe).toBeGreaterThanOrEqual(band.min);
    expect(catastrophe).toBeLessThanOrEqual(band.max);
  });

  test('final payout is capped by rarity even after external bonuses', () => {
    const game={elapsed:300};
    expect(missionPayout(game,incident({rarity_level:1}),999999)).toBeLessThanOrEqual(5000);
    expect(missionPayout(game,incident({rarity_level:6}),999999)).toBeLessThanOrEqual(85000);
  });

  test('correct call triage gives only a small financial bonus', () => {
    const game={elapsed:300};
    const base=4000;
    const correct=missionPayout(game,incident({rarity_level:3,call_result:{correct:true}}),base);
    const incorrect=missionPayout(game,incident({rarity_level:3,call_result:{correct:false}}),base);
    expect(correct).toBeGreaterThan(incorrect);
    expect(correct-incorrect).toBeLessThanOrEqual(200);
  });
});


describe('weekly fixed-cost invoice', () => {
  const fixedGame = () => ({
    personnel:[
      {service:'fire',salary:1542},
      {service:'medical',salary:1341},
      {service:'police',salary:1998},
    ],
    bases:[
      {id:'f',service:'fire',enabled:true},
      {id:'m',service:'medical',enabled:true},
      {id:'p',service:'police',enabled:true},
    ],
    facilities:[],
    command_centers:[{id:'c',active:true}],
    units:[
      {id:'v1',vehicle_type:'fire-engine',enabled:true,wear:0,mileage_km:0},
    ],
    complexes:[],
  });

  test('contains salaries and fixed installations but excludes vehicle wear and mileage', () => {
    const game=fixedGame();
    const before=weeklyFixedCostBreakdown(game);
    game.units[0].wear=99;
    game.units[0].mileage_km=250000;
    const after=weeklyFixedCostBreakdown(game);
    expect(after).toEqual(before);
    expect(after.salaries).toBeGreaterThan(0);
    expect(after.bases).toBeGreaterThan(0);
    expect(after.command_centers).toBeGreaterThan(0);
  });

  test('HEM service is a weekly fixed contract', () => {
    const game=fixedGame();
    const before=weeklyFixedCostBreakdown(game);
    game.units.push({id:'hem',vehicle_type:'medical-helicopter',enabled:true});
    const after=weeklyFixedCostBreakdown(game);
    expect(after.hem_contracts).toBeGreaterThan(0);
    expect(after.total-before.total).toBe(after.hem_contracts);
  });
});


test('fleet insurance is weekly fixed while wear and mileage stay variable',()=>{
  const game={
    personnel:[],bases:[],facilities:[],command_centers:[],complexes:[],
    units:[{id:'u',enabled:true,vehicle_type:'patrol',purchase_price:38000,insurance:{active:true,type:'public-fleet'},wear:5,mileage_km:1000}],
  };
  const first=weeklyFixedCostBreakdown(game);
  game.units[0].wear=95;game.units[0].mileage_km=250000;
  const second=weeklyFixedCostBreakdown(game);
  expect(first.insurance).toBeGreaterThan(0);
  expect(second.insurance).toBe(first.insurance);
  expect(second.total).toBe(first.total);
});
