import {
  ensureRealismState,
  seedIncidentRealism,
  onCallTriage,
  tacticalOptionsFor,
  tacticalModifier,
  coverageSnapshot,
  queueVehicleProcurement,
  tickRealism,
  buildAfterActionReport,
  applyRealismAction,
} from './realismEngine';

const fixture=()=>{
  const game={
    elapsed:0,calendar_started_at:'2026-10-05T07:00:00.000Z',saved_at:'2026-10-05T07:00:00.000Z',
    money:5000000,level:3,trust:95,reputation:50,expenses:0,
    conditions:{weather:'clear',traffic:'light'},
    bases:[
      {id:'b-fire',name:'Quartel',service:'fire',city:'Porto',land:'mainland',level:1,enabled:true,capacity:4,lng:-8.61,lat:41.15,personnel:4},
      {id:'b-med',name:'Base INEM',service:'medical',city:'Porto',land:'mainland',level:1,enabled:true,capacity:4,lng:-8.62,lat:41.16,personnel:3},
      {id:'b-pol',name:'Esquadra',service:'police',city:'Porto',land:'mainland',level:1,enabled:true,capacity:4,lng:-8.60,lat:41.14,personnel:3},
    ],
    command_centers:[{id:'c1',name:'Comando Porto',center_node:'porto-aliados',active:true}],
    active_command_center_id:'c1',
    personnel:[
      {id:'p1',name:'A',profile_index:0,service:'fire',base_id:'b-fire',status:'available',qualifications:['command'],salary:1542,skill:80,leadership:85,health:100,fatigue:0},
      {id:'p2',name:'B',profile_index:1,service:'fire',base_id:'b-fire',status:'available',qualifications:[],salary:1542,skill:70,health:100,fatigue:0},
      {id:'p3',name:'C',profile_index:2,service:'medical',base_id:'b-med',status:'available',qualifications:['advanced-care'],salary:1341,skill:80,health:100,fatigue:0},
      {id:'p4',name:'D',profile_index:3,service:'police',base_id:'b-pol',status:'available',qualifications:['investigation'],salary:1998,skill:80,health:100,fatigue:0},
    ],
    units:[
      {id:'u1',name:'VUCI 01',service:'fire',vehicle_type:'fire-engine',vehicle_class:'heavy',base_id:'b-fire',status:'available',enabled:true,condition:100,resources:{fuel:100,water:3000,foam:300},crew_required:2,crew_assigned:2,personnel_ids:['p1','p2'],purchase_price:275000,mileage_km:10000,wear:5,lng:-8.61,lat:41.15},
      {id:'u2',name:'ABSC 01',service:'medical',vehicle_type:'ambulance',vehicle_class:'medium',base_id:'b-med',status:'available',enabled:true,condition:100,resources:{fuel:100,oxygen:100,medical:100},crew_required:1,crew_assigned:1,personnel_ids:['p3'],purchase_price:92000,mileage_km:5000,wear:3,lng:-8.62,lat:41.16},
      {id:'u3',name:'PSP 01',service:'police',vehicle_type:'patrol',vehicle_class:'light',base_id:'b-pol',status:'available',enabled:true,condition:100,resources:{fuel:100,equipment:100},crew_required:1,crew_assigned:1,personnel_ids:['p4'],purchase_price:38000,mileage_km:8000,wear:4,lng:-8.60,lat:41.14},
    ],
    facilities:[{id:'h1',type:'hospital',name:'Hospital',city:'Porto',land:'mainland',enabled:true,capacity:20,lng:-8.63,lat:41.15,specialties:['urgency','trauma'],specialty_capacity:{trauma:8}}],
    incidents:[],patients:[],prisoners:[],complexes:[],planned_missions:[],trainings:[],logs:[],history:[],
    supply_orders:[],logistics_metrics:{},cooperation:{buildings:[]},
  };
  ensureRealismState(game);
  return game;
};

const incident=()=>({
  id:'i1',title:'Incêndio industrial',service:'fire',category:'urban_fire',priority:1,rarity_level:4,
  needs:{fire:2,medical:1,police:0},casualties:2,detainees:0,created:0,status:'waiting',
  required_vehicle_types:['fire-engine'],recommended_vehicle_types:[],support_vehicle_types:[],
  required_trainings:['command'],recommended_trainings:[],command_center_id:'c1',
  lng:-8.64,lat:41.16,district:'Porto',call:{text:'Vejo muito fumo.'},
});

