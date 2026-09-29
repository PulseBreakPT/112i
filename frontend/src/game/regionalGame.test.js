import { applyAction, newGame, tickGame } from './localGame';
import { eligibleMissions, progressionSnapshot } from './progression';

test('new careers start with one command center and all resources assigned to it', () => {
  const game = newGame();
  const center = game.command_centers[0];
  expect(center.name).toContain('Porto');
  expect(game.active_command_center_id).toBe(center.id);
  expect(game.bases.every(base => base.command_center_id === center.id)).toBe(true);
  expect(game.incidents.every(incident => incident.command_center_id === center.id)).toBe(true);
});

test('mission unlocks are isolated between command centers', () => {
  let game = newGame();
  game.money = 100000;
  game.level = 4;
  game = applyAction(game,'create_command_center',{name:'Comando do Algarve',site_id:'faro',radius_km:45});
  const faro = game.command_centers.find(center => center.city === 'Faro');
  game = applyAction(game,'build_base',{service:'medical',site_id:'faro',command_center_id:faro.id});
  expect(game.bases.find(base => base.node === 'faro').operational_at).toBeGreaterThan(game.elapsed);
  game = tickGame(game,181);
  const snapshot = progressionSnapshot(game,{
    fire:{base_price:10000},medical:{base_price:8000},police:{base_price:8000},
  });
  expect(snapshot.command_centers[faro.id].building_counts).toEqual({medical:1});
  expect(snapshot.command_centers[faro.id].unlocked_missions.length).toBeLessThan(snapshot.unlocked_missions.length);
});

test('planned missions start at their scheduled time', () => {
  let game = newGame();
  const center = game.command_centers[0];
  game = applyAction(game,'create_planned_mission',{title:'Jogo de teste',scenario:5,delay:60,site_id:'porto-aliados',command_center_id:center.id});
  const planned = game.planned_missions[0];
  expect(planned.status).toBe('scheduled');
  game = tickGame(game,61);
  expect(game.planned_missions[0].status).toBe('active');
  expect(game.incidents.some(incident => incident.planned_mission_id === planned.id)).toBe(true);
});

test('units can deploy to a staging area and become staged', () => {
  let game = newGame();
  const center = game.command_centers[0];
  game = applyAction(game,'create_staging_area',{name:'ZC Teste',site_id:'porto-aliados',command_center_id:center.id});
  const staging = game.staging_areas[0],unit = game.units[0];
  const route={coordinates:[[unit.lng,unit.lat],[staging.lng,staging.lat]],times:[0,10],duration:10,distance:500};
  game = applyAction(game,'deploy_to_staging',{staging_id:staging.id,unit_id:unit.id,route});
  game = tickGame(game,11);
  expect(game.units.find(item=>item.id===unit.id).status).toBe('staged');
});

test('player POIs belong to one area and affect only its mission pool', () => {
  let game = newGame();
  const center = game.command_centers[0];
  game = applyAction(game,'create_player_poi',{name:'Refinaria de teste',type:'industrial',site_id:'porto-campanha',command_center_id:center.id});
  expect(game.player_pois).toHaveLength(1);
  expect(game.player_pois[0].command_center_id).toBe(center.id);
  expect(eligibleMissions(game,center.id).length).toBeGreaterThan(0);
});

test('personnel are individual, assigned to vehicles and can be recruited or dismissed', () => {
  let game = newGame();
  expect(game.personnel).toHaveLength(22);
  expect(game.units.every(unit => unit.personnel_ids.length === unit.crew_assigned)).toBe(true);
  const base = game.bases.find(item => item.service === 'medical');
  const before = game.personnel.length;
  game.money = 100000;
  game = applyAction(game,'recruit_personnel',{base_id:base.id,amount:2});
  expect(game.personnel).toHaveLength(before+2);
  const free = game.personnel.find(person => person.base_id === base.id && !person.unit_id && person.status === 'available');
  game = applyAction(game,'dismiss_personnel',{person_id:free.id});
  expect(game.personnel).toHaveLength(before+1);
});

test('extra personnel increase operational resolution speed', () => {
  const normal = newGame();
  const incident = normal.incidents[0];
  const units = ['fire','medical'].map(service => normal.units.find(unit => unit.service === service));
  incident.needs = {fire:1,medical:1};
  incident.required_personnel = units.reduce((sum,unit)=>sum+unit.crew_assigned,0);
  units.forEach(unit => { unit.status='onscene'; unit.incident_id=incident.id; incident.assigned.push(unit.id); });
  const reinforced = JSON.parse(JSON.stringify(normal));
  reinforced.incidents[0].required_personnel = Math.max(1,Math.floor(incident.required_personnel/2));
  const normalTick = tickGame(normal,10);
  const reinforcedTick = tickGame(reinforced,10);
  expect(reinforcedTick.incidents[0].progress).toBeGreaterThan(normalTick.incidents[0].progress);
});
