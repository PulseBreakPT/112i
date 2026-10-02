import { applyAction, newGame, tickGame, selectRecommendedUnitIds } from './localGame';
import { eligibleMissions, progressionSnapshot, nextBuildingCost } from './progression';

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
  const beforeMoney=game.money;
  game = applyAction(game,'create_planned_mission',{title:'Jogo de teste',scenario:5,delay:300,site_id:'porto-aliados',command_center_id:center.id});
  expect(game.money).toBe(beforeMoney-100);
  const planned = game.planned_missions[0];
  expect(planned.status).toBe('scheduled');
  game = tickGame(game,301);
  expect(game.planned_missions[0].status).toBe('active');
  const incident=game.incidents.find(incident => incident.planned_mission_id === planned.id);
  expect(incident).toBeTruthy();
  expect(incident.player_planned).toBe(true);
});

test('units can deploy to a staging area and become staged', () => {
  let game = newGame();
  const center = game.command_centers[0];
  game = applyAction(game,'create_staging_area',{name:'ZC Teste',site_id:'porto-aliados',command_center_id:center.id});
  const staging = game.staging_areas[0],unit = game.units[0];
  const route={coordinates:[[unit.lng,unit.lat],[staging.lng,staging.lat]],times:[0,10],duration:10,distance:500};
  game = applyAction(game,'deploy_to_staging',{staging_id:staging.id,unit_id:unit.id,route});
  const moving=game.units.find(item=>item.id===unit.id);
  expect(moving.travel_total).toBeGreaterThan(route.duration);
  game = tickGame(game,Math.ceil(moving.travel_total)+1);
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

test('personnel have persistent gameplay attributes and career metadata', () => {
  const game=newGame(),person=game.personnel[0];
  expect(person).toMatchObject({
    level:1,
    rank:'Operacional',
    missions_completed:0,
    successes:0,
    failures:0,
  });
  for(const key of ['morale','health','stress','skill','response_speed','decision_making','teamwork','discipline','endurance','first_aid','emergency_driving','leadership','communication','team_affinity']){
    expect(person[key]).toBeGreaterThanOrEqual(0);
    expect(person[key]).toBeLessThanOrEqual(100);
  }
  expect(person.age).toBeGreaterThanOrEqual(22);
  expect(person.salary).toBeGreaterThan(0);
  expect(person.specialization).toBeTruthy();
  expect(person.trait).toBeTruthy();
});

test('better personnel attributes improve incident resolution speed', () => {
  const base=newGame(),incident=base.incidents[0];
  const units=['fire','medical'].map(service=>base.units.find(unit=>unit.service===service));
  incident.needs={fire:1,medical:1};incident.required_personnel=units.reduce((sum,unit)=>sum+unit.crew_assigned,0);incident.required_vehicle_types=[];incident.required_trainings=[];
  units.forEach(unit=>{unit.status='onscene';unit.incident_id=incident.id;if(!incident.assigned.includes(unit.id))incident.assigned.push(unit.id);});
  const strong=JSON.parse(JSON.stringify(base)),weak=JSON.parse(JSON.stringify(base));
  strong.personnel.forEach(person=>{if(units.some(unit=>unit.personnel_ids.includes(person.id))){person.skill=95;person.decision_making=95;person.teamwork=95;person.discipline=95;person.morale=95;person.health=100;person.stress=0;person.fatigue=0;person.leadership=90;}});
  weak.personnel.forEach(person=>{if(units.some(unit=>unit.personnel_ids.includes(person.id))){person.skill=35;person.decision_making=35;person.teamwork=35;person.discipline=35;person.morale=40;person.health=65;person.stress=70;person.fatigue=65;person.leadership=30;}});
  const strongTick=tickGame(strong,10),weakTick=tickGame(weak,10);
  expect(strongTick.incidents[0].progress).toBeGreaterThan(weakTick.incidents[0].progress);
});

test('resolved incidents advance individual personnel careers and wellbeing', () => {
  let game=newGame();
  const incident=game.incidents[0],unit=game.units.find(item=>item.service==='fire');
  incident.needs={fire:1};incident.required_personnel=unit.crew_assigned;incident.required_vehicle_types=[];incident.required_trainings=[];incident.assigned=[unit.id];incident.progress=99;incident.status='onscene';
  unit.status='onscene';unit.incident_id=incident.id;
  const personId=unit.personnel_ids[0],before=game.personnel.find(person=>person.id===personId),beforeStress=before.stress,beforeExperience=before.experience||0;
  game=tickGame(game,10);
  const after=game.personnel.find(person=>person.id===personId);
  expect(game.incidents.some(item=>item.id===incident.id)).toBe(false);
  expect(after.missions_completed).toBe(1);
  expect(after.successes).toBe(1);
  expect(after.experience).toBeGreaterThan(beforeExperience);
  expect(after.stress).toBeGreaterThan(beforeStress);
  expect(after.level).toBeGreaterThanOrEqual(1);
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

test('progressive recruitment only adds personnel after its completion time', () => {
  let game=newGame();game.money=100000;
  const base=game.bases[0],before=game.personnel.length;
  game=applyAction(game,'queue_recruitment',{base_id:base.id,amount:2});
  expect(game.personnel).toHaveLength(before);
  expect(game.recruitment_queue[0].status).toBe('pending');
  game=tickGame(game,241);
  expect(game.personnel).toHaveLength(before+2);
  expect(game.recruitment_queue[0].status).toBe('completed');
});

test('dispatch policy stores reserve and maximum response distance', () => {
  let game=newGame();
  game=applyAction(game,'update_dispatch_policy',{max_response_km:42,reserve_by_service:{fire:2}});
  expect(game.dispatch_policy.max_response_km).toBe(42);
  expect(game.dispatch_policy.reserve_by_service.fire).toBe(2);
  expect(game.dispatch_policy.reserve_by_service.medical).toBe(1);
});

test('vehicle shifts and consumables are simulated', () => {
  let game=newGame();game.clock_start_hour=2;game.clock_start_day=0;const unit=game.units[0];
  expect(unit.resources.water).toBe(unit.resource_capacity.water);
  expect(unit.resource_capacity.water).toBeGreaterThan(3000);
  game=applyAction(game,'update_advanced_unit',{unit_id:unit.id,shift:{start:0,end:1},max_response_km:25,fixed_crew:true});
  game=tickGame(game,2);
  const changed=game.units.find(item=>item.id===unit.id);
  expect(changed.status).toBe('offshift');
  expect(changed.max_response_km).toBe(25);
  expect(changed.fixed_crew).toBe(true);
});

test('mission-specific ranges are stored by command center', () => {
  let game=newGame();const center=game.command_centers[0];
  game=applyAction(game,'set_mission_range',{command_center_id:center.id,mission_key:'fire',radius_km:18});
  expect(game.command_centers[0].mission_ranges.fire).toBe(18);
});

test('changing the general command radius also updates the default generation radius', () => {
  let game=newGame();const center=game.command_centers[0];
  game=applyAction(game,'update_command_center',{command_center_id:center.id,radius_km:60});
  expect(game.command_centers[0].radius_km).toBe(60);
  expect(game.command_centers[0].mission_ranges.default).toBe(60);
});

test('spawn zones can be created and removed', () => {
  let game=newGame();const center=game.command_centers[0];
  game=applyAction(game,'add_spawn_zone',{command_center_id:center.id,name:'Teste',mission_key:'fire',points:[
    {lng:center.lng-.01,lat:center.lat-.01},{lng:center.lng+.01,lat:center.lat-.01},
    {lng:center.lng+.01,lat:center.lat+.01},{lng:center.lng-.01,lat:center.lat+.01},
  ]});
  expect(game.command_centers[0].spawn_zones).toHaveLength(1);
  const zoneId=game.command_centers[0].spawn_zones[0].id;
  game=applyAction(game,'delete_spawn_zone',{command_center_id:center.id,zone_id:zoneId});
  expect(game.command_centers[0].spawn_zones).toHaveLength(0);
});

test('custom coordinate POIs must belong to their command area', () => {
  let game=newGame();game.money=100000;
  const porto=game.command_centers[0];
  expect(()=>applyAction(game,'create_player_poi',{name:'PDI Faro',type:'stadium',custom:true,lng:-7.93,lat:37.02,city:'Faro',command_center_id:porto.id})).toThrow(/área|região/i);
  game=applyAction(game,'create_command_center',{name:'Comando do Algarve',site_id:'faro',radius_km:45});
  const faro=game.command_centers.find(center=>center.city==='Faro');
  game=applyAction(game,'create_player_poi',{name:'PDI Faro',type:'stadium',custom:true,lng:-7.93,lat:37.02,city:'Faro',command_center_id:faro.id});
  expect(game.player_pois[0]).toMatchObject({name:'PDI Faro',lng:-7.93,lat:37.02,city:'Faro'});
});


test('triage keeps the deadline while alliance sharing adds a bounded response margin', () => {
  let game=newGame();
  const incident=game.incidents[0],deadline=incident.response_deadline;
  game=applyAction(game,'answer',{incident_id:incident.id,choice:0});
  expect(game.incidents.find(item=>item.id===incident.id).response_deadline).toBe(deadline);
  game=applyAction(game,'share_incident_to_alliance',{incident_id:incident.id});
  const shared=game.incidents.find(item=>item.id===incident.id);
  expect(shared.response_deadline).toBeGreaterThan(deadline);
  expect(shared.response_deadline-deadline).toBeGreaterThanOrEqual(60);
  expect(shared.response_deadline-deadline).toBeLessThanOrEqual(180);
});

test('recommended dispatch respects the configured maximum response distance', () => {
  let game=newGame();
  const incident=game.incidents[0];
  game.dispatch_policy.max_response_km=.01;
  game.units.forEach(unit=>{unit.max_response_km=.01;});
  expect(()=>selectRecommendedUnitIds(game,incident.id,'minimum')).toThrow(/raio|disponíveis|compatíveis/i);
});

test('base stock is consumed when an idle vehicle is resupplied', () => {
  let game=newGame();
  const unit=game.units.find(item=>item.service==='fire'),base=game.bases.find(item=>item.id===unit.base_id);
  unit.resources.water=1000;
  const before=base.supply_reserve.water;
  game=tickGame(game,10);
  const afterUnit=game.units.find(item=>item.id===unit.id),afterBase=game.bases.find(item=>item.id===base.id);
  expect(afterUnit.resources.water).toBeGreaterThan(1000);
  expect(afterBase.supply_reserve.water).toBeLessThan(before);
});

test('operating costs are co-financed instead of creating a debt spiral', () => {
  let game=newGame();
  game.money=0;
  game.next_upkeep=game.elapsed;
  game=tickGame(game,1);
  expect(game.operating_debt).toBe(0);
  expect(game.money).toBeGreaterThanOrEqual(5000);
  expect(game.public_funding).toBeGreaterThan(0);
});

test('seeded simulation state advances deterministically', () => {
  const game=newGame();
  const a=JSON.parse(JSON.stringify(game)),b=JSON.parse(JSON.stringify(game));
  const ta=tickGame(a,220),tb=tickGame(b,220);
  expect(ta.rng_state).toBe(tb.rng_state);
  expect(ta.incidents.map(item=>[item.scenario,item.node,item.false_alarm])).toEqual(tb.incidents.map(item=>[item.scenario,item.node,item.false_alarm]));
});


test('weekly trust objective requires continuous time and cannot be claimed immediately', () => {
  let game=newGame();
  game.incidents=[];game.next_spawn=999999;game.next_crisis_wave=999999;
  const task=game.rotating_tasks.weekly.find(item=>item.metric==='trust_hold');
  expect(task).toBeTruthy();
  expect(()=>applyAction(game,'claim_rotating_task',{task_id:task.id})).toThrow(/ainda não concluído/i);
  game=tickGame(game,3599);
  expect(game.rotating_tasks.weekly.find(item=>item.id===task.id).progress_value).toBeLessThan(3600);
  game=tickGame(game,2);
  const before=game.money;
  game=applyAction(game,'claim_rotating_task',{task_id:task.id});
  expect(game.money).toBe(before+task.reward);
});

test('suspended bases no longer provide dispatch capacity', () => {
  let game=newGame();
  const fireBase=game.bases.find(base=>base.service==='fire');
  game=applyAction(game,'toggle_building_generation',{building_id:fireBase.id,enabled:false});
  const incident=game.incidents.find(item=>item.needs.fire);
  expect(()=>selectRecommendedUnitIds(game,incident.id,'minimum')).toThrow(/disponíveis|compatíveis|raio/i);
});

test('vehicle transfers reserve capacity and take time', () => {
  let game=newGame();game.money=100000;
  const center=game.command_centers[0];
  game=applyAction(game,'build_base',{service:'fire',site_id:'porto-campanha',command_center_id:center.id});
  game=tickGame(game,181);
  const target=game.bases.find(base=>base.service==='fire'&&base.node==='porto-campanha'),unit=game.units.find(item=>item.service==='fire');
  const originId=unit.base_id;
  game=applyAction(game,'transfer_unit',{unit_id:unit.id,base_id:target.id});
  expect(game.units.find(item=>item.id===unit.id).status).toBe('base_transfer');
  expect(game.units.find(item=>item.id===unit.id).base_id).toBe(originId);
  game=tickGame(game,1801);
  expect(game.units.find(item=>item.id===unit.id).base_id).toBe(target.id);
});

test('routed vehicle transfers move along the prepared road route and finish at the target base', () => {
  let game=newGame();game.money=100000;
  const center=game.command_centers[0];
  game=applyAction(game,'build_base',{service:'fire',site_id:'porto-campanha',command_center_id:center.id});
  game=tickGame(game,181);
  const target=game.bases.find(base=>base.service==='fire'&&base.node==='porto-campanha');
  const unit=game.units.find(item=>item.service==='fire');
  const origin=game.bases.find(base=>base.id===unit.base_id);
  const route={coordinates:[[origin.lng,origin.lat],[(origin.lng+target.lng)/2,(origin.lat+target.lat)/2],[target.lng,target.lat]],times:[0,60,120],duration:120,distance:2400};
  game=applyAction(game,'transfer_unit',{unit_id:unit.id,base_id:target.id,route});
  let moving=game.units.find(item=>item.id===unit.id);
  expect(moving.status).toBe('base_transfer');
  expect(moving.route).toHaveLength(3);
  expect(moving.travel_total).toBeGreaterThan(route.duration);
  const firstLeg=Math.ceil(moving.travel_total/2);
  game=tickGame(game,firstLeg);
  moving=game.units.find(item=>item.id===unit.id);
  expect(moving.base_id).toBe(origin.id);
  expect(moving.travel).toBeGreaterThan(0);
  game=tickGame(game,Math.ceil(moving.travel_total-moving.travel)+1);
  const arrived=game.units.find(item=>item.id===unit.id);
  expect(arrived.base_id).toBe(target.id);
  expect(arrived.status).toMatch(/available|uncrewed/);
  expect(arrived.route).toHaveLength(0);
});

test('vehicle crew can be removed and assigned individually while the unit is at its base', () => {
  let game=newGame();
  const unit=game.units.find(item=>item.service==='fire');
  const originalPersonId=unit.personnel_ids[0];
  game=applyAction(game,'remove_unit_personnel',{unit_id:unit.id,person_id:originalPersonId});
  let changed=game.units.find(item=>item.id===unit.id);
  let person=game.personnel.find(item=>item.id===originalPersonId);
  expect(changed.personnel_ids).not.toContain(originalPersonId);
  expect(person.unit_id).toBeNull();
  expect(person.status).toBe('available');
  game=applyAction(game,'assign_unit_personnel',{unit_id:unit.id,person_id:originalPersonId});
  changed=game.units.find(item=>item.id===unit.id);
  person=game.personnel.find(item=>item.id===originalPersonId);
  expect(changed.personnel_ids).toContain(originalPersonId);
  expect(person.unit_id).toBe(unit.id);
  expect(person.status).toBe('assigned');
});

test('protected reserve funding is not counted as operational earnings', () => {
  let game=newGame();
  game.money=0;game.next_upkeep=999999;
  const earned=game.earned;
  game=tickGame(game,1);
  expect(game.money).toBeGreaterThanOrEqual(5000);
  expect(game.public_funding).toBeGreaterThan(0);
  expect(game.earned).toBe(earned);
});

test('cooperative academy capacity can support training', () => {
  let game=newGame();
  game.money=100000;game.cooperation.funds=10000;
  game=applyAction(game,'build_alliance_facility',{type:'academy',name:'Academia de rede'});
  const base=game.bases.find(item=>item.service==='medical');
  game=applyAction(game,'start_training',{base_id:base.id,course:'advanced-care',count:1});
  expect(game.trainings.some(item=>item.base_id===base.id&&item.status==='active')).toBe(true);
});


test('empty command centers do not increase global incident capacity', () => {
  let game=newGame();game.money=100000;
  const before=progressionSnapshot(game,{fire:{base_price:10000},medical:{base_price:8000},police:{base_price:8000}}).mission_cap;
  game=applyAction(game,'create_command_center',{name:'Comando vazio',site_id:'faro',radius_km:45});
  const after=progressionSnapshot(game,{fire:{base_price:10000},medical:{base_price:8000},police:{base_price:8000}}).mission_cap;
  expect(after).toBe(before);
});

test('career task rewards do not count as operational revenue', () => {
  let game=newGame();
  const task=game.tasks.find(item=>item.type==='completed'),earned=game.earned;
  game.completed=(task.baseline||0)+task.target;
  game=applyAction(game,'claim_task',{task_id:task.id});
  expect(game.earned).toBe(earned);
  expect(game.task_rewards).toBe(task.reward);
});

test('response preparation delay affects recommended dispatch order', () => {
  const game=newGame();
  const incident=game.incidents.find(item=>item.service==='fire');
  incident.needs={fire:1};incident.required_vehicle_types=[];incident.required_trainings=[];incident.required_personnel=1;
  const fire=game.units.filter(item=>item.service==='fire');
  fire[0].response_delay=120;fire[1].response_delay=0;
  const selected=selectRecommendedUnitIds(game,incident.id,'minimum');
  expect(selected[0]).toBe(fire[1].id);
});

test('critical transfer cancellation releases the reserved destination bed', () => {
  let game=newGame();game.money=100000;
  const center=game.command_centers[0];
  game=applyAction(game,'build_facility',{type:'hospital',site_id:'porto-campanha',command_center_id:center.id});
  game=applyAction(game,'build_facility',{type:'hospital',site_id:'porto-foz',command_center_id:center.id});
  game=tickGame(game,181);
  const [origin,target]=game.facilities.filter(item=>item.type==='hospital');
  game.patients.push({id:'test-patient',status:'admitted',hospital_id:origin.id,severity:3,specialty:'urgency',incident:'Teste',source_node:origin.node,city:origin.city});
  game=applyAction(game,'schedule_critical_transfer',{patient_id:'test-patient',facility_id:target.id});
  const transfer=game.medical_transfers.find(item=>item.patient_id==='test-patient');
  expect(game.patients.find(item=>item.id==='test-patient').reserved_hospital_id).toBe(target.id);
  game=applyAction(game,'cancel_medical_transfer',{transfer_id:transfer.id});
  const patient=game.patients.find(item=>item.id==='test-patient');
  expect(patient.status).toBe('admitted');
  expect(patient.reserved_hospital_id).toBeUndefined();
  expect(game.medical_transfers.find(item=>item.id===transfer.id).status).toBe('cancelled');
});


test('new careers start with a healthy operating budget', () => {
  const game=newGame();
  expect(game.money).toBe(40000);
  expect(game.operating_debt).toBe(0);
  expect(game.next_public_funding).toBeGreaterThan(0);
});

test('eligible investments are co-financed instead of exhausting the player', () => {
  let game=newGame();
  game.money=100;
  const center=game.command_centers[0];
  game=applyAction(game,'build_base',{service:'fire',site_id:'porto-campanha',command_center_id:center.id});
  expect(game.money).toBeGreaterThanOrEqual(5000);
  expect(game.public_funding).toBeGreaterThan(0);
  expect(game.bases.some(base=>base.node==='porto-campanha'&&base.service==='fire')).toBe(true);
});

test('operating costs can never drain the protected reserve', () => {
  let game=newGame();
  game.money=5000;
  game.next_upkeep=game.elapsed;
  game=tickGame(game,1);
  expect(game.money).toBeGreaterThanOrEqual(5000);
  expect(game.operating_debt).toBe(0);
});

test('periodic public funding creates sustainable positive cash flow', () => {
  let game=newGame();
  game.money=5000;
  game.next_public_funding=game.elapsed;
  const beforeFunding=game.public_funding||0;
  game=tickGame(game,1);
  expect(game.money).toBeGreaterThan(5000);
  expect(game.public_funding).toBeGreaterThan(beforeFunding);
});

test('base prices scale smoothly even for a nationwide network', () => {
  const game=newGame();
  game.bases=Array.from({length:30},(_,index)=>({id:String(index),service:index%3===0?'fire':index%3===1?'medical':'police'}));
  const price=nextBuildingCost(game,'fire',10000);
  expect(price).toBeLessThanOrEqual(25000);
  expect(price).toBeGreaterThan(10000);
});