describe('integrated realism engine',()=>{
  test('fog of war starts incomplete and triage materially improves intelligence',()=>{
    const game=fixture(),inc=incident();
    seedIncidentRealism(game,inc,()=>.4);
    const before=inc.intel_confidence;
    expect(before).toBeLessThan(80);
    expect(inc.reconnaissance.complete).toBe(false);
    onCallTriage(game,inc,true);
    expect(inc.intel_confidence).toBeGreaterThan(before);
  });

  test('tactical doctrine has meaningful speed, risk and resource tradeoffs',()=>{
    const inc=incident();
    const options=tacticalOptionsFor(inc);
    expect(options.length).toBeGreaterThanOrEqual(3);
    inc.tactical_plan={option:'offensive'};
    expect(tacticalModifier(inc).speed).toBeGreaterThan(1);
    expect(tacticalModifier(inc).risk).toBeGreaterThan(1);
  });

  test('coverage falls when local resources leave availability',()=>{
    const game=fixture();
    const full=coverageSnapshot(game);
    game.units[0].status='enroute';
    const reduced=coverageSnapshot(game);
    expect(reduced.by_service.fire.score).toBeLessThan(full.by_service.fire.score);
  });

  test('vehicle procurement queues delivery instead of creating an instant asset',()=>{
    const game=fixture(),base=game.bases[0],definition={id:'test-heavy',name:'Pesado teste',vehicle_class:'heavy',price:300000};
    const order=queueVehicleProcurement(game,base,definition,{total:369000,own:110700,grant:258300});
    expect(order.status).toBe('ordered');
    expect(game.vehicle_procurements).toHaveLength(1);
    expect(order.delivery_at).toBeGreaterThan(game.elapsed);
  });

  test('live hospital simulation produces bounded pressure and handover time',()=>{
    const game=fixture();
    tickRealism(game,60,{vehicleCatalog:{}});
    const hospital=game.facilities[0];
    expect(hospital.ed_pressure).toBeGreaterThanOrEqual(15);
    expect(hospital.ed_pressure).toBeLessThanOrEqual(94);
    expect(hospital.handover_minutes).toBeGreaterThanOrEqual(8);
  });

  test('AAR records real costs and creates a persistent police case',()=>{
    const game=fixture(),inc={...incident(),id:'pol-1',title:'Roubo',service:'police',category:'crime',detainees:1,rarity_level:3};
    const report=buildAfterActionReport(game,inc,{score:84},[game.units[2]],true);
    expect(report.costs.total).toBeGreaterThan(0);
    expect(game.after_action_reports[0].id).toBe(report.id);
    expect(game.police_cases.some(file=>file.incident_id===inc.id)).toBe(true);
  });

  test('mutual aid has ETA and only affects the incident once it arrives',()=>{
    const game=fixture(),inc=incident();game.incidents=[inc];
    expect(applyRealismAction(game,'request_mutual_aid',{service:'fire',base_id:'b-fire',incident_id:inc.id,units:1})).toBe(true);
    const original=inc.needs.fire;
    expect(game.mutual_aid[0].status).toBe('requested');
    game.elapsed=game.mutual_aid[0].arrives_at;
    tickRealism(game,1,{vehicleCatalog:{}});
    expect(game.mutual_aid[0].status).toBe('active');
    expect(inc.needs.fire).toBe(original-1);
  });

  test('drone reconnaissance is an asset with weather and battery constraints',()=>{
    const game=fixture(),inc=incident();seedIncidentRealism(game,inc,()=>.4);game.incidents=[inc];
    expect(applyRealismAction(game,'acquire_drone',{command_center_id:'c1'})).toBe(true);
    expect(game.drone_assets).toHaveLength(1);
    expect(applyRealismAction(game,'deploy_drone',{incident_id:inc.id})).toBe(true);
    expect(game.drone_assets[0].status).toBe('deployed');
    const before=inc.intel_confidence;
    game.elapsed=game.drone_missions[0].completes_at;
    tickRealism(game,1,{vehicleCatalog:{}});
    expect(game.drone_assets[0].status).toBe('available');
    expect(inc.intel_confidence).toBeGreaterThan(before);
  });

  test('weekly budget cycle is approval metadata and never an annual expense',()=>{
    const game=fixture(),before=game.money;
    tickRealism(game,1,{vehicleCatalog:{}});
    expect(game.budget_cycle.approved_envelope).toBeGreaterThan(0);
    expect(game.budget_cycle.note).toMatch(/Não é uma cobrança anual/);
    expect(game.money).toBe(before);
  });
});
