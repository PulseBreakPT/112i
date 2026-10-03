import {
  missionCompensationBase,
  missionCompensationBand,
  missionPayout,
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
